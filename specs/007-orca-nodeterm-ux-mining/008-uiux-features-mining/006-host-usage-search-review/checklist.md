---
title: "Verification Checklist: Phase 6 host-gated usage/search/change-review"
description: "Verification Date: TBD. Level-2 QA items mapping to the UQ/SH/CR/TE/MI acceptance criteria; all open at 0%."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/006-host-usage-search-review"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the host-gated usage/search/change-review Level-2 checklist; all items open."
    next_safe_action: "Await implementation, then verify each acceptance and fail-closed item."
    completion_pct: 0
---

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

# Verification Checklist: Phase 6 host-gated usage/search/change-review

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

- [ ] CHK-001 [P0] All 21 findings documented as REQs in spec.md, each naming its host field and the ready-now/blocked split
- [ ] CHK-002 [P0] Fixture defined for each ready-now surface (usage resetsAt, search results, resolved path)
- [ ] CHK-003 [P1] Each blocked field tracked in `../../007-host-requests/`
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [ ] CHK-010 [P0] Code passes eslint/format checks
- [ ] CHK-011 [P0] No console errors or warnings introduced
- [ ] CHK-012 [P1] Every host-gated surface fails closed (renders nothing) with its field absent
- [ ] CHK-013 [P1] The client renders only host-pre-resolved tokens; no verdict, inference, or mutation
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing (acceptance criteria mapping)

- [ ] CHK-020 [P1] REQ-003 (UQ-3): reset-countdown formatter correct from a fixture; scheduler wakes only at the rounding boundary
- [ ] CHK-021 [P1] REQ-006 (UQ-6): used/remaining toggle never flips colour meaning; device-local
- [ ] CHK-022 [P1] REQ-005 (UQ-5): usage colour and context-meter colour are two functions; absent severity reads unknown; no shared scale
- [ ] CHK-023 [P1] REQ-001/002/004/007/008 (UQ-1/2/4/7/8): usage card inert without the payload; gating window is host-flagged; failed poll keeps last-good; stale decays; poll-cadence documented
- [ ] CHK-024 [P1] REQ-009 (SH-1): search harness debounces 180ms, gates under 2 chars, renders fixture results; live results only with the RPC
- [ ] CHK-025 [P1] REQ-010..017 (CR-1..8): each renders only its host token; unknown check degrades to muted; CR-4 reuses `diff-preview.svelte`
- [ ] CHK-026 [P1] REQ-018 (CR-9): three-tab hub deep-links (composing with NL-1) and safe-defaults on a bad link
- [ ] CHK-027 [P1] REQ-019 (TE-3): detected path inert without the RPC; resolved path opens at line:col; miss toasts
- [ ] CHK-028 [P1] REQ-020/021 (MI-1/MI-3): excerpt+prefill builds over MI-4; new-chat and branch inert until their host capability lands
- [ ] CHK-029 [P0] token-identity 0-diff on moved CSS; test:web green from the final state
- [ ] CHK-030 [P1] a11y-parity: usage sheet, search screen, source-control hub preserve dialog/listbox/tab semantics and focus return
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [ ] CHK-FIX-001 [P0] Each finding classed (usage/search/change-review are cross-consumer host-render; UQ-5 algorithmic on colour separation)
- [ ] CHK-FIX-002 [P0] Same-class producer inventory: every host-published field consumed is enumerated with its fail-closed absent behaviour
- [ ] CHK-FIX-003 [P0] Consumer inventory: `diff-preview.svelte` reuse (CR-4) and NL-1 deep-link composition (CR-9) audited
- [ ] CHK-FIX-004 [P0] TE-3 path handling includes an outside-root / miss / line:col adversarial fixture set
- [ ] CHK-FIX-007 [P1] Fixture-backed evidence pinned to a stated fixture shape, not a moving host response
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [ ] CHK-031 [P0] No fabricated check verdict, quota inference, or synthesized path; all values are host-published
- [ ] CHK-032 [P0] TE-3 opens only host-resolved targets; no device filesystem walk or local path synthesis
- [ ] CHK-033 [P1] Web URLs opened (CR-3) are host-supplied; no client-constructed provider URLs
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [ ] CHK-040 [P1] spec/plan/tasks synchronized; every blocked field cross-referenced to `../../007-host-requests/`
- [ ] CHK-041 [P1] Code comments carry durable WHY only (no spec/finding ids in code)
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [ ] CHK-050 [P1] Changes confined to `pages/{home,search,chat}/**`, `shared/{format,commands}/**`, `routes/**`
- [ ] CHK-051 [P1] No task-created residue in the diff
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 11 | 0/11 |
| P1 Items | 16 | 0/16 |
| P2 Items | 0 | 0/0 |

**Verification Date**: TBD
<!-- /ANCHOR:summary -->
