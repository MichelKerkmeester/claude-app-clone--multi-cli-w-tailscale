---
title: "Phase 1 — Architecture, Conventions & Token Library"
description: "Phase 1 — Architecture, Conventions & Token Library"
trigger_phrases:
  - "phase 1 — architecture, conventions & token library"
importance_tier: "important"
_memory:
  continuity:
    packet_pointer: "app-mobile-cli/003-design-system-library/001-architecture-conventions-tokens"
    last_updated_at: "2026-08-18T00:00:00Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Research synthesized into the build-ready decision (research/research.md) with six single-lens cited iterations; decision verified against the real code and frozen contracts"
    next_safe_action: "Begin Phase 2 migration (002-implement-migrate-component-library) following the Phase-2 migration contract in research/research.md"
    blockers: []
    key_files:
      - "spec.md"
      - "research/research.md"
      - "001-research/implementation-summary.md"
    completion_pct: 100
    open_questions: []
    answered_questions:
      - "Which executor models run the research iterations? — DeepSeek V4 Flash MAX via the Cline CLI ran an agent-invoked synthesis pass (six single-lens iterations), not the 20-pass /deep:research state machine; recorded in research/PROVENANCE.md."
      - "Is the inline-comment grammar prefix @ds? — Yes; the decision fixes @ds surface/slot/state/variant/edit/guardrail/theme/catalog."
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: phase -->

# Phase 1 — Architecture, Conventions & Token Library

> **Research-first phase parent — research DECIDED.** This file documents the phase's purpose and
> structure only. The research phase is recorded in [`001-research/`](001-research/); the research
> artifacts — the brief, the synthesized build-ready decision, and the cited iterations — live in
> [`research/`](research/). The decision is final for this phase; build detail lives in Phase 2.

## 1. METADATA

- **Phase:** `app-mobile-cli/003-design-system-library/001-architecture-conventions-tokens`
- **Kind:** research-first phase parent; first sub-phase is `001-research/`.
- **Deliverable:** one build-ready decision (`research/research.md`) governing all of Phase 2.
- **Status in this packet:** DECIDED. `research/research.md` is the synthesized build-ready
  decision (three areas: component architecture, the designer-editability `@ds` grammar, and the
  primitive→semantic→component token library), backed by six single-lens cited iterations. It was
  produced by an agent-invoked synthesis pass (DeepSeek V4 Flash MAX via the Cline CLI), **not**
  the planned 20-pass `/deep:research` state machine — recorded honestly in `research/PROVENANCE.md`.
  It changes no source value and weakens no security boundary.

## 2. PROBLEM & PURPOSE

### Problem Statement

Phase 2 cannot migrate ~55 components safely until three things are decided: how a component is
authored (architecture and file conventions), exactly how a low-code designer edits styling,
markup, layout, and per-state presentation without reaching logic or security (the
designer-editability model), and how the token library is layered (primitive → semantic →
component) with the frozen palette as source. Deciding these mid-migration would force rework.

### Purpose

Investigate, across 20 independent research iterations, and synthesize one build-ready decision
covering the component architecture, the designer-editability model (including the inline-comment
grammar, variant/slot conventions, "edit here" seams, and guardrails), and the token-library
architecture with light/dark theming and WCAG AA contrast guaranteed at the token layer.

## 3. SCOPE

### In Scope

- The component architecture and file/setup conventions for `apps/pi-remote-web/`.
- The designer-editability model: token-first CSS; the inline-comment grammar labelling each
  editable region and per-state block; variant/slot conventions; explicit "edit here" seams;
  and guardrails keeping logic/security out of a designer's edit path.
- The token-library architecture: primitive, semantic, and component token layers; the frozen
  palette as the primitive source; the light/dark theming mechanism; contrast guarantees.
- Reference investigation of the Untitled UI React library and comparable designer-editable
  systems (shadcn/ui, Radix Themes, Material 3 tokens, Polaris token tiers) as direction.

### Out of Scope (frozen)

- Changing any source value (the ink-on-parchment palette, Inter + Source Serif 4) or the
  read-only-by-default security posture. This phase decides how to formalize them, not to
  change them.
- Implementing the architecture or migrating any component — that is Phase 2.

## 4. PHASE STRUCTURE

- [`001-research/`](001-research/) — lean spec-kit phase recording the research phase in the
  packet graph; points at `../research/`.
- [`research/`](research/) — the deep-research artifacts, laid out to match the `/deep:research`
  conventions:
  - [`research/BRIEF.md`](research/BRIEF.md) — the research brief and the questions to answer.
  - [`research/research.md`](research/research.md) — the **written** build-ready synthesized
    decision (three decisions + security/contrast implications + citations + the Phase-2 migration
    contract). Replaces the former placeholder.
  - [`research/deep-research-config.json`](research/deep-research-config.json) — the original run
    manifest (20 iterations planned). Left unchanged; `PROVENANCE.md` records that this run was an
    agent-invoked synthesis pass rather than the 20-pass state machine the manifest scoped.
  - [`research/PROVENANCE.md`](research/PROVENANCE.md) — the honest record of how the research was
    actually run and which deep-loop runtime artifacts are intentionally absent (not fabricated).
  - `research/iterations/` — six single-lens cited passes (`iteration-001`…`006`) plus the
    authoring template.

## 5. ACCEPTANCE CRITERIA (this packet) — all met

- ✅ The research structure exists and links internally; `PROVENANCE.md` states plainly how the
  research was actually run (agent-invoked synthesis, six iterations — not the planned 20-pass
  state machine) and which runtime artifacts are intentionally absent.
- ✅ `research/research.md` is the written, build-ready decision covering the three areas
  (component architecture; the designer-editability `@ds` grammar; the primitive→semantic→component
  token library), each with choice / evidence / rejected alternative / Phase-2 implication, and a
  closing Phase-2 migration contract.
- ✅ The decision stays within the frozen source values and the read-only security posture: it
  changes no palette value and weakens no security boundary. The one contrast-adjacent implication
  (the `--ink-disabled` / `--ink-muted` / `--placeholder` token pooling) is **flagged and deferred**
  to the Phase-2 `002-theming-light-dark` grandchild — not changed here.
- ✅ The `001-research/` phase validates as a lean spec-kit phase (`validate.sh --strict` exit 0).

## 6. OPEN QUESTIONS — resolved

- **Research models — resolved.** DeepSeek V4 Flash MAX via the Cline CLI ran the synthesis
  (external-CLI orchestration, agent-invoked), recorded in `research/PROVENANCE.md`.
- **Grammar prefix — resolved.** The decision fixes `@ds` as the prefix
  (`@ds surface/slot/state/variant/edit/guardrail/theme/catalog`); Phase 2 adopts it.

## RELATED DOCUMENTS

- [`../implementation-phases.md`](../implementation-phases.md) — the four phases.
- [`../build-strategy.md`](../build-strategy.md) — the working proposal for the editability model,
  the inline-comment grammar, and the token-library architecture this research finalizes.
- [`../002-implement-migrate-component-library/`](../002-implement-migrate-component-library/) —
  the phase that consumes this decision.
