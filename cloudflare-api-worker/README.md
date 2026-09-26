# Phase 14B — Cloudflare API Worker

This Worker replaces only the cloud-dependent backend path. The local-first prayer, Bible, journal, journeys, Lay It Down and offline/PWA core remain in the browser.

Architecture:
- Firebase Auth remains the client identity provider.
- Firebase ID tokens are verified against Google's Firebase signing keys.
- Firestore remains the single source of truth for free credits, Plus entitlement and fair-use counters.
- Firestore server access uses Google OAuth + Firestore REST, not firebase-admin.
- Groq is called with asynchronous fetch(), not the synchronous Python SDK.
- Lemon Squeezy webhook updates the same Firestore entitlement fields.
- No D1 database is introduced.

Required Cloudflare secrets (never commit them):
- FIREBASE_SERVICE_ACCOUNT
- AI_API_KEY (or GROQ_API_KEY)
- LEMON_WEBHOOK_SECRET
- GUEST_HASH_SALT

Initial launch routes:
- GET /health and /api/health
- GET /readiness and /api/readiness
- POST /chat and /api/chat
- GET /entitlement and /api/entitlement
- Lemon webhook aliases used by the existing backend

The current frontend uses the non-streaming /chat route, so streaming is not part of the first cutover gate.
