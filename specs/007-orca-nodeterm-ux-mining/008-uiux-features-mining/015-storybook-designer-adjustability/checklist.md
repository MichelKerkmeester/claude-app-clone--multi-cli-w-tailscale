---
title: "Verification checklist - Phase 15 Storybook designer adjustability"
description: "Verification checklist for the catalog adjustability work; every completed item carries evidence naming a real artifact."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/015-storybook-designer-adjustability"
    last_updated_at: "2026-08-29T08:00:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Authored the adjustability checklist alongside the shipped work."
    next_safe_action: "Finish the remaining page views, then wire design links."
    completion_pct: 85
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Verification Checklist: Phase 15 Storybook designer adjustability

<!-- ANCHOR:protocol -->
## Verification Protocol

Every completed item carries evidence naming a real artifact: a command and its output, a file and line, or the measurement that proves it. A control that exists but changes nothing is not evidence of adjustability.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] CHK-001 [P0] Requirements documented in spec.md with acceptance criteria [evidence: `spec.md` section 4 states REQ-001 through REQ-008]
- [x] CHK-002 [P0] Sequenced approach defined in plan.md [evidence: `plan.md` section 4 orders playground, controls, then reference by leverage]
- [x] CHK-003 [P1] Baseline measured before anything was added [evidence: `window.__STORYBOOK_PREVIEW__` read across 101 components; 442 of 924 props already carried a control]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] Code passes eslint/format checks [evidence: `npx eslint` on the changed story files reports no new error; the unused bindings a discard destructure left were replaced with a typed omit helper]
- [x] CHK-011 [P0] No console errors or warnings introduced [evidence: `npm run typecheck -w @pi-remote/web` reports 1250 files and 0 errors, 6 warnings being the standing baseline]
- [x] CHK-012 [P1] Catalog tooling stays out of the app bundle [evidence: the playground and the seams reference live in `app-mobile/.storybook/`, outside the `src` tree the app builds from]
- [x] CHK-013 [P1] No production API exists to serve a story [evidence: an `initialOpen` prop and a `children` slot added in an earlier attempt were reverted; `composer-tools.svelte` and `sheet-model-effort.svelte` read byte-identical to their committed state]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] CHK-019 [P0] A retune reaches a story other than the one that set it [evidence: `--accent` in `views-header--default` reads `#d97757`, then `#00ff00` with an override stored, then `#d97757` once cleared]
- [x] CHK-020 [P0] The mechanism carrying a retune is negative-controlled [evidence: with the `beforeEach` hook removed and Storybook rebuilt, the same check reports NOT APPLIED]
- [x] CHK-021 [P0] Every derived control is proven to change the render [evidence: rendered twice per control through `window.__STORYBOOK_PREVIEW__` — roster ready to empty takes cards 2/0, session count 1 to 4 gives 1/2, block count 1 to 6 grows the transcript 194/698 characters]
- [x] CHK-022 [P0] No existing story changed its pixels [evidence: `git status --porcelain screenshots` reports only the pages this work adds]
- [x] CHK-023 [P0] Both test suites green from the final state, confirmed by content [evidence: `npm run test:web` exit 0: 114 files with 782 passed and 3 skipped, plus 83 files with 772 passed]
- [x] CHK-024 [P1] The token gate still passes with its input named [evidence: `node scripts/token-identity.mjs verify app-mobile/src/app.css` matched all 39 goldens across light, dark and system]
- [x] CHK-025 [P1] Story coverage passes [evidence: `node scripts/story-coverage.mjs` passes; catalog tooling sits outside its scan]
- [x] CHK-026 [P1] Comment integrity passes [evidence: `node scripts/css-comment-integrity.mjs` reports 1 css and 128 svelte files clean]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-030 [P0] The gap was measured rather than assumed [evidence: explicit `argTypes` were judged redundant because docgen already derives a control for every prop that can carry one]
- [x] CHK-031 [P0] A token that behaves differently per theme is surfaced [evidence: the playground flags `--ink-inverse` and `--canvas`; `--surface-code`, `--on-code` and `--space-4` correctly carry no flag]
- [x] CHK-032 [P1] The reference cannot drift from the code it describes [evidence: `editable-seams.svelte` reads markers from component sources and `app.css` at build time rather than from a kept list]
- [x] CHK-033 [P1] Every page view exposes its states as controls [evidence: `window.__STORYBOOK_PREVIEW__` reports synthetic controls on review, inbox, enrollment and the composer; `pendingCount:0` takes buttons 6/1 and `itemCount:0` takes them 7/1]
- [ ] CHK-034 [P1] Components link to their design source [deferred by operator decision: there is no design file for this app, possibly one in future. `@storybook/addon-designs` stays installed and unwired, and `STORYBOOK.md` records that no story declares a `design:` parameter so the gap cannot be misread as coverage]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-040 [P0] No external origin is contacted by the catalog [evidence: `token-overrides.ts` and `editable-seams.svelte` read the CSSOM and bundled source only; no fetch or external host is introduced]
- [x] CHK-041 [P0] The content-security policy is unchanged [evidence: `app-mobile/svelte.config.js` still sets `default-src 'self'` and `scripts/release-verify.mjs` still asserts it]
- [x] CHK-042 [P1] No host field invented and no protocol type widened [evidence: derived controls compose existing demo fixtures; `npm run typecheck` passes against the unchanged protocol package]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-050 [P1] The catalog explains itself to a designer [evidence: `app-mobile/.storybook/README.md` covers the playground, the flips badge, export and reset]
- [x] CHK-051 [P1] Code comments carry durable WHY only, no spec or finding ids [evidence: `git diff` scanned for spec paths and REQ/CHK/task ids in changed code: clean]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-060 [P1] Changes confined to the surfaces this phase owns [evidence: `git status --porcelain` reviewed per commit; catalog tooling in `.storybook`, controls in story files only]
- [x] CHK-061 [P1] No task-created residue in the diff [evidence: `ui-audit.json` is gitignored; the scoped diff carries no scratch output]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Field | Value |
|-------|-------|
| **Scope** | The catalog: 336 stories across 101 components |
| **Evidence** | A control proven by rendering two values and comparing the DOM |
| **Status** | In Progress |
<!-- /ANCHOR:summary -->
