#!/usr/bin/env python3
"""External launch dependency audit for 1into1 with Jesus.

This began as the Phase 14 prelaunch audit. It now supports both the historical
prelaunch checkpoint and the current production-era repository configuration.
Modern pull requests must not fail merely because the retired prelaunch
workers.dev frontend is no longer deployed.
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PRODUCTION_ORIGIN = "https://www.1into1.com"
PRODUCTION_APEX_ORIGIN = "https://1into1.com"
LEGACY_PREVIEW_BASE = os.getenv(
    "PHASE14_PREVIEW_BASE",
    "https://oneintoone-jesus.aniketw3699.workers.dev",
).rstrip("/")
API_BASE = os.getenv(
    "PHASE14_API_BASE",
    "https://oneintoone-jesus-api.aniketw3699.workers.dev",
).rstrip("/")
LEMON_HOST = "https://purple1into1.lemonsqueezy.com/checkout/buy/"


def request(url: str, method: str = "GET", headers: dict | None = None, timeout: int = 25):
    req = urllib.request.Request(
        url,
        method=method,
        headers={
            "User-Agent": "1into1-external-launch-audit/3.0",
            **(headers or {}),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.status, dict(response.headers), response.read()
    except urllib.error.HTTPError as exc:
        return exc.code, dict(exc.headers), exc.read()
    except urllib.error.URLError as exc:
        return 0, {}, str(exc).encode("utf-8", errors="replace")


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


def validate_billing(source: str, failures: list[str], passes: list[str]) -> None:
    checkout_urls = re.findall(r'checkoutUrl\s*:\s*"([^"]*)"', source)
    if len(checkout_urls) != 2:
        failures.append("billing config must contain exactly monthly and annual checkout URLs")
    elif not all(url.startswith(LEMON_HOST) for url in checkout_urls):
        failures.append("billing checkout URLs are not the approved Lemon Squeezy live checkout host")
    elif "enabled=2171751" not in checkout_urls[0] or "enabled=2171775" not in checkout_urls[1]:
        failures.append("billing checkout URLs do not target the approved monthly/annual variants")
    else:
        passes.append("Lemon Squeezy monthly and annual checkout URLs are connected")


def validate_repository_launch_config(failures: list[str], passes: list[str]) -> str:
    launch = (ROOT / "launch-config.js").read_text(encoding="utf-8")
    billing = (ROOT / "billing-config.js").read_text(encoding="utf-8")
    environment = js_string(launch, "environment")

    if environment not in {"prelaunch", "production"}:
        failures.append(f"unsupported repository environment: {environment!r}")
        return environment

    if js_string(launch, "backendApiUrl") != API_BASE:
        failures.append("repository backend URL does not match the Cloudflare API")

    if environment == "production":
        if bool_from_js(launch, "plusCheckoutEnabled") is not True:
            failures.append("production Plus checkout must be enabled")
        if bool_from_js(launch, "encryptedBackupEnabled") is not True:
            failures.append("production encrypted backup must be enabled")
        if js_string(launch, "canonicalHost") != PRODUCTION_ORIGIN:
            failures.append("production canonical host must be https://www.1into1.com")
        if not any("repository" in item or "production" in item for item in failures):
            passes.append("repository launch config matches the current production architecture")
    else:
        passes.append("repository remains on the legacy prelaunch checkpoint")

    validate_billing(billing, failures, passes)
    return environment


def validate_legacy_preview(failures: list[str], passes: list[str]) -> None:
    for path in ["/", "/launch-config.js", "/billing-config.js", "/bible.html", "/privacy.html"]:
        status, _, body = request(LEGACY_PREVIEW_BASE + path)
        if status != 200:
            failures.append(f"legacy Cloudflare preview {path} returned {status}")
        elif not body:
            failures.append(f"legacy Cloudflare preview {path} returned an empty body")

    if not any("legacy Cloudflare preview" in item for item in failures):
        passes.append("legacy workers.dev preview serves key product assets")


def validate_production_frontend(failures: list[str], passes: list[str]) -> None:
    # External frontend smoke only. Branch content is validated separately by
    # Cloudflare Hosting Checkpoint against the exact generated dist/ bundle.
    for path in ["/", "/bible.html", "/privacy.html"]:
        status, _, body = request(PRODUCTION_ORIGIN + path)
        if status != 200:
            failures.append(f"production frontend {path} returned {status}")
        elif not body:
            failures.append(f"production frontend {path} returned an empty body")

    if not any("production frontend" in item for item in failures):
        passes.append("production frontend serves key public product pages")


def validate_backend(failures: list[str], passes: list[str]) -> None:
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
                failures.append("backend reports cloud provider unconfigured")
            if not any("backend" in item for item in failures):
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
            )
            for required in required_checks:
                if not checks.get(required):
                    failures.append(f"backend readiness check is false: {required}")
            if readiness.get("status") != "ready":
                failures.append("backend readiness endpoint does not report ready")
            elif not any("readiness" in item for item in failures):
                passes.append("backend readiness endpoint reports ready")
        except Exception as exc:
            failures.append(f"backend readiness response is invalid JSON: {exc}")


def validate_cors(environment: str, failures: list[str], passes: list[str]) -> None:
    origins = [
        (PRODUCTION_ORIGIN, "production www origin"),
        (PRODUCTION_APEX_ORIGIN, "production apex origin"),
    ]
    if environment == "prelaunch":
        origins.append((LEGACY_PREVIEW_BASE, "legacy Cloudflare preview origin"))

    for origin, label in origins:
        status, headers, _ = cors_preflight(origin)
        if status not in (200, 204):
            failures.append(f"{label} CORS preflight returned {status}")
        elif allow_origin(headers) != origin:
            failures.append(
                f"{label} CORS allow-origin is {allow_origin(headers)!r}, expected {origin!r}"
            )
        else:
            passes.append(f"{label} is accepted by backend CORS")


def main() -> int:
    failures: list[str] = []
    passes: list[str] = []

    environment = validate_repository_launch_config(failures, passes)

    if environment == "prelaunch":
        validate_legacy_preview(failures, passes)
        frontend_label = LEGACY_PREVIEW_BASE
    else:
        validate_production_frontend(failures, passes)
        frontend_label = PRODUCTION_ORIGIN

    validate_backend(failures, passes)
    validate_cors(environment, failures, passes)

    print("EXTERNAL LAUNCH DEPENDENCY AUDIT")
    print(f"Environment: {environment or 'unknown'}")
    print(f"Frontend: {frontend_label}")
    print(f"API: {API_BASE}")

    for item in passes:
        print("PASS:", item)
    for item in failures:
        print("FAIL:", item)

    print(f"SUMMARY passes={len(passes)} failures={len(failures)}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
