# Active Invention Hypothesis — Universal Information Provenance

Last updated: 2026-09-29

Status: **ACTIVE KILL-TEST — CATEGORY CREATION**

## Category concept

Working name for the category:

**Universal Information Provenance / Desktop Data Lineage / Evidence-Native Computing**

Core promise:

> Every important fact, number, quote, image, or AI-assisted claim you use on your computer should retain a traceable path back to where it came from.

This is NOT intended to be:
- a generic clipboard manager;
- a note-taking app;
- a document manager;
- an audit-only Excel plug-in;
- another AI chatbot.

It would be a local layer beneath ordinary work applications.

## Example workflow

A user copies a number from a PDF or webpage and pastes it into Excel.

The system records:
- source document or URL;
- page/location;
- selected original context;
- timestamp;
- source application;
- optional screenshot/snippet fingerprint.

If the value is then used in a formula, copied into PowerPoint, pasted into Word, or included in an AI-generated report, the information path remains traceable.

The user can click the final number or statement and walk backward through:
PowerPoint -> Excel -> source PDF/web page.

## Why this is interesting

Narrow/vertical products prove people value traceability:
- audit and finance tools link Excel values to evidence;
- data-lineage platforms trace business numbers to source systems;
- small clipboard tools preserve where copied content came from;
- browsers are actively standardising/exposing clipboard provenance metadata.

But the current market is fragmented by application and profession.

The category hypothesis is to make provenance a general desktop capability for knowledge work.

## Potential users

- finance and accounting;
- audit;
- consulting;
- analysts;
- researchers;
- journalists;
- legal/compliance;
- students/academics;
- sales/marketing research;
- anyone producing reports, spreadsheets, decks, or AI-assisted work from multiple sources.

## Local-first architecture hypothesis

Possible MVP:
- desktop background app;
- browser extension;
- local SQLite provenance store;
- clipboard/source hooks;
- Word/Excel/PowerPoint or browser-document add-ins;
- no file uploads by default;
- no central server required except licensing/update infrastructure.

Optional AI should be local or bring-your-own-provider so recurring compute cost is not mandatory.

## Moat hypothesis

The moat would NOT be clipboard history.

Potential moat:
- cross-application lineage model;
- destination anchoring and propagation;
- robust source fingerprints;
- transformation/derivation tracking;
- compatibility across Office, browsers, PDFs and common apps;
- evidence-bundle export format;
- accumulated edge-case compatibility;
- potentially an open provenance interchange format.

## Kill conditions

Reject if:
- a mature product already provides cross-app source-to-destination lineage;
- destination anchoring is technically unreliable across major apps;
- OS permissions make the product unusable;
- users like source-aware clipboard history but will not pay for persistent lineage;
- Office/browser APIs prevent reliable propagation;
- privacy/security risk is too high;
- the product collapses into a free clipboard manager feature;
- freedom-to-operate review identifies blocking IP issues.

## Next validation

1. Deep competitor map.
2. Interview/review mining across finance, consulting, research and audit.
3. Technical proof of source capture + destination anchoring.
4. Test willingness to pay with a clickable prototype.
5. Determine whether the wedge should begin with Excel/Word/PowerPoint or browser + Excel.


---

# Kill-Test Result — 2026-09-29

## Verdict: MODIFY, NOT GO

The broad "Universal Information Provenance" idea survives on pain, willingness to pay, market breadth and local-first feasibility, but FAILS the strict "we are the only player" requirement.

### Why the pain is validated

- DataSnipper has 600,000+ users in 175+ countries and built a large business around traceable audit/finance evidence.
- Macabacus has roughly 80,000 finance professionals / 3,000 organizations and charges $360/year for the professional tier that includes Excel-to-PowerPoint/Word linking.
- think-cell reports 1.3M+ professionals in 35,000 organizations and charges from roughly $28.60/month; Excel-to-PowerPoint linking is a major workflow.
- User discussions repeatedly show painful PDF->Excel extraction and manual Excel->PowerPoint update workflows.

### Closest competitors / substitutes found

1. Tregunta Lines — publicly describes an "Integrity" product that maps relationships among Excel, Word, PowerPoint, assumptions, KPIs, evidence and decisions into a traceable integrity graph. This is the closest conceptual competitor found.
2. DataSnipper — source documents -> Excel evidence/snips/traceability for audit and finance.
3. Evida AI — source-linked audit findings and lineage in Excel.
4. SnipCell / CellSource — PDF -> Excel source references.
5. Macabacus / UpSlide / think-cell — Excel -> PowerPoint/Word linked data and refresh.
6. Sourced / Clipora / MultiCopy — web clipboard history with source URL.
7. Trace-Pilot — Chrome/Google Sheets/PDF -> VS Code provenance markers.
8. GoFigr — code/data -> figures, with provenance surviving into PowerPoint/email.

Conclusion: all pieces of the proposed chain already exist in vertical or app-specific products, and at least one recent company is publicly pitching a broader Office/evidence integrity graph.

### Remaining potentially distinct wedge

**Automatic Source-to-Output Lineage for ordinary Office work**

Browser / PDF -> Excel / Word -> PowerPoint, with provenance captured automatically during normal copy/paste and preserved through transformations.

This is narrower than "universal provenance" but broader than:
- clipboard history;
- PDF-to-Excel evidence;
- Excel-to-PowerPoint links;
- data-lineage platforms.

No dominant product was found that clearly owns this exact user experience across ordinary browser/PDF + Excel + Word + PowerPoint work.

### Technical feasibility

Evidence supports a plausible MVP:
- Chromium already attaches source URL metadata to clipboard HTML on Windows.
- Firefox 158 added source-origin provenance metadata and standardization work is active at W3C.
- Office Add-ins run across Windows, Mac and web.
- Excel supports workbook Custom XML parts and notes/comments.
- Word content controls have hidden tags and XML mapping.
- PowerPoint shapes expose tags and custom XML parts.

Therefore source capture + destination metadata is technically plausible.

However, exact lineage preservation across arbitrary edits, cell moves, formula transformations, pasted text fragments and applications is NOT proven. This is the largest technical risk.

### Economics

A browser extension + local desktop companion + Office add-ins can keep most data local. A paid version could plausibly avoid per-user GPU/storage costs. Static hosting/licensing/update infrastructure would remain minor compared with cloud-AI products.

### Main risks

- closest conceptual competitor already exists;
- Microsoft/Office vendors could copy key features;
- browser provenance metadata is inconsistent across browsers and privacy modes;
- reliable Excel cell anchoring and lineage propagation may be brittle;
- capturing clipboard history creates privacy/security risk;
- the product can collapse into "clipboard manager with source URL" if destination lineage is weak;
- willingness to pay for universal provenance itself is not yet directly proven — only for strong adjacent/vertical solutions.

### Decision

**Do not build the full product.**

The idea is only worth continuing if a tiny proof can demonstrate:
1. copy from browser/PDF;
2. paste into Excel;
3. preserve exact source;
4. derive a formula;
5. paste derived result into PowerPoint;
6. click the PowerPoint number and walk backward to Excel and the original source.

If that six-step chain cannot be made reliable, REJECT.

If it works, validate willingness to pay before expanding.
