---
title: "Phase 1 — Architecture, Conventions & Token Library"
description: "Phase 1 — Architecture, Conventions & Token Library"
trigger_phrases:
  - "phase 1 — architecture, conventions & token library"
importance_tier: "important"
_memory:
  continuity:
    packet_pointer: "app-mobile-cli/003-pi-remote-design-system/001-architecture-conventions-tokens"
    last_updated_at: "2026-08-17T00:00:00Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Scaffolded research-first phase with brief and 20-iteration research structure"
    next_safe_action: "Prepare the research model roster, then run the 20 iterations"
    blockers: []
    key_files:
      - "spec.md"
    completion_pct: 0
    open_questions:
      - "Which executor models run the 20 research iterations (operator-defined, TBD)?"
    answered_questions: []
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: phase -->

# Phase 1 — Architecture, Conventions & Token Library

> **Research-first phase parent.** This file documents the phase's purpose and structure only.
> The research phase is recorded in [`001-research/`](001-research/); the research artifacts —
> the brief, the synthesized decision, and the iterations scaffold — live in
> [`research/`](research/). Build detail for the decision this phase produces lives in Phase 2.

## 1. METADATA

- **Phase:** `app-mobile-cli/003-pi-remote-design-system/001-architecture-conventions-tokens`
- **Kind:** research-first phase parent; first sub-phase is `001-research/`.
- **Deliverable:** one build-ready decision (`research/research.md`) governing all of Phase 2.
- **Status in this packet:** scaffolded only. The research **models are TBD** (operator-defined
  later) and the **20 iterations are not run** here.

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
  - [`research/research.md`](research/research.md) — the build-ready synthesized decision
    (a labelled **placeholder** in this packet; written after the iterations run).
  - [`research/deep-research-config.json`](research/deep-research-config.json) — the run manifest
    (20 iterations planned, executors **TBD**, status `pending`).
  - [`research/PROVENANCE.md`](research/PROVENANCE.md) — how the research will be run and why
    runtime-state artifacts are intentionally absent.
  - `research/iterations/` — the scaffold expecting ~20 cited passes; a template pass is included.

## 5. ACCEPTANCE CRITERIA (this packet)

- The research structure exists, links internally, and states plainly that the models are TBD
  and the 20 iterations are not yet run.
- `research/research.md` exists as a labelled placeholder that names the three decisions it will
  carry and marks the decision as pending.
- The decision, once synthesized, stays within the frozen source values and the read-only
  security posture; any security-crossing implication is flagged for Phase 2 to design
  security-first.
- The `001-research/` phase validates as a lean spec-kit phase.

## 6. OPEN QUESTIONS

- **Research models are TBD.** The operator defines the executor roster (and whether it runs
  through `/deep:research` or external-CLI orchestration) before the 20 iterations run.
- Whether the inline-comment grammar prefix is `@ds` (working proposal) or another marker is a
  research output; Phase 2 adopts whatever the decision fixes.

## RELATED DOCUMENTS

- [`../implementation-phases.md`](../implementation-phases.md) — the four phases.
- [`../build-strategy.md`](../build-strategy.md) — the working proposal for the editability model,
  the inline-comment grammar, and the token-library architecture this research finalizes.
- [`../002-implement-migrate-component-library/`](../002-implement-migrate-component-library/) —
  the phase that consumes this decision.
