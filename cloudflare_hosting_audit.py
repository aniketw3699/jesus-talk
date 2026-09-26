#!/usr/bin/env python3
"""Safety audit for the Cloudflare Pages frontend bundle."""

from __future__ import annotations

import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"

subprocess.run(["bash", "build-cloudflare.sh"], cwd=ROOT, check=True)

required = [
    "index.html",
    "404.html",
    "bible.html",
    "blessing.html",
    "blogs.html",
    "christian-prayer-app.html",
    "bible-study.html",
    "offline-bible.html",
    "prayer-guides.html",
    "privacy.html",
    "terms.html",
    "refund.html",
    "offline.html",
    "service-worker.js",
    "manifest.webmanifest",
    "launch-config.js",
    "billing-config.js",
    "local-scripture-data.js",
    "offline-core.js",
    "local-experiences.js",
    "private-sync.js",
    "bible-manifest.js",
    "local-bible-engine.js",
    "robots.txt",
    "sitemap.xml",
    "_headers",
]
missing = [p for p in required if not (DIST / p).is_file()]
if missing:
    raise SystemExit(f"FAIL: missing Cloudflare output assets: {missing}")

forbidden_names = {
    "api",
    ".github",
    "qa",
    ".firebaserc",
    "firebase.json",
    "firestore.rules",
    "requirements.txt",
    "vercel.json",
    "published_slugs.json",
    "topics.json",
    ".DS_Store",
}
leaked = [name for name in forbidden_names if (DIST / name).exists()]
if leaked:
    raise SystemExit(f"FAIL: non-public repository files leaked into dist: {leaked}")

bad_suffixes = {".py", ".md", ".mjs"}
bad_files = [
    str(p.relative_to(DIST))
    for p in DIST.rglob("*")
    if p.is_file() and p.suffix.lower() in bad_suffixes
]
if bad_files:
    raise SystemExit(f"FAIL: development/audit files leaked into dist: {bad_files}")

index = (DIST / "index.html").read_text(encoding="utf-8")
if 'src="/__/firebase/' in index:
    raise SystemExit("FAIL: Firebase Hosting-relative SDK URLs remain in index.html")

firebase_markers = [
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js",
    "https://jesus-chat-bd89f.firebaseapp.com/__/firebase/init.js",
]
for marker in firebase_markers:
    if marker not in index:
        raise SystemExit(f"FAIL: expected host-independent Firebase marker missing: {marker}")

sw = (DIST / "service-worker.js").read_text(encoding="utf-8")
match = re.search(r"const APP_SHELL\s*=\s*\[(.*?)\];", sw, re.S)
if not match:
    raise SystemExit("FAIL: could not parse service worker APP_SHELL")

shell_paths = re.findall(r'"([^"]+)"', match.group(1))
missing_shell = []
for route in shell_paths:
    if route == "/":
        target = DIST / "index.html"
    else:
        target = DIST / route.lstrip("/")
    if not target.exists():
        missing_shell.append(route)

if missing_shell:
    raise SystemExit(f"FAIL: service-worker APP_SHELL assets missing from dist: {missing_shell}")

if not (DIST / "blogs").is_dir() or not any((DIST / "blogs").glob("*.html")):
    raise SystemExit("FAIL: devotional pages were not copied")
if not (DIST / "guides").is_dir() or not any((DIST / "guides").glob("*.html")):
    raise SystemExit("FAIL: guide pages were not copied")

files = [p for p in DIST.rglob("*") if p.is_file()]
print(f"PASS: Cloudflare Pages bundle is sanitized and complete ({len(files)} files).")
print("PASS: Firebase frontend bootstrap no longer depends on the current host.")
print(f"PASS: {len(shell_paths)} service-worker app-shell routes resolve inside dist.")
