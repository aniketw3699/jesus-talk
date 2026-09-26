# 1into1.com SEO launch and domain cutover

## Current situation

As of September 26, 2026, `1into1.com` is still publicly indexed as the former 1into1 PDF product. This repository is preparing the replacement 1into1 with Jesus product for the same domain.

Because the topic is changing from PDF utilities to Christian prayer/Bible software, treat the launch as a clean content replacement rather than trying to transfer unrelated PDF URLs into prayer URLs.

## Cutover order

1. Finish the Jesus product preview and launch checks.
2. Point both `1into1.com` and `www.1into1.com` to the new production host.
3. Choose `https://www.1into1.com/` as the canonical host and permanently redirect the apex host to it if the hosting layer supports that.
4. Verify these production URLs return HTTP 200:
   - `/`
   - `/christian-prayer-app.html`
   - `/bible.html`
   - `/bible-study.html`
   - `/offline-bible.html`
   - `/prayer-guides.html`
   - all five `/guides/` hubs
   - `/blogs.html`
   - `/privacy.html`, `/terms.html`, `/refund.html`
5. Verify `/robots.txt` and `/sitemap.xml`.
6. Deploy the updated Firestore rules before enabling encrypted Plus backup.
7. Connect the correct Lemon Squeezy Plus monthly and annual checkout variants before enabling checkout.

## Old PDF URLs

Do **not** redirect unrelated PDF tool URLs such as `/pdf-to-word`, `/compress-pdf`, or `/ocr-pdf` to the prayer homepage or to unrelated prayer pages.

If a former PDF URL has no genuinely equivalent destination in the new product, let it return a real 404 (or 410 if your hosting layer supports it). The custom 404 page in this repository gives people a useful path back to the sanctuary.

Do not block those deleted PDF URLs in `robots.txt` while expecting Google to remove them. Google needs to be able to crawl the old URLs and see that the content is gone.

## Search Console after cutover

Keep the existing domain property if already verified.

Remove the old PDF sitemap submission and submit:

`https://www.1into1.com/sitemap.xml`

Use URL Inspection first on this priority set:

1. `https://www.1into1.com/`
2. `https://www.1into1.com/christian-prayer-app.html`
3. `https://www.1into1.com/bible-study.html`
4. `https://www.1into1.com/offline-bible.html`
5. `https://www.1into1.com/prayer-guides.html`
6. the five topic hubs

Do not manually request indexing for all 82 devotionals on day one. Let the sitemap and internal-link hierarchy do most of the discovery work.

## Content strategy after launch

The scheduled AI publishing job is intentionally disabled.

Do not resume high-volume automatic article publishing. Use Search Console queries to decide what deserves a new page.

Before adding a new article, confirm that:

- the query has real impressions or a clear unmet user need;
- an existing page does not already satisfy the same intent;
- the new page has a distinct purpose, not just a keyword variation;
- Scripture claims and references have been checked;
- the page is linked from a relevant hub;
- it adds useful substance beyond the existing devotionals.

## What to monitor

During the first weeks after cutover, watch:

- indexed vs non-indexed pages;
- 404s from the retired PDF product;
- impressions for the homepage and four product/pillar pages;
- impressions for the five topic hubs;
- queries that reach positions roughly 8-30;
- pages with impressions but poor click-through;
- crawl or canonical errors;
- Core Web Vitals/mobile usability.

A major topic change on an existing domain can cause temporary ranking volatility. Do not react by mass-producing pages. Fix technical issues first, then expand only from evidence.
