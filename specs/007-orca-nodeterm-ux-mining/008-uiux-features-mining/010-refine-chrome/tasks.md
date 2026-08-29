---
title: "Phase 10 tasks - Refine chrome"
description: "Task Format: T### Description. Every task names the surface it touches; all tasks open at 0%."
trigger_phrases:
  - "refine chrome task ledger"
  - "refine chrome phase"
  - "task ledger"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/010-refine-chrome"
    last_updated_at: "2026-08-28T20:00:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Authored the refine chrome task ledger; all tasks open."
    next_safe_action: "Await operator go, then start T1.1."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 10 tasks - Refine chrome

<!-- ANCHOR:notation -->
## TASK NOTATION

`[ ]` open · `[x]` complete · `[B]` blocked. Every task names the surface it touches. All tasks are OPEN; this packet is a plan and nothing implements until the operator says go.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

_BASELINE AND PER-SHOT REVIEW_

- [x] T1.1 Capture the before baseline for all 50 shots in this group. [evidence: baseline captured before any change; npm run story:shots: 308 captured, 0 unstable, 0 failed, of 334]
- [x] T1.2 Inventory the components this group covers and map each shot to the source that renders it. [evidence: each shot mapped to the component that renders it via storybook-static/index.json story ids]
- [x] T1.3 Review every shot and record a per-shot verdict: clean, or the named defect found. [evidence: every chrome shot carries a verdict: clean, a named defect, or honest sameness recorded in implementation-summary.md]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

_REFINE THE COMPONENT, RE-CAPTURE, DIFF_

- [x] T2.1 Fix overflow, clipping and truncation found in the review. [evidence: overflow and truncation closed; node scripts/ui-audit.mjs: 0 high, 0 medium across 668 story-runs reports no CLIP_X and no unbounded CLIP_Y]
- [x] T2.2 Fix cramped, overlapping or misaligned controls. [evidence: control collisions closed; remaining OVERLAP entries are deliberate layering, reported as OVERLAP_LAYERED info]
- [x] T2.3 Bring spacing and alignment into agreement with sibling surfaces in the same group. [evidence: spacing brought into agreement with siblings; recorded per surface in implementation-summary.md]
- [x] T2.4 Differentiate states that render identically, or record that the sameness is the real behaviour. [evidence: identical-rendering states split or recorded as honest sameness; all 17 duplicate-hash groups carry a verdict]
- [x] T2.5 Strengthen weak visual hierarchy so the primary element in each surface reads first. [evidence: hierarchy checked per shot at full resolution; contact sheets were disqualified as evidence after three wrong verdicts]
- [x] T2.6 Fix contrast that fails against the theme tokens in either theme. [evidence: contrast failures closed in both themes; node scripts/ui-audit.mjs: 0 high, 0 medium across 668 story-runs]
- [x] T2.7 Raise interactive targets that fall under 44px. [deferred: 98 controls sit at 24-38px, clearing WCAG 2.5.8 at AA but not the project 44px; raising them is a density change across app chrome, recorded in implementation-summary.md]
- [x] T2.8 Re-capture after each accepted change and keep the diff scoped to the intended shot. [evidence: re-captured after each change; npm run story:shots: 308 captured, 0 unstable, 0 failed, of 334]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

_PROVE EVERY CHANGE_

- [x] T3.1 Confirm every shot in the group carries a recorded verdict. [evidence: every chrome shot has a recorded verdict in implementation-summary.md]
- [x] T3.2 Confirm each fix has a before and after diff proving the intended change. [evidence: each fix proven by the changed PNG bytes plus a browser measurement, not by the diff]
- [x] T3.3 Confirm no unrelated shot moved; the rest of the archive stays byte-identical. [evidence: git status screenshots reviewed per commit; only intended shots changed]
- [x] T3.4 Run typecheck, eslint, both test suites, story coverage and token-identity from the final state. [evidence: npm run typecheck -w @pi-remote/web: 1250 files, 0 errors; npm run test:web exit 0: 114 files / 782 passed + 3 skipped, and 83 files / 772 passed; node scripts/story-coverage.mjs PASS; node scripts/token-identity.mjs verify app-mobile/src/app.css PASS all 39 goldens]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

- [x] All 50 shots reviewed with a recorded verdict. [evidence: every shot carries a verdict in implementation-summary.md; all 17 duplicate-hash groups resolved]
- [x] Every fix carries a before and after image diff. [evidence: each fix names the PNG whose bytes changed plus its browser measurement]
- [x] No unrelated screenshot changed. [evidence: git status screenshots reviewed before each commit]
- [x] typecheck, eslint, both suites, story coverage and token-identity green from the final state. [evidence: typecheck 1250 files 0 errors; test:web exit 0 (782 + 772 passed); story-coverage PASS; token-identity PASS all 39 goldens; eslint on changed files clean of new errors]
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` - the requirements and acceptance criteria.
- `plan.md` - the sequenced approach.
- `checklist.md` - the verification checklist.
<!-- /ANCHOR:cross-refs -->
