# Active Invention Hypothesis — SaaS Escape Hatch / Data Exit Layer

Last updated: 2026-09-29

Status: **ACTIVE KILL-TEST — CATEGORY-CREATION SYNTHESIS**

## Core problem

Businesses increasingly run on SaaS products but often discover at exit time that:
- native exports are incomplete or hard to restore;
- relationships, workflow logic, metadata, attachments and permissions do not survive cleanly;
- migration can cost substantial money and time;
- backups often restore only into the same SaaS product;
- the business may possess a backup without being genuinely portable.

## Category concept

Working names:
- **SaaS Escape Hatch**
- **Data Exit Layer**
- **Portable SaaS Mirror**
- **Exit-Ready Computing**

Core promise:

> Keep a continuously updated, structured copy of the important data in your SaaS tools in storage you control, and continuously prove that you can leave those tools.

This is NOT merely:
- cloud backup;
- a CSV exporter;
- a one-time migration service;
- another integration/ETL platform.

## Proposed product

A local-first desktop/agent product that connects directly to SaaS APIs and writes into customer-owned storage:
- local disk / SQLite / Postgres;
- NAS;
- customer S3-compatible bucket;
- optional Google Drive / OneDrive.

For each supported SaaS tool, preserve:
- raw source data;
- normalized open representation;
- attachments;
- relationships;
- IDs and timestamps;
- selected configuration/workflow metadata where APIs permit it.

The system then provides:
1. continuous sync;
2. open/human-readable mirror;
3. portability completeness score;
4. restore test;
5. migration recipe to one or more alternative tools;
6. exit-readiness report.

## Why the pain is validated

- Gartner published a 2026 Market Guide for SaaS Backup saying organizations are identifying SaaS data-protection and recoverability gaps because of limited native recovery.
- Notion's official documentation says full exports can take up to 30 hours and cannot instantly recreate a workspace by re-uploading the export.
- User reports describe expensive Salesforce migrations and fear of losing access to years of data.
- The SaaS backup market is already multi-billion-dollar, proving willingness to pay for protection.
- Import2 charges from $499 for full one-time app migration and $5,000+ for professional migration service.

## Existing adjacent products

### Backup
- Rewind
- Keepit
- Skyvia
- CubeBackup
- Synology Active Backup

### Migration
- Import2
- Evicta (Zendesk-specific extraction / data liberation)

### Important competitor limitations discovered

- Skyvia can restore a backup to another account of the **same cloud application**, not a different application.
- Rewind exports are integration-dependent; for some products local JSON export is an additional service, and Rewind explicitly says it does not provide re-import services for those JSON files.
- CubeBackup is inexpensive and self-hosted but primarily focused on Google Workspace.
- Keepit is broad backup/recovery but stores in Keepit's backup platform rather than acting as a universal open portability/migration layer.
- Import2 handles cross-app migration but is a migration event, not continuous exit readiness.

## Critical warning

This broad idea has already been independently articulated online. A 2026 Reddit poster described continuously syncing SaaS data to their own Postgres and adding migration logic, and an opportunity site describes a "continuous export" SaaS escape hatch.

Therefore this is NOT a claim that nobody has ever thought of the concept.

The opportunity, if any, is to become the first obvious product/category that combines:
**continuous mirror + customer-owned storage + open normalized structure + verified restore + cross-app migration readiness.**

## Business model hypothesis

Free:
- one SaaS connector;
- manual snapshot;
- portability audit;
- open export.

Paid individual / micro-business:
- continuous sync;
- several connectors;
- version history;
- restore verification.

SMB:
- multiple workspaces;
- scheduled exit drills;
- migration recipes;
- audit/reporting;
- policy and alerts.

Pricing is NOT yet validated. Adjacent markets prove people pay, but the exact willingness to pay for "exit readiness" requires testing.

## Architecture fit

Strong for the user's constraints:
- data can flow directly from SaaS API to customer's device/storage;
- no mandatory central storage;
- no mandatory GPU/AI;
- local SQLite/Postgres can hold normalized graph;
- our servers can be limited to licensing, updates and optional metadata.

## Moat hypothesis

The moat would be:
- high-quality connector library;
- normalized cross-SaaS schema;
- relationship/configuration preservation;
- restore verification;
- mapping/migration recipes;
- accumulated edge cases and compatibility tests.

NOT merely low price or a prettier backup UI.

## Main risks / kill conditions

Reject if:
- existing backup vendors can already provide practical cross-app exit/restore at comparable breadth;
- APIs omit too much workflow/configuration data to make the mirror operationally useful;
- connector maintenance becomes too expensive;
- users will pay for backup but not for portability/exit readiness;
- the product becomes a generic ETL/backup tool;
- migration fidelity between materially different SaaS products is too poor;
- OAuth/app verification or API restrictions prevent scalable direct-to-local operation.

## Smallest proof

Do NOT build dozens of connectors first.

A meaningful proof would be:
1. connect one mainstream SaaS workspace;
2. continuously mirror it locally in open format;
3. preserve relationships and attachments;
4. delete/lose access to the source copy in a controlled test;
5. browse the mirror independently;
6. restore into a clean account or migrate into a chosen alternative;
7. produce a report showing exactly what did and did not survive.

If this cannot be done with high fidelity for a representative tool, reject before expanding.
