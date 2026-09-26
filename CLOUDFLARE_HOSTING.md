# Cloudflare Hosting Checkpoint

## Purpose

Validate Cloudflare Pages as the zero-cost static frontend host for **1into1 with Jesus** without changing production DNS, billing, Firestore rules, or the current Ask Deeper backend.

This checkpoint is intentionally split into two migrations:

1. **Frontend first:** static/PWA frontend -> Cloudflare Pages.
2. **Backend later:** evaluate the FastAPI Ask Deeper API for Cloudflare Workers separately.

Do not combine those two changes into one cutover.

## Current checkpoint architecture

```text
Cloudflare Pages preview (*.pages.dev)
        |
        +-- local prayer / Bible / journal / journeys / PWA -> browser/device
        |
        +-- Firebase Auth + Firestore -> existing Firebase project
        |
        +-- Ask Deeper -> existing Vercel FastAPI backend
                         https://jesus-talk-dusky.vercel.app
```

The production launch config remains unchanged:

- environment: `prelaunch`
- Plus checkout: OFF
- encrypted backup: OFF
- canonical host: `https://www.1into1.com`
- backend: existing Vercel API

## Why a sanitized build directory is required

The repository root is not a safe static publish directory. It contains backend Python, Firestore rules, GitHub workflows, audits, release documentation, Vercel configuration, and other non-web files.

Cloudflare must deploy **`dist/`**, produced by:

```bash
bash build-cloudflare.sh
```

The build copies only browser-facing assets and generates Cloudflare `_headers` rules.

Never configure Pages to publish the repository root.

## Firebase host-independence fix

The frontend previously loaded Firebase through relative Firebase Hosting reserved URLs:

```text
/__/firebase/...
```

That makes the same HTML fail when hosted on Cloudflare.

The checkpoint changes those to:

- Firebase compat SDKs from Google's `gstatic.com` CDN.
- the current Firebase project's initialization script through its absolute Firebase Hosting URL.

This keeps existing `window.firebase` code intact and works independently of the frontend host.

The absolute Firebase init URL is an interim compatibility bridge. Before retiring Firebase Hosting completely, capture the public Firebase web configuration into a reviewed static config file so initialization no longer depends on Firebase Hosting at all.

## Cloudflare Pages test settings

During the checkpoint, use only the generated `*.pages.dev` domain.

Recommended setup:

- Git repository: `aniketw3699/jesus-talk`
- Checkpoint branch: `feature/cloudflare-hosting-checkpoint`
- Framework preset: None
- Build command: `bash build-cloudflare.sh`
- Build output directory: `dist`
- Root directory: repository root

Do **not** attach `1into1.com` or `www.1into1.com` during this checkpoint.

## Pass criteria

A Cloudflare preview is acceptable only after verifying:

- homepage renders
- onboarding renders
- local prayer works
- Bible works
- journal works locally
- Lay It Down remains ephemeral/local
- journeys work
- Pray for Someone works
- service worker installs
- offline reload works
- no horizontal mobile overflow
- Firebase SDK initializes
- Google sign-in is tested only after the preview host is intentionally authorized in Firebase
- Ask Deeper still reaches the existing Vercel API
- pricing remains prelaunch and checkout remains disabled
- encrypted backup remains disabled

## Google sign-in note

Firebase Authentication restricts authorized domains. A new `*.pages.dev` preview may require an explicit temporary authorized-domain entry before Google sign-in can be tested.

Do not broaden authorized domains unnecessarily and remove temporary preview domains after the checkpoint if they are no longer needed.

## Backend migration is a separate gate

The current backend uses FastAPI plus dependencies including Firebase Admin, Groq and HTTPX. Cloudflare supports Python Workers/FastAPI, but dependency/runtime compatibility must be proven before replacing the Vercel API.

Until that test passes, keep:

```text
backendApiUrl = https://jesus-talk-dusky.vercel.app
```

No API migration is authorized by this checkpoint.

## Production cutover

Only after the Cloudflare preview passes should the release plan decide whether to:

1. make Cloudflare the production frontend;
2. keep Vercel temporarily for Ask Deeper;
3. later migrate Ask Deeper to a Worker if the compatibility/cost test passes.

DNS remains untouched until explicit production-cutover approval.
