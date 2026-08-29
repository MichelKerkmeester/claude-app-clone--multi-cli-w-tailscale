---
title: "Verification checklist - Phase 12 Refine views"
description: "Verification checklist for refine views; every item needs evidence naming a real artifact."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/012-refine-views"
    last_updated_at: "2026-08-28T20:00:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Authored the refine views checklist."
    next_safe_action: "Await operator go, then start T1.1."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Verification Checklist: Phase 12 Refine views

<!-- ANCHOR:protocol -->
## Verification Protocol

Every completed item carries evidence naming a real artifact: a command and its output, a file and line, or the shot whose diff proves the change. A claim without one is not evidence.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] CHK-001 [P0] Requirements documented in spec.md with acceptance criteria [evidence: `spec.md` section 3 lists the in-scope defect classes for this group]
- [x] CHK-002 [P0] Sequenced approach defined in plan.md [evidence: `plan.md` sequences setup, implementation and verification for this phase]
- [x] CHK-003 [P1] Before baseline captured for every shot in scope [evidence: baseline captured before edits via `npm run story:shots` (308 captured, 0 unstable, 0 failed)]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] Code passes eslint/format checks [evidence: `npx eslint` on the changed files reports only errors already present at HEAD; the one keyless each-block introduced here is keyed]
- [x] CHK-011 [P0] No console errors or warnings introduced [evidence: `npm run typecheck -w @pi-remote/web` reports 1250 files and 0 errors, 6 warnings being the standing baseline]
- [x] CHK-012 [P1] Fixes land in the component; a story changed only where it hid the state [evidence: fixes land in the component; stories changed only where the story hid the state, recorded per case in `implementation-summary.md`]
- [x] CHK-013 [P1] Scoped styles stay with their component; shared rules stay in app.css [evidence: scoped styles stay with their component; the shared empty-preview and card rules stay global in `app.css`]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] CHK-019 [P0] Every component in this group is mapped to the shot that renders it [evidence: each shot maps to its rendering component through the story id in `storybook-static/index.json`]
- [x] CHK-020 [P0] Every shot in scope carries a recorded verdict [evidence: every shot in scope carries a verdict in `implementation-summary.md`]
- [x] CHK-021 [P0] Every accepted fix carries a before and after image diff [evidence: each accepted fix names the PNG whose bytes changed plus the browser measurement, in `implementation-summary.md`]
- [x] CHK-022 [P0] No unrelated screenshot changed [evidence: `git status screenshots` reviewed before each commit; unrelated shots unchanged]
- [x] CHK-023 [P0] Capture drift measured at n=6 per side, zero unstable, zero failed [evidence: A/B of six `npm run story:shots` runs per side against one shared Storybook build - the current capture differed from its own run 1 in 5 of 5 comparisons, a pre-change capture in 5 of 5, varying in the same families (`sandboxed-diagram` dominant, `plan-mode-button--executing-plan`). 309 captured, 0 unstable, 0 failed every run. Byte-equality therefore does NOT hold archive-wide; the flake is load-dependent and pre-existing, unchanged by the per-shot ground repaint, so no revert is owed. Flaked shots restored with `git checkout HEAD -- screenshots` before each commit]
- [x] CHK-024 [P0] Both test suites green from the final state, confirmed by content [evidence: `npm run test:web` exit 0, read by content: 114 files with 782 passed and 3 skipped, plus 83 files with 772 passed]
- [x] CHK-025 [P1] token-identity passes with its input file named [evidence: `node scripts/token-identity.mjs verify app-mobile/src/app.css` passes all 39 goldens across light, dark and system]
- [x] CHK-026 [P1] story coverage passes [evidence: `node scripts/story-coverage.mjs` passes with both story hosts allowlisted and no stale entry]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-030 [P0] Each defect classed as component, story, or honest behaviour before any fix [evidence: each defect classed component, story, or honest behaviour before any fix, with the deciding code path quoted in `implementation-summary.md`]
- [x] CHK-031 [P0] A defect found on one surface is checked for on its sibling surfaces [evidence: sibling check applied: the invariant-ink defect was traced from one well to all seven rules sharing that pairing in `app.css`]
- [x] CHK-032 [P1] A state recorded as honest sameness is written down, not silently left [evidence: honest sameness written down in `implementation-summary.md`: image placeholder, headless button, image-status copy pairs, code follow-tail, verified-image cover, transcript live edge]
- [x] CHK-033 [P1] Every fix names the shot that proves it [evidence: every fix names the shot that proves it in `implementation-summary.md`]
- [x] CHK-034 [P1] No fix relies on a story change to look correct [evidence: no fix relies on a story change; two production props added to make stories render were reverted, verified by an empty `git diff` on those components]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-040 [P0] The markdown sanitization boundary is unchanged [evidence: the safe-Markdown allowlist parser is unchanged; find highlighting wraps only parsed text nodes in `markdown-preview.svelte` and adds no raw-HTML path]
- [x] CHK-041 [P0] No capability check relaxed to make a surface render [evidence: no capability check relaxed; `node scripts/ui-audit.mjs` renders no host-gated surface that was forced open]
- [x] CHK-042 [P1] No host field invented and no protocol type widened [evidence: no host field invented and no protocol type widened; `npm run typecheck` clean against the unchanged protocol package]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-050 [P1] spec/plan/tasks synchronized with what shipped [evidence: spec, plan and tasks reconciled with what shipped, recorded in `implementation-summary.md`]
- [x] CHK-051 [P1] Code comments carry durable WHY only, no spec or finding ids [evidence: `git diff` scanned for spec paths and REQ/CHK/task ids in changed code: clean]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-060 [P1] Changes confined to the surfaces this phase owns [evidence: `git status --porcelain` reviewed per commit; changes confined to the surfaces this phase owns, enforced by per-executor scope locks in each dispatch brief]
- [x] CHK-061 [P1] No task-created residue in the diff [evidence: `ui-audit.json` is gitignored; no task-created residue in the scoped diff]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Field | Value |
|-------|-------|
| **Scope** | 37 screenshots |
| **Evidence** | Image diff per change plus the scripted gate |
| **Status** | Complete |
<!-- /ANCHOR:summary -->
