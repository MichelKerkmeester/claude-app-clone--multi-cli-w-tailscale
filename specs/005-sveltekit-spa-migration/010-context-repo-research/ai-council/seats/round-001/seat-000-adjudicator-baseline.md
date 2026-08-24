---
round: 1
seat: seat-000
executor: native-adjudicator
lens: analytical
status: ok
timestamp: "2026-08-23T09:20:00Z"
simulated: false
---

# Adjudicator baseline — independent client-side verification

Gathered before Round 1 seats returned, so the adjudicator holds evidence independent of the seats.
Scope reserved to the browser client and the packet's own program docs; the relay server and the
protocol were left to the seats.

## Confirmed present (file:line)

**The sync client already implements most of R-01.**
`app-mobile/src/shared/data/state.ts:310-370` is the transcript reducer.
- `case 'gap'` (357-370) resets to `EMPTY_TRANSCRIPT` and sets `awaitingSnapshot: true` for every
  reason except `unknown-session`. That is "on a gap, force an explicit resync; never continue".
- `case 'delta'` (331) returns unchanged state while `awaitingSnapshot` is true — live frames are
  refused before readiness.
- `case 'delta'` (332-339) treats an epoch change as a full reset plus `awaitingSnapshot: true`.
- `case 'snapshot'` (310-329) replaces `blocks` wholesale and clears `awaitingSnapshot` + `gapReason`.
- Dedupe: `envelopes.filter((envelope) => envelope.seq > state.coversThrough)` (341).
- `blocksFromEnvelopes` (`state.ts:456-475`) additionally rejects any envelope whose `sessionId`,
  `epoch` or `seq > coversThrough` disagree, and requires `block.seq === envelope.seq`.

**A fail-closed mutation gate rides on the same flag** — not proposed by any source repo.
`awaitingSnapshot` is threaded to `Chat.svelte:171,181,443,473`, `SessionComposer.svelte:201,655`
(placeholder "Syncing with the relay…" at 276) and `submitSlashDraft.ts:88` (returns
`failed('not-live')`). While the client is recovering from a gap, every mutation is refused.

**Transport lifecycle** — `app-mobile/src/shared/data/useSyncSocket.svelte.ts`.
- Cursor-based resume: `openSyncSocket(sessionId, cursor, ...)` (177-179).
- Epoch-change on a delta closes the socket to force a fresh snapshot (183-193).
- Bounded exponential backoff capped at 15s: `Math.min(1_000 * 2 ** retryCount, 15_000)` (241, 249).
- `navigator.onLine` guard to an explicit offline state (172-175).
- `requestAnimationFrame` batching of inbound sync messages (202-215) — a frame-rate throttle.
- `retryCount` resets to 0 on any live message (219).
- Transport liveness is tracked separately from device connectivity:
  `relay.ts:98-121` (`RELAY_HEARTBEAT_MAX_AGE_MS = 15_000`, `getRelayHeartbeat` returns
  `fresh|stale|unknown` alongside `navigatorOnline`).

**R-07 is satisfied structurally, not by convention.**
`app-mobile/static/service-worker.js:160-169` refuses any push payload that is not exactly two keys,
constrains `lookupId` to `/^[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/` before it becomes a URL, and derives
the title from the three-value `attentionClass` enum (171-175). The body is the fixed string
"Open Pi Remote to fetch current state." (132). `notificationclick` (142-158) only navigates to
`/attention/<lookupId>` — there is no in-place notification action, so the "re-read before you send /
already handled" sub-claim has no surface to apply to.
Permission is requested inside `subscribeToPush` (`attention.ts:84`) behind the explicit
`PushSettings` opt-in, not on first load.

**Offline persistence is metadata-only by construction.**
`cache.ts:76-103` strips a denylist of byte-bearing keys (`bytes`, `blob`, `objectUrl`, `arrayBuffer`,
`file`, ...) from anything written to the cache; `state.ts:279-292` refuses to let a cache hydrate
overwrite `source === 'relay'`. This is OGAM's A6 already implemented, and enforced rather than
merely omitted.

## Confirmed absent (file:line)

1. **No delta contiguity check.** `state.ts:341` filters `seq > coversThrough` and `state.ts:349`
   advances `coversThrough` to `Math.max(...)`. A delta whose lowest envelope sits above
   `coversThrough + 1` is applied and the cursor jumps — the hole is never detected. The dedupe
   half of R-01's client rule ships; the *verification* half does not.

2. **No close-code classification.** `useSyncSocket.svelte.ts:234-242` treats every close
   identically: increment `retryCount`, reconnect with backoff. A permanent authorization failure
   reconnects forever behind a "connecting" indicator instead of surfacing re-enrollment.

3. **No client-side liveness timeout.** `getRelayHeartbeat` computes staleness but nothing closes a
   socket that has gone quiet. A half-open connection stays "open" with no data indefinitely.

4. **No test covers the gap → resync path.** `app-mobile/tests/` has no transcript sync-reducer
   test: `transcript-scope.test.ts` covers cross-session scoping only; `todo-state.test.ts` covers
   the todo projection reducer. Grep for `sync.gap` and `awaitingSnapshot` across `tests/` returns
   only fixture literals in `submitSlashDraft.test.ts:193`, `ask-question-card.svelte.test.ts:360`
   and `submitSlashDraftTransport.test.ts:62`.

## Local evidence bearing on R-04

The prior pass filed R-04 ("one service owns the state machine") as Deferred. Local evidence is
stronger than the imported evidence: 19 hand-placed `untrack()` guards across 11 files
(`+layout.svelte` 3, `useSyncSocket.svelte.ts` 3, `hostCommandCatalog.svelte.ts` 3, `Chat.svelte` 2,
`AttachmentDraftProvider.svelte` 2, and six single sites), each defending an `$effect` that both
reads and writes the state it reduces. That is the same "two owners of one truth" smell R-04 names,
recorded seven times already in this program as `$effect` self-invalidation.

## Program context the research sweep could not see

- `011-ux-affordances/spec.md` is the ONLY packet permitted to change a rendered value; it currently
  holds one requirement at ~90%. Any visual recommendation must land there or nowhere.
- `TranscriptList.svelte`'s `followToBottom()`, live-edge threshold, virtualization and turn grouping
  sit behind a `@ds guardrail: do-not-edit` fence (`011-ux-affordances/spec.md:68-70`).
- `007-verify-and-cutover/a11y-parity-findings.md:9-26`: all P0 and P1 a11y items are FIXED and
  independently re-verified; P2 items are deferred amendment candidates. Do not re-propose them.
- That same document records the structural blind spot: token-identity, CDP and the backend suite
  are all blind to the a11y class. Any recommendation whose regression is invisible to the nine
  gates needs its own check, or it is unenforceable.
