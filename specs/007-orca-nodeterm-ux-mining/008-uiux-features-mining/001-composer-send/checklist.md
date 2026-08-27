---
title: "Verification Checklist: Phase 1 composer/send"
description: "Verification Date: TBD. Level-2 QA items mapping to the CI/RS acceptance criteria; all open at 0%."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/001-composer-send"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the composer/send Level-2 checklist; all items open."
    next_safe_action: "Await implementation, then verify each acceptance item."
    completion_pct: 0
---

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

# Verification Checklist: Phase 1 composer/send

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

- [ ] CHK-001 [P0] All 7 findings documented as REQs in spec.md with acceptance criteria
- [ ] CHK-002 [P0] Sequenced approach and ambiguous-send batch defined in plan.md
- [ ] CHK-003 [P1] Composer token-identity + test:web baseline captured before any change
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [ ] CHK-010 [P0] Code passes eslint/format checks
- [ ] CHK-011 [P0] No console errors or warnings introduced
- [ ] CHK-012 [P1] Send-path error handling covers accepted/rejected/unknown
- [ ] CHK-013 [P1] Changes follow the existing composer seam and storage-helper patterns
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

_Acceptance criteria mapping._

- [ ] CHK-020 [P0] REQ-001 (CI-4): reconnect blip mid-typing does not disable the textarea; Send stays gated
- [ ] CHK-021 [P0] REQ-002 (CI-1): A→Home→B→A restores draft and staged attachment exactly; storage failure degrades to empty
- [ ] CHK-022 [P0] REQ-003 (CI-2): lost-ack-but-landed send does not restore or resend; true failure restores exact raw draft after the 20s deadline
- [ ] CHK-023 [P0] REQ-004 (RS-1): submitPrompt distinguishes accepted/rejected/unknown, ambiguity survives re-throw, distinct copy per outcome
- [ ] CHK-024 [P1] REQ-005 (RS-2): deferred error never paints the wrong session; unmounted-banner path toasts
- [ ] CHK-025 [P1] REQ-006 (RS-3): 1/2 blips stay reconnecting, 3rd flips to revoked, full auth clears the latch
- [ ] CHK-026 [P1] REQ-007 (CI-5): picker inert with catalog absent; inserts editable draft (never auto-send) and badges duplicate-source when present
- [ ] CHK-027 [P0] token-identity 0-diff on composer CSS; test:web green from the final state
- [ ] CHK-028 [P1] a11y contract (live regions, focus return) preserved on the composer
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [ ] CHK-FIX-001 [P0] Each finding classed (CI-4 class-of-bug on the disabled predicate; CI-2/RS-1 cross-consumer over send outcomes)
- [ ] CHK-FIX-002 [P0] Same-class producer inventory: every transient lock feeding the textarea `disabled` audited (CI-4)
- [ ] CHK-FIX-003 [P0] Consumer inventory: every `sendPrompt`/`submitPrompt` caller audited for the new outcome shape (RS-1)
- [ ] CHK-FIX-006 [P1] Cellular/lost-ack negative control reproduced before the CI-2 fix and proven by the same check
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [ ] CHK-030 [P0] No draft text or attachment bytes enter a DTO; the draft cache is client-only
- [ ] CHK-031 [P0] The CI-5 picker never invents rows; it renders only host catalog entries
- [ ] CHK-032 [P1] RS-3 latch never leaks auth state beyond the reconnect banner
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [ ] CHK-040 [P1] spec/plan/tasks synchronized; CI-5 host dependency cross-referenced to `../../007-host-requests/`
- [ ] CHK-041 [P1] Code comments carry durable WHY only (no spec/finding ids in code)
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [ ] CHK-050 [P1] Changes confined to `pages/chat/**` and `shared/{transport,state,commands}/**`
- [ ] CHK-051 [P1] No task-created residue in the diff
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 12 | 0/12 |
| P1 Items | 11 | 0/11 |
| P2 Items | 0 | 0/0 |

**Verification Date**: TBD
<!-- /ANCHOR:summary -->
