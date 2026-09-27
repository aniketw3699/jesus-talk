# Disruption checkpoint — September 26, 2026

This checkpoint was inserted before the final release candidate to answer a business question: does 1into1 with Jesus have a sufficiently distinct reason to exist when strong Christian apps already offer substantial functionality for free?

## September 27 routing amendment

The launch QA exposed a regression: the local-first router was treating arbitrary chat as a prayer template. The product architecture is now corrected so users can type naturally without first selecting a category. The router decides among local prayer/support, standard Christian conversation AI, and Ask Deeper. Out-of-scope general-world questions are not answered as a general-purpose assistant; they are redirected to a Christian/Scripture-centered angle.

## Finding

Continue — but do **not** position the product as merely a free Bible, an offline Bible, a private prayer app, or a cheap AI Bible chatbot. Each of those positions already has direct competition.

The sharpened product promise is:

> **One Christian conversation box with invisible intent routing: unlimited private local prayer in the browser, no account or app-store install required for core use, standard Jesus/Scripture-scoped conversation when open-ended intelligence is needed, and Ask Deeper reserved for higher-depth theology and Bible study.**

Plus monetizes higher-depth Ask Deeper intelligence and future encrypted cross-device services rather than putting ordinary prayer behind a usage quota. Standard conversation must remain strictly inside the Christian/Scripture scope and should use the lightweight cloud model when a local response is not appropriate.

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

### 3. Make routing automatic, but keep the local/cloud boundary transparent

The user should not have to understand the routing architecture before asking a question. The default Talk experience should classify the turn automatically.

Explicit prayer and supported burden/guidance flows stay local. Prepared Scripture and a growing set of verified Christian/Bible knowledge answers are served from the user's device before any AI request. Open-ended Christian conversation can use the standard cloud model when device-side answers are not sufficient. Ask Deeper uses the higher-depth cloud path.

Privacy copy and response-state UI must make this boundary understandable without forcing the user to choose a backend manually.

### 4. Pay for deeper intelligence, not prayer

Free/core:
- unlimited local prayer
- automatic invisible routing with device-first answers
- standard Jesus/Scripture-scoped conversation when cloud intelligence is needed
- Bible + local search
- Lay It Down
- journeys
- journal
- Pray for Someone
- local Scripture guidance

Paid / limited higher-depth cloud:
- Ask Deeper
- optional encrypted cross-device backup
- future premium cloud features

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
4. Automatic Talk routing preserves local prayer while clearly distinguishing standard cloud conversation from higher-depth Ask Deeper when relevant.
5. Lay It Down text remains ephemeral.
6. Plus cloud use has a fair-use/anti-abuse ceiling.
7. No UI claims that the AI is Jesus.
8. The free/paid boundary is “prayer is free; standard scoped conversation is available; higher-depth Ask Deeper is the metered/premium intelligence layer.”

If future work violates these conditions, stop and reassess the product positioning before release.
