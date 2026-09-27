# Disruption checkpoint — September 26, 2026

This checkpoint was inserted before the final release candidate to answer a business question: does 1into1 with Jesus have a sufficiently distinct reason to exist when strong Christian apps already offer substantial functionality for free?

## Finding

Continue — but do **not** position the product as merely a free Bible, an offline Bible, a private prayer app, or a cheap AI Bible chatbot. Each of those positions already has direct competition.

The sharpened product promise is:

> **Unlimited private local prayer, directly in the browser — no account or app-store install required for core use. The app tells the user when a response is local/on-device and when they deliberately choose cloud Ask Deeper.**

Plus monetizes optional cloud intelligence and future encrypted cross-device services rather than putting ordinary prayer behind a usage quota.

## Competitive reality

| Product | Free / core offer | Paid offer / current public pricing evidence | Offline / privacy observations | Why it matters |
| --- | --- | --- | --- | --- |
| YouVersion | Full Bible app is free, no ads; account is optional for many features | No consumer subscription upsell | Offline Bible and plans are supported | 1into1 cannot compete on “free Bible” |
| Hallow | 1,000+ free sessions; account required | US: $9.99/month or $69.99/year | Prayer sessions can be downloaded for offline use; account sync | 1into1 cannot compete on “offline prayer” alone |
| Bible Chat | Free app with personalized plans, verse search and limited use | US App Store lists $12.99/month and up to $59.99/year premium options | Added offline Bible reading in 2026; privacy policy covers Inputs/Outputs and other personal data | 1into1 cannot compete on “AI Bible chat” alone |
| Pray.com | Free daily prayer, radio, podcasts and prayer requests | Premium annual subscription / trial model | Account required; free service is content/community heavy | 1into1 is more utility/private-prayer oriented |
| Glorify | Free Bible, journal, daily devotional and limited library | Glorify Plus monthly/annual in-app purchases | App Store disclosure includes user content, search history, identifiers, usage data | Privacy differentiation can matter, but is not enough by itself |
| Abide | Free audio Bible, daily devotions and Bible plans | $9.99/month; $39.99/year after trial | Primarily meditation/sleep/content library | 1into1 is not trying to outspend premium audio/content libraries |
| PrayForge | Free local prayer journal, KJV Bible, daily prayer, privacy features | Website currently shows $4.99/month, $14.99/year and $24.99 lifetime; terms also describe paid unlimited features | No account, local-only, fully offline | Closest privacy/offline prayer competitor; proves privacy + offline alone is not a moat |
| Bible: Chat, Widgets, Audio | Full offline Bible, search, notes, audio, widgets and more are free | AI Discuss is paid through subscription/credits; US App Store shows premium options including $19.99/year and $0.99 AI-credit packs | Free Bible is offline; AI questions are sent to a third-party AI service | Closest monetization architecture to 1into1; proves “free Bible + paid AI” is not a moat |

## Sources checked

- Hallow free version: https://help.hallow.com/en/articles/3279868-how-do-i-access-the-free-version-of-the-app
- Hallow pricing: https://help.hallow.com/en/articles/2880438-how-much-does-the-subscription-cost
- Hallow offline: https://help.hallow.com/en/articles/3276892-how-to-download-prayers-and-manage-downloaded-sessions
- YouVersion account/free model: https://help.youversion.com/l/en/article/qmdpqhm2rv-profile
- YouVersion Bible app: https://www.youversion.com/bible-app
- Bible Chat App Store: https://apps.apple.com/us/app/bible-chat-daily-devotional/id6448849666
- Bible Chat privacy: https://thebiblechat.com/privacy-policy/
- Pray.com free tier: https://www.pray.com/help/signing-up-to-pray-com-for-free
- Glorify free tier: https://glorify-app.zendesk.com/hc/en-gb/articles/360020071400-Do-I-have-to-pay-to-use-the-app
- Abide pricing: https://abide.com/
- PrayForge product/pricing: https://prayforge.app/
- PrayForge terms: https://prayforge.app/terms/
- Bible: Chat, Widgets, Audio: https://apps.apple.com/us/app/bible-chat-widgets-audio/id387597113

## What 1into1 must own

### 1. Unlimited local prayer is free

Ordinary local prayer must not be artificially limited just to force conversion.

The user should be able to pray repeatedly without an account, subscription, or per-prayer server cost.

### 2. No install is required for core use

1into1 is browser-first/PWA. A person can arrive from Google, open the sanctuary and begin immediately. Installation is optional.

This removes app-store friction and directly connects SEO discovery to product use.

### 3. Make the local/cloud boundary visible

The user should never need to guess whether private text is staying on-device or going to cloud AI.

Local modes should be labeled Local. Ask Deeper should be labeled Cloud.

### 4. Pay for intelligence, not prayer

Free:
- unlimited local prayer
- Bible + local search
- Lay It Down
- journeys
- journal
- Pray for Someone
- local Scripture guidance

Paid / limited cloud:
- Ask Deeper
- optional encrypted cross-device backup
- future cloud features

### 5. Protect cloud economics

“Unlimited Ask Deeper” must not mean unlimited automated API consumption.

Plus is for normal personal use and is protected by a configurable server-side fair-use ceiling. Local prayer remains unlimited even if the cloud ceiling is reached.

### 6. Keep the signature experiences

The most defensible features are not generic Bible reading:
- What are you carrying today?
- I Don't Know What to Pray
- Lay It Down with ephemeral text
- situation-aware local prayer
- Pray for Someone + shareable blessing
- guided journeys
- explicit non-impersonation of Jesus

### 7. Web SEO is part of the distribution moat

Most direct competitors require an app-store install for their full experience. 1into1 can connect a Google query directly to an interactive prayer experience in the browser.

The SEO pillar/hub architecture therefore remains strategically important, not just a traffic add-on.

## What we must NOT claim as the moat

Do not position 1into1 primarily as:
- “the free Bible app”
- “the offline Bible”
- “the private prayer app”
- “the cheapest Christian app”
- “an AI Jesus chatbot”
- “free Bible + paid AI”

Competitors already occupy each of those positions.

## Pricing decision

Keep the planned launch target for now:
- $2.99/month
- $19.99/year

Reason:
- monthly is materially below the large premium prayer apps;
- annual price is still low relative to Hallow, Bible Chat and Abide;
- PrayForge is currently cheaper annually, and another Bible app lists $19.99/year, so price alone is explicitly **not** the moat;
- 1into1 Plus includes paid cloud reasoning, which has real marginal cost.

Do not lower pricing again before obtaining actual conversion and usage-cost data.

## Release gate

Phase 12 should proceed only while these conditions remain true:

1. Core local prayer has no prayer-use quota.
2. Core use does not require an account.
3. Core use does not require app-store installation.
4. Local prayer is visibly distinguished from cloud Ask Deeper.
5. Lay It Down text remains ephemeral.
6. Plus cloud use has a fair-use/anti-abuse ceiling.
7. No UI claims that the AI is Jesus.
8. The free/paid boundary is “prayer is free; optional cloud intelligence is paid.”

If future work violates these conditions, stop and reassess the product positioning before release.
