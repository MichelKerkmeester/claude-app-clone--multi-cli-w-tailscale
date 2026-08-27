---
title: "Verification Checklist: Phase 5 host inbox and notifications"
description: "Verification Date: TBD. Level-2 QA items mapping to the CE/AN/HP-3 acceptance criteria; all open at 0%."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/005-host-inbox-notifications"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the host inbox/notification Level-2 checklist; all items open."
    next_safe_action: "Await implementation, then verify each acceptance item."
    completion_pct: 0
---

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

# Verification Checklist: Phase 5 host inbox and notifications

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

- [ ] CHK-001 [P0] All 13 findings documented as REQs, each naming its host field/RPC and the ready-now/blocked split
- [ ] CHK-002 [P0] Sequenced approach and inbox/notification batches defined in plan.md
- [ ] CHK-003 [P1] Every host request filed in `../../007-host-requests/`; inbox token-identity + test:web baseline captured
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [ ] CHK-010 [P0] Code passes eslint/format checks
- [ ] CHK-011 [P0] No console errors or warnings introduced
- [ ] CHK-012 [P1] Every host field read is fail-closed (absent field renders nothing)
- [ ] CHK-013 [P1] Changes follow the existing inbox/attention seam
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

_Acceptance criteria mapping._

- [ ] CHK-020 [P1] REQ-001 (CE-5): reading a card hides it from this device's badge only; no host state changes
- [ ] CHK-021 [P1] REQ-002 (CE-1): timeline renders nothing with field absent; renders newest-first by sessionId from a fixture
- [ ] CHK-022 [P1] REQ-003 (CE-2): a duplicate title in-window shows one card; no client-invented dedup
- [ ] CHK-023 [P1] REQ-004 (CE-3): answered ask stops glowing with stale choices on the supersede edge
- [ ] CHK-024 [P1] REQ-005 (CE-4): only the retained set renders; nothing resurrected from local cache
- [ ] CHK-025 [P1] REQ-006 (CE-6): a finished-unseen card clears on every surface after one view
- [ ] CHK-026 [P1] REQ-007 (CE-7): acting on a stale ticket shows already-handled
- [ ] CHK-027 [P1] REQ-008 (HP-3): bulk bar inert without the read-ack RPC; never fakes a batch ack
- [ ] CHK-028 [P1] REQ-009 (AN-1): host restart with a stale seq quarantines rather than drops
- [ ] CHK-029 [P1] REQ-010 (AN-2): suppressed-while-foregrounded alert surfaces on background unless answered
- [ ] CHK-030 [P1] REQ-011 (AN-3): toggling a kind off stops it before a throttle slot is spent
- [ ] CHK-031 [P1] REQ-012 (AN-4): unknown host refused, missing credential to re-pair, never a blank chat
- [ ] CHK-032 [P1] REQ-013 (AN-5): answered-elsewhere banner retracts with no show-after-dismiss flash
- [ ] CHK-033 [P0] token-identity 0-diff on inbox CSS; test:web green from the final state
- [ ] CHK-034 [P1] a11y contract (list semantics, banner roles, focus return) preserved
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [ ] CHK-FIX-001 [P0] Each finding classed (CE-5 instance-only; the rest cross-consumer over a host field)
- [ ] CHK-FIX-002 [P0] Producer inventory: every consumer of `AttentionItemDto` audited for the added `sessionId` shape
- [ ] CHK-FIX-003 [P0] Consumer inventory: every notification-tap and badge consumer audited against the new payloads
- [ ] CHK-FIX-005 [P1] Fixture matrix axes (present/absent field, in-window/out-window, known/unknown host) listed before completion
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [ ] CHK-040 [P0] Device-local read/archive and the reconnect watermark are client-only; never reach the host
- [ ] CHK-041 [P0] A notification payload is validated (hostId known) before any route; unknown host refused
- [ ] CHK-042 [P1] The client fabricates no resolved/unresolved/dedup/retention state
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [ ] CHK-050 [P1] spec/plan/tasks synchronized; every host dependency cross-referenced to `../../007-host-requests/`
- [ ] CHK-051 [P1] Code comments carry durable WHY only (no spec/finding ids in code)
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [ ] CHK-060 [P1] Changes confined to `pages/inbox/**`, `shared/{format,state}/**`, `routes/**`, and the service worker
- [ ] CHK-061 [P1] No task-created residue in the diff
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 11 | 0/11 |
| P1 Items | 23 | 0/23 |
| P2 Items | 0 | 0/0 |

**Verification Date**: TBD
<!-- /ANCHOR:summary -->
