#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

OUT_DIR="dist"
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

# Publish only browser assets. Never point Cloudflare Pages directly at the
# repository root: this repo also contains backend, CI, audit and deployment
# files that are not part of the public website.
shopt -s nullglob
for file in *.html *.js *.css *.png *.svg *.mp3; do
  cp "$file" "$OUT_DIR/"
done

for file in manifest.webmanifest robots.txt sitemap.xml; do
  if [[ -f "$file" ]]; then
    cp "$file" "$OUT_DIR/"
  fi
done

for dir in blogs guides; do
  if [[ -d "$dir" ]]; then
    cp -R "$dir" "$OUT_DIR/"
  fi
done

# Cloudflare Pages consumes this file from the build output. Keep the service
# worker and launch/billing gates fresh after each deploy.
cat > "$OUT_DIR/_headers" <<'EOF'
/service-worker.js
  Cache-Control: no-cache

/launch-config.js
  Cache-Control: no-store

/billing-config.js
  Cache-Control: no-store
EOF

echo "Cloudflare static bundle ready: $OUT_DIR"
find "$OUT_DIR" -type f | sort
