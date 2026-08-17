---
title: "Phase 2 — Implement Architecture & Migrate Component Library"
description: "Phase 2 — Implement Architecture & Migrate Component Library"
trigger_phrases:
  - "phase 2 — implement architecture & migrate component library"
importance_tier: "important"
_memory:
  continuity:
    packet_pointer: "app-mobile-cli/003-pi-remote-design-system/002-implement-migrate-component-library"
    last_updated_at: "2026-08-17T00:00:00Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Scaffolded migration phase with fifteen component-group grandchildren"
    next_safe_action: "Build the tokens-foundation grandchild after Phase 1 decision lands"
    blockers:
      - "Phase 1 synthesized decision is a placeholder until its 20 iterations run"
    key_files:
      - "spec.md"
    completion_pct: 0
    open_questions: []
    answered_questions: []
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: phase -->

# Phase 2 — Implement Architecture & Migrate Component Library

> **Phase parent.** This file documents the phase's purpose and its grandchild map only.
> Per-surface migration detail lives in each grandchild's `spec.md` / `plan.md` / `tasks.md` /
> `checklist.md`; the flow and gates live in [`implementation-phases.md`](implementation-phases.md).

## 1. METADATA

- **Phase:** `app-mobile-cli/003-pi-remote-design-system/002-implement-migrate-component-library`
- **Kind:** phase parent; 15 migration grandchildren, foundation first, catalog/docs last.
- **Prerequisite:** Phase 1's synthesized decision
  (`../001-architecture-conventions-tokens/research/research.md`) — a placeholder until its 20
  iterations run.

## 2. PROBLEM & PURPOSE

### Problem Statement

The app's ~55 components are hand-styled in one global stylesheet with no shared component API,
no formal token layering, no per-state seams a designer can edit, and no catalog. They must move
onto the Phase-1 architecture and token library without changing any source value or security
boundary, and without a big-bang rewrite that risks the shipped surface.

### Purpose

Implement the architecture and the token library, then migrate every component group onto it —
one grandchild per group — applying the inline-comment grammar and per-state seams, updating each
surface's states, and registering it in a live catalog. Prefer more, smaller grandchildren over
fewer large ones so each is independently shippable and verifiable.

## 3. SCOPE

### In Scope

- Stand up the primitive → semantic → component token library and the light/dark theming
  mechanism (grandchildren `001`–`002`).
- Migrate the shared control and overlay primitives (`003`, `012`).
- Migrate every user-facing surface onto tokens plus the inline-comment conventions, updating
  each surface's per-state presentation (`004`–`011`, `013`).
- Unify the shared status vocabulary and motion (`014`) and stand up the live catalog + designer
  docs (`015`).

### Out of Scope (frozen)

- Any change to the ink-on-parchment source values or Inter + Source Serif 4.
- Any change to the read-only-by-default security posture, redaction, ticketing, or plan-mode
  enforcement. Migration restyles; it never touches the mutation/security path.
- Deciding the architecture or the grammar — that is Phase 1's output, consumed here.

## 4. GRANDCHILD DOCUMENTATION MAP

Build order: foundation first, then per-surface, then states/motion, then catalog/docs last.

| Grandchild | Surface / group | Migrates onto the system |
|---|---|---|
| `001-tokens-foundation` | Token library | primitive → semantic → component layers; frozen palette as source |
| `002-theming-light-dark` | Theming | light/dark mechanism + AA contrast at the token layer |
| `003-primitives-react-aria` | Control primitives | Button/Toggle/Disclosure/Field/status/glyphs |
| `004-app-shell-header-nav` | App shell | shell, headers, home/review/inbox, session layout |
| `005-transcript-message-blocks` | Transcript | list + per-kind blocks, streaming, live edge |
| `006-composer-input` | Composer | input tray + viewport-anchored keyboard behaviour |
| `007-model-effort-sheet` | Model + effort | model picker + effort/reasoning sheet content |
| `008-slash-command-autocomplete` | Slash | autocomplete + palette surfaces |
| `009-plan-mode-controls` | Plan mode | controls, cards, review/leave sheets, announcers |
| `010-rich-content-cards` | Rich content | command/output, code, and text-artifact cards |
| `011-artifacts-viewer-previews` | Artifacts | viewer shell + Text/Code/Diff/Markdown/Image/Pdf |
| `012-overlays-sheets-modals` | Overlays | shared overlay/sheet/modal primitive + choreography |
| `013-question-todos-surfaces` | Plan/todo | plan todo checklist + ask-question/todos scaffold |
| `014-states-interaction-motion` | States + motion | status vocabulary, motion, focus, reduced-motion |
| `015-catalog-docs-preview` | Catalog | live preview/catalog + designer documentation |

### Dependency and transition rules

- `001`–`002` (tokens + theming) ship before any per-surface grandchild.
- `003` (control primitives) and `012` (overlay primitives) ship before the surfaces that
  consume them (`004`–`011`, `013`).
- `015` (catalog) ships last and registers every migrated surface, variant, and state.
- `010-rich-content-cards` absorbs the rich-content cards that currently live on a parallel
  build branch and are absent from `main`; it depends on that branch merging first.

## 5. OPEN QUESTIONS

- The precise token-layer boundaries and the finalized inline-comment grammar are Phase 1
  outputs; every grandchild consumes whatever Phase 1 fixes.
- Whether `013`'s ask-question/todos surfaces are built here or deferred depends on the sibling
  `002` packet's F9/F10 features, which are still pending.

## RELATED DOCUMENTS

- [`implementation-phases.md`](implementation-phases.md) — the migration flow and per-grandchild gate.
- [`../001-architecture-conventions-tokens/`](../001-architecture-conventions-tokens/) — the
  decision this phase consumes.
- [`../build-strategy.md`](../build-strategy.md) — the editability model, grammar, and token
  architecture every grandchild applies.
