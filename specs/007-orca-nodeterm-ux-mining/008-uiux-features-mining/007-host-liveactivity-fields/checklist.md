---
title: "Verification Checklist: Phase 7 Live-Activity and host DTO fields"
description: "Verification Date: TBD. Level-2 QA items mapping to the LA/SC/CI/MA/SP/HP acceptance criteria; all open at 0%."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/007-host-liveactivity-fields"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the Live-Activity and host DTO-field Level-2 checklist; all items open."
    next_safe_action: "Await implementation, then verify each acceptance item."
    completion_pct: 0
---

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

# Verification Checklist: Phase 7 Live-Activity and host DTO fields

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

- [ ] CHK-001 [P0] All 13 findings documented as REQs in spec.md with acceptance criteria and a named host dependency or "none"
- [ ] CHK-002 [P0] Sequenced approach (ready-now first, host-gated inert) and the attention-resolver batch defined in plan.md
- [ ] CHK-003 [P1] Touched-surface token-identity + test:web baseline captured before any change
- [ ] CHK-004 [P1] Each host-gated field tracked in `../../007-host-requests/`
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [ ] CHK-010 [P0] Code passes eslint/format checks
- [ ] CHK-011 [P0] No console errors or warnings introduced
- [ ] CHK-012 [P1] The five ready-now LA modules are pure and reused by the home card without duplication
- [ ] CHK-013 [P1] Every host-gated affordance is fail-closed inert with its field absent
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

_Acceptance criteria mapping._

- [ ] CHK-020 [P1] REQ-001 (LA-1): arbitration picks the correct session across tier and tie cases against a fixture
- [ ] CHK-021 [P1] REQ-002 (LA-2): a tick never re-elects; only a state edge changes the winner
- [ ] CHK-022 [P1] REQ-003 (LA-3): same input yields the same clipped string on every surface; no blank line between turns
- [ ] CHK-023 [P1] REQ-004 (LA-4): inert with the push contract absent; edges immediate and ticks coalesced against a fixture
- [ ] CHK-024 [P1] REQ-005 (LA-5): surface grays after the staleness window even if the end push is lost; re-arms on update
- [ ] CHK-025 [P1] REQ-006 (LA-6): done treatment neutral with the flag absent; honest interrupted/stale against a fixture flag
- [ ] CHK-026 [P1] REQ-007 (LA-7): dismiss latches state; unchanged state stays hidden; a genuine move re-shows the row
- [ ] CHK-027 [P1] REQ-008 (CI-3): composer unchanged with fields absent; adopt-once and retire against a fixture
- [ ] CHK-028 [P1] REQ-009 (MA-3): notice unchanged with kind absent; play then revoke against a fixture object URL
- [ ] CHK-029 [P1] REQ-010 (SC-1): chip absent with no cacheExpiresAt; counts down and clears at expiry against a fixture
- [ ] CHK-030 [P1] REQ-011 (SC-3): elapsed renders now; count segments absent with no counts, never faked; live against a fixture
- [ ] CHK-031 [P1] REQ-012 (SP-3): tail absent with no stream; live feed and expand against a fixture stream
- [ ] CHK-032 [P1] REQ-013 (HP-6): home ungrouped with no projectLabel; auto-collapse and explicit-toggle against a fixture label
- [ ] CHK-033 [P0] token-identity 0-diff on the touched CSS; test:web green from the final state
- [ ] CHK-034 [P1] a11y contract preserved on the touched surfaces
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [ ] CHK-FIX-001 [P0] Each finding classed (LA-1/2/3/5/7 algorithmic pure modules; the eight host-gated as cross-consumer over a new read-only field)
- [ ] CHK-FIX-002 [P0] Same-class producer inventory: every surface reading the shared attention resolver audited (LA-1, phase-003 dock, Live Activity)
- [ ] CHK-FIX-003 [P0] Consumer inventory: every home-card and glanceable consumer of the LA content fallback audited (LA-3)
- [ ] CHK-FIX-005 [P1] Fixture matrix listed for each host-gated finding (absent-field and present-field rows) before completion is claimed
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [ ] CHK-040 [P0] The MA-3 object URL is scoped and revoked on teardown; no media bytes persist beyond the preview or enter a DTO
- [ ] CHK-041 [P0] No host-gated affordance fabricates a value when its field is absent
- [ ] CHK-042 [P1] The LA local first-seen and latched-dismiss state stays client-only and never reaches the host
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [ ] CHK-050 [P1] spec/plan/tasks synchronized; every host-gated finding cross-referenced to `../../007-host-requests/`
- [ ] CHK-051 [P1] Code comments carry durable WHY only (no spec/finding ids in code)
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [ ] CHK-060 [P1] Changes confined to `shared/{format,state,commands}/**`, `pages/{home,chat}/**`, `attention.ts`, and the service worker
- [ ] CHK-061 [P1] No task-created residue in the diff
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 10 | 0/10 |
| P1 Items | 24 | 0/24 |
| P2 Items | 0 | 0/0 |

**Verification Date**: TBD
<!-- /ANCHOR:summary -->
