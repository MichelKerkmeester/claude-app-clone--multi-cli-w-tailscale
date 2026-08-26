---
title: "Home list behaviour checklist — barrier for the six ✅ list-behaviour recs"
description: "Barrier sign-off for recency-sort, pull-to-refresh keep-last-good, the four-kind list states, the resume slot, single-flight Open, and haptics: fail-closed (no host field invented, status never written, host-too-old ≠ empty), pure-seam differential tests, token-identity 0-diff, test:web green, and a11y-parity. Every barrier open — nothing implemented."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-ux-mining/002-home-selection/001-list-behavior"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the open barrier for the six list-behaviour recs; no evidence yet."
    next_safe_action: "Fill each barrier with evidence during implementation when the operator says go."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Home list behaviour checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. Every barrier is OPEN —
no implementation exists yet. Because these are ✅ drop-in behaviours, the authoritative proofs are the
pure-seam differential/boundary tests (order + list-state), the keep-last-good and single-flight
interaction tests, `token-identity` for any card CSS touched, `test:web`, and an a11y-parity check.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [ ] **CHK-PRE-01** [P0] The `token-identity` and `test:web` baselines are captured before any `.svelte`
  edit, so the 0-diff / green claims have a real starting point.
- [ ] **CHK-PRE-02** [P0] The pure helpers `sortByRecency` / `deriveListState` have canonical reference
  implementations to differential-test against before wiring them into the roster.
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [ ] **CHK-CQ-01** [P0] No rec reads a field absent from `SessionCardDto` (`id`, `status`, `updatedAt`,
  `messageCount`); every enrichment is client-local interaction or an existing-field read.
- [ ] **CHK-CQ-02** [P0] No code path writes `status` or any session field — stale/order/state are view
  output only.
- [ ] **CHK-CQ-03** [P1] Order and list-state live in pure functions over the immutable snapshot (the
  cross-cutting guardrail), not inline in the `.svelte` render.
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [ ] **CHK-TEST-01** [P0] `sortByRecency` is differential-tested vs. a canonical sort and boundary-tested
  on empty / single / equal-`updatedAt` inputs.
- [ ] **CHK-TEST-02** [P0] `deriveListState` boundary tests show a failed/capability-gated fetch stays
  visibly unresolved (host-too-old / error+retry), never "no sessions".
- [ ] **CHK-TEST-03** [P0] `token-identity` resolves 0-diff across light/dark/system for any card CSS
  touched, and `test:web` passes from the final state.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [ ] **CHK-FIX-01** [P0] A rejected pull-to-refresh keeps the last-good snapshot and flips freshness to
  Stale; a refetch never flashes the empty state.
- [ ] **CHK-FIX-02** [P0] Single-flight Open disables every sibling Open while one launch is pending and
  clears on navigation/timeout so the roster cannot wedge; the disable never blocks the host route.
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [ ] **CHK-SEC-01** [P0] Fail-closed: no client-invented session truth, no `status` write, host-too-old
  distinguished from no-sessions; unknown/stale data stays visibly unresolved.
- [ ] **CHK-SEC-02** [P0] Nothing under `specs/context/**` is touched and no file outside
  `app-mobile/src/pages/home/**` + the two cited `shared/**` helpers (and their tests) changes.
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [ ] **CHK-DOC-01** [P1] `validate.sh <phase> --strict` exits 0 through its realpath from the final state.
- [ ] **CHK-DOC-02** [P1] No spec path or artifact id was introduced into any code comment (comment hygiene).
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [ ] **CHK-ORG-01** [P1] The haptics wrapper degrades to a silent no-op when `navigator.vibrate` is
  absent (Safari/PWA) and never throws.
- [ ] **CHK-ORG-02** [P2] The roster's a11y contract (live region, list semantics, focus order) is
  preserved — proven by the a11y-parity check.
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

Planned, not yet verified. When implemented, the six list-behaviour recs (1.1, 1.2, 1.9, 1.10, 1.11, 1.12)
close with the pure-seam differential/boundary tests, the keep-last-good and single-flight interaction
tests, `token-identity` at 0-diff, `test:web` green, and a11y-parity preserved — all from the final state,
with no `status` write and no invented host field.
<!-- /ANCHOR:summary -->
