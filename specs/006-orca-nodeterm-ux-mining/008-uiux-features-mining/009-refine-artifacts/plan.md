---
title: "Phase 9 plan - Refine artifacts"
description: "Sequenced approach for refine artifacts: 91 screenshots, reviewed per shot, fixed in the component, proven by image diff."
trigger_phrases:
  - "refine artifacts plan approach"
  - "refine artifacts phase"
  - "plan approach"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/008-uiux-features-mining/009-refine-artifacts"
    last_updated_at: "2026-08-28T20:00:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Authored the refine artifacts plan."
    next_safe_action: "Await operator go, then start T1.1."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 9 plan - Refine artifacts

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context
The archive at `screenshots/` is produced by `scripts/capture-screenshots.mjs` (`npm run story:shots`). It crops each shot to rendered content, drops the page background, freezes motion and the clock, and shoots each frame twice keeping only a frame that reproduces. `MANIFEST.json` records every story, its size, and any story that renders nothing visible.

### Overview
Walk all 91 artifacts screenshots one at a time and treat each as a UI review: analyse what it shows, debug what is wrong, then optimise and refine the component. Fix the component rather than the story, re-capture, and prove each change with a before and after diff of the shot itself.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- The archive is deterministic: two runs byte-identical, zero unstable, zero failed.
- Every shot in scope has a recorded before state.

### Definition of Done
- Every shot in scope carries a verdict, every fix carries an image diff, and no unrelated shot moved.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

Refinement is presentation-only and touches the component that owns the surface. Scoped `<style>` blocks stay with their component; shared rules stay in `app.css`. A defect whose cause is a parent-owned rule is fixed where the rule lives, not duplicated into the child. Nothing here reads or writes host truth, and no capability check is relaxed to make a surface look better.

The proof is the picture. A change is accepted when the before and after shot of the affected component shows the intended difference and every other shot in the archive is unchanged.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · baseline and review
Capture the before state and record a verdict for every shot in scope.

### Phase 2 · refine
Fix the defects found, component first, re-capturing as each lands.

### Phase 3 · verification
Prove every fix by diff, confirm no collateral movement, and run the full gate.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:phase-deps -->
## L2: PHASE DEPENDENCIES

| Phase | Depends on | Why |
|-------|-----------|-----|
| 1 | `008-screenshot-archive-integrity` | The archive must be trustworthy before a shot is read as evidence |
| 2 | Phase 1 | A fix needs a recorded before state to be provable |
| 3 | Phase 2 | Verification reads the final state only |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Effort | Note |
|-------|--------|------|
| 1 | M | 91 shots to read individually |
| 2 | L | scales with the defects found, not with the shot count |
| 3 | S | the gate is scripted |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

Existing suites guard behaviour and must stay green, but they cannot see any defect this phase targets. The evidence is the image diff: the affected shot changes in the intended way and every other shot stays byte-identical. Where a refinement changes a token or a shared rule, `node scripts/token-identity.mjs verify app-mobile/src/app.css` must still pass.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- `scripts/capture-screenshots.mjs` and `npm run story:shots`.
- `node scripts/story-coverage.mjs` - every renderable component keeps a story.
- `node scripts/token-identity.mjs verify app-mobile/src/app.css` - the gate needs its input named.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Every change is a scoped presentation edit committed with its regenerated shots, so reverting one commit restores both the component and its picture.
<!-- /ANCHOR:rollback -->
