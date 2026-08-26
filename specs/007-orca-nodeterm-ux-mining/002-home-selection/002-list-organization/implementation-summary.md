---
title: "Home list organization implementation summary — PLANNED"
description: "Planned stub for the sectioning/filtering chrome (time buckets 1.3, status chips 1.4, search chrome 1.5, device-local favorite 1.14, new-session chrome 1.13). Status Planned; implementation deferred until the operator says go. No completion claims — every anchor is written in the planned tense. The useful-search query and session-create RPC are host-blocked and deferred to 007-host-requests."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/002-home-selection/002-list-organization"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the planned-stub doc; no code, no verification run."
    next_safe_action: "Implement the ✅ chrome when the operator says go; log ⚠️ paths to 007-host-requests."
    blockers:
      - "Useful search (1.5) and session-create (1.13) need host fields/RPC in 007-host-requests"
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Home list organization implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `002-home-selection` |
| Level | 2 |
| Status | Planned — implementation deferred until the operator says "go" |
| Requirements planned | REQ-001 … REQ-006 |
| Host dependency | Partial — useful search (1.5) + session-create (1.13) are ⚠️; the chrome + 1.3/1.4/1.14 are ✅ |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Nothing is built yet. The plan is to add the home list's sectioning and filtering chrome: time-bucket
sections with counts (Active/Today/Yesterday/Older) from `updatedAt` (1.3), status filter chips over
existing `status` (1.4), a search box with two distinct empty states (1.5), a device-local favorite that
reorders the local list only (1.14), and a "New session" control disabled-until-live (1.13). The chrome and
recs 1.3/1.4/1.14 are ✅; the *useful* search query (over host `title`/`preview`) and the actual
session-create (a host RPC) are ⚠️ and are requested in `007-host-requests`, not faked on the client.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Bucketing, filtering, and the favorite float will be one composed PURE pipeline over the immutable session
snapshot (`organize(items, { filter, query, favorites })`), differential- and boundary-tested per the
cross-cutting guardrail and building on `001`'s recency-sort seam. The search box and the "New session"
control will be chrome: the search matches only client-held data with the useful query gated on a host
field, and the create control stays inert-until-live with no client-owned create. Verification will run the
pipeline differential/boundary tests, the fail-closed favorite test, the two-empty-state and inert-create
tests, `token-identity` (0-diff), `test:web`, and an a11y-parity check — all from the final state.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Time buckets only; folder/project grouping deferred.** Buckets need nothing new (`updatedAt`); folder/
project/agent grouping needs `cwd`/`projectLabel`/`agent` and a redacted-path product decision, so it is
out of scope and tracked in `007-host-requests`.

**Search chrome now, useful query later.** Matching the opaque `id` alone is low value and reads as broken;
the planned decision is to scope the input to what it can match and gate the real query on a host `title`/
`preview` field, rather than synthesize a client-side title (which would violate fail-closed and the
"opaque ids only" home rule).

**A favorite is a view preference, not session truth.** The device-local favorite reorders the local list
and fails closed on an unreadable store; a cross-device authoritative pin would be a new host mutation and
is out of scope.

**"New session" chrome cannot create.** Copying orca's worktree-creating "New Workspace" is ❌; the control
is inert-until-live chrome whose click target waits on a host session-create RPC.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Planned result |
|---|---|
| `organize` pipeline differential/boundary | Pending — matches canonical; composes without double-count/lost float |
| Fail-closed favorite | Pending — unreadable store → favorites unavailable, never host-order default |
| Two search empty states | Pending — "no sessions match" vs. "no sessions here" distinguished |
| Inert "New session" | Pending — present · disabled until live · never calls create |
| Token identity | Pending — 0-diff across light/dark/system for the new chrome |
| `test:web` | Pending — green from the final state |
| a11y-parity | Pending — chip group / labelled search input / section headings preserved |
| `validate.sh --strict` | Pending — exit 0 via realpath |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

This is a planning stub; no code exists and no gate has run. Two paths inside this chrome are host-blocked
and deliberately fail closed: a *useful* search needs a host `title`/`preview` field, and "New session"
needs a host session-create RPC — both requested in `007-host-requests`. Until they land, the search
matches only client-held data and the create control is inert. Folder/project grouping and a cross-device
pin are further ⚠️ items out of this sub-phase's scope.
<!-- /ANCHOR:limitations -->
