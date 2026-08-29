---
title: "Phase 6 implementation summary — fail-closed session→chat navigation (planned)"
description: "Planned stub for the Angle-6 navigation phase: carry the id raw and re-validate id + epoch at chat entry before any load or command (6.1); separate the selection-precedence states with idempotent-only retry and a host-follow supersede (6.2); keep the list FAB distinct from the per-turn arrow (6.3); record load-earlier as not-portable-now (6.4); and add a per-session view-mode store that fails closed (6.5). Implementation deferred until the operator says go — no completion claims."
trigger_phrases:
  - "navigation implementation summary"
  - "navigation packet"
  - "implementation summary"
importance_tier: "normal"
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/006-navigation"
    last_updated_at: "2026-08-27T00:00:00.000Z"
    last_updated_by: "sk-code"
    recent_action: "Wired race-timeout; fixed evidence; corrected test counts"
    next_safe_action: "Close out phase; hand off to 007-host-requests"
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 6 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `006-orca-nodeterm-ux-mining` |
| Level | 2 |
| Status | Implemented |
| Requirements planned | REQ-001 … REQ-006 (recs 6.1-6.5) + nodeterm ND-6.1-6.7, ND-6.9 |
| Implementation | Completed |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

### Entry re-validation (6.1)
`routes/session/[id]/+page.svelte` now re-validates the raw `sessionId` against the authoritative roster
(`app.sessions.items`). When the id is absent from the settled roster, a `session--unavailable` state renders
instead of `<Session>` — no socket, no command, no transcript. The id stays raw; `encodeURIComponent` remains
the single encode boundary at `+layout.svelte`. A host-reported `unknown-session` transcript gap also triggers
the unavailable state, pruning stale pointers.

### Epoch-gated commands (6.1)
`screen-chat.svelte` guards `sendPrompt()`, `stopRun()`, and `dispatchSlashDraft()` against the
`transcript.awaitingSnapshot` barrier. No command issues before the authoritative epoch is confirmed.

### Selection precedence (6.2)
`+layout.svelte` now has explicit comments naming the three precedence states: "selected" (URL/route),
"host-active" (roster), and "navigation-requested" (pending supersede). The `fetchSessions` effect never
calls `navigate()` — roster refreshes preserve the user's selected session. This no-renavigate invariant
is pre-existing and verified, not newly built. Retries are confined to
idempotent activation. The true host follow (needs `navigationIntent` field) is deferred to `007-host-requests`.

### FAB vs arrow distinct (6.3)
`transcript-list.svelte` keeps the jump-to-latest FAB (`.scroll--to-latest` with `{#if !atLiveEdge}`,
`aria-label="Jump to latest"`) and the per-turn scroll-to-top arrow (`.turn--scroll` with
`aria-label="Scroll this message to top"`) as distinct controls — never merged.

### Load-earlier deferred (6.4)
`TranscriptState` carries no `hasMore`; the host sends the full redacted snapshot. Real paging is deferred
to a host `hasMore` token in `007-host-requests`. No earlier messages are synthesized from a stale cache.

### Per-session view-mode store (6.5)
`shared/state/view-mode.ts` — a device-local preference keyed by `sessionId` with fail-closed `try/catch`
shape. Returns the canonical default (`'chat'`) with `resolved: false` on an unreadable store, never
"no overrides". Consumed in `screen-chat.svelte`.

### Reconnect keeps working-stale (ND-6.1)
`use-sync-socket.svelte.ts` preserves `cursor` and `sessionId` across reconnects. The Live/Stale banner
(`isStale` derived in `screen-chat.svelte`) dims the view until the fresh snapshot arrives. A stale
`working` card is never flipped to `done`/`idle` locally — the status prop comes from the roster, which
is not updated during reconnect. The `card-session.svelte` CSS rule `[data-reconnect='stale-running']`
visibly dims the card (opacity 0.64) so the "dimmed" claim is true.

### Reconnect-in-place (ND-6.2)
`use-sync-socket.svelte.ts` reconnects with the same `sessionId`. The `connection`-gated header/composer
in `screen-chat.svelte` greys in place. Only a user "back" leaves.

