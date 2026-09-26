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

**PENDING — not falsely marked complete.**

The current Vercel status is blocked by the account-level build-rate limit rather than a source-code failure. Because there is no usable rendered RC preview yet, the following still require actual-browser inspection before merge:

### Mobile visual
- narrow iPhone-sized viewport
- Android-sized viewport
- short-height screen
- safe-area / bottom navigation
- modal scrolling
- textarea/input focus behavior
- pinch zoom
- reduced-motion behavior

### First-time guest journey
- landing screen
- burden chips
- local prayer response
- Bible open/search
- Journal
- Lay It Down animation
- I Don't Know What to Pray
- Pray for Someone
- journey start/progress
- first Ask Deeper cloud allowance

### Signed-in free journey
- Google sign-in
- 5 Ask Deeper/day display and behavior
- local prayer remains unlimited
- exhausted free cloud allowance opens Plus UI only for Ask Deeper

### Offline browser journey
- load once online
- switch network off
- local prayer
- prepared Bible
- journal
- journeys
- Lay It Down
- Ask Deeper degrades locally/gracefully

### Visual trust / copy
- Local/Cloud mode labels fit on mobile
- pricing modal clearly says checkout is not live
- encrypted backup button clearly says Coming Soon
- no legacy product-brand / PDF / Firebase-domain copy appears visually

## Merge gate

PR #12 should remain Draft until rendered browser QA is completed on a usable release preview.

Do not merge solely because automated CI is green.
