#!/usr/bin/env python3
from pathlib import Path
import argparse
import re
import sys

ROOT = Path(__file__).resolve().parent
CANONICAL = "https://www.1into1.com"
APEX = "https://1into1.com"

def read(path):
    return (ROOT / path).read_text(encoding="utf-8")

def bool_value(text, key):
    m = re.search(rf"\b{re.escape(key)}\s*:\s*(true|false)\b", text, re.I)
    if not m:
        return None
    return m.group(1).lower() == "true"

def string_value(text, key):
    m = re.search(rf"\b{re.escape(key)}\s*:\s*[\"']([^\"']*)[\"']", text)
    return m.group(1).strip() if m else ""

def checkout_url(text, block_name):
    m = re.search(
        rf"\b{re.escape(block_name)}\s*:\s*Object\.freeze\(\{{([\s\S]*?)\}}\)",
        text,
        re.M,
    )
    if not m:
        return ""
    return string_value(m.group(1), "checkoutUrl")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Require all external launch-dependent features to be activated.",
    )
    args = parser.parse_args()

    failures = []
    warnings = []

    required = [
        "launch-config.js",
        "billing-config.js",
        "index.html",
        "api/index.py",
        "firestore.rules",
        "firebase.json",
        "service-worker.js",
        "robots.txt",
        "sitemap.xml",
        "retired_pdf_paths.txt",
    ]
    for path in required:
        if not (ROOT / path).exists():
            failures.append(f"missing required production file: {path}")

    if failures:
        for failure in failures:
            print("FAIL:", failure)
        return 1

    launch = read("launch-config.js")
    billing = read("billing-config.js")
    index = read("index.html")
    api = read("api/index.py")
    rules = read("firestore.rules")
    firebase = read("firebase.json")
    sw = read("service-worker.js")
    robots = read("robots.txt")
    sitemap = read("sitemap.xml")

    environment = string_value(launch, "environment")
    canonical = string_value(launch, "canonicalHost")
    backend = string_value(launch, "backendApiUrl")
    plus_enabled = bool_value(launch, "plusCheckoutEnabled")
    backup_enabled = bool_value(launch, "encryptedBackupEnabled")
    monthly_url = checkout_url(billing, "plusMonthly")
    annual_url = checkout_url(billing, "plusAnnual")

    if canonical != CANONICAL:
        failures.append(f"launch-config.js: canonicalHost must be {CANONICAL}")
    if not backend.startswith("https://"):
        failures.append("launch-config.js: backendApiUrl must use HTTPS")
    if plus_enabled is None or backup_enabled is None:
        failures.append("launch-config.js: production feature flags are missing")

    if "launch-config.js" not in index:
        failures.append("index.html: launch-config.js is not loaded")
    if "DEVELOPER_EMAIL" in index:
        failures.append("index.html: public developer-email bypass must not ship")

    if 'DEVELOPER_EMAIL = os.getenv("DEVELOPER_EMAIL", "").strip()' not in api:
        failures.append("api/index.py: developer email must have an empty default")
    if CANONICAL not in api or APEX not in api:
        failures.append("api/index.py: both production origins must be allowed")
    if '@app.get("/readiness")' not in api or '@app.get("/api/readiness")' not in api:
        failures.append("api/index.py: production readiness endpoint missing")

    if '"firestore"' not in firebase or '"rules": "firestore.rules"' not in firebase:
        failures.append("firebase.json: Firestore rules deployment config missing")
    if "match /encrypted_backups/{backupId}" not in rules:
        failures.append("firestore.rules: encrypted backup rules missing")

    if '"/launch-config.js"' not in sw:
        failures.append("service-worker.js: launch-config.js missing from app shell")

    if f"Sitemap: {CANONICAL}/sitemap.xml" not in robots:
        failures.append("robots.txt: production sitemap URL is wrong")
    if f"<loc>{CANONICAL}/</loc>" not in sitemap:
        failures.append("sitemap.xml: production homepage URL missing")

    retired = []
    for line in read("retired_pdf_paths.txt").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        retired.append(line)
        local_candidate = ROOT / line.lstrip("/")
        if local_candidate.exists() or local_candidate.with_suffix(".html").exists():
            failures.append(f"retired PDF route still exists in new product: {line}")
        if f"{CANONICAL}{line}" in sitemap:
            failures.append(f"retired PDF route still appears in sitemap: {line}")

    def valid_checkout(url):
        return url.startswith("https://") and "/checkout/" in url

    if plus_enabled:
        if not valid_checkout(monthly_url):
            failures.append("Plus monthly is enabled but checkoutUrl is not a valid HTTPS checkout URL")
        if not valid_checkout(annual_url):
            failures.append("Plus annual is enabled but checkoutUrl is not a valid HTTPS checkout URL")
    else:
        warnings.append("Plus checkout is safely gated OFF until matching Lemon Squeezy variants are connected.")

    if backup_enabled:
        if "encrypted_backups" not in rules:
            failures.append("Encrypted backup is enabled but Firestore rules are missing")
    else:
        warnings.append("Encrypted backup is safely gated OFF until production Firestore rules are deployed and verified.")

    if args.strict:
        if environment != "production":
            failures.append("strict readiness requires launch-config environment='production'")
        if plus_enabled is not True:
            failures.append("strict readiness requires plusCheckoutEnabled=true")
        if backup_enabled is not True:
            failures.append("strict readiness requires encryptedBackupEnabled=true")

    print("Production readiness audit")
    print(f" - environment: {environment or 'missing'}")
    print(f" - canonical: {canonical or 'missing'}")
    print(f" - backend: {backend or 'missing'}")
    print(f" - Plus checkout enabled: {plus_enabled}")
    print(f" - encrypted backup enabled: {backup_enabled}")
    print(f" - representative retired PDF paths checked: {len(retired)}")

    for warning in warnings:
        print("WARNING:", warning)

    if failures:
        print(f"FAILED: {len(failures)} readiness issue(s)")
        for failure in failures:
            print(" - " + failure)
        return 1

    if args.strict:
        print("PASS: strict production configuration is statically ready.")
    else:
        print("PASS: prelaunch configuration is safe; unfinished external features are gated.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
