---
title: "Feature Specification: Pi Remote — Designer-Editable Coded Design System"
description: "Pi Remote — Designer-Editable Coded Design System"
trigger_phrases:
  - "feature specification: pi remote — designer-editable coded design system"
importance_tier: "important"
_memory:
  continuity:
    packet_pointer: "app-mobile-cli/003-pi-remote-design-system"
    last_updated_at: "2026-08-17T00:00:00Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Scaffolded design-system packet with four phase children and token research brief"
    next_safe_action: "Prepare Phase 1 token-architecture research models, then build Phase 2 foundation"
    blockers: []
    key_files:
      - "spec.md"
    completion_pct: 0
    open_questions:
      - "Which research models run Phase 1's 20 iterations (operator-defined, TBD)?"
    answered_questions: []
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: phase -->

# Feature Specification: Pi Remote — Designer-Editable Coded Design System

> **Phase-parent packet.** This file documents root purpose and the phase map only.
> The four-phase build detail lives in [`implementation-phases.md`](implementation-phases.md);
> the how — the designer-editability model, delegation, and per-phase gate discipline —
> lives in [`build-strategy.md`](build-strategy.md); orientation is in [`README.md`](README.md).
> Each phase child owns its own build detail. Keep this file to root purpose only.

## 1. METADATA

- **Packet:** `app-mobile-cli/003-pi-remote-design-system`
- **Parent product:** Pi Remote — installable iPhone PWA that remote-controls the `pi` coding agent over a private Tailscale tailnet (secure foundation in sibling packet `001-pi-remote-mobile-agent-like-cc`; mobile UI/UX feature parity in sibling packet `002-pi-remote-mobile-ui-ux-features`).
- **Kind:** phase parent (four phases; Phase 1 and Phase 2 are themselves phase parents).
- **Structure:** research-first — Phase 1 synthesizes the architecture, conventions, and token-library decision before any component is migrated in Phase 2.
- **Target bar:** the Untitled UI React library and comparable designer-editable coded design systems, taken one step further so a designer with low-level code knowledge can safely adjust styling, markup, layout, and per-state presentation.

## 2. PROBLEM & PURPOSE

### Problem Statement

The Pi Remote web app already reaches Claude/Kimi-app visual quality, but its UI is authored as one 5,000-line global stylesheet plus ~55 hand-styled React components with no shared component API, no formal token layering, and no catalog. A designer cannot safely change how a surface or one of its states looks without reading application logic and risking the frozen security posture. There is no single, documented, token-driven system a non-engineer can edit.

### Purpose

Bring every page and component of the Mobile CLI app onto a well-built coded design system — a dedicated token library (primitive → semantic → component layers), a documented component API (variants, states, slots), theming, accessibility and contrast guarantees, a live preview/catalog surface, and migration guidance — authored so a designer with low-level code knowledge can adjust styling, markup, layout, and per-state presentation through clear token seams and an inline-comment grammar, without touching logic or weakening security.

## 3. SCOPE

### In Scope

- Four phases: (1) architecture, conventions, and the token library, research-first; (2) implement the architecture, migrate every component group onto it, and stand up the library; (3) refine and audit for real designer-editability; (4) plan a dedicated `sk-code` mode for future Mobile-CLI app work.
- A dedicated token library formalizing the existing frozen palette as the source: primitive tokens, semantic tokens, and per-component tokens, with light and dark theming.
- A designer-editability model: token-first CSS, a documented inline-comment grammar that labels each editable region and state, variant/slot conventions, "edit here" seams, and guardrails that keep logic and security out of a designer's edit path.
- A live preview/catalog surface and a designer guide.
- UI/architecture work only, within the fixed design system and the read-only-by-default security posture.

### Out of Scope (frozen)

- **Design system source values:** ink-on-parchment. Light — bone `#f8f8f6`, raised `#ffffff`, carbon `#24221f`, muted `#6c6a65`, clay `#d97757`, AA text accent `#8a452f`, AA UI accent `#b85f42`, soft selection `#f3e4de`. Dark — page `#24221f`, raised `#2d2a26`, text `#f8f8f6`, muted `#9f998f`, clay `#d97757`, accent text `#f0b19a`, soft selection `#3a2720`. Inter + Source Serif 4; light + dark; WCAG AA. These are the SOURCE tokens the new library formalizes, not values to change.
- **Security posture:** read-only default; one-use ticketed + revision-checked mutations that fail closed; redaction everywhere; host/extension-enforced plan mode; content-free push; operator-only `--full-access` (the phone can never enable it). Not weakened by this packet.
- **Stack:** React 19 + Vite + Tailwind 4 + react-aria-components; strict TypeScript; npm workspaces. The system builds on this stack; it does not replace it.

## 4. PHASE DOCUMENTATION MAP

Phase numbers follow **build order**. Phase 1 is research-first; its first sub-phase is `001-research/`. Phase 2 is a phase parent whose grandchildren migrate one component group each, foundation first and catalog/docs last.

| Phase | Focus | Kind | Detail |
|-------|-------|------|--------|
| `001-architecture-conventions-tokens` | Architecture, conventions, designer-editability model, and the token library | research-first phase parent | 20 research iterations (models TBD, not run), then a synthesized decision |
| `002-implement-migrate-component-library` | Implement the architecture, migrate every component group, stand up the library | phase parent | 15 migration grandchildren, foundation first, catalog/docs last |
| `003-refine-audit-designer-editability` | Audit and refine that a low-code designer can safely edit styling/markup/layout/states | leaf | editability evidence + designer guide |
| `004-sk-code-mobile-cli-mode` | Plan a dedicated `sk-code` mode for Mobile-CLI app work | leaf (plan-only) | mode design; no skill is built in this packet |

### Dependency and transition rules

- Phase 1's synthesized decision (`001-architecture-conventions-tokens/research/research.md`) is the input to every Phase 2 grandchild; no migration starts until it exists.
- Within Phase 2, the tokens/foundation and theming grandchildren ship before per-surface grandchildren, which ship before the states/motion and catalog/docs grandchildren.
- Phase 3 runs after Phase 2's grandchildren are migrated; it audits the whole surface, not one component.
- Phase 4 is plan-only and independent; it can be authored any time but encodes the conventions Phase 1 defines and Phase 2 proves.

## 5. OPEN QUESTIONS

- **Research models are TBD.** Phase 1 requires 20 deep-research iterations; the operator defines the executor roster later. The iterations are scaffolded but NOT run in this packet.
- The exact inline-comment grammar and the precise token-layer boundaries are Phase 1 research outputs; Phase 2 consumes whatever Phase 1 synthesizes.
- Rich-content cards currently live on a parallel build branch and are absent from `main`; Phase 2's rich-content grandchild absorbs them into the system once that branch merges.

## RELATED DOCUMENTS

- [`implementation-phases.md`](implementation-phases.md) — the four phases in detail.
- [`build-strategy.md`](build-strategy.md) — the designer-editability model, delegation, and per-phase verification gates.
- [`README.md`](README.md) — orientation, layout, and the frozen contracts carried by every phase.
- Sibling packet `../002-pi-remote-mobile-ui-ux-features/` — the mobile UI/UX feature-parity packet this system restyles.
- Sibling packet `../001-pi-remote-mobile-agent-like-cc/` — the shipped secure foundation.
