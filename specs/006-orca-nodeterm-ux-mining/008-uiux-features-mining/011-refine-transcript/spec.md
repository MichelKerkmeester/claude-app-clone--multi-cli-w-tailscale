---
title: "Phase 11 - Refine transcript"
description: "Walk all 39 transcript screenshots one at a time and treat each as a UI review: analyse what it shows, debug what is wrong, then optimise and refine the component. Fix the component rather than the story, re-capture, and prove each change with a before and after diff of the shot itself. Scope: 39 screenshots. Chain: after 010-refine-chrome · before 012-refine-views."
trigger_phrases:
  - "refine transcript spec requirements"
  - "refine transcript phase"
  - "spec requirements"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/008-uiux-features-mining/011-refine-transcript"
    last_updated_at: "2026-08-28T20:00:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Authored the refine transcript plan; no code yet."
    next_safe_action: "Await operator go, then start T1.1."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 11 - Refine transcript

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
| **Created** | 2026-08-28 |
| **Scope** | 39 screenshots |
| **Constraint** | Host-authoritative, fail-closed. Refinement never adds host truth |
| **Evidence** | The screenshot itself; a change is proven by a before and after image diff |
| **Phase chain** | after `010-refine-chrome` · before `012-refine-views` |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
The transcript surfaces cover transcript blocks, folds, find bar and load panels, and 39 screenshots record how they actually render. Nothing has yet read those shots as a UI review. A green test suite says a component mounts and behaves; it says nothing about whether text overflows, controls crowd, two states look identical, hierarchy reads, spacing matches its siblings, or a touch target is large enough to hit. Those defects are invisible to every gate this repo runs and visible in one glance at the picture.

### Purpose
Walk all 39 transcript screenshots one at a time and treat each as a UI review: analyse what it shows, debug what is wrong, then optimise and refine the component. Fix the component rather than the story, re-capture, and prove each change with a before and after diff of the shot itself.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- Per-shot analysis of all 39 transcript screenshots.
- Overflow, clipped or truncated text, and content escaping its container.
- Cramped, overlapping or misaligned controls, and spacing inconsistent with sibling surfaces.
- States that should differ but render identically, and weak visual hierarchy.
- Contrast against the theme tokens, and touch targets under 44px.

### Out of Scope
- New features or host fields; this is refinement of what already ships.
- Other screenshot groups - each has its own phase.
- Rewriting a component wholesale when a targeted fix serves.

### Files to Change

| Path | Action | Why |
|------|--------|-----|
| the `transcript` component sources under `app-mobile/src` | Modify | targeted refinement driven by its own screenshot |
| co-located `*.stories.ts` | Modify | only where a story hides a state that needs reviewing |
| `screenshots/**` | Regenerate | after each accepted change |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-001 | Every one of the 39 shots in this group is reviewed individually and its verdict recorded. | No shot is skipped; each is marked either clean or carrying a named defect. |
| REQ-002 | Each accepted fix is proven by a before and after image diff of the affected shot. | A claim of improvement without a visual diff is not accepted. |

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-003 | Fixes land in the component, not in the story. | A story is changed only when it was hiding the state that needed reviewing. |
| REQ-004 | No refinement regresses another surface. | Both suites, token-identity and the full archive stay green, and unrelated shots stay byte-identical. |
| REQ-005 | Every defect is classified before it is fixed. | Each is recorded as a component defect, a story artefact, or the component's honest behaviour; a fix follows the classification. |
| REQ-006 | A defect found once is checked for across its sibling surfaces. | Where the same pattern recurs in the group it is fixed together, not left to reappear in a later phase. |
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. All 39 shots reviewed with a recorded verdict.
2. Every fix carries a before and after image diff.
3. No unrelated screenshot changed.
4. typecheck, eslint, both suites, story coverage and token-identity green from the final state.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Risk | Impact | Mitigation |
|------|--------|------------|
| A refinement regresses a surface no one looked at | Medium | The whole archive is re-captured and unrelated shots must stay byte-identical |
| A fix is claimed without visual proof | High | Every accepted change carries a before and after image diff of its own shot |
| Story-level patching hides a real component defect | High | Fixes land in the component; a story changes only when it hid the state |
| Capture nondeterminism produces phantom diffs | Medium | Two runs must be byte-identical with zero unstable before any review is trusted |

**Depends on:** `010-refine-chrome` and a trustworthy archive from `008-screenshot-archive-integrity`.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:nfr -->
## L2: NON-FUNCTIONAL REQUIREMENTS

### Performance
No refinement may add a per-frame timer, an unbounded listener, or a second animation loop to a surface that did not have one.

### Security
The markdown sanitization boundary and every fail-closed capability check stay intact; refinement is presentation only.

### Reliability
A refinement must not change what a surface does when its data is absent; a fail-closed empty state stays empty.
<!-- /ANCHOR:nfr -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

1. Whether a state that renders identically to another is a defect or the component's honest behaviour is decided per case and recorded, never assumed.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:edge-cases -->
## L2: EDGE CASES

### Data Boundaries
The longest realistic string, the empty string and a single character each stay inside their container; a number column stays aligned as its digit count grows.

### Error Scenarios
A surface rendering an error keeps that error legible after refinement; an error state is never restyled into looking like success.

### State Transitions
A state that renders identically to its neighbour is either differentiated or recorded as honest sameness; it is never left ambiguous.
<!-- /ANCHOR:edge-cases -->

---

<!-- ANCHOR:complexity -->
## L2: COMPLEXITY ASSESSMENT

Level 2. 39 shots to review; each fix is a targeted presentation change with an image diff as its proof.
<!-- /ANCHOR:complexity -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `plan.md` - the sequenced approach for this phase.
- `tasks.md` - the task ledger.
- `checklist.md` - the verification checklist.
- `../spec.md` - the phase parent.
<!-- /ANCHOR:cross-refs -->
