---
title: "Home list behaviour implementation summary — PLANNED"
description: "Planned stub for the six ✅ list-behaviour recs (recency-sort 1.1, pull-to-refresh keep-last-good 1.2, four-kind list states 1.9, resume slot 1.10, single-flight Open 1.11, haptics 1.12). Status Planned; implementation deferred until the operator says go. No completion claims — every anchor is written in the planned tense."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/002-home-selection/001-list-behavior"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the planned-stub doc; no code, no verification run."
    next_safe_action: "Implement the six recs when the operator says go, then fill this doc."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Home list behaviour implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `002-home-selection` |
| Level | 2 |
| Status | Planned — implementation deferred until the operator says "go" |
| Requirements planned | REQ-001 … REQ-007 |
| Host dependency | None — all six recs are ✅ drop-in |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Nothing is built yet. The plan is to add six ✅ client-local behaviours to the home roster: recency-sort
by `updatedAt` (1.1), pull-to-refresh that keeps the last-good snapshot on failure (1.2), a four-kind list
state machine — loading · error+retry · host-too-old · ready — that keeps old data on refetch (1.9), a
reserved resume slot filled from cache and inert until live (1.10), single-flight Open (1.11), and a
no-op-safe haptics taxonomy (1.12). All read existing `SessionCardDto` fields or are pure interaction;
none writes `status` or needs a new host field.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Order and list-state will be extracted as PURE functions over the immutable `SessionListState` snapshot
(`sortByRecency`, `deriveListState`) so each is differential- and boundary-testable per the cross-cutting
guardrail; the four interaction recs will be built as local view state around the existing list-load and
`onSelect` routes, leaving the host route untouched. Verification will run the pure-seam differential/
boundary tests, the keep-last-good and single-flight interaction tests, `token-identity` (0-diff for any
card CSS touched), `test:web`, and an a11y-parity check on the roster — all from the final state.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Extract order/state as a pure seam.** Home sort and list-state carry data, so they become pure functions
over the snapshot rather than inline render logic — the guardrail that keeps every later drop-in provably
faithful and lets "host-too-old ≠ empty" be boundary-tested in one place.

**Fail closed on the missing capability signal.** `host-too-old` needs a relay capability/version marker.
Planned decision: if no such signal exists, fold the unknown case into `error+retry` rather than mislabel
it "no sessions"; a dedicated capability field is an `007-host-requests` item, not a client invention.

**Presentation only — never write `status`.** Every affordance derives a view from existing fields; the
resume slot and single-flight disable are local interaction state that never mutates session truth.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Planned result |
|---|---|
| `sortByRecency` differential/boundary | Pending — matches a canonical sort; stable on empty/single/equal |
| `deriveListState` boundary | Pending — failed/gated fetch stays visibly unresolved, never "no sessions" |
| Pull-to-refresh keep-last-good | Pending — a rejected refresh keeps prior items + shows Stale |
| Single-flight Open | Pending — one launch disables sibling Opens |
| Token identity | Pending — 0-diff across light/dark/system for any card CSS touched |
| `test:web` | Pending — green from the final state |
| a11y-parity | Pending — roster live region / list semantics / focus order preserved |
| `validate.sh --strict` | Pending — exit 0 via realpath |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

This is a planning stub; no code exists and no gate has run. The one open dependency is the `host-too-old`
capability signal (see Decisions) — until it is confirmed, that state folds into `error+retry`. Everything
else is ✅ drop-in and blocked on nothing. Sibling sub-phases `002-list-organization` and `003-card-polish`
decorate this list; `003`'s card-content bundle is the ⚠️ host-dependent work that this sub-phase does not
carry.
<!-- /ANCHOR:limitations -->
