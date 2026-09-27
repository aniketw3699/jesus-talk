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
echo "Deploying a SEPARATE temporary workers.dev Worker..."
echo "This does NOT publish to 1into1.com and does NOT modify the production Worker."
npx --yes wrangler@4.141.0 deploy \
  --config wrangler.device-preview.jsonc

echo
echo "Open the workers.dev URL printed above."
echo "Production 1into1.com was not targeted by this command."
