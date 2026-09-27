#!/usr/bin/env bash
set -euo pipefail

EXPECTED_BRANCH="feature/on-device-ai-foundation"
CURRENT_BRANCH="$(git branch --show-current)"

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
echo "Creating isolated Cloudflare Worker Preview (production traffic is not changed)..."
npx --yes wrangler@4.141.0 preview \
  --name on-device-ai \
  --message "1into1 on-device AI preview"

echo
echo "Preview created. Open the workers.dev Preview URL printed above."
