---
title: "Home list behaviour implementation summary — PLANNED"
description: "Planned stub for the six ✅ list-behaviour recs (recency-sort 1.1, pull-to-refresh keep-last-good 1.2, four-kind list states 1.9, resume slot 1.10, single-flight Open 1.11, haptics 1.12). Status Planned; implementation deferred until the operator says go. No completion claims — every anchor is written in the planned tense."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/002-home-selection/001-list-behavior"
    last_updated_at: "2026-08-26T14:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Extended the planned stub with the ten nodeterm status-grouping recs, still no code"
    next_safe_action: "Implement status-grouped roster alongside recency-sort when the operator says go"
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
| Host dependency | Orca six ✅ drop-in · fold-in unread/needs-you axis = host `attention` (⚠️ requested in `007-host-requests`) |
| nodeterm fold-in | ND-1.1/1.2/1.3/1.4/1.8/1.9/1.10 · ND-2.3/2.4/2.5 — status-grouped list |
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

The nodeterm fold-in adds (still planned) a derived status-grouped list: a `buildStatusList` projection into
fixed, always-present, attention-first sections (`attention → unread → working → idle → unknown`), each with
a count (ND-1.1/1.2); first-match membership precedence so a running-but-unread session stays under Running
(ND-1.3/2.3); newest-`updatedAt`-first within-section sort that never fabricates a clock (ND-1.4); header
counts derived by the same precedence as the rows (ND-1.9); per-id `$derived` card subscription (ND-1.8); a
device-local recency/status toggle (ND-1.10); and an unread overlay kept device-local and never folded into
`status` (ND-2.4/2.5). These ship over the existing DTO plus a device-local unread bit; the unread/needs-you
axis lights up when the host `attention` field lands — ⚠️ already requested in `007-host-requests`, not
re-requested. The status sections complement orca 1.3's time buckets (sibling `002-list-organization`), an
orthogonal grouping axis, not a replacement.
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

**Status sections complement, not replace, time buckets.** The nodeterm status-grouped list (ND-1.1) is an
orthogonal grouping axis to orca 1.3's time buckets (sibling `002-list-organization`); a device-local toggle
(ND-1.10) selects flat recency (orca 1.1) or status grouping, fail-closed on parse.

**Unread stays a device-local overlay.** The unread bit is client-only and never folded into `status`
(ND-2.5); it is set only when the session's chat is not foreground+active (ND-2.4). The Unread section and
the needs-you part of Attention fail closed to empty until the host `attention` field lands — not
re-requested, already in `007-host-requests`.
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
| `buildStatusList` precedence/count | Pending — first-match precedence holds; counts equal rows (anti-drift) |
| status-section sort | Pending — newest-`updatedAt`-first; absent clock sinks, never faked |
| unread overlay ⟂ status | Pending — unread bit never folded into `status`; recency/status toggle fails closed |
| `validate.sh --strict` | Pending — exit 0 via realpath |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

This is a planning stub; no code exists and no gate has run. Two open dependencies: the `host-too-old`
capability signal (see Decisions) — until confirmed, that state folds into `error+retry` — and the
fold-in's unread/needs-you axis, which needs the host `attention` field (⚠️ already requested in
`007-host-requests`); until it lands the Unread section is present but empty and status-only grouping ships.
Everything else is ✅ drop-in and blocked on nothing. Sibling sub-phases `002-list-organization` and `003-card-polish`
decorate this list; `003`'s card-content bundle is the ⚠️ host-dependent work that this sub-phase does not
carry.
<!-- /ANCHOR:limitations -->
