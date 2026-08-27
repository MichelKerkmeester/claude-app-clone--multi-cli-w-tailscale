---
title: "Verification Checklist: Phase 3 home/switcher/nav/search"
description: "Verification Date: TBD. Level-2 QA items mapping to the HP/SC/SD/NL/SH acceptance criteria; all open at 0%."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/003-home-switcher-nav-search"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the home/switcher/nav/search Level-2 checklist; all items open."
    next_safe_action: "Await implementation, then verify each acceptance item."
    completion_pct: 0
---

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

# Verification Checklist: Phase 3 home/switcher/nav/search

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

- [ ] CHK-001 [P0] All 19 findings documented as REQs in spec.md with acceptance criteria
- [ ] CHK-002 [P0] Sequenced approach and search/dock/nav batches defined in plan.md
- [ ] CHK-003 [P1] Home token-identity + test:web baseline captured before any change
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [ ] CHK-010 [P0] Code passes eslint/format checks
- [ ] CHK-011 [P0] No console errors or warnings introduced
- [ ] CHK-012 [P1] Search, sort, and resolver logic is pure and unit-tested
- [ ] CHK-013 [P1] Changes follow the existing roster seams and preference-store patterns
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

_Acceptance criteria mapping._

- [ ] CHK-020 [P0] REQ-001 (HP-4): badge equals attention count, clears at zero, no-op where the API is absent
- [ ] CHK-021 [P1] REQ-002 (HP-1): Smart sort ranks a just-finished session above a still-working one
- [ ] CHK-022 [P1] REQ-003 (HP-5): no matching card hidden inside a collapsed section; no-op without collapsible sections
- [ ] CHK-023 [P1] REQ-004 (SC-2): density toggles per device; hidden chips do not render; no host field
- [ ] CHK-024 [P1] REQ-005 (SC-4): known tool renders a glyph, unknown falls back to text
- [ ] CHK-025 [P1] REQ-006 (SD-1): dock lists visited sessions newest-first and navigates
- [ ] CHK-026 [P1] REQ-007 (SD-2): home card and dock chip render the same badge in every state
- [ ] CHK-027 [P1] REQ-008 (SD-3): status dot reads cleanly in both themes, no dark-mode halo
- [ ] CHK-028 [P1] REQ-009 (SD-4): fade only on overflow; new chip auto-reveals only when at the end
- [ ] CHK-029 [P1] REQ-010 (SD-5): no-op remove disabled; pinned removal routes through one confirm
- [ ] CHK-030 [P1] REQ-011 (SD-6): a host-dropped id never appears in the dock
- [ ] CHK-031 [P1] REQ-012 (NL-1): deep-link tap racing a manual tap never double-pushes or blanks
- [ ] CHK-032 [P1] REQ-013 (NL-2): back pops from a card-entry, replaces from a deep-link entry
- [ ] CHK-033 [P1] REQ-014 (NL-4): hidden-tab polling stops; refocus fires one immediate read
- [ ] CHK-034 [P1] REQ-015 (NL-5): reconnect refetches rather than showing the stale snapshot
- [ ] CHK-035 [P1] REQ-016 (SH-2): preview matches surface, labelled "matched in preview"
- [ ] CHK-036 [P1] REQ-017 (SH-3): free terms match now; repo:/path: inert with host fields absent
- [ ] CHK-037 [P1] REQ-018 (SH-4): every hit corresponds to visible, highlightable preview text
- [ ] CHK-038 [P1] REQ-019 (SH-5): "clde" ranks "claude" first
- [ ] CHK-039 [P0] token-identity accounts for the SD-3 tokens with no unexpected diffs; test:web green from the final state
- [ ] CHK-040 [P1] a11y contract (roster roles, dock focus order, dismissal) preserved
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [ ] CHK-FIX-001 [P0] Each finding classed (HP-4 instance; SD-1/SD-2/SD-6 cross-consumer over the shared resolver; NL-1 algorithmic on the nav slot)
- [ ] CHK-FIX-002 [P0] Same-class producer inventory: every roster sort/filter path audited for the search batch
- [ ] CHK-FIX-003 [P0] Consumer inventory: every consumer of the shared attention-badge resolver audited (SD-2)
- [ ] CHK-FIX-006 [P1] Deep-link race and hidden-tab negative controls reproduced before NL-1 and NL-4 fixes
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [ ] CHK-050 [P0] The dock never asserts session ownership; "close" removes only a local chip
- [ ] CHK-051 [P0] Preferences, recency stack, and unread count are client-only and never reach the host
- [ ] CHK-052 [P1] SD-6 fail-closes any id absent from the host's current session set before render
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [ ] CHK-060 [P1] spec/plan/tasks synchronized; SH-3 repo:/path: dependency cross-referenced to phase 006
- [ ] CHK-061 [P1] Code comments carry durable WHY only (no spec/finding ids in code)
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [ ] CHK-070 [P1] Changes confined to `pages/home/**`, `routes/**`, the new dock component, `shared/{format,state}/**`, and `app.css`
- [ ] CHK-071 [P1] No task-created residue in the diff
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 11 | 0/11 |
| P1 Items | 28 | 0/28 |
| P2 Items | 0 | 0/0 |

**Verification Date**: TBD
<!-- /ANCHOR:summary -->
