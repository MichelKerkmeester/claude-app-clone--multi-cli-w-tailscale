<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Research — Architecture, Conventions & Token Library

> First sub-phase of the `001-architecture-conventions-tokens` phase. This is a **lean
> spec-kit phase**: it records the research phase in the packet's phase graph. The research
> **artifacts** live in the deep-loop-aligned folder [`../research/`](../research/), not here.

## Summary

Research-first: no Phase 2 migration started until this phase's research was synthesized into a
build-ready decision. **That decision is done:** [`../research/research.md`](../research/research.md)
is the canonical, build-ready authority for all of Phase 2. It was produced by an agent-invoked
synthesis pass (DeepSeek V4 Flash MAX via the Cline CLI) with six single-lens cited iterations —
not the 20-pass `/deep:research` state machine — as recorded in
[`../research/PROVENANCE.md`](../research/PROVENANCE.md).

## Deliverable (in ../research/)

- [`../research/research.md`](../research/research.md) — the **written** build-ready decision:
  three decisions (component architecture; the designer-editability `@ds` grammar; the
  primitive→semantic→component token library), security/contrast implications, five external
  citations + repo evidence, and a closing Phase-2 migration contract.
- `../research/iterations/iteration-001..006.md` — six independent, cited single-lens passes
  (Untitled UI React; shadcn/ui; Radix Themes; Material 3; Polaris; the app's own code) plus the
  authoring template.
- [`../research/deep-research-config.json`](../research/deep-research-config.json) — the original
  20-pass run manifest, left unchanged (see `PROVENANCE.md` for why the actual run differed).
- [`../research/BRIEF.md`](../research/BRIEF.md) — the research brief and questions answered.
- [`../research/PROVENANCE.md`](../research/PROVENANCE.md) — the honest record of how the research
  was run and which deep-loop runtime artifacts are intentionally absent (not fabricated).

## Acceptance criteria — all met

- ✅ `../research/research.md` is the written decision carrying all three decisions (choice /
  evidence / rejected alternative / Phase-2 implication each) and the Phase-2 migration contract.
- ✅ `../research/iterations/` holds six real cited passes, each headed with its lens; the template
  pass remains.
- ✅ The decision stays within the frozen ink-on-parchment source values and the read-only security
  posture; the one contrast-adjacent implication (disabled/muted token pooling) is flagged and
  deferred to the Phase-2 `002-theming-light-dark` grandchild, not changed here.

## Security & Redaction

Read-only research: markdown only, no application-code / protocol / relay change.

## Dependencies & affected areas

None inbound. Outbound: `../research/research.md` is the input to Phase 2's `spec.md`,
`implementation-phases.md`, and every migration grandchild.
