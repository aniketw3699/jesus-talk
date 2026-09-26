# 1into1 Plus billing activation

The new product pricing is intentionally **not connected to the legacy checkout links**.

## Target pricing

- Plus Monthly: **$2.99/month**
- Plus Annual: **$19.99/year**

## Why checkout remains disabled

The historical checkout links belonged to older products/prices. They must not be reused for the new Plus labels.

The current backend also ignores subscription entitlement events unless the subscription's Lemon Squeezy variant ID is explicitly approved in `LEMON_PLUS_VARIANT_IDS`.

## Lemon Squeezy setup required before launch

1. Create a recurring **monthly** Plus variant at $2.99/month.
2. Create a recurring **annual** Plus variant at $19.99/year.
3. Copy each reusable `/checkout/buy/...` URL into `billing-config.js`:
   - `plusMonthly.checkoutUrl`
   - `plusAnnual.checkoutUrl`
4. Put both Lemon Squeezy variant IDs in the backend environment:
   ```env
   LEMON_PLUS_VARIANT_IDS=MONTHLY_VARIANT_ID,ANNUAL_VARIANT_ID
   ```
5. Set `LEMON_WEBHOOK_SECRET` in the backend environment.
6. Keep `ALLOW_TEST_BILLING=false` in production.
7. In Lemon Squeezy, send at least `subscription_created` and `subscription_updated` events to the signed webhook endpoint.
8. Preview each checkout and verify price, currency, billing interval and signed-in email before enabling the UI.

## Entitlement behavior

The webhook:
- verifies Lemon Squeezy's HMAC signature;
- accepts only Subscription-object events;
- rejects variant IDs not in `LEMON_PLUS_VARIANT_IDS`;
- rejects test-mode subscriptions unless explicitly enabled;
- requires the target 1into1 account to exist;
- checks the account email against the subscription email when both are present;
- stores subscription ID, variant ID, status and `ends_at` metadata;
- never grants Plus from one-time order events.

Access is retained for active/trial/cancelled grace-period and recoverable billing states. Expired or unpaid subscriptions do not receive Plus.

## Removed legacy behavior

The old 7-day one-time pass entitlement has been removed from the production backend.

## Secrets

Never commit Lemon Squeezy secrets or API keys to the repository.
