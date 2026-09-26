#!/usr/bin/env python3
import argparse
import json
import re
import sys
import urllib.error
import urllib.request

DEFAULT_BASE = "https://www.1into1.com"
DEFAULT_API = "https://jesus-talk-dusky.vercel.app"

ESSENTIAL_PATHS = [
    "/",
    "/christian-prayer-app.html",
    "/bible.html",
    "/bible-study.html",
    "/offline-bible.html",
    "/prayer-guides.html",
    "/guides/anxiety-and-fear.html",
    "/guides/grief-and-loss.html",
    "/guides/sleep-and-rest.html",
    "/guides/relationships-and-forgiveness.html",
    "/guides/money-work-and-provision.html",
    "/blogs.html",
    "/privacy.html",
    "/terms.html",
    "/refund.html",
    "/robots.txt",
    "/sitemap.xml",
    "/manifest.webmanifest",
    "/service-worker.js",
    "/launch-config.js",
    "/billing-config.js",
]

def request(url, method="GET", headers=None, timeout=20):
    req = urllib.request.Request(
        url,
        method=method,
        headers={
            "User-Agent": "1into1-production-smoke/1.0",
            **(headers or {}),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.status, dict(response.headers), response.read()
    except urllib.error.HTTPError as exc:
        return exc.code, dict(exc.headers), exc.read()

def as_text(body):
    return body.decode("utf-8", errors="replace")

def bool_from_js(source, key):
    m = re.search(rf"\b{re.escape(key)}\s*:\s*(true|false)\b", source, re.I)
    return bool(m and m.group(1).lower() == "true")

def checkout_urls(source):
    return re.findall(r'checkoutUrl\s*:\s*"([^"]*)"', source)

def load_retired(path):
    rows = []
    with open(path, "r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line and not line.startswith("#"):
                rows.append(line)
    return rows

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default=DEFAULT_BASE)
    parser.add_argument("--api-url", default=DEFAULT_API)
    parser.add_argument("--strict", action="store_true")
    parser.add_argument("--retired-paths", default="retired_pdf_paths.txt")
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    api = args.api_url.rstrip("/")
    failures = []
    notes = []

    fetched = {}
    for path in ESSENTIAL_PATHS:
        status, headers, body = request(base + path)
        fetched[path] = (status, headers, body)
        if status != 200:
            failures.append(f"{path}: expected HTTP 200, got {status}")

    home = as_text(fetched.get("/", (0, {}, b""))[2])
    canonical_match = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)', home, re.I)
    canonical = canonical_match.group(1) if canonical_match else ""
    if canonical != "https://www.1into1.com/":
        failures.append(f"homepage canonical unexpected: {canonical!r}")

    robots = as_text(fetched.get("/robots.txt", (0, {}, b""))[2])
    if "Sitemap: https://www.1into1.com/sitemap.xml" not in robots:
        failures.append("robots.txt does not advertise the production sitemap")

    sitemap = as_text(fetched.get("/sitemap.xml", (0, {}, b""))[2])
    for required in [
        "https://www.1into1.com/",
        "https://www.1into1.com/christian-prayer-app.html",
        "https://www.1into1.com/bible-study.html",
        "https://www.1into1.com/offline-bible.html",
        "https://www.1into1.com/prayer-guides.html",
    ]:
        if required not in sitemap:
            failures.append(f"sitemap missing {required}")

    launch = as_text(fetched.get("/launch-config.js", (0, {}, b""))[2])
    billing = as_text(fetched.get("/billing-config.js", (0, {}, b""))[2])
    plus_enabled = bool_from_js(launch, "plusCheckoutEnabled")
    backup_enabled = bool_from_js(launch, "encryptedBackupEnabled")

    urls = checkout_urls(billing)
    if plus_enabled:
        if len(urls) < 2 or any(not u.startswith("https://") for u in urls[:2]):
            failures.append("Plus is enabled but live billing-config checkout URLs are incomplete")
    else:
        notes.append("Plus checkout remains gated off.")

    if not backup_enabled:
        notes.append("Encrypted backup remains gated off.")

    health_status, _, health_body = request(api + "/api/health")
    if health_status != 200:
        failures.append(f"API health returned {health_status}")
    else:
        try:
            health = json.loads(as_text(health_body))
            if health.get("status") != "active":
                failures.append("API health status is not active")
            if not health.get("db_connected"):
                failures.append("API reports database disconnected")
            if not health.get("cloud_configured"):
                failures.append("API reports Ask Deeper cloud provider unconfigured")
        except Exception as exc:
            failures.append(f"API health is not valid JSON: {exc}")

    readiness_status, _, readiness_body = request(api + "/api/readiness")
    if readiness_status != 200:
        failures.append(f"API readiness returned {readiness_status}")
    else:
        try:
            ready = json.loads(as_text(readiness_body))
            checks = ready.get("checks", {})
            if not checks.get("production_www_origin"):
                failures.append("API readiness: www production origin is not allowed")
            if not checks.get("production_apex_origin"):
                failures.append("API readiness: apex production origin is not allowed")
            if args.strict and ready.get("status") != "ready":
                failures.append(f"strict API readiness is {ready.get('status')!r}, expected 'ready'")
        except Exception as exc:
            failures.append(f"API readiness is not valid JSON: {exc}")

    preflight_status, preflight_headers, _ = request(
        api + "/chat",
        method="OPTIONS",
        headers={
            "Origin": "https://www.1into1.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,authorization",
        },
    )
    if preflight_status not in (200, 204):
        failures.append(f"API CORS preflight returned {preflight_status}")
    allow_origin = preflight_headers.get("access-control-allow-origin") or preflight_headers.get("Access-Control-Allow-Origin")
    if allow_origin != "https://www.1into1.com":
        failures.append(f"API CORS allow-origin unexpected: {allow_origin!r}")

    retired = load_retired(args.retired_paths)
    for path in retired:
        status, _, _ = request(base + path)
        if status not in (404, 410):
            failures.append(f"retired PDF route {path} must return 404/410, got {status}")

    if args.strict:
        if not plus_enabled:
            failures.append("strict smoke requires Plus checkout enabled")
        if not backup_enabled:
            failures.append("strict smoke requires encrypted backup enabled")

    print(f"Production smoke checked {len(ESSENTIAL_PATHS)} essential URLs and {len(retired)} retired PDF routes.")
    for note in notes:
        print("NOTE:", note)

    if failures:
        print(f"FAILED: {len(failures)} production smoke issue(s)")
        for failure in failures:
            print(" - " + failure)
        return 1

    print("PASS: production smoke checks passed.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
