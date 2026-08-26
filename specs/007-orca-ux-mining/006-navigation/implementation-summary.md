---
title: "Phase 6 implementation summary — fail-closed session→chat navigation (planned)"
description: "Planned stub for the Angle-6 navigation phase: carry the id raw and re-validate id + epoch at chat entry before any load or command (6.1); separate the selection-precedence states with idempotent-only retry and a host-follow supersede (6.2); keep the list FAB distinct from the per-turn arrow (6.3); record load-earlier as not-portable-now (6.4); and add a per-session view-mode store that fails closed (6.5). Implementation deferred until the operator says go — no completion claims."
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-ux-mining/006-navigation"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Planned-state doc written; status Planned; no implementation."
    next_safe_action: "On operator go, implement 6.1 entry re-validation first, then verify."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 6 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `007-orca-ux-mining` |
| Level | 2 |
| Status | Planned |
| Requirements planned | REQ-001 … REQ-006 (recs 6.1-6.5) |
| Implementation | Deferred until the operator says go |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Nothing yet — this is a planned stub. On operator go, this phase will make session→chat navigation
fail-closed and correct. Entry re-validation (6.1) will keep the opaque id raw through the router (encoded
once at the `routes/+layout.svelte` boundary) and, at `routes/session/[id]/+page.svelte`, fail closed when the
id is absent from the authoritative roster and gate command issuance on epoch confirmation. Selection
precedence (6.2) will model "selected", "host-active", and "navigation-requested" as separate presentation
states so a snapshot refresh cannot move the user off their session, with only a host follow superseding and
retries confined to idempotent activation. The list jump-to-latest FAB in `transcript-list.svelte` will stay
distinct from the per-turn scroll-to-top arrow (6.3). Load-earlier will be recorded as not-portable-now
because the host sends the full redacted snapshot (6.4). A per-session device-local view-mode preference store
will fail closed on an unreadable store (6.5).
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

To be delivered. The plan lands each rec at an existing seam: the route (`routes/+layout.svelte` single
encode + `routes/session/[id]/+page.svelte` entry check), the reducer epoch guard (`shared/state/state.ts`)
and the `transcript.awaitingSnapshot` barrier that `screen-chat.svelte` already honours, the live-edge FAB in
`transcript-list.svelte`, and a new device-local preference helper under `shared/state/`. The two host-gated
enhancements — the true host `navigationIntent` follow (6.2) and a transcript `hasMore` page token (6.4) — are
planned as fail-closed fallbacks and deferred to `../007-host-requests`; the client invents neither. Proof
will come from fail-closed behaviour tests, `token-identity` 0-diff for the FAB/arrow split, a11y-parity, and
`test:web`, all from the final state.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Split 6.1 into an id check and an epoch check.** The id check is new at the route (fail closed when the raw
id is not in the roster, rather than rendering a live chat against `status: 'unknown'`). The epoch check
reuses what exists — `TranscriptState.epoch`, the reducer's epoch-mismatch guard, and the awaiting-snapshot
barrier — so command issuance is already gated once entry defers to it.

**6.2 ships the local-precedence core now; the true follow waits on a host field.** Local selection is
presentation only and a snapshot refresh must not change it. A genuine host-issued follow needs a host
`navigationIntent` field; until it lands, only user-initiated navigation supersedes, and no client follow is
invented.

**6.3 is a split invariant, not a new FAB.** The list FAB already exists (scrolled-up-gated, "latest"-only,
with an unread badge that is our own extra); this phase only guarantees the per-turn arrow (owned by
`../003-chat-message` rec 3.1) never merges with it.

**6.4 is a documented no-op.** The host sends the full redacted snapshot and `TranscriptState` carries no
`hasMore`, so load-earlier is recorded as not-portable-now; real paging is deferred, and synthesizing earlier
turns from a stale cache across epochs is prohibited.

**6.5 ships the fail-closed seam, not a new toggle.** orca's chat-vs-terminal split is not portable (no PTY),
so the concrete mode set is minimal; the value is a per-session device-local store that treats an unreadable
state as unresolved rather than "no overrides."
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Fail-closed entry (unknown id, epoch mismatch) | Planned — not yet run |
| Selection unchanged through a roster refresh | Planned — not yet run |
| FAB/arrow split + `token-identity` 0-diff | Planned — not yet run |
| Per-session view-mode store fails closed | Planned — not yet run |
| a11y-parity (roles/labels/focus/dismissal) | Planned — not yet run |
| `test:web` | Planned — not yet run |
| `validate.sh --strict` (via realpath) | Planned — not yet run |
| Traceability (every task → a rec 6.1-6.5) | Planned — not yet run |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

Two enhancements are host-gated and intentionally out of the ✅ scope: the true host "follow" supersede (6.2)
needs a host `navigationIntent` field, and real load-earlier pagination (6.4) needs a transcript `hasMore`
token — both requested in `../007-host-requests` and buildable when the host ships them. Until then, only
user-initiated navigation supersedes local selection, and the transcript relies on the full host snapshot. The
per-session view-mode store (6.5) carries a minimal mode set today because orca's chat-vs-terminal split is
not portable to a client with no PTY; it ships the fail-closed seam that future per-session presentation
toggles read through. Implementation is deferred until the operator says go.
<!-- /ANCHOR:limitations -->
