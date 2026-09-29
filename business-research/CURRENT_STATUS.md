# Current Research Status

Last updated: 2026-09-29

## Current strategy

Pain-first category creation. Do not return to the old "find an expensive incumbent and make a cheaper clone" method.

## Previous invention hypothesis

**Universal Information Provenance / Desktop Data Lineage**
Verdict: **MODIFY, NOT GO**
Reason: pain and willingness to pay were validated, but too many adjacent/partial competitors exist and Tregunta is already approaching a broader integrity graph.

## New active invention hypothesis

**SaaS Escape Hatch / Data Exit Layer**

Core concept:
Continuously mirror important SaaS data into storage controlled by the customer, preserve structure/relationships in an open representation, verify that the data is actually recoverable, and maintain migration/exit recipes so the business can leave a SaaS vendor rather than merely possess a backup.

Why it survived the first screen:
- global and growing SaaS dependency;
- clear vendor-lock-in/data-portability pain;
- Gartner recognizes SaaS recovery gaps;
- adjacent backup market is multi-billion-dollar;
- migration services/products prove willingness to pay;
- local/direct-to-customer-storage architecture can keep our infrastructure cost low;
- current products fragment the problem into backup, same-app restore, extraction or one-time migration.

Why it is NOT a GO:
- Rewind, Keepit, Skyvia, CubeBackup, Synology and Import2 are strong adjacent products;
- the concept has been independently suggested online;
- connector/API maintenance could become the dominant cost;
- exact willingness to pay for continuous "exit readiness" is not yet proven;
- perfect cross-app migration is impossible for some SaaS workflows.

Next gate:
1. choose one representative SaaS pair;
2. map export fidelity;
3. prove continuous local mirror;
4. prove independent browsing/recovery;
5. prove useful migration into an alternative;
6. test buyer willingness to pay specifically for exit readiness rather than backup.

See `ACTIVE_SAAS_ESCAPE_HATCH_HYPOTHESIS.md`.

## Recently rejected category-creation ideas

- universal file dependency / safe moves;
- arbitrary-file version control;
- metadata sanitizer;
- AI-agent local firewall;
- cross-AI portable memory.
