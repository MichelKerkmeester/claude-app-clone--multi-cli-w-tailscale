---
title: "Design system and component library — phase parent"
description: "Phase parent for the React-era design system: decide the architecture, conventions and tokens; migrate ~15 component groups from one global stylesheet onto a shared component library; and audit that a designer can edit each surface safely. The SvelteKit rewrite that later superseded the rendering path is its own top-level spec."
trigger_phrases:
  - "design system library spec requirements"
  - "design system library packet"
  - "spec requirements"
importance_tier: "normal"
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/003-design-system-library"
    last_updated_at: "2026-08-24T16:49:14Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Phase parent scoped; the React design-system trio merged into 17 children."
    next_safe_action: "Resume the active phase child, or read the phase map below."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Design system and component library — phase parent

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | (top-level spec) |
| Mode | Phase parent |
| Children | 17 (`001-architecture-conventions-tokens` … `017-editability-audit-and-guide`) |
| Status | Planned |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

The Pi Remote mobile app began as ~55 components hand-styled in one global stylesheet, with no shared
component API and no way for a designer to change a surface safely. This program builds the design
system that fixes that: it decides the architecture, conventions and tokens; migrates the component
groups onto a shared component library, one surface group at a time; and audits whether a designer can
edit each migrated surface without breaking it.

Each concern is a phase because each has a different verification and a different failure mode. It is
the React-era foundation; the SvelteKit rewrite that later replaced the rendering path is tracked
separately in `004-sveltekit-spa-migration`, and the sk-code skill mode for this surface in
`004-sk-code-mobile-cli-mode`.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:phases -->
## 3. PHASE DOCUMENTATION MAP

| Phase | Child | Scope |
|---|---|---|
| 1 | `001-architecture-conventions-tokens` | How a component is structured, the naming conventions, and the token foundation the migration depends on. |
| 2 | `002-tokens-foundation` | The token foundation for the library. |
| 3 | `003-theming-light-dark` | Light and dark theming on the tokens. |
| 4 | `004-primitives-react-aria` | The accessible interaction primitives. |
| 5 | `005-app-shell-header-nav` | The app shell, header and navigation. |
| 6 | `006-transcript-message-blocks` | The transcript and message blocks. |
| 7 | `007-composer-input` | The composer input. |
| 8 | `008-model-effort-sheet` | The model and effort sheet. |
| 9 | `009-slash-command-autocomplete` | The slash-command autocomplete. |
| 10 | `010-plan-mode-controls` | The plan-mode controls. |
| 11 | `011-rich-content-cards` | The rich-content cards. |
| 12 | `012-artifacts-viewer-previews` | The artifacts viewer and previews. |
| 13 | `013-overlays-sheets-modals` | The overlays, sheets and modals. |
| 14 | `014-question-todos-surfaces` | The question and todo surfaces. |
| 15 | `015-states-interaction-motion` | The states, interaction and motion. |
| 16 | `016-catalog-docs-preview` | The catalog, docs and preview. |
| 17 | `017-editability-audit-and-guide` | The audit that proves a designer can edit each surface safely, and the guide that records how. |
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:invariants -->
## 4. INVARIANTS

Non-negotiable across every phase:

- Every surface moves onto the shared component library without changing its rendered behaviour.
- A designer can edit each migrated surface through the documented seams without reading the internals.
- Comment hygiene: no spec path or artifact id in any code comment.
<!-- /ANCHOR:invariants -->

---

<!-- ANCHOR:cross-refs -->
## 5. CROSS-REFERENCES

- `004-sk-code-mobile-cli-mode` — the sk-code skill mode for this surface.
- `004-sveltekit-spa-migration` — the rewrite that superseded the React rendering path.
<!-- /ANCHOR:cross-refs -->
