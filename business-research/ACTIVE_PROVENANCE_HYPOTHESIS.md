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
