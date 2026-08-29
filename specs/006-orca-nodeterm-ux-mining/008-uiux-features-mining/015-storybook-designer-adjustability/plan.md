---
title: "Implementation plan - Phase 15 Storybook designer adjustability"
description: "Sequenced approach for making the catalog the place the design system is explored and tuned: a token playground first because it carries the most leverage, then derived state controls per view, then the reference for what may be changed."
trigger_phrases:
  - "adjustability plan"
  - "token playground sequencing"
  - "catalog tooling plan"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/008-uiux-features-mining/015-storybook-designer-adjustability"
    last_updated_at: "2026-08-29T08:00:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Authored the adjustability plan alongside the work already shipped."
    next_safe_action: "Finish the remaining page views, then wire design links."
    completion_pct: 85
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Implementation Plan: Phase 15 Storybook designer adjustability

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context
SvelteKit 5 with a token-driven stylesheet, a Storybook 9 catalog of 336 stories, and a screenshot archive that must not move. The content-security policy forbids an external visual editor, so the catalog itself is the surface.

### Overview
Three additions, ordered by leverage. A token playground moves every story at once, so it comes first. Derived controls then reach the state that object props hide. A reference page finally makes the system's own record of what is editable readable where the work happens.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- The component or view is in the catalog and renders.
- Its state is understood from the code rather than from the story's literals.

### Definition of Done
- A control changes the rendered DOM, shown by rendering two values.
- Every existing story keeps its name and its pixels.
- Typecheck, both suites, story coverage, comment integrity and the token gate pass.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

Catalog tooling lives in `.storybook`, outside `src`, so it cannot reach the app bundle and is invisible to the coverage scan. A retune is an inline custom property on the document element, re-applied before each story by a preview hook. Derived controls are synthetic args mapped onto real props by a story `render`; the component never learns they exist.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · token playground
Discover every `:root` custom property from the CSSOM, edit it live, persist per browser, export a paste-ready block, and label the tokens that differ between themes.

### Phase 2 · derived state controls
Per view and per object-prop component, expose the states a designer needs and map them onto the real props, leaving every named story's pixels untouched.

### Phase 3 · the record
Read the editable-seam and frozen markers out of the components and the stylesheet, and present them as a reference.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:phase-deps -->
## L2: PHASE DEPENDENCIES

Phase 1 stands alone. Phase 2 depends on nothing but is verified against the archive Phase 1 leaves unchanged. Phase 3 depends only on the markers already present in the source.
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

Phase 1 is one surface plus a preview hook. Phase 2 is the largest, one story file per view. Phase 3 is a single generated page.
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

The suites cannot see any of this: a control that exists but changes nothing passes every test. The evidence is behavioural — render a story twice with different values for a control and compare the DOM — plus the archive staying byte-identical apart from pages this work adds. A retune is proven by reading a token's computed value in a story other than the playground.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- `npm run build-storybook -w @pi-remote/web` and `node scripts/capture-screenshots.mjs`.
- `node scripts/story-coverage.mjs` - every renderable component under `src` keeps a story.
- `node scripts/token-identity.mjs verify app-mobile/src/app.css` - the gate the playground defers to.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Every addition is catalog-only and committed separately from the app, so reverting a commit removes the tooling and leaves the product untouched.
<!-- /ANCHOR:rollback -->
