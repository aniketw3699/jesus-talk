# Production cutover runbook

This runbook prepares the switch from the former 1into1 PDF site to **1into1 with Jesus**. It does not authorize an automatic domain change.

## Current safe state

`launch-config.js` intentionally starts in:

- `environment: "prelaunch"`
- `plusCheckoutEnabled: false`
- `encryptedBackupEnabled: false`

That means the core free product can be previewed without accidentally exposing an unconfigured checkout or backup feature.

## External items that must be completed before full monetized launch

### 1. Lemon Squeezy

Create and verify:

- Plus Monthly — $2.99/month
- Plus Annual — $19.99/year

Put only the verified reusable checkout URLs in `billing-config.js`.

Then change `plusCheckoutEnabled` to `true`. Do not enable the flag first.

### 2. Firestore encrypted-backup rules

Deploy the repository's current `firestore.rules` to project `jesus-chat-bd89f`.

A manual GitHub Actions workflow is provided for this. It requires an explicit confirmation input and the existing `FIREBASE_SERVICE_ACCOUNT` repository secret.

After deploying the rules, test backup + restore with a Plus test account. Only then change `encryptedBackupEnabled` to `true`.

### 3. Backend environment

Production backend should have, as applicable:

- Firebase service-account credentials
- Lemon Squeezy webhook secret
- configured Ask Deeper AI provider credentials/model
- optional developer/test email only as a server environment variable, never in frontend source

Verify `https://jesus-talk-dusky.vercel.app/api/readiness`.

The response reports configuration booleans only; it does not return secrets.

## Domain cutover

Do this only after the release candidate is merged and production hosting is ready.

1. Attach `www.1into1.com` to the new frontend host.
2. Attach the apex `1into1.com` and permanently redirect it to `https://www.1into1.com/` when your domain/hosting setup allows it.
3. Do not change canonical URLs away from `www`; the repository already uses `https://www.1into1.com`.
4. Do not redirect unrelated former PDF tool URLs to prayer pages.
5. Former PDF URLs with no equivalent replacement should return real HTTP 404 or 410.

Representative retired URLs are tracked in `retired_pdf_paths.txt`.

## Immediate production smoke

After DNS/host cutover, run the manual **Production Smoke Test** workflow or locally:

`python production_smoke.py`

For the full monetized launch after billing and encrypted backup are enabled:

`python production_smoke.py --strict`

Do not submit Search Console indexing requests until the non-strict smoke test passes.

## Search Console order

After the new host is serving successfully:

1. Keep/use the existing verified domain property for `1into1.com`.
2. Remove the old PDF sitemap submission if it points to an obsolete sitemap.
3. Submit `https://www.1into1.com/sitemap.xml`.
4. Inspect/request indexing in this order:
   1. homepage
   2. Christian Prayer App pillar
   3. Bible Study pillar
   4. Offline Bible pillar
   5. Prayer Guides pillar
   6. five topic hubs
5. Let the sitemap/internal-link structure discover the devotional archive; do not manually request all 82 pages at once.
6. Monitor retired PDF URLs until Google recrawls them as 404/410.

## Rollback conditions

Do not continue the launch if any of these occur:

- homepage or key pillar pages return non-200 responses;
- canonical host is not `www.1into1.com`;
- API health/database/cloud provider is broken;
- browser CORS from `www.1into1.com` fails;
- retired PDF routes redirect into unrelated prayer content;
- wrong checkout amount/billing interval is shown;
- encrypted backup is enabled before Firestore rules are deployed and tested.

If the frontend cutover itself is faulty, point the domain back to the previous known-good host while fixing the release candidate. Do not try to compensate for a broken cutover by mass-changing canonicals or sitemap URLs.
