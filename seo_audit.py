#!/usr/bin/env python3
from pathlib import Path
from urllib.parse import urlsplit
import html as html_lib
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
DOMAIN = "https://www.1into1.com"

CRITICAL = [
    "index.html",
    "christian-prayer-app.html",
    "bible-study.html",
    "offline-bible.html",
    "prayer-guides.html",
    "guides/anxiety-and-fear.html",
    "guides/grief-and-loss.html",
    "guides/sleep-and-rest.html",
    "guides/relationships-and-forgiveness.html",
    "guides/money-work-and-provision.html",
    "blogs.html",
    "bible.html",
]

SEO_PILLARS = [
    "christian-prayer-app.html",
    "bible-study.html",
    "offline-bible.html",
    "prayer-guides.html",
    "guides/anxiety-and-fear.html",
    "guides/grief-and-loss.html",
    "guides/sleep-and-rest.html",
    "guides/relationships-and-forgiveness.html",
    "guides/money-work-and-provision.html",
]

def read(path):
    return (ROOT / path).read_text(encoding="utf-8")

def first(pattern, text, flags=re.I | re.S):
    m = re.search(pattern, text, flags)
    return html_lib.unescape(m.group(1).strip()) if m else ""

def normalize_local_target(source: Path, href: str):
    href = html_lib.unescape(href.strip())
    if not href or href.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
        return None

    parts = urlsplit(href)
    if parts.scheme in ("http", "https"):
        if parts.netloc not in ("www.1into1.com", "1into1.com"):
            return None
        path = parts.path
    else:
        path = parts.path

    if not path or path == "/":
        return ROOT / "index.html"

    if path.startswith("/"):
        candidate = ROOT / path.lstrip("/")
    else:
        candidate = (source.parent / path).resolve()

    try:
        candidate.relative_to(ROOT.resolve())
    except ValueError:
        return None

    if candidate.is_dir():
        candidate = candidate / "index.html"
    elif not candidate.suffix:
        html_candidate = candidate.with_suffix(".html")
        if html_candidate.exists():
            candidate = html_candidate

    return candidate

def main():
    failures = []
    warnings = []

    # Core on-page metadata.
    titles = {}
    for rel in CRITICAL:
        path = ROOT / rel
        if not path.exists():
            failures.append(f"missing critical page: {rel}")
            continue
        text = path.read_text(encoding="utf-8")

        title = first(r"<title>(.*?)</title>", text)
        desc = first(r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']', text)
        canonical = first(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\'](.*?)["\']', text)
        h1s = re.findall(r"<h1\b[^>]*>(.*?)</h1>", text, re.I | re.S)

        if not title:
            failures.append(f"{rel}: missing <title>")
        else:
            if title in titles:
                failures.append(f"duplicate critical title: {rel} and {titles[title]} -> {title}")
            titles[title] = rel
            if len(title) > 72:
                warnings.append(f"{rel}: long title ({len(title)} chars)")

        if not desc:
            failures.append(f"{rel}: missing meta description")
        elif len(desc) > 180:
            warnings.append(f"{rel}: long meta description ({len(desc)} chars)")

        if not canonical.startswith(DOMAIN):
            failures.append(f"{rel}: canonical is not on {DOMAIN}: {canonical!r}")

        if rel != "index.html" and len(h1s) != 1:
            failures.append(f"{rel}: expected exactly one H1, found {len(h1s)}")
        if 'name="robots" content="noindex' in text.lower():
            failures.append(f"{rel}: critical page contains noindex")

    # Breadcrumbs on the new crawlable hierarchy.
    for rel in SEO_PILLARS:
        text = read(rel)
        if "BreadcrumbList" not in text:
            failures.append(f"{rel}: BreadcrumbList structured data missing")

    # Site structure / non-orphan checks.
    index = read("index.html")
    for href in [
        "christian-prayer-app.html",
        "bible-study.html",
        "offline-bible.html",
        "prayer-guides.html",
    ]:
        if href not in index:
            failures.append(f"index.html: does not link to {href}")

    guide_index = read("prayer-guides.html")
    for href in [
        "/guides/anxiety-and-fear.html",
        "/guides/grief-and-loss.html",
        "/guides/sleep-and-rest.html",
        "/guides/relationships-and-forgiveness.html",
        "/guides/money-work-and-provision.html",
    ]:
        if href not in guide_index:
            failures.append(f"prayer-guides.html: missing topic hub link {href}")

    blogs_index = read("blogs.html")
    if blogs_index.count("/guides/") < 5 and blogs_index.count("guides/") < 5:
        failures.append("blogs.html: topic hubs are not sufficiently linked")

    for rel in SEO_PILLARS[4:]:
        text = read(rel)
        article_links = len(re.findall(r'href=["\']/blogs/', text, re.I))
        if article_links < 4:
            failures.append(f"{rel}: only {article_links} devotional links; expected at least 4")

    # Sitemap coverage.
    sitemap_text = read("sitemap.xml")
    try:
        root = ET.fromstring(sitemap_text)
        ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        sitemap_urls = {
            (node.text or "").strip()
            for node in root.findall(".//sm:loc", ns)
        }
    except Exception as exc:
        failures.append(f"sitemap.xml: invalid XML: {exc}")
        sitemap_urls = set()

    for rel in SEO_PILLARS:
        expected = f"{DOMAIN}/{rel}"
        if expected not in sitemap_urls:
            failures.append(f"sitemap.xml: missing {expected}")

    # Existing devotional canonicals and basic metadata.
    blog_files = sorted((ROOT / "blogs").glob("*.html"))
    if len(blog_files) < 80:
        failures.append(f"expected established devotional library; found only {len(blog_files)} blog pages")

    for path in blog_files:
        text = path.read_text(encoding="utf-8")
        canonical = first(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\'](.*?)["\']', text)
        if not canonical.startswith(DOMAIN + "/blogs/"):
            failures.append(f"{path.relative_to(ROOT)}: invalid canonical {canonical!r}")
        if not first(r"<title>(.*?)</title>", text):
            failures.append(f"{path.relative_to(ROOT)}: missing title")
        if not first(r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']', text):
            failures.append(f"{path.relative_to(ROOT)}: missing description")

    # Broken local hrefs across crawlable HTML.
    for source in ROOT.rglob("*.html"):
        text = source.read_text(encoding="utf-8")
        for href in re.findall(r'href=["\']([^"\']+)["\']', text, re.I):
            target = normalize_local_target(source, href)
            if target is not None and not target.exists():
                failures.append(
                    f"{source.relative_to(ROOT)}: broken local href {href!r} -> "
                    f"{target.relative_to(ROOT) if str(target).startswith(str(ROOT)) else target}"
                )

    # Google ignores meta keywords; keep them out of critical pages.
    for rel in CRITICAL:
        text = read(rel)
        if re.search(r'<meta[^>]+name=["\']keywords["\']', text, re.I):
            warnings.append(f"{rel}: meta keywords present (Google ignores them)")

    print(f"SEO audit checked {len(CRITICAL)} critical pages and {len(blog_files)} devotional pages.")
    for warning in warnings:
        print("WARNING: " + warning)

    if failures:
        print(f"FAILED: {len(failures)} SEO issue(s)")
        for failure in failures:
            print(" - " + failure)
        return 1

    print("PASS: hierarchy, canonicals, internal links, metadata, and sitemap coverage are consistent.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
