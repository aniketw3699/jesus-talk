#!/usr/bin/env python3
"""Phase 14 external-launch readiness checks.

This audit intentionally does NOT enable billing, deploy Firestore rules, or
switch production DNS. It verifies the currently safe prelaunch state and
reports external blockers that still need explicit activation/testing.
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
    "https://jesus-talk-dusky.vercel.app",
).rstrip("/")

PREVIEW_ORIGIN = PREVIEW_BASE
PRODUCTION_ORIGIN = "https://www.1into1.com"


def request(url: str, method: str = "GET", headers: dict | None = None, timeout: int = 25):
    req = urllib.request.Request(
        url,
        method=method,
        headers={
            "User-Agent": "1into1-phase14-audit/1.0",
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
        failures.append("live preview is not safely in prelaunch mode")
    if bool_from_js(launch, "plusCheckoutEnabled") is not False:
        failures.append("Plus checkout must remain OFF during Phase 14 validation")
    if bool_from_js(launch, "encryptedBackupEnabled") is not False:
        failures.append("encrypted backup must remain OFF until Firestore is deployed/tested")
    if js_string(launch, "backendApiUrl") != API_BASE:
        failures.append("live preview backend URL does not match the approved backend")
    if not any("live preview" in f for f in failures):
        passes.append("live launch config remains safely gated")

    status, _, billing_body = request(PREVIEW_BASE + "/billing-config.js")
    billing = text(billing_body) if status == 200 else ""
    checkout_urls = re.findall(r'checkoutUrl\s*:\s*"([^"]*)"', billing)
    if len(checkout_urls) < 2:
        failures.append("billing config is missing monthly/annual checkout entries")
    elif any(checkout_urls):
        blockers.append("billing URLs are populated; verify products/intervals before enabling Plus")
    else:
        blockers.append("Lemon Squeezy checkout URLs are still blank (expected pre-activation blocker)")

    # Backend live health.
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
            for required in ("database", "cloud_ai", "production_www_origin", "production_apex_origin"):
                if not checks.get(required):
                    failures.append(f"backend readiness check is false: {required}")
            if checks.get("lemon_webhook_secret"):
                passes.append("Lemon webhook secret is configured on the backend")
            else:
                blockers.append("Lemon webhook secret is not configured on the live backend")
            if readiness.get("status") == "ready":
                passes.append("backend readiness endpoint reports ready")
            else:
                blockers.append(
                    "backend readiness is degraded until all external launch dependencies are configured"
                )
        except Exception as exc:
            failures.append(f"backend readiness response is invalid JSON: {exc}")

    # Production-domain CORS must already be correct.
    status, headers, _ = cors_preflight(PRODUCTION_ORIGIN)
    if status not in (200, 204):
        failures.append(f"production CORS preflight returned {status}")
    elif allow_origin(headers) != PRODUCTION_ORIGIN:
        failures.append(
            f"production CORS allow-origin is {allow_origin(headers)!r}, expected {PRODUCTION_ORIGIN!r}"
        )
    else:
        passes.append("production www origin is accepted by backend CORS")

    # The new exact workers.dev preview origin is now present in source on this
    # Phase 14 branch, but the existing Vercel backend may not have been
    # redeployed yet. Report that as a deployment blocker rather than hiding it.
    status, headers, _ = cors_preflight(PREVIEW_ORIGIN)
    if status in (200, 204) and allow_origin(headers) == PREVIEW_ORIGIN:
        passes.append("live backend accepts the Cloudflare preview origin")
    else:
        blockers.append(
            "live backend has not yet picked up the Cloudflare preview CORS origin; "
            "Ask Deeper browser QA on workers.dev remains pending backend deployment"
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
