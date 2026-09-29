# Current Research Status

Last updated: 2026-09-29

## Decision after broad search

The research strategy has changed again.

Do not keep searching indefinitely for a software category with zero competitors. The current recommendation is to enter a proven growing market with a clear wedge and validate before committing engineering effort.

## Primary recommendation

**PracticeOS / Software Practice Simulator**

Core promise:

> Record a real software workflow once, and automatically create a safe interactive practice environment where someone can learn, practise, make mistakes and be scored without touching the real production system.

Why this is now the primary recommendation:
- software training / digital adoption is a proven market;
- SAP acquired WalkMe for ~$1.5B;
- enterprise simulation platforms demonstrate high willingness to pay;
- lower-cost documentation/demo tools generally do not provide a true practice sandbox;
- the product is testable without specialist industry knowledge;
- browser-only V1 is feasible;
- simulations can largely run client-side, limiting infrastructure cost;
- the direction fits software building plus teaching/content capabilities.

The intended wedge is NOT generic e-learning authoring.

It is:
**self-serve AI capture -> realistic software practice simulation -> scoring/scenarios.**

See:
`PRIMARY_RECOMMENDATION_PRACTICEOS.md`

## Previous invention hypotheses

- SaaS Escape Hatch / Data Exit Layer — **REJECTED**
- Universal Information Provenance — **MODIFY / NOT GO**

## Next gate

Do not build a full platform.

First prove one browser workflow can be converted into a realistic interactive practice sandbox with:
- correct/incorrect action detection;
- fake data;
- hints;
- scoring;
- shareable URL.

Then validate with real software trainers / SaaS customer-education teams.

If the proof or willingness-to-pay test fails, reject and resume search.
