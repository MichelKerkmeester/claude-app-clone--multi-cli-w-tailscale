---
title: "Phase 9 tasks - Refine artifacts"
description: "Task Format: T### Description. Every task names the surface it touches; all tasks open at 0%."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/009-refine-artifacts"
    last_updated_at: "2026-08-28T20:00:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Authored the refine artifacts task ledger; all tasks open."
    next_safe_action: "Await operator go, then start T1.1."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 9 tasks - Refine artifacts

<!-- ANCHOR:notation -->
## TASK NOTATION

`[ ]` open · `[x]` complete · `[B]` blocked. Every task names the surface it touches. All tasks are OPEN; this packet is a plan and nothing implements until the operator says go.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

_BASELINE AND PER-SHOT REVIEW_

- [ ] T1.1 Capture the before baseline for all 91 shots in this group.
- [ ] T1.2 Inventory the components this group covers and map each shot to the source that renders it.
- [ ] T1.3 Review every shot and record a per-shot verdict: clean, or the named defect found.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

_REFINE THE COMPONENT, RE-CAPTURE, DIFF_

- [ ] T2.1 Fix overflow, clipping and truncation found in the review.
- [ ] T2.2 Fix cramped, overlapping or misaligned controls.
- [ ] T2.3 Bring spacing and alignment into agreement with sibling surfaces in the same group.
- [ ] T2.4 Differentiate states that render identically, or record that the sameness is the real behaviour.
- [ ] T2.5 Strengthen weak visual hierarchy so the primary element in each surface reads first.
- [ ] T2.6 Fix contrast that fails against the theme tokens in either theme.
- [ ] T2.7 Raise interactive targets that fall under 44px.
- [ ] T2.8 Re-capture after each accepted change and keep the diff scoped to the intended shot.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

_PROVE EVERY CHANGE_

- [ ] T3.1 Confirm every shot in the group carries a recorded verdict.
- [ ] T3.2 Confirm each fix has a before and after diff proving the intended change.
- [ ] T3.3 Confirm no unrelated shot moved; the rest of the archive stays byte-identical.
- [ ] T3.4 Run typecheck, eslint, both test suites, story coverage and token-identity from the final state.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

- [ ] All 91 shots reviewed with a recorded verdict.
- [ ] Every fix carries a before and after image diff.
- [ ] No unrelated screenshot changed.
- [ ] typecheck, eslint, both suites, story coverage and token-identity green from the final state.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` - the requirements and acceptance criteria.
- `plan.md` - the sequenced approach.
- `checklist.md` - the verification checklist.
<!-- /ANCHOR:cross-refs -->
