#!/usr/bin/env bash
set -euo pipefail

EXPECTED_BRANCH="feature/on-device-ai-foundation"
CURRENT_BRANCH="$(git branch --show-current)"

# dist/ is generated output and may remain from an earlier preview attempt.
rm -rf dist

if [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
  echo "REFUSING: preview helper must run from $EXPECTED_BRANCH"
  echo "Current branch: $CURRENT_BRANCH"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "REFUSING: working tree is not clean. Commit or restore local changes first."
  git status --short
  exit 1
fi

echo "Running exact Cloudflare bundle and browser-facing safety audit..."
python3 cloudflare_hosting_audit.py

echo
echo "Rewriting ONLY the generated preview bundle to use its same-origin API proxy..."
python3 - <<'PY'
from pathlib import Path

path = Path("dist/launch-config.js")
source = path.read_text(encoding="utf-8")
expected = 'backendApiUrl: "https://oneintoone-jesus-api.aniketw3699.workers.dev"'
replacement = 'backendApiUrl: "/api-preview"'

if expected not in source:
    raise SystemExit("REFUSING: expected production API marker not found in generated preview bundle")

path.write_text(source.replace(expected, replacement, 1), encoding="utf-8")
print("PASS: preview bundle uses /api-preview; source launch-config.js remains unchanged.")
PY

echo
echo "Deploying a SEPARATE temporary workers.dev Worker..."
echo "This does NOT publish to 1into1.com and does NOT modify the production Worker/API."
npx --yes wrangler@4.141.0 deploy \
  --config wrangler.device-preview.jsonc

PREVIEW_URL="https://oneintoone-jesus-device-preview.aniketw3699.workers.dev"

echo
echo "Checking the LIVE preview -> cloud API path..."
proxy_ok=0
for i in {1..15}; do
  if curl -fsS "$PREVIEW_URL/api-preview/api/health" > /tmp/oneintoone-preview-health.json 2>/dev/null; then
    if grep -q '"status":"active"' /tmp/oneintoone-preview-health.json; then
      proxy_ok=1
      break
    fi
  fi
  sleep 1
done

if [ "$proxy_ok" -ne 1 ]; then
  echo "FAIL: live preview could not reach the cloud API through /api-preview."
  cat /tmp/oneintoone-preview-health.json 2>/dev/null || true
  exit 1
fi

echo "PASS: live preview can reach the cloud API through the same-origin proxy."
echo
echo "Open: $PREVIEW_URL"
echo "Production 1into1.com was not targeted by this command."
