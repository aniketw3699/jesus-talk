#!/usr/bin/env python3
"""Phase 14 external-launch readiness checks.

This audit validates the live Cloudflare preview/API after the Ask Deeper and
Lemon Squeezy integration. Production DNS is still intentionally untouched and
encrypted backup remains gated until Firestore rules are explicitly deployed
and restore/delete behavior is verified.
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request

PREVIEW_BASE = os.getenv(
    "PHASE14_PREVIEW_BASE",
    "https://oneintoone-jesus.aniketw3699.workers.dev",
).rstrip("/")
API_BASE = os.getenv(
    "PHASE14_API_BASE",
    "https://oneintoone-jesus-api.aniketw3699.workers.dev",
).rstrip("/")

PREVIEW_ORIGIN = PREVIEW_BASE
PRODUCTION_ORIGIN = "https://www.1into1.com"
LEMON_HOST = "https://purple1into1.lemonsqueezy.com/checkout/buy/"


def request(url: str, method: str = "GET", headers: dict | None = None, timeout: int = 25):
    req = urllib.request.Request(
        url,
        method=method,
        headers={
            "User-Agent": "1into1-phase14-audit/2.0",
            **(headers or {}),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.status, dict(response.headers), response.read()
    except urllib.error.HTTPError as exc:
        return exc.code, dict(exc.headers), exc.read()


def text(body: bytes) -> str:
    return body.decode("utf-8", errors="replace")


def json_body(body: bytes):
    return json.loads(text(body))


def bool_from_js(source: str, key: str):
    match = re.search(rf"\b{re.escape(key)}\s*:\s*(true|false)\b", source, re.I)
    return None if not match else match.group(1).lower() == "true"


def js_string(source: str, key: str):
    match = re.search(rf"\b{re.escape(key)}\s*:\s*[\"']([^\"']*)[\"']", source)
    return "" if not match else match.group(1)


def allow_origin(headers: dict) -> str:
    return (
        headers.get("access-control-allow-origin")
        or headers.get("Access-Control-Allow-Origin")
        or ""
    )


def cors_preflight(origin: str):
    return request(
        API_BASE + "/chat",
        method="OPTIONS",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,authorization",
        },
    )


def main() -> int:
    failures: list[str] = []
    blockers: list[str] = []
    passes: list[str] = []

    # Cloudflare live preview.
    for path in ["/", "/launch-config.js", "/billing-config.js", "/bible.html", "/privacy.html"]:
        status, _, body = request(PREVIEW_BASE + path)
        if status != 200:
            failures.append(f"Cloudflare preview {path} returned {status}")
        elif not body:
            failures.append(f"Cloudflare preview {path} returned an empty body")
    if not failures:
        passes.append("Cloudflare workers.dev preview serves key product assets")

    status, _, launch_body = request(PREVIEW_BASE + "/launch-config.js")
    launch = text(launch_body) if status == 200 else ""
    if js_string(launch, "environment") != "prelaunch":
        failures.append("live preview is not in the expected prelaunch environment")
    if bool_from_js(launch, "plusCheckoutEnabled") is not True:
        failures.append("Plus checkout is not enabled on the Phase 14 preview")
    if bool_from_js(launch, "encryptedBackupEnabled") is not False:
        failures.append("encrypted backup must remain OFF until Firestore is deployed/tested")
    if js_string(launch, "backendApiUrl") != API_BASE:
        failures.append("live preview backend URL does not match the Cloudflare API")
    if not any("live preview" in f for f in failures):
        passes.append("live preview routes Ask Deeper to Cloudflare and exposes Plus checkout")

    status, _, billing_body = request(PREVIEW_BASE + "/billing-config.js")
    billing = text(billing_body) if status == 200 else ""
    checkout_urls = re.findall(r'checkoutUrl\s*:\s*"([^"]*)"', billing)
    if len(checkout_urls) != 2:
        failures.append("billing config must contain exactly monthly and annual checkout URLs")
    elif not all(url.startswith(LEMON_HOST) for url in checkout_urls):
        failures.append("billing checkout URLs are not the approved Lemon Squeezy live checkout host")
    elif "enabled=2171751" not in checkout_urls[0] or "enabled=2171775" not in checkout_urls[1]:
        failures.append("billing checkout URLs do not target the approved monthly/annual variants")
    else:
        passes.append("Lemon Squeezy monthly and annual checkout URLs are connected")

    # Backend live health/readiness.
    status, _, body = request(API_BASE + "/api/health")
    if status != 200:
        failures.append(f"backend health returned {status}")
    else:
        try:
            health = json_body(body)
            if health.get("status") != "active":
                failures.append("backend health status is not active")
            if not health.get("db_connected"):
                failures.append("backend reports Firebase database disconnected")
            if not health.get("cloud_configured"):
                failures.append("backend reports Ask Deeper cloud provider unconfigured")
            if not any("backend" in f for f in failures):
                passes.append(
                    f"backend health active; provider={health.get('cloud_provider') or 'unknown'}"
                )
        except Exception as exc:
            failures.append(f"backend health response is invalid JSON: {exc}")

    status, _, body = request(API_BASE + "/api/readiness")
    if status != 200:
        failures.append(f"backend readiness returned {status}")
    else:
        try:
            readiness = json_body(body)
            checks = readiness.get("checks") or {}
            required_checks = (
                "database",
                "cloud_ai",
                "lemon_webhook_secret",
                "guest_hash_salt",
                "production_www_origin",
                "production_apex_origin",
                "cloudflare_preview_origin",
            )
            for required in required_checks:
                if not checks.get(required):
                    failures.append(f"backend readiness check is false: {required}")
            if readiness.get("status") != "ready":
                failures.append("backend readiness endpoint does not report ready")
            elif not any("readiness" in f for f in failures):
                passes.append("backend readiness endpoint reports ready with all Phase 14B secrets")
        except Exception as exc:
            failures.append(f"backend readiness response is invalid JSON: {exc}")

    for origin, label in (
        (PRODUCTION_ORIGIN, "production www origin"),
        (PREVIEW_ORIGIN, "Cloudflare preview origin"),
    ):
        status, headers, _ = cors_preflight(origin)
        if status not in (200, 204):
            failures.append(f"{label} CORS preflight returned {status}")
        elif allow_origin(headers) != origin:
            failures.append(
                f"{label} CORS allow-origin is {allow_origin(headers)!r}, expected {origin!r}"
            )
        else:
            passes.append(f"{label} is accepted by backend CORS")

    blockers.append(
        "Encrypted backup remains gated until Firestore rules are explicitly deployed and "
        "create/restore/wrong-password/new-device/delete tests pass."
    )
    blockers.append(
        "Production 1into1.com DNS/custom-domain cutover remains intentionally pending Phase 15."
    )

    print("PHASE 14 EXTERNAL LAUNCH AUDIT")
    print(f"Preview: {PREVIEW_BASE}")
    print(f"API: {API_BASE}")

    for item in passes:
        print("PASS:", item)
    for item in blockers:
        print("BLOCKER:", item)
    for item in failures:
        print("FAIL:", item)

    print(
        f"SUMMARY passes={len(passes)} blockers={len(blockers)} failures={len(failures)}"
    )

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
