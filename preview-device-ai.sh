#!/usr/bin/env bash
set -euo pipefail

EXPECTED_BRANCH="feature/on-device-ai-foundation"
CURRENT_BRANCH="$(git branch --show-current)"
RUNTIME_CONFIG=".wrangler.device-preview.runtime.jsonc"
API_OUTPUT="/tmp/oneintoone-api-version.ndjson"

rm -rf dist
rm -f "$RUNTIME_CONFIG" "$API_OUTPUT"
trap 'rm -f "$RUNTIME_CONFIG" "$API_OUTPUT"' EXIT

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
    --keep-vars \
    --message "1into1 universal conversation preview $(git rev-parse --short HEAD)"
)

API_VERSION_ID="$(python3 - "$API_OUTPUT" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
if not path.is_file():
    raise SystemExit("")

version_id = ""
for raw in path.read_text(encoding="utf-8").splitlines():
    raw = raw.strip()
    if not raw:
        continue
    try:
        item = json.loads(raw)
    except Exception:
        continue
    if item.get("type") != "version-upload":
        continue

    candidate = (
        item.get("version_id")
        or item.get("versionId")
        or (item.get("version") or {}).get("id")
        or (item.get("result") or {}).get("version_id")
        or (item.get("result") or {}).get("id")
    )
    if candidate:
        version_id = str(candidate)

print(version_id)
PY
)"

if [ -z "$API_VERSION_ID" ]; then
  echo "FAIL: could not determine the uploaded API version ID."
  exit 1
fi

echo "PASS: uploaded candidate API version $API_VERSION_ID without deploying it."

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

python3 - "$API_VERSION_ID" <<'PY'
import json
import sys
from pathlib import Path

version_id = sys.argv[1]
source = Path("wrangler.device-preview.jsonc")
target = Path(".wrangler.device-preview.runtime.jsonc")
config = json.loads(source.read_text(encoding="utf-8"))
config["vars"] = {"API_VERSION_ID": version_id}
target.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
PY

echo
echo "Deploying the SEPARATE temporary workers.dev frontend..."
echo "It will call ONLY API candidate version $API_VERSION_ID through a Service Binding."
echo "This does NOT deploy the API candidate and does NOT modify 1into1.com."
npx --yes wrangler@4.141.0 deploy \
  --config "$RUNTIME_CONFIG"

PREVIEW_URL="https://oneintoone-jesus-device-preview.aniketw3699.workers.dev"

echo
echo "Checking the LIVE preview -> candidate API path..."
proxy_ok=0
for i in {1..15}; do
  if curl -fsS "$PREVIEW_URL/api-preview/api/health" > /tmp/oneintoone-preview-health.json 2>/dev/null; then
    if grep -q '"status":"active"' /tmp/oneintoone-preview-health.json && \
       grep -q '"version":"5.2.0"' /tmp/oneintoone-preview-health.json; then
      proxy_ok=1
      break
    fi
  fi
  sleep 1
done

if [ "$proxy_ok" -ne 1 ]; then
  echo "FAIL: live preview is not reaching the new universal API version."
  cat /tmp/oneintoone-preview-health.json 2>/dev/null || true
  exit 1
fi

echo "PASS: live preview is using universal API candidate version 5.2.0."
echo
echo "Open: $PREVIEW_URL"
echo "Production 1into1.com and deployed API traffic were not targeted by this command."
