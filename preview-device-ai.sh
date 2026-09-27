#!/usr/bin/env bash
set -euo pipefail

EXPECTED_BRANCH="feature/on-device-ai-foundation"
CURRENT_BRANCH="$(git branch --show-current)"
API_OUTPUT="/tmp/oneintoone-api-version.ndjson"
PREVIEW_URL="https://oneintoone-jesus-device-preview.aniketw3699.workers.dev"
API_ALIAS="universal-preview"

rm -rf dist
rm -f "$API_OUTPUT" /tmp/oneintoone-preview-health.json /tmp/oneintoone-preview-headers.txt
trap 'rm -f "$API_OUTPUT" /tmp/oneintoone-preview-health.json /tmp/oneintoone-preview-headers.txt' EXIT

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
echo "Uploading the NEW API code as a NON-DEPLOYED Worker version..."
echo "Production API traffic stays on its current deployed version."
(
  cd cloudflare-api-worker
  WRANGLER_OUTPUT_FILE_PATH="$API_OUTPUT" \
  npx --yes wrangler@4.141.0 versions upload \
    --config wrangler.jsonc \
    --preview-alias "$API_ALIAS" \
    --keep-vars \
    --message "1into1 universal conversation preview $(git rev-parse --short HEAD)"
)

readarray -t API_INFO < <(python3 - "$API_OUTPUT" "$API_ALIAS" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
alias = sys.argv[2]
if not path.is_file():
    raise SystemExit(1)

version_id = ""
version_url = ""

def walk(value):
    if isinstance(value, dict):
        for item in value.values():
            yield from walk(item)
    elif isinstance(value, list):
        for item in value:
            yield from walk(item)
    elif isinstance(value, str):
        yield value

for raw in path.read_text(encoding="utf-8").splitlines():
    raw = raw.strip()
    if not raw:
        continue
    try:
        item = json.loads(raw)
    except Exception:
        continue

    if item.get("type") == "version-upload":
        candidate = (
            item.get("version_id")
            or item.get("versionId")
            or (item.get("version") or {}).get("id")
            or (item.get("result") or {}).get("version_id")
            or (item.get("result") or {}).get("id")
        )
        if candidate:
            version_id = str(candidate)

    for candidate in walk(item):
        if (
            candidate.startswith("https://")
            and ".workers.dev" in candidate
            and alias in candidate
            and "oneintoone-jesus-api" in candidate
        ):
            version_url = candidate.rstrip("/")

print(version_id)
print(version_url)
PY
)

API_VERSION_ID="\${API_INFO[0]:-}"
API_VERSION_URL="\${API_INFO[1]:-}"

if [ -z "$API_VERSION_ID" ]; then
  echo "FAIL: could not determine the uploaded API version ID."
  exit 1
fi

if [ -z "$API_VERSION_URL" ]; then
  API_VERSION_URL="https://\${API_ALIAS}-oneintoone-jesus-api.aniketw3699.workers.dev"
fi

echo "PASS: uploaded candidate API version $API_VERSION_ID without deploying it."
echo "Candidate API Version URL: $API_VERSION_URL"

echo
echo "Checking candidate API directly before publishing the frontend preview..."
candidate_ok=0
for i in {1..15}; do
  curl -sS -D /tmp/oneintoone-preview-headers.txt \
    -H "Origin: $PREVIEW_URL" \
    "$API_VERSION_URL/api/health" \
    -o /tmp/oneintoone-preview-health.json 2>/dev/null || true

  if grep -q '"status":"active"' /tmp/oneintoone-preview-health.json 2>/dev/null && \
     grep -q '"version":"5.3.0"' /tmp/oneintoone-preview-health.json 2>/dev/null && \
     grep -qi "^access-control-allow-origin: $PREVIEW_URL" /tmp/oneintoone-preview-headers.txt 2>/dev/null; then
    candidate_ok=1
    break
  fi
  sleep 1
done

if [ "$candidate_ok" -ne 1 ]; then
  echo "FAIL: candidate API Version URL is not ready with universal version 5.3.0 + preview CORS."
  echo "Health body:"
  cat /tmp/oneintoone-preview-health.json 2>/dev/null || true
  echo
  echo "Response headers:"
  cat /tmp/oneintoone-preview-headers.txt 2>/dev/null || true
  exit 1
fi

echo "PASS: non-deployed candidate API Version URL is live as version 5.3.0 with preview CORS."

echo
echo "Checking chat preflight against the candidate API..."
preflight_headers="$(mktemp)"
preflight_code="$(
  curl -sS -o /dev/null -D "$preflight_headers" -w '%{http_code}' \
    -X OPTIONS \
    -H "Origin: $PREVIEW_URL" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: content-type,authorization" \
    "$API_VERSION_URL/chat" || true
)"

if [ "$preflight_code" != "204" ] || \
   ! grep -qi "^access-control-allow-origin: $PREVIEW_URL" "$preflight_headers"; then
  echo "FAIL: candidate API chat CORS preflight failed."
  cat "$preflight_headers" 2>/dev/null || true
  rm -f "$preflight_headers"
  exit 1
fi
rm -f "$preflight_headers"
echo "PASS: candidate API accepts the isolated preview origin for chat."

echo
echo "Rewriting ONLY the generated preview bundle to call the candidate Version URL..."
python3 - "$API_VERSION_URL" <<'PY'
from pathlib import Path
import sys

api_url = sys.argv[1]
path = Path("dist/launch-config.js")
source = path.read_text(encoding="utf-8")
expected = 'backendApiUrl: "https://oneintoone-jesus-api.aniketw3699.workers.dev"'
replacement = f'backendApiUrl: "{api_url}"'

if expected not in source:
    raise SystemExit("REFUSING: expected production API marker not found in generated preview bundle")

path.write_text(source.replace(expected, replacement, 1), encoding="utf-8")
print("PASS: generated preview bundle points directly to the non-deployed candidate API.")
PY

echo
echo "Deploying the SEPARATE temporary workers.dev frontend..."
echo "This does NOT deploy the API candidate and does NOT modify 1into1.com."
npx --yes wrangler@4.141.0 deploy \
  --config wrangler.device-preview.jsonc

echo
echo "Checking the live frontend bundle points to the candidate API..."
served_launch="$(curl -fsS "$PREVIEW_URL/launch-config.js" || true)"
if ! printf '%s' "$served_launch" | grep -Fq "$API_VERSION_URL"; then
  echo "FAIL: live preview frontend is not pointing to the candidate API Version URL."
  exit 1
fi

echo "PASS: live preview frontend points to the non-deployed universal API candidate."
echo "PASS: live preview is using universal API candidate version 5.3.0."
echo
echo "Open: $PREVIEW_URL"
echo "Production 1into1.com and deployed API traffic were not targeted by this command."
