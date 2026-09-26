#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent

def read(path):
    return (ROOT / path).read_text(encoding="utf-8")

def main():
    failures = []

    required = [
        "launch-config.js",
        "billing-config.js",
        "firestore.rules",
        "DISRUPTION_CHECKPOINT.md",
        "PRODUCTION_CUTOVER.md",
        "production_readiness.py",
        "production_smoke.py",
        ".github/workflows/deploy_firestore_rules.yml",
        ".github/workflows/production_smoke.yml",
    ]
    for path in required:
        if not (ROOT / path).exists():
            failures.append(f"missing RC file: {path}")

    if failures:
        for failure in failures:
            print("FAIL:", failure)
        return 1

    launch = read("launch-config.js")
    billing = read("billing-config.js")
    index = read("index.html")
    terms = read("terms.html")
    firestore_workflow = read(".github/workflows/deploy_firestore_rules.yml")
    smoke_workflow = read(".github/workflows/production_smoke.yml")
    seo_workflow = read(".github/workflows/seo_cron.yml")
    disruption = read("DISRUPTION_CHECKPOINT.md")

    required_launch_values = [
        'environment: "prelaunch"',
        "plusCheckoutEnabled: false",
        "encryptedBackupEnabled: false",
        'canonicalHost: "https://www.1into1.com"',
    ]
    for marker in required_launch_values:
        if marker not in launch:
            failures.append(f"launch-config.js: RC must retain {marker!r}")

    checkout_values = re.findall(r'checkoutUrl\s*:\s*"([^"]*)"', billing)
    if len(checkout_values) < 2:
        failures.append("billing-config.js: expected two Plus checkout slots")
    elif any(value.strip() for value in checkout_values[:2]):
        failures.append("billing-config.js: RC must not contain live checkout URLs before external billing verification")

    for marker in [
        "Unlimited local prayer",
        "No app install required",
        "Ask Deeper · Cloud",
        "Comfort · Local",
        "Written Prayer · Local",
        "Guidance · Local",
    ]:
        if marker not in index:
            failures.append(f"index.html: disruption marker missing -> {marker!r}")

    if "fair-use" not in terms.lower():
        failures.append("terms.html: cloud fair-use disclosure missing")
    if "PLUS_DAILY_FAIR_USE_LIMIT" not in read("api/index.py"):
        failures.append("api/index.py: Plus cloud fair-use ceiling missing")

    for path, workflow in [
        (".github/workflows/deploy_firestore_rules.yml", firestore_workflow),
        (".github/workflows/production_smoke.yml", smoke_workflow),
    ]:
        if "workflow_dispatch:" not in workflow:
            failures.append(f"{path}: must remain manual workflow_dispatch only")
        if re.search(r"(?m)^\s*schedule\s*:", workflow):
            failures.append(f"{path}: must not run on a schedule")
        if re.search(r"(?m)^\s*push\s*:", workflow):
            failures.append(f"{path}: must not run automatically on push")

    if "DEPLOY_RULES" not in firestore_workflow:
        failures.append("deploy_firestore_rules.yml: explicit production confirmation token missing")

    if "git push origin main" in seo_workflow or "firebase deploy" in seo_workflow:
        failures.append("seo_cron.yml: generated content must remain PR-gated and non-deploying")

    for marker in [
        "Unlimited local prayer",
        "No account",
        "app-store install",
        "fair-use",
    ]:
        if marker.lower() not in disruption.lower():
            failures.append(f"DISRUPTION_CHECKPOINT.md: required product guardrail missing -> {marker!r}")

    # Detect common committed live-secret formats. Examples/documentation with
    # empty values are allowed; long token-like values are not.
    secret_patterns = {
        "GitHub classic PAT": re.compile(r"\bghp_[A-Za-z0-9]{20,}\b"),
        "GitHub fine-grained PAT": re.compile(r"\bgithub_pat_[A-Za-z0-9_]{20,}\b"),
        "Groq API key": re.compile(r"\bgsk_[A-Za-z0-9]{20,}\b"),
        "OpenAI-style key": re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b"),
    }

    scan_ext = {".html", ".js", ".py", ".md", ".txt", ".json", ".yml", ".yaml", ".xml", ".webmanifest"}
    skip_dirs = {".git", "node_modules", ".venv", "venv", "__pycache__"}
    skip_files = {"release_candidate_audit.py"}

    for path in ROOT.rglob("*"):
        if not path.is_file() or path.name in skip_files:
            continue
        if any(part in skip_dirs for part in path.parts):
            continue
        if path.suffix.lower() not in scan_ext and path.name not in {"robots.txt"}:
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        rel = path.relative_to(ROOT)
        for label, pattern in secret_patterns.items():
            if pattern.search(content):
                failures.append(f"{rel}: possible committed {label}")

    if failures:
        print(f"FAILED: {len(failures)} release-candidate issue(s)")
        for failure in failures:
            print(" - " + failure)
        return 1

    print("PASS: RC remains prelaunch-safe, disruption-aligned, manual-deploy only, and free of obvious token patterns.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