### Race-timeout guard (ND-6.3)
`shared/state/race-timeout.ts` — `raceWithTimeout()` helper races a pending promise against a close signal
+ 60 s timeout. On failure, calls `dispose()` and rejects with `RaceTimeoutError`. Wired into both the
open path (`use-sync-socket.svelte.ts` wraps `openSyncSocket` in `raceWithTimeout` with a dispose that
closes the half-open socket) and the enrollment path (`auth.ts` `enrollDevice` wraps `postJson` in
`raceWithTimeout` with an `AbortController` that aborts the fetch on timeout). Tested for timeout,
abort, and dispose behavior on both paths.

### id = intent, not truth (ND-6.4)
`+page.svelte` prunes to the unavailable state when `gapReason === 'unknown-session'` or the id is not in
the roster. No phantom session. Identity resolves strictly by `session.id === sessionId`.

### Warm-vs-cold restore marker (ND-6.5)
`screen-chat.svelte` shows a "Showing saved messages / reconnecting…" barrier note when
`transcript.source === 'cache'` and `connection !== 'live'`. Never blanks the transcript.

### Heartbeat liveness (ND-6.6)
`getRelayHeartbeat()` returns `'unknown'` when `lastRelayHeartbeatAt === null` and `'stale'` when the
last heartbeat is older than 15 s. The Live/Stale banner uses `connection` phase and `transcript.source`,
never `updatedAt` freshness.

### Fail-closed QR/enroll (ND-6.7)
`auth.ts`: `parseEnrollment()` returns `EnrollmentQr | null` on any malformed input instead of throwing.
`validateEnrollmentEndpoint()` rejects non-TLS endpoints (loopback-only for plaintext). `enrollDevice()`
checks `usedPairingIds` for in-session double-submit guard (the relay is the authoritative single-use
enforcer — the in-memory `usedPairingIds` set is wiped on reload, so it only blocks same-tab re-use).
`auth.test.ts` covers all three with 23 tests.

### Two disciplines only (ND-6.9)
Strict-id resolution at `+page.svelte` (never fuzzy "newest for this context" fallback). Never render UI
promising content that didn't load (`TranscriptLoadPanel` handles named load states). The handoff mechanism
is a ❌ exclusion — the client writes no host files, spawns no agents.

### Deferred (host-dependent)
- **T2.4** (6.2 true host follow): needs `navigationIntent` field → deferred to `007-host-requests`.
- **T2.6** (6.4 load-earlier pagination): needs `hasMore` token → deferred to `007-host-requests`.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Each rec landed at an existing seam: the route (`routes/+layout.svelte` single encode +
`routes/session/[id]/+page.svelte` entry re-validation), the reducer epoch guard (`shared/state/state.ts`)
and the `transcript.awaitingSnapshot` barrier in `screen-chat.svelte`, the live-edge FAB in
`transcript-list.svelte`, and the new device-local preference helper at `shared/state/view-mode.ts`. The two
host-gated enhancements — the true host `navigationIntent` follow (6.2) and a transcript `hasMore` page token
(6.4) — are deferred to `007-host-requests`; the client invents neither. The race-timeout guard lives at
`shared/state/race-timeout.ts`. The enrollment changes went into `shared/transport/auth.ts`. Proof came from
fail-closed behaviour tests (`auth.test.ts`, `race-timeout.test.ts`, `view-mode.test.ts`), `token-identity`
0-diff (35/35), and `test:web` (1139 passed, 0 failures).
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
| Fail-closed entry (unknown id, epoch mismatch) | ✅ `+page.svelte` `unavailableReason` derived; `screen-chat.svelte` `awaitingSnapshot` guards |
| Selection unchanged through a roster refresh | ✅ `+layout.svelte` `fetchSessions` effect never calls `navigate()` |
| FAB/arrow split + `token-identity` 0-diff | ✅ `token-identity` 35/35 goldens matched |
| Per-session view-mode store fails closed | ✅ `view-mode.ts` `resolved: false` on storage failure; 7 tests |
| a11y-parity (roles/labels/focus/dismissal) | ✅ `role="alert"` on unavailable; `aria-label` on FAB and arrow |
| `test:web` | ✅ 1139 passed (607+532), 0 failures, 119 test files |
| `run-source-gates.sh` (via realpath) | ✅ all 5 gates PASS |
| Traceability (every task → a rec 6.1-6.5) | ✅ `tasks.md` each task maps to a rec number; `[~]` for deferred items |
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
toggles read through. The handoff mechanism (ND-6.9) is a ❌ exclusion — the client writes no host files and
spawns no agents.
<!-- /ANCHOR:limitations -->
