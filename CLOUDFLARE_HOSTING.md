# Cloudflare Hosting Checkpoint

## Decision

Use **Cloudflare Workers Static Assets** as the preferred Cloudflare frontend target for **1into1 with Jesus**.

Cloudflare now recommends Workers as its primary platform for new applications. Static asset requests remain free and unlimited, and a static-only Worker does not need a Worker script.

Cloudflare Pages remains a viable fallback, but the preferred production direction is now Workers Static Assets because it gives us a cleaner future path for adding selected backend routes without moving the frontend again.

## Migration strategy

Keep the migration split into two gates:

1. **Frontend first:** static/PWA frontend -> Cloudflare Workers Static Assets.
2. **Backend later:** separately evaluate the FastAPI Ask Deeper API for Cloudflare Python Workers.

Do not combine those changes into one cutover.

## Current checkpoint architecture

```text
Cloudflare workers.dev preview
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

## Static bundle

The repository root is not a safe public asset directory. It contains backend Python, Firestore rules, GitHub workflows, audits, release documentation, Vercel configuration, and other non-web files.

Cloudflare must serve only **`dist/`**, produced by:

```bash
bash build-cloudflare.sh
```

The build copies browser-facing assets only.

## Workers configuration

`wrangler.jsonc` defines a static-only Worker:

- Worker name: `oneintoone-jesus`
- asset directory: `./dist`
- no server Worker script
- HTML handling: `auto-trailing-slash`
- not-found handling: `404-page`

This preserves clean URLs such as `/christian-prayer-app` while ensuring retired/unrelated PDF paths can still return real 404 responses.

## Firebase host-independence fix

The frontend previously loaded Firebase through relative Firebase Hosting reserved URLs:

```text
/__/firebase/...
```

That would fail when the frontend host changed.

The checkpoint now uses:

- Firebase compat SDKs from Google's `gstatic.com` CDN.
- the current Firebase project's initialization script through its absolute Firebase Hosting URL.

This keeps existing `window.firebase` code intact independently of the frontend host.

The absolute Firebase init URL is an interim compatibility bridge. Before Firebase Hosting is retired completely, move the public Firebase web configuration into a reviewed static configuration so initialization no longer depends on Firebase Hosting.

## Local/CI verification

The checkpoint must pass:

- launch audit
- SEO architecture audit
- production readiness
- release candidate audit
- 55-check product-flow QA
- JavaScript/PWA parsing
- sanitized `dist/` audit
- Wrangler deployment dry-run
- rendered Chromium QA against the exact `dist/` output

No Cloudflare deployment is needed for these checks.

## Real Cloudflare preview

Use only a temporary `workers.dev` preview first. Do **not** attach `1into1.com` or `www.1into1.com` during this checkpoint.

Preferred permanent-account setup:

- Cloudflare dashboard -> Workers & Pages
- Create application
- Import repository
- GitHub repository: `aniketw3699/jesus-talk`
- Worker name must match `oneintoone-jesus`
- branch: `feature/cloudflare-hosting-checkpoint`
- build command: `bash build-cloudflare.sh`
- deploy command: `npx wrangler deploy`

The repository already contains the Wrangler asset configuration.

## Preview pass criteria

Verify on the actual `workers.dev` origin:

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
- Google sign-in only after intentionally authorizing the exact preview hostname in Firebase
- Ask Deeper still reaches the existing Vercel API
- pricing remains prelaunch and checkout remains disabled
- encrypted backup remains disabled

## Backend migration remains separate

The current backend uses FastAPI plus Firebase Admin, Groq and HTTPX.

Cloudflare Python Workers/FastAPI support exists, but dependency/runtime compatibility must be proven before replacing the current backend.

Until that separate checkpoint passes:

```text
backendApiUrl = https://jesus-talk-dusky.vercel.app
```

No backend migration is authorized by this frontend checkpoint.

## Production cutover

Only after the actual Cloudflare preview passes should we decide to:

1. make Cloudflare Workers Static Assets the production frontend;
2. keep Vercel temporarily for Ask Deeper;
3. later migrate Ask Deeper to a Worker only if compatibility and cost tests pass.

DNS remains untouched until explicit production-cutover approval.
