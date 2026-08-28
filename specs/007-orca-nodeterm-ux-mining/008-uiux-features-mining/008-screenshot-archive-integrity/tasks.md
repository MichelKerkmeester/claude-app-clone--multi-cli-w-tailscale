---
title: "Phase 8 tasks - Screenshot archive integrity"
description: "Task Format: T### Description. Every task names the surface it touches; all tasks open at 0%."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/008-screenshot-archive-integrity"
    last_updated_at: "2026-08-28T20:00:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Authored the screenshot archive integrity task ledger; all tasks open."
    next_safe_action: "Await operator go, then start T1.1."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 8 tasks - Screenshot archive integrity

<!-- ANCHOR:notation -->
## TASK NOTATION

`[ ]` open · `[x]` complete · `[B]` blocked. Every task names the surface it touches. All tasks are OPEN; this packet is a plan and nothing implements until the operator says go.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

_BASELINE AND PER-SHOT REVIEW_

- [ ] T1.1 Reproduce the run-on text defect from the live app, not only Storybook, so the fix is aimed at the real symptom.
- [ ] T1.2 Capture the current archive state as the before baseline for this phase.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

_REFINE THE COMPONENT, RE-CAPTURE, DIFF_

- [ ] T2.1 Add the missing card styling to `card-file-preview.svelte` so its rows render.
- [ ] T2.2 Add the missing `.artifact-details` rule to `artifact-details.svelte`.
- [ ] T2.3 Verify the drafted ask-question card stories render a real question in all five states.
- [ ] T2.4 Verify the session-state icon story renders a visible glyph for idle, running and interrupted.
- [ ] T2.5 Verify the three host-error defaults render populated surfaces and keep an explicit error story each.
- [ ] T2.6 Fix the artifact-details fixture so Dimensions no longer reads `1 x 1`.
- [ ] T2.7 Decide the view framing question and record the reason in the summary.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

_PROVE EVERY CHANGE_

- [ ] T3.1 Re-capture the archive; two runs byte-identical, zero unstable, zero failed.
- [ ] T3.2 Re-review every changed shot visually and confirm no dead, unstyled or error-defaulted shot remains.
- [ ] T3.3 Run typecheck, eslint, both test suites, story coverage and token-identity from the final state.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

- [ ] The file-preview and artifact-details surfaces render correctly in the live app.
- [ ] No dead, unstyled, or error-defaulted screenshot remains in the archive.
- [ ] Two capture runs are byte-identical with zero unstable and zero failed.
- [ ] typecheck, eslint, both suites, story coverage and token-identity green from the final state.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` - the requirements and acceptance criteria.
- `plan.md` - the sequenced approach.
- `checklist.md` - the verification checklist.
<!-- /ANCHOR:cross-refs -->
