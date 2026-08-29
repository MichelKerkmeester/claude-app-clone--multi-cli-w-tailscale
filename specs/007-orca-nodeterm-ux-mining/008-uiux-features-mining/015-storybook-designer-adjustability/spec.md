---
title: "Phase 15 - Storybook designer adjustability"
description: "Make every component, view and page adjustable by a designer inside the catalog: a live token playground that retunes the design system, derived controls for the state that hides behind object props, and a reference page for what the system says may be changed. Nothing writes a stylesheet and no production API exists to serve a story. Chain: after 014-refine-source-control-and-small-surfaces."
trigger_phrases:
  - "storybook designer adjustability"
  - "token playground catalog"
  - "derived story controls"
  - "editable seams reference"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/015-storybook-designer-adjustability"
    last_updated_at: "2026-08-29T15:05:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Closed the four control defects; added the negative-controlled visibility gate."
    next_safe_action: "Packet closed; no follow-up owed inside this phase."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 15 - Storybook designer adjustability

> **Phase links** - Parent: [`../spec.md`](../spec.md) · Master plan: [`../plan.md`](../plan.md) · Archive: [`../../../../screenshots/MANIFEST.json`](../../../../screenshots/MANIFEST.json)

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent** | `008-uiux-features-mining` |
| **Level** | 2 |
| **Priority** | P1 |
| **Status** | Complete |
| **Created** | 2026-08-29 |
| **Scope** | The catalog: 337 stories across 101 components |
| **Constraint** | Story-only. No production API may exist to serve a story; tokens change only through their gate |
| **Evidence** | A control is proven by rendering two values and showing the DOM differs |
| **Phase chain** | after `014-refine-source-control-and-small-surfaces` |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
A designer opening the catalog can read every surface and change almost nothing about them. The system's values live in one stylesheet and are invisible from the catalog; the state that distinguishes one screen from another lives behind object props that render as raw JSON editors; and the record of what may safely be changed sits in comments beside the rules, findable only by grepping component source. Measured across 101 components, 442 of 924 props carry a control and 142 of those resolve to a JSON editor, which is data entry rather than design work.

### Purpose
Make the catalog the place the design system is explored and tuned. Retuning a token should move every story at once and hand back text the token gate can accept. A screen's states should be reachable from a control rather than from editing a literal. And what the system invites a change to should be readable where the work happens.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- A live token playground over every custom property the stylesheets declare on `:root`.
- Derived state controls for the page views and for components whose state hides behind object props.
- A reference page for the editable seams and frozen markers already recorded in the source.
- Keeping the theme toggle and the two-theme audit working across the catalog.

### Out of Scope
- Writing token values into the stylesheet from the catalog; the playground exports text to paste.
- Any external visual-editor service; the content-security policy forbids the origins one needs.
- Rewriting theme selectors to allow two themes in one document.
- Changing what any existing story renders.

### Files to Change
- `app-mobile/.storybook/` - the playground, the seams reference, and the preview hook that applies a retune.
- `app-mobile/src/**/*.stories.ts` - derived controls and fixture ages, story-side only.
- `app-mobile/src/pages/chat/source-control/check-summary.svelte` - make the published classification visible.
- `app-mobile/src/shared/fixtures/demo.ts` - one timestamp stranded away from the pinned capture clock.
- `scripts/ui-audit.mjs` - exclude catalog tooling from the product sweep.
- `scripts/token-override-check.mjs`, `scripts/catalog-state-visibility.mjs` - the two gates this phase adds.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers
- REQ-001 A token edited in the catalog applies to every other story, and clearing it restores the shipped value.
- REQ-002 No production component gains a prop, slot or export that exists only to make a story render.
- REQ-003 Every existing story keeps its name, and no story changes its pixels except as a named state fix carrying evidence. Amended during implementation: the original wording forbade any pixel change, which would have blocked the very defects this phase exists to find. Seven shots moved, each one listed in `implementation-summary.md` with what it rendered before and after.
- REQ-004 The token gate stays the only authority on token values; the catalog writes no stylesheet.

### P1 - Required (complete OR user-approved deferral)
- REQ-005 A designer can reach a view's states from a control rather than by editing an object literal.
- REQ-006 A control that exists is proven to change the render; one that changes nothing is a defect.
- REQ-007 What the design system marks editable or frozen is readable inside the catalog.
- REQ-008 A token whose value differs between themes is labelled, because an override pins it flat.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- Editing a token in the playground changes a different story's computed value, and clearing it restores the original.
- Every page view exposes its states as controls, each shown to change the rendered DOM.
- The archive changes only where a state fix requires it, every moved shot is named with its before and after, and each reproduces across two full captures.
- Typecheck, both suites, story coverage, comment integrity and the token gate stay green.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- A control is easy to add and easy to make inert; one that renders no difference is worse than none, because it reads as coverage.
- Scaffolding in the app tree is a standing cost. Catalog tooling lives outside `src` so it cannot reach the bundle.
- An override is an inline property and outranks the theme blocks, so an overridden token stops flipping. This is surfaced rather than hidden.
- The catalog depends on Storybook's prop inference; a change to that inference changes what is adjustable without any edit here.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:nfr -->
## L2: NON-FUNCTIONAL REQUIREMENTS

### Performance
The preview re-applies stored overrides before each story; with none stored it is a single map read.

### Security
No external origin is contacted. The content-security policy stays `default-src 'self'`, and the release check that asserts it is untouched.

### Reliability
The token list and the seams reference are read from source at build time, so neither can disagree with the code it describes.
<!-- /ANCHOR:nfr -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

- ~~Which design source should each component link to?~~ Answered by the operator: there is no design file for this app, possibly one in future. Design links are out of scope; the addon stays installed and unwired.
- Should the seams reference stay one page, or be split per component into autodocs? One page cannot rot; per-component text would need generating.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:edge-cases -->
## L2: EDGE CASES

### Data Boundaries
A count control is clamped to the fixture it slices, so asking for more rows than exist yields the whole fixture rather than an error.

### Error Scenarios
Browser storage is unavailable in a private window and throws rather than returning empty, so every access is guarded and yields no overrides.

### State Transitions
Switching a view's state control rebuilds the real prop object from the fixture; it never mutates the fixture, which other stories share.
<!-- /ANCHOR:edge-cases -->

---

<!-- ANCHOR:complexity -->
## L2: COMPLEXITY ASSESSMENT

Level 2. Story-side work across the catalog plus three catalog-only surfaces; each control is proven by rendering two values and comparing the DOM.
<!-- /ANCHOR:complexity -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `plan.md` - the sequenced approach for this phase.
- `tasks.md` - the task ledger.
- `checklist.md` - the verification checklist.
- `../spec.md` - the phase parent.
<!-- /ANCHOR:cross-refs -->
