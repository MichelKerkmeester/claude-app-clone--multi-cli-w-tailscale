---
title: "Verification Checklist: Phase 4 a11y and onboarding"
description: "Verification Date: TBD. Level-2 QA items mapping to the AI/OS acceptance criteria; all open at 0%."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/004-a11y-onboarding"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the a11y/onboarding Level-2 checklist; all items open."
    next_safe_action: "Await implementation, then verify each acceptance item."
    completion_pct: 0
---

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

# Verification Checklist: Phase 4 a11y and onboarding/settings/diagnostics

---

<!-- ANCHOR:protocol -->
## Verification Protocol

| Priority | Handling | Completion Impact |
|----------|----------|-------------------|
| **[P0]** | HARD BLOCKER | Cannot claim done until complete |
| **[P1]** | Required | Must complete OR get user approval |
| **[P2]** | Optional | Can defer with documented reason |
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [ ] CHK-001 [P0] All 11 findings documented as REQs in spec.md with acceptance criteria
- [ ] CHK-002 [P0] Sequenced approach and sheet-primitive batch defined in plan.md
- [ ] CHK-003 [P1] Touched-surface token-identity + test:web baseline captured before any change
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [ ] CHK-010 [P0] Code passes eslint/format checks
- [ ] CHK-011 [P0] No console errors or warnings introduced
- [ ] CHK-012 [P1] Every persisted store is try/catch guarded and degrades to empty
- [ ] CHK-013 [P1] New sheets reuse the shared Sheet primitive and its back-dismiss
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing (acceptance criteria mapping)

- [ ] CHK-020 [P0] REQ-001 (AI-1): opening Find focuses the input and raises the keyboard with no second tap
- [ ] CHK-021 [P0] REQ-002 (AI-2): back-gesture closes the topmost sheet on every sheet; bespoke copy removed from sheet-plan-review.svelte
- [ ] CHK-022 [P1] REQ-003 (AI-3): moveUp/moveDown actions present, aria-correct, unit-tested; conditional wiring noted
- [ ] CHK-023 [P1] REQ-004 (AI-4): chip fills draft without sending; every icon-only row named; storage failure degrades to empty
- [ ] CHK-024 [P1] REQ-005 (OS-1): made-decision and no-op steps skip; every choice framed changeable
- [ ] CHK-025 [P1] REQ-006 (OS-2): unconfirmed removal shows Retry card that survives restart and clears on success
- [ ] CHK-026 [P1] REQ-007 (OS-3): each probe streams its result; FAQ reachable; failed probe actionable
- [ ] CHK-027 [P1] REQ-008 (OS-4): ring buffer bounded and reload-durable; Copy yields structured blob; first pair fails at the ceiling
- [ ] CHK-028 [P1] REQ-009 (OS-5): a synonym surfaces the row; no host call
- [ ] CHK-029 [P1] REQ-010 (OS-6): missing target advances; each tour fires once ever; never over another overlay
- [ ] CHK-030 [P1] REQ-011 (OS-7): external revoke flips the toggle on next focus; toast fires once; toggle never lies
- [ ] CHK-031 [P0] token-identity 0-diff on touched CSS; test:web green from the final state
- [ ] CHK-032 [P1] a11y contract (focus, roles, dismissal, live regions) preserved or improved
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [ ] CHK-FIX-001 [P0] Each finding classed (AI-2 cross-consumer over all five sheets; OS-7 class-of-bug on the lying toggle)
- [ ] CHK-FIX-002 [P0] Same-class producer inventory: every sheet audited for back-dismiss after AI-2
- [ ] CHK-FIX-003 [P0] Consumer inventory: every icon-only control audited for an a11y label (AI-4, OS-*)
- [ ] CHK-FIX-006 [P1] OS-7 permission-revoked-while-backgrounded negative control reproduced before the fix
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [ ] CHK-040 [P0] Quick-prompts, gates, tour, cleanup queue, and ring buffer are client-only; none reach the host
- [ ] CHK-041 [P0] The Copy diagnostics blob carries no secret material
- [ ] CHK-042 [P1] OS-7 never claims a permission is in effect when the OS denied it (RS-4 principle)
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [ ] CHK-050 [P1] spec/plan/tasks synchronized; AI-3 conditional and OS-7 AN-6 absorption noted
- [ ] CHK-051 [P1] Code comments carry durable WHY only (no spec/finding ids in code)
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [ ] CHK-060 [P1] Changes confined to `pages/{chat,enrollment,home,settings}/**` and `shared/{primitives,state,transport,commands,format}/**`
- [ ] CHK-061 [P1] No task-created residue in the diff
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 12 | 0/12 |
| P1 Items | 17 | 0/17 |
| P2 Items | 0 | 0/0 |

**Verification Date**: TBD
<!-- /ANCHOR:summary -->
