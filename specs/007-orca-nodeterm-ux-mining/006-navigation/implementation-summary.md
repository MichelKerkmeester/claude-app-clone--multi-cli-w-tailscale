---
title: "Phase 6 implementation summary — fail-closed session→chat navigation (planned)"
description: "Planned stub for the Angle-6 navigation phase: carry the id raw and re-validate id + epoch at chat entry before any load or command (6.1); separate the selection-precedence states with idempotent-only retry and a host-follow supersede (6.2); keep the list FAB distinct from the per-turn arrow (6.3); record load-earlier as not-portable-now (6.4); and add a per-session view-mode store that fails closed (6.5). Implementation deferred until the operator says go — no completion claims."
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/006-navigation"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Extended the planned stub with the nodeterm ND-6.1-6.7,6.9 nav folds"
    next_safe_action: "On operator go, implement ND-6.1 reconnect-undecided then verify"
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
| Parent | `007-orca-nodeterm-ux-mining` |
| Level | 2 |
| Status | Planned |
| Requirements planned | REQ-001 … REQ-006 (recs 6.1-6.5) + nodeterm ND-6.1-6.7, ND-6.9 |
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

Folded from the nodeterm Angle-6 pass (all ✅ pure interaction/logic, strongly fail-closed-aligned): reconnect
defaults to *undecided* so a stale `working` card stays `working (stale)` and is never locally promoted to
`done`/`idle` (ND-6.1); a host-connection drop greys the chat in place and reconnects the same id, never a
second view or a bounce Home (ND-6.2); any pending open/reconnect/enroll promise races a close-signal + a 60 s
timeout, never hanging (ND-6.3); a target whose `id`+`epoch` no longer validate prunes to a safe Home fallback,
never a phantom (ND-6.4); cache hydration shows a "restored" marker until the live snapshot lands (ND-6.5);
liveness rides the relay heartbeat, never `updatedAt` freshness (ND-6.6); QR/enrollment pairing parses to a
typed null (never throws), TLS-validates the endpoint, and treats the token as single-use (ND-6.7); and the two
handoff disciplines — strict-id resolution and never promising content that didn't load — are extracted
(ND-6.9). The handoff *mechanism* itself is a ❌ exclusion.
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

**Reconnect is fail-closed by default, not merely cautious (ND-6.1).** Only *live* rows can be stranded by a
lost event; an idle-really-working card self-corrects. A reconnect therefore distrusts only the live rows, and
a locally-promoted terminal state is barred — a wrong "finished" costs a false notification. Cache hydration
marks the view "restored" until the live snapshot lands, and liveness rides the heartbeat, never `updatedAt`.

**The connection-establishment boundary is hardened without a host field (ND-6.2/6.3/6.4/6.7/6.9).**
Close-vs-drop reconnects in place with the same id; a pending open/reconnect/enroll promise races close + a
60 s timeout so a dead socket cannot hang; a not-found `id`+`epoch` prunes strictly to Home; and enrollment
pairing parses to a typed null, TLS-validates, and uses a single-use token. The nodeterm handoff mechanism is
❌ — the host owns transcripts.
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
