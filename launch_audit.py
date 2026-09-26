#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
TEXT_EXTENSIONS = {".html", ".js", ".py", ".md", ".txt", ".xml", ".yml", ".yaml", ".json", ".webmanifest"}

FORBIDDEN = {
    "old product brand": "You With Jesus",
    "old Firebase canonical domain": "jesus-chat-bd89f.web.app",
    "legacy checkout 1": "cf0e4518-23cd-4011-8fc6-df4713c51516",
    "legacy checkout 2": "4aab51c1-d448-43d4-b3da-7ad7408d2a73",
    "legacy checkout 3": "dca75e97-af03-4754-97ef-36a760e80e83",
    "old checkout CTA": "Start Your Sacred Walk",
    "old response label": "Deep AI Replies",
    "old divine-listening indicator": "The Holy Spirit is listening to your heart",
    "old direct impersonation prompt": "You are Jesus Christ",
    "mobile zoom disabled": "user-scalable=no",
}

SKIP_DIRS = {".git", "node_modules", ".venv", "venv", "__pycache__"}
SKIP_FILES = {"launch_audit.py", "security_audit.py"}

def iter_text_files():
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if path.name in SKIP_FILES:
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.suffix.lower() in TEXT_EXTENSIONS or path.name in {"robots.txt"}:
            yield path

def main():
    failures = []
    checked = 0

    for path in iter_text_files():
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        checked += 1
        rel = path.relative_to(ROOT)

        for label, token in FORBIDDEN.items():
            if token in text:
                failures.append(f"{rel}: {label} -> {token!r}")

    required = [
        "index.html",
        "bible.html",
        "privacy.html",
        "terms.html",
        "refund.html",
        "offline.html",
        "service-worker.js",
        "manifest.webmanifest",
        "private-sync.js",
        "billing-config.js",
        "local-bible-engine.js",
        "local-scripture-data.js",
        "local-experiences.js",
    ]
    for name in required:
        if not (ROOT / name).exists():
            failures.append(f"missing required launch file: {name}")

    sw = (ROOT / "service-worker.js").read_text(encoding="utf-8")
    for cached in [
        "/index.html",
        "/bible.html",
        "/blessing.html",
        "/offline.html",
        "/private-sync.js",
        "/billing-config.js",
        "/local-bible-engine.js",
    ]:
        if f'"{cached}"' not in sw:
            failures.append(f"service-worker.js: app shell missing {cached}")

    robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
    if "https://www.1into1.com/sitemap.xml" not in robots:
        failures.append("robots.txt: sitemap is not on https://www.1into1.com")

    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    if "https://www.1into1.com/" not in sitemap:
        failures.append("sitemap.xml: final domain missing")

    index = (ROOT / "index.html").read_text(encoding="utf-8")
    for marker in [
        "1into1 with Jesus",
        "Ask Deeper",
        "FREE FOREVER · $0",
        "Local-first by default",
        "private-sync.js",
    ]:
        if marker not in index:
            failures.append(f"index.html: required launch marker missing -> {marker!r}")

    privacy = (ROOT / "privacy.html").read_text(encoding="utf-8")
    for marker in ["Ask Deeper Cloud Processing", "Optional Plus Encrypted Backup", "Google Analytics"]:
        if marker not in privacy:
            failures.append(f"privacy.html: required disclosure missing -> {marker!r}")

    print(f"Launch audit checked {checked} text files.")
    if failures:
        print(f"FAILED: {len(failures)} launch issue(s)")
        for failure in failures:
            print(" - " + failure)
        return 1

    print("PASS: no stale launch blockers found.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
