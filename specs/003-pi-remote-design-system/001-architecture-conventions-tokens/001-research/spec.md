<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Research — Architecture, Conventions & Token Library

> First sub-phase of the `001-architecture-conventions-tokens` phase. This is a **lean
> spec-kit phase**: it records the research phase in the packet's phase graph. The research
> **artifacts** live in the deep-loop-aligned folder [`../research/`](../research/), not here.

## Summary

Research-first: no Phase 2 migration starts until this phase's research is synthesized into a
build-ready decision. The synthesized decision is [`../research/research.md`](../research/research.md).
The research **models are TBD** and the **20 iterations are not run** in this packet.

## Deliverable (in ../research/)

- [`../research/research.md`](../research/research.md) — the build-ready synthesized decision
  (canonical; a labelled placeholder until the iterations run).
- `../research/iterations/iteration-NNN.md` — the ~20 independent, cited passes (scaffolded; a
  template pass is included).
- [`../research/deep-research-config.json`](../research/deep-research-config.json) — the run
  manifest (20 planned, executors TBD, status `pending`).
- [`../research/BRIEF.md`](../research/BRIEF.md) — the research brief and questions to answer.
- [`../research/PROVENANCE.md`](../research/PROVENANCE.md) — how the research will be run and
  which canonical artifacts are intentionally absent until it runs.

## Acceptance criteria

- `../research/research.md` exists and names the three decisions it will carry, marked pending.
- `../research/iterations/` holds the scaffold for every planned pass; each real pass will be
  headed with its source executor once the operator sets the roster.
- The decision, once synthesized, stays within the frozen ink-on-parchment source values and the
  read-only-by-default security posture; any security-crossing implication is flagged for the
  Phase 2 grandchildren to design security-first.

## Security & Redaction

Read-only research: markdown only, no application-code / protocol / relay change.

## Dependencies & affected areas

None inbound. Outbound: `../research/research.md` is the input to Phase 2's `spec.md`,
`implementation-phases.md`, and every migration grandchild.
