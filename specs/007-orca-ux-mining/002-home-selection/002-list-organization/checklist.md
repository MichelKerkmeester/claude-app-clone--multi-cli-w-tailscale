---
title: "Home list organization checklist — barrier for the sectioning/filter/search/favorite/new-session chrome"
description: "Barrier sign-off for time buckets, status chips, search chrome + two empty states, device-local favorite, and new-session chrome: fail-closed (no client create, no invented title, favorite unreadable-store fails closed), composed-pipeline differential tests, token-identity 0-diff, test:web green, and a11y-parity. Every barrier open — nothing implemented."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-ux-mining/002-home-selection/002-list-organization"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the open barrier for the five list-organization recs; no evidence yet."
    next_safe_action: "Fill each barrier with evidence during implementation when the operator says go."
    blockers:
      - "Useful search (1.5) and session-create (1.13) barriers stay open pending 007-host-requests"
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Home list organization checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. Every barrier is OPEN —
no implementation exists yet. The authoritative proofs are the composed-pipeline differential/boundary
tests (bucket × filter × favorite), the fail-closed favorite test, the two-empty-state and inert-create
tests, `token-identity` for the new chrome CSS, `test:web`, and an a11y-parity check.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [ ] **CHK-PRE-01** [P0] The `token-identity` and `test:web` baselines are captured before any `.svelte`
  edit, so the 0-diff / green claims have a real starting point.
- [ ] **CHK-PRE-02** [P0] The `organize(...)` pipeline has a canonical reference implementation to
  differential-test against before it is wired into the roster.
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [ ] **CHK-CQ-01** [P0] Buckets, filter, and favorite are one composed pure function over the immutable
  snapshot (the cross-cutting guardrail), not inline `.svelte` render logic.
- [ ] **CHK-CQ-02** [P0] No rec reads a field absent from `SessionCardDto`; buckets read `updatedAt`/
  `status`, the filter reads `status`, the favorite is a client preference. No `status` is written.
- [ ] **CHK-CQ-03** [P0] The search input matches only client-held data; no client-side `title`/`preview`
  is synthesized. The useful query is gated on a host field requested in `007-host-requests`.
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [ ] **CHK-TEST-01** [P0] The composed pipeline is differential-tested vs. canonical and boundary-tested
  (empty · one · all-filtered · favorite-in-section) with no double-count or lost float.
- [ ] **CHK-TEST-02** [P0] The two search empty states are distinguished ("no sessions match" vs. "no
  sessions here").
- [ ] **CHK-TEST-03** [P0] `token-identity` resolves 0-diff across light/dark/system for the new chrome,
  and `test:web` passes from the final state.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [ ] **CHK-FIX-01** [P0] The device-local favorite fails closed: an unreadable preference store surfaces
  "favorites unavailable", never a silent host-order default; the favorite is never treated as session truth.
- [ ] **CHK-FIX-02** [P0] The "New session" control is inert-until-live and never calls a client-owned
  create; the session-create RPC dependency is logged in `007-host-requests`.
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [ ] **CHK-SEC-01** [P0] Fail-closed: no client-owned create, no invented title/preview, no `status`
  write; the ⚠️ paths stay inert until the host ships.
- [ ] **CHK-SEC-02** [P0] Nothing under `specs/context/**` is touched and no file outside
  `app-mobile/src/pages/home/**` + the cited `shared/**` helpers (and their tests) changes.
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [ ] **CHK-DOC-01** [P1] `validate.sh <phase> --strict` exits 0 through its realpath from the final state.
- [ ] **CHK-DOC-02** [P1] The two host dependencies (useful search field, session-create RPC) are recorded
  in `007-host-requests` with the UI they unlock and the fail-closed fallback; no spec path or artifact id
  is introduced into any code comment.
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [ ] **CHK-ORG-01** [P1] The bucket helper sits in `shared/format/view-helpers.ts` next to `relativeTime`;
  the favorite preference helper follows the existing `shared/state/` preference pattern.
- [ ] **CHK-ORG-02** [P2] The chrome's a11y contract (chip group, labelled search input, section headings)
  is preserved — proven by the a11y-parity check.
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

Planned, not yet verified. When implemented, the ✅ chrome (recs 1.3, 1.4, 1.14, and the 1.5/1.13 chrome)
closes with the composed-pipeline differential tests, the fail-closed favorite and two-empty-state tests,
the inert-create test, `token-identity` at 0-diff, `test:web` green, and a11y-parity — all from the final
state. The 1.5 useful query and 1.13 create stay host-blocked and fail-closed until `007-host-requests`.
<!-- /ANCHOR:summary -->
