# Phase 13 — Release Candidate QA

Release branch: `release/1into1-jesus-rc1`

Final PR: #12 — Release Candidate: 1into1 with Jesus

## Automated product-flow result

**55 / 55 checks passed**

The executable QA is `release_flow_qa.mjs` and runs inside the main Launch Hardening Audit workflow.

### Guest / local prayer routing

Passed:
- local Scripture engine loads
- signature experience engine loads
- anxiety/work prayer routes locally
- Written Prayer routes locally
- Life Guidance routes locally
- deep Scripture study routes to Ask Deeper cloud
- offline mode forces local fallback even for study
- local routing occurs before cloud fetch
- explicit offline fallback exists
- UI distinguishes Local modes from Cloud Ask Deeper
- no-account core-use promise is present
- no-install browser-core promise is present

## Safety

Passed:
- self-harm language is intercepted
- safety response prioritizes immediate human/emergency help
- Lay It Down contains a safety intercept

## Local memory / privacy

Passed:
- structured local memory updates for normal prayer
- raw personal prayer wording is not stored in structured topic memory
- Journal has no sign-in gate
- Lay It Down contains no network request
- Lay It Down clears the burden textarea
- Lay It Down does not persist confession text
- Pray for Someone contains no network request
- Journey days contain no network request
- encrypted backup remains behind the production feature gate

## Signature experiences

Passed:
- Pray for Someone generates a named local prayer
- Pray for Someone includes a Scripture anchor
- I Don't Know What to Pray produces a local prayer
- Anxiety journey has 7 local days
- journey days render locally with Scripture
- Forgiveness journey has 14 local days

## Bible

Passed:
- local Bible engine loads
- translation is World English Bible (WEB)
- manifest identifies the translation as public domain
- direct reference parsing works
- stubbed John 3:16 reference resolution works
- direct reference search works
- anxiety topic map contains expected Scripture

## Optional encrypted backup

Passed:
- encryption engine loads
- opted-in backup includes durable journal data
- opted-in backup includes local intentions
- transient feed HTML is excluded
- transient active conversation history is excluded
- Lay It Down confession fields are absent
- AES-GCM encryption is used
- PBKDF2-SHA256 key derivation is used
- encrypted payload does not expose journal plaintext
- correct passphrase restores the snapshot
- wrong passphrase is rejected

## Plus / fair use

Passed:
- frontend handles the `FAIR_USE_EXHAUSTED` response without reopening the paywall
- local prayer remains available independently of the cloud fair-use path

Separate launch/RC audits also enforce:
- Plus checkout remains OFF in the release candidate
- encrypted backup remains OFF
- checkout URLs remain blank
- environment remains `prelaunch`
- disruption positioning remains present
- fair-use protection remains present

## Other automated release gates

Current RC CI also passes:
- Launch audit
- Python compilation
- SEO architecture audit
- Production readiness audit
- Release Candidate safety audit
- JavaScript / inline-script parsing
- PWA manifest parsing
- obvious committed-token pattern scanning

## Visual/browser QA status

**COMPLETE for the local release-candidate UI and offline flows.**

A dedicated Chromium workflow now renders the exact RC locally inside GitHub Actions without deploying it.

Workflow:

`.github/workflows/visual_qa.yml`

Browser driver:

`qa/visual_qa_capture.mjs`

Latest rendered QA result:

**110 / 110 checks passed**

Viewports tested:

- iPhone-style: 390 × 844
- Android-style: 360 × 800
- large mobile: 412 × 915
- desktop: 1366 × 768

### First-time onboarding

Rendered and checked:

- step 1 burden selection
- step 2 timing selection
- step 3 need selection
- personalized result card
- entering the sanctuary

A real issue was found during this pass: the sixth burden option was present but easy to miss inside an internal scroll area on mobile.

Fixed:
- blessing/onboarding card is now short-screen scroll-safe
- all six burden choices are visibly discoverable on mobile

The latest iPhone assertion confirms:

`count: 6, visible: true`

### Sanctuary / local prayer

Rendered and checked:

- home screen
- burden-first mobile layout
- Local/Cloud labels
- local prayer response
- bottom navigation
- ritual banner
- prayer composer
- no horizontal page overflow

### Journal

Rendered and checked:

- opens without sign-in
- local entries render
- intentions render
- encrypted backup remains visibly Coming Soon
- clear-history and return controls fit on mobile

A QA issue found here was also fixed: the modal did not explicitly state that the Journal is local.

The Journal now says that the private local journal, prayer history, habit metrics, and intentions stay on the device by default.

### Lay It Down

Rendered and checked:

- private burden entry
- ephemeral privacy notice
- surrender state
- Scripture result
- reflection
- Return in Peace

### Pray for Someone

Rendered and checked:
- named local prayer output
- Scripture-grounded output
- share/listen controls

### Journeys

Rendered and checked:
- Anxiety journey
- Financial journey
- Forgiveness journey cards
- modal fit on mobile/desktop

### Pricing

Rendered and checked:
- FREE FOREVER section
- $2.99 monthly plan
- $19.99 annual plan
- fair-use wording
- checkout visibly unavailable in prelaunch
- no accidental live-payment path

### Bible

Rendered and checked:
- WEB / Public Domain selector
- book/chapter selectors
- Scripture search
- topic shortcuts
- chapter text
- Listen / Reflect / Pray controls
- mobile and desktop layout
- no horizontal document overflow

### Offline

Rendered and checked:
- Service Worker reaches ready state
- app reloads after network is disabled
- offline/local status is understandable
- no missing product-shell resources

All current Service Worker app-shell files were separately verified to exist in the RC repository.

### Browser errors/resources

Latest visual run:
- no serious browser console errors
- no missing product resources

Expected localhost-only Firebase Hosting helper 404s are excluded by URL in the QA harness; genuine product resource failures still fail the workflow.

### What still requires production-host testing

The local rendered RC cannot truthfully prove external production integrations that depend on the real domain/environment.

These remain part of production smoke / launch setup:

- Google sign-in on the final authorized production origin
- real Ask Deeper browser request from `https://www.1into1.com`
- Lemon Squeezy checkout after verified products are connected
- encrypted Firestore backup after production rules are deployed
- actual DNS/custom-domain behavior

Those are external launch checks, not unresolved local UI defects.

## Merge gate

The local release-candidate UI, offline behavior, and rendered browser flows have completed automated + visual QA.

PR #12 should still remain Draft until the external production-dependent items are deliberately configured and checked according to the cutover runbook.

Do not enable billing or encrypted backup merely to make the release appear complete.
