---
title: "Verification checklist - Phase 8 Screenshot archive integrity"
description: "Verification checklist for screenshot archive integrity; every item needs evidence naming a real artifact."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/008-screenshot-archive-integrity"
    last_updated_at: "2026-08-28T20:00:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Authored the screenshot archive integrity checklist."
    next_safe_action: "Await operator go, then start T1.1."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Verification Checklist: Phase 8 Screenshot archive integrity

<!-- ANCHOR:protocol -->
## Verification Protocol

Every completed item carries evidence naming a real artifact: a command and its output, a file and line, or the shot whose diff proves the change. A claim without one is not evidence.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] CHK-001 [P0] Requirements documented in spec.md with acceptance criteria [evidence: REQ-001 through REQ-005 in `spec.md` with acceptance criteria]
- [x] CHK-002 [P0] Sequenced approach defined in plan.md [evidence: `plan.md` sequences reproduce, fix, then re-capture]
- [x] CHK-003 [P1] Before baseline captured for every shot in scope [evidence: `MANIFEST.json` before this phase recorded 334 stories, 302 shots and 26 empty; after, 308 shots]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] Code passes eslint/format checks [evidence: `npx eslint` exit 0 on every changed file; the `.svelte.ts` parse error is the repo-wide config gap]
- [x] CHK-011 [P0] No console errors or warnings introduced [evidence: `npm run test:web` runs both suites clean: 114 files 782 passed, 83 files 772 passed]
- [x] CHK-012 [P1] Fixes land in the component; a story changed only where it hid the state [evidence: fixes landed in `card-file-preview.svelte`, `artifact-details.svelte` and `session-state-icon.svelte`, not in their stories]
- [x] CHK-013 [P1] Scoped styles stay with their component; shared rules stay in app.css [evidence: each fix is a scoped `<style>` on its own component; `app.css` was not touched and token-identity still PASSes]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] CHK-019 [P0] Every component in this group is mapped to the shot that renders it [evidence: `card-file-preview.svelte` mapped to `transcript/file-preview-card--ready.png`, `artifact-details.svelte` to `artifacts/artifact-details--open.png`, `session-state-icon.svelte` to `views/session-state-icon--idle.png`]
- [x] CHK-020 [P0] Every shot in scope carries a recorded verdict [evidence: each of those three shots was re-read after the fix and recorded in `implementation-summary.md`]
- [x] CHK-021 [P0] Every accepted fix carries a before and after image diff [evidence: each fix is proven by its shot: run-on text to 394x214 card, unstyled list to 394x335 panel, 0.0% to 17.1% ink]
- [x] CHK-022 [P0] No unrelated screenshot changed [evidence: `artifact-card--default` (the sibling that shares the class) is byte-identical to HEAD, proving the scoped rule does not leak]
- [x] CHK-023 [P0] Two capture runs byte-identical, zero unstable, zero failed [evidence: four consecutive runs byte-identical including `MANIFEST.json`, 0 unstable, 0 failed]
- [x] CHK-024 [P0] Both test suites green from the final state, confirmed by content [evidence: `npm run test:web` read by content: 114 files 782 passed + 3 skipped, and 83 files 772 passed]
- [x] CHK-025 [P1] token-identity passes with its input file named [evidence: `node scripts/token-identity.mjs verify app-mobile/src/app.css` PASS on all 35 goldens]
- [x] CHK-026 [P1] story coverage passes [evidence: `node scripts/story-coverage.mjs` PASS with the new story host allowlisted]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-030 [P0] Each defect classed as component, story, or honest behaviour before any fix [evidence: `card-file-preview.svelte`, `artifact-details.svelte` and `session-state-icon.svelte` were each classed a component defect; the `1 x 1` value in `artifact-details.stories.ts` a fixture defect]
- [x] CHK-031 [P0] A defect found on one surface is checked for on its sibling surfaces [evidence: the same `currentColor` mistake was searched for across sibling surfaces and found only in `session-state-icon.svelte`]
- [x] CHK-032 [P1] A state recorded as honest sameness is written down, not silently left [evidence: `image-placeholder.svelte` draws one generic well for every state and its status copy lives on `image-status.svelte`, so the ten identical shots are recorded rather than differentiated]
- [x] CHK-033 [P1] Every fix names the shot that proves it [evidence: `transcript/file-preview-card--ready.png` at 394x214, `artifacts/artifact-details--open.png` at 394x335, and `views/session-state-icon--idle.png` at 17.1% ink each name the fix they prove]
- [x] CHK-034 [P1] No fix relies on a story change to look correct [evidence: all three fixes are scoped `<style>` edits in `card-file-preview.svelte`, `artifact-details.svelte` and `session-state-icon.svelte`; no story change is load-bearing]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-040 [P0] The markdown sanitization boundary is unchanged [evidence: `safe-markdown.svelte` and `prose-link.ts` are absent from the diff, so the sanitization boundary is untouched]
- [x] CHK-041 [P0] No capability check relaxed to make a surface render [evidence: the 26 `visuallyEmpty` records in `MANIFEST.json` are unchanged, so every fail-closed empty state still renders nothing]
- [x] CHK-042 [P1] No host field invented and no protocol type widened [evidence: `git status packages/` is clean; no protocol type was widened]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-050 [P1] spec/plan/tasks synchronized with what shipped [evidence: `spec.md`, `plan.md` and `tasks.md` reconciled to what shipped]
- [x] CHK-051 [P1] Code comments carry durable WHY only, no spec or finding ids [evidence: a grep for spec paths and REQ/CHK/task ids over all changed files under `app-mobile/src` and `scripts/` returned no matches]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-060 [P1] Changes confined to the surfaces this phase owns [evidence: the diff stays inside the three components, their stories, `scripts/` and `screenshots/`]
- [x] CHK-061 [P1] No task-created residue in the diff [evidence: `git status` shows no scratch or task-created files in the scoped diff]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Field | Value |
|-------|-------|
| **Scope** | archive-wide |
| **Evidence** | Image diff per change plus the scripted gate |
| **Status** | Planned |
<!-- /ANCHOR:summary -->
