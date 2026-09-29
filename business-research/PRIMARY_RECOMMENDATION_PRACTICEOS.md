# Primary Recommendation — PracticeOS / Software Practice Simulator

Last updated: 2026-09-29

Status: **PRIMARY RECOMMENDATION — VALIDATE BEFORE BUILDING**

## Strategic decision

Stop requiring a zero-competitor category.

The recommended business is a self-serve software-practice and assessment platform:

> Record a real software workflow once. Automatically turn it into a safe interactive practice environment where learners must actually perform the task, receive hints, make mistakes, and get scored.

Working names:
- PracticeOS
- WorkGym
- SkillLab
- Software Flight Simulator

## Why this direction

It combines:
- a proven enterprise market (digital adoption / software training);
- strong willingness to pay;
- a global audience;
- a product that can be tested without specialist industry knowledge;
- low infrastructure potential because simulations can be largely static/client-side;
- a product-led free tier;
- the user's software-building and teaching/content strengths.

## Market evidence

- SAP acquired digital-adoption leader WalkMe for approximately $1.5B in 2024.
- A 2026 market estimate values digital-adoption platforms at roughly $1.59B in 2026 and projects $4.37B by 2034.
- Assima and uPerform sell high-value enterprise software-training/simulation products.
- A UK public-sector listing prices an Assima licence at £4,456/month.
- iorad prices a single creator at $200/month and supports interactive tutorials / practice / quiz modes.
- New AI-era workforce research highlights "experience starvation": workers lose hands-on learning as AI removes junior repetitive work, and large employers are turning to simulations and boot camps.

## Product definition

This is NOT:
- another LMS;
- another course authoring tool;
- another Scribe/Tango screenshot guide;
- another Supademo marketing demo;
- another WalkMe overlay.

The core object is a **practice sandbox**.

### Author workflow

1. Start browser recorder.
2. Perform a real task in Salesforce, HubSpot, Jira, Shopify, Google Workspace, etc.
3. Product captures screens/DOM/interactions.
4. AI converts it into a safe simulated workflow.
5. Author edits expected steps, allowed alternatives, fake data, mistakes and hints.
6. Publish as a practice link, assessment, embed or SCORM package.

### Learner modes

- **Learn** — guided walkthrough.
- **Practice** — hints available, mistakes allowed.
- **Test** — no hints; score accuracy/time/path.
- **Scenario** — altered data or edge case.

## Initial wedge

Start **browser-only**.

Do not attempt arbitrary Windows/macOS desktop applications in V1.

Target web applications where the recorder can reliably capture DOM/state:
- CRM;
- help desk;
- project management;
- e-commerce admin;
- HR systems;
- finance web apps;
- common SaaS products.

## Customer segments

1. SaaS customer-education teams.
2. Corporate L&D / software rollout teams.
3. Training companies and independent software instructors.
4. BPO / support operations onboarding large groups.
5. Later: hiring / software-skill assessment.

## Competitive gap

- Scribe/Tango: strong documentation/guides.
- Supademo/Arcade/Storylane: strong demos.
- WalkMe/Whatfix: in-production guidance.
- iorad: closest self-serve interactive training competitor but expensive.
- Assima: high-fidelity enterprise simulation, high cost/complexity.

Opportunity:
**self-serve, AI-generated practice simulation at SMB/creator pricing**, with real scoring and scenario variation.

## Moat to pursue

Not prettier tutorials.

Potential moat:
- capture-to-simulation compiler;
- resilient DOM/state cloning;
- automatic update/repair when source UI changes;
- synthetic safe data;
- alternative-path recognition;
- scoring engine;
- scenario generation;
- cross-app workflow support later.

## Architecture

A low-cost architecture is plausible:
- browser extension for capture;
- static simulation assets;
- client-side playback;
- lightweight database for projects/analytics;
- AI mostly at authoring time, not every learner click.

This avoids a large per-user inference bill.

## Commercial hypothesis

Illustrative only; requires validation:
- Free: limited simulations / learner runs.
- Creator: around $29/month.
- Team: around $99/month.
- Business: around $299/month.
- Enterprise: custom/self-hosted/SSO.

Do not finalize pricing until interviews and competitor testing.

## Kill conditions

Reject or modify if:
- we cannot create a realistic practice simulation from a normal browser workflow with minimal author cleanup;
- iorad already satisfies the target segment at acceptable price;
- customers only want guides/demos, not practice;
- source UI changes make maintenance too brittle;
- security teams reject capture tooling;
- we cannot show a measurable outcome such as faster onboarding, fewer support tickets, or higher task accuracy.

## First proof

Before building a full platform:

Create ONE browser workflow such as:
- create a CRM lead;
- move it through stages;
- update required fields;
- generate a follow-up task.

Turn it into a simulated environment where a learner has to perform the workflow without touching the real CRM.

The proof passes only if:
- capture takes minutes;
- simulation feels like the real app;
- learner can make a mistake;
- system can identify correct/incorrect actions;
- author can change sample data;
- result can be shared by URL.

If that works, test with software trainers / SaaS customer-education teams before expanding.
