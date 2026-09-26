# 1into1 Plus billing activation

The new product pricing is intentionally **not connected to the legacy checkout links**.

## Target pricing

- Plus Monthly: **$2.99/month**
- Plus Annual: **$19.99/year**

## Why the checkout URLs are blank

The old checkout links currently point to:
- a 7-day one-time pass,
- the old $7.99 monthly subscription,
- the old 6-month subscription.

Displaying the new price while sending customers to those old checkouts could charge the wrong amount.

## Lemon Squeezy setup required before launch

1. In Lemon Squeezy, create or configure a recurring **monthly** subscription variant at $2.99/month.
2. Create a recurring **annual** subscription variant at $19.99/year.
3. Copy each reusable `/checkout/buy/...` URL.
4. Put those URLs into `billing-config.js`:
   - `plusMonthly.checkoutUrl`
   - `plusAnnual.checkoutUrl`
5. Preview checkout and verify the amount and billing interval before merging the pricing branch.

The existing webhook already activates `isSubscribed` for recurring subscription events when `checkout[custom][user_id]` is passed, so the entitlement flow does not need a new webhook format for these two variants.

Do not commit Lemon Squeezy API secrets to the repository.
