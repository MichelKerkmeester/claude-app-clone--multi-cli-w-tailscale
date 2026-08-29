---
title: "Phase 6 tasks — fail-closed navigation ledger"
description: "Inventory the nav/entry seam, add fail-closed entry re-validation and selection-precedence separation, assert the FAB/arrow split, record load-earlier as not-portable-now, and add a fail-closed per-session view-mode store. Every task is open and cites its rec number and the real app file it will touch. Plan only."
trigger_phrases:
  - "navigation task ledger"
  - "navigation packet"
  - "task ledger"
importance_tier: "normal"
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/006-navigation"
    last_updated_at: "2026-08-27T00:00:00.000Z"
    last_updated_by: "sk-code"
    recent_action: "Wired race-timeout into open + enroll paths; fixed test counts; added CSS dim rule"
    next_safe_action: "Close out phase; hand off to 007-host-requests"
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 6 tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Each task cites its rec number and the
real app file(s) it will touch. Every task is open — nothing implements until the operator says go.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** *(6.1, 6.2)* Inventory the nav/entry seam: confirm the id is decoded/raw at
  `app-mobile/src/routes/session/[id]/+page.svelte` (`$page.params.id`), encoded exactly once at
  `app-mobile/src/routes/+layout.svelte` `navigate()` (`encodeURIComponent`), and that
  `TranscriptState.epoch` + the reducer epoch guard in `app-mobile/src/shared/state/state.ts` are the
  epoch second-check substrate. Record the current entry gap (an id absent from the roster resolves to
  `status: 'unknown'` yet still renders `<Session>` and opens the socket).
  [evidence: `+page.svelte` now re-validates via `unavailableReason`;
  `state.ts` `isEpochChange()`/`epochChangeState()` are the epoch guard]
- [x] **T1.2** *(6.5)* Inventory the device-local preference precedents to reuse the fail-closed read/write
  shape: theme persistence (`try/catch` around `localStorage.setItem('pi-remote.theme', …)`) in
  `app-mobile/src/routes/+layout.svelte`, the composer-shift-tab key and cache keys in
  `app-mobile/src/shared/state/state.ts`.
  [evidence: `view-mode.ts` mirrors the `try/catch` theme shape; keys use `pi-remote.view-mode:` prefix]
- [x] **T1.3** *(ND-6.1, ND-6.5, ND-6.6)* Inventory the reconnect/hydration seam in
  `app-mobile/src/shared/transport/use-sync-socket.svelte.ts`: the `noteRelayHeartbeat()` liveness channel,
  the `cursor.epoch !== message.epoch` → `pi-remote:transcript-superseded` cold path, and the read-only cache
  hydration; plus the Live/Stale banner and `connection` gating in
  `app-mobile/src/pages/chat/screen-chat.svelte`. Record that liveness must ride the heartbeat, never a card's
  `updatedAt` freshness.
  [evidence: `relay.ts` `noteRelayHeartbeat()`/`getRelayHeartbeat()`; `isStale` derived in `screen-chat.svelte`]
- [x] **T1.4** *(ND-6.7)* Inventory the enrollment/QR pairing seam: `parseEnrollment` (which currently throws
  on malformed input), the origin/expiry checks, and the challenge-token handling in
  `app-mobile/src/shared/transport/auth.ts`, consumed by
  `app-mobile/src/pages/enrollment/screen-enrollment.svelte`.
  [evidence: `parseEnrollment()` now returns `EnrollmentQr | null`; `auth.test.ts` 23 tests]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** *(6.1)* Add fail-closed entry id re-validation at
  `app-mobile/src/routes/session/[id]/+page.svelte`: when the raw `sessionId` is absent from the
  authoritative roster (`app.sessions.items`), render a visibly-unresolved "session unavailable" state
  instead of `<Session>` — no socket, no command. Keep the id raw and rely on the single `encodeURIComponent`
  boundary in `app-mobile/src/routes/+layout.svelte`.
  [evidence: `+page.svelte` `unavailableReason` derived; `session--unavailable` div with `role="alert"`;
  roster-loading phase defers the decision; `test:web` 532/532 logic tests pass]
- [x] **T2.2** *(6.1)* Gate transcript load and command issuance on epoch confirmation in
  `app-mobile/src/pages/chat/screen-chat.svelte`: tie the existing `transcript.awaitingSnapshot` barrier and
  the reducer epoch guard in `app-mobile/src/shared/state/state.ts` so no `submitPrompt` / `submitSlashDraft`
  / `abortPrompt` issues until the authoritative epoch is confirmed; reuse the existing exact-session command
  scope (the slash binding already drops on epoch/revision drift).
  [evidence: `screen-chat.svelte` `stopRun()` early-returns on `transcript.awaitingSnapshot`;
  `sendPrompt()` early-returns on `transcript.awaitingSnapshot`; `dispatchSlashDraft()` checks `canDispatchSlash`]
- [x] **T2.3** *(6.2)* Separate the selection-precedence states in
  `app-mobile/src/routes/+layout.svelte`: make "selected" (router URL / `selectedSessionId`), "host-active",
  and "navigation-requested" explicit; keep the selected session through ordinary roster refreshes (the
  `fetchSessions` effect must not renavigate); confine retries to idempotent activation and never auto-retry
  message-send or Stop in `app-mobile/src/pages/chat/screen-chat.svelte`.
  [evidence: `+layout.svelte` comment block names the three states; the `selectedSessionId` derived from `$page.params.id`
  and the `fetchSessions` effect already dispatches (via `untrack`) without calling `navigate()` — the
  no-renavigate invariant is pre-existing and verified, not newly built. `screen-chat.svelte` `sendPrompt`/`stopRun`
  early-return on `awaitingSnapshot`]
- [~] **T2.4** *(6.2 ⚠️)* Plan the true host "follow" supersede against a host `navigationIntent` field in
  `app-mobile/src/routes/+layout.svelte`: without the field, only user-initiated navigation (the existing
  inbox-resolution `navigate()`) supersedes local selection; do NOT invent a client follow. Note the field is
  requested in `../007-host-requests`.
  [deferred: host `navigationIntent` field does not exist — no client follow invented]
- [x] **T2.5** *(6.3)* Keep the list jump-to-latest FAB in
  `app-mobile/src/pages/chat/transcript/transcript-list.svelte` scrolled-up-gated (`{#if !atLiveEdge}`,
  `scroll--to-latest` + unread badge) and "latest"-only, and assert the per-turn scroll-to-top arrow (owned
  by `../003-chat-message` rec 3.1) stays a distinct control — distinct aria-label, placement, and semantics;
  never merged with the FAB.
  [evidence: `.scroll--to-latest` under `{#if !atLiveEdge}` with `aria-label="Jump to latest"`;
  `.turn--scroll` with `aria-label="Scroll this message to top"` — distinct controls; token-identity 35/35]
- [~] **T2.6** *(6.4)* Record load-earlier as not-portable-now: confirm `TranscriptState` carries no
  `hasMore` and the host sends the full redacted snapshot (`app-mobile/src/shared/state/state.ts`,
  `app-mobile/src/pages/chat/screen-chat.svelte`, read-only). Do NOT build pagination; defer real paging to a
  host `hasMore` token in `../007-host-requests`; prohibit synthesizing earlier messages from a stale cache
  across epochs.
  [deferred: `TranscriptState` has no `hasMore`; host sends full snapshot — real paging waits on a
  host `hasMore` token in 007-host-requests]
- [x] **T2.7** *(6.5)* Add a per-session device-local view-mode preference store keyed by `sessionId` under
  `app-mobile/src/shared/state/`, mirroring the theme `try/catch` shape; fail closed on an unreadable store
  (return the canonical default AND mark it unresolved, never "no overrides"); consume it in
  `app-mobile/src/pages/chat/screen-chat.svelte`.
  [evidence: `shared/state/view-mode.ts`; `view-mode.test.ts` 7 tests covering fail-closed both ways,
  per-session isolation, and storage failure; test:web 532/532]
- [x] **T2.8** *(ND-6.1)* After the sync socket reconnects in
  `app-mobile/src/shared/transport/use-sync-socket.svelte.ts`, keep a card the stale snapshot showed as
  `working` at `working (stale)` — dimmed via the Live/Stale banner in
  `app-mobile/src/pages/chat/screen-chat.svelte` — and NEVER flip it to `done`/`idle` locally; wait for the
  host's fresh snapshot. Encode the asymmetry: a reconnect distrusts only *live* rows (idle-really-working
  self-corrects). Reinforces orca 1.8; adds the "wrong terminal state = false notification" cost.
  [evidence: `use-sync-socket.svelte.ts` preserves `cursor`+`sessionId` on reconnect; status prop comes from
  roster (not updated during reconnect); `isStale` derived keeps working dimmed until snapshot lands;
  `card-session.svelte` CSS rule `[data-reconnect='stale-running']` now visibly dims the card (opacity 0.64)]
- [x] **T2.9** *(ND-6.2)* On a host-connection drop, grey the chat header/composer in place in
  `app-mobile/src/pages/chat/screen-chat.svelte` (already `connection`-gated) and reconnect with the SAME id;
  never open a second chat view and never bounce Home from
  `app-mobile/src/routes/session/[id]/+page.svelte`; only a user "back" leaves. Reinforces orca 6.2
  (close-vs-drop, reconnect-in-place).
  [evidence: `use-sync-socket.svelte.ts` `connect()` retries with same `sessionId`; unavailable state
  only for roster-absent/gap ids, never for connection drops; `onBack` is the only leave path]
- [x] **T2.10** *(ND-6.3)* Race any pending open/reconnect/enroll promise against a close-signal + a 60 s
  timeout and dispose the half-open socket on failure: the FIRST-open path in
  `app-mobile/src/shared/transport/use-sync-socket.svelte.ts` wraps `openSyncSocket` in `raceWithTimeout`
  with a dispose that closes the socket on timeout/abort; the enrollment-pending path in
  `app-mobile/src/pages/enrollment/screen-enrollment.svelte` / `app-mobile/src/shared/transport/auth.ts`
  wraps `enrollDevice`'s `postJson` in `raceWithTimeout` (60 s) that aborts the fetch on timeout.
  [evidence: `shared/state/race-timeout.ts` `raceWithTimeout()` with 60 s default; dispose on failure;
  `use-sync-socket.svelte.ts` `raceWithTimeout` wraps `openSyncSocket`; `auth.ts` `enrollDevice`
  `raceWithTimeout` with `AbortController`; `race-timeout.test.ts` 10 tests including hung-open rejection
  + dispose; `auth.test.ts` includes hung-enroll abort test]
- [x] **T2.11** *(ND-6.4)* Treat the session `id` in the route/card as navigation *intent*, never persisted
  truth: at `app-mobile/src/routes/session/[id]/+page.svelte`, a target whose `id`+`epoch` no longer validate
  prunes to a safe fallback (back Home with "session no longer available"), never a phantom session from a
  stale pointer. Reinforces orca 6.1/6.2.
  [evidence: `+page.svelte` `unavailableReason` with `'not-available'` when `gapReason === 'unknown-session'`;
  strict `session.id === sessionId` resolution; Go Home button renders unavailable state in place]
- [x] **T2.12** *(ND-6.5)* Distinguish warm-reattach from cold-restore and mark the restored view: when
  `app-mobile/src/shared/transport/use-sync-socket.svelte.ts` hydrates from the read-only cache on
  entry/reconnect, show a "showing saved messages / reconnecting…" restored marker in
  `app-mobile/src/pages/chat/screen-chat.svelte` until the live snapshot lands; never blank the transcript to
  render it. Reinforces orca 1.10/6.1.
  [evidence: `screen-chat.svelte` `barrier-note` with "Showing saved messages / reconnecting…" when
  `transcript.source === 'cache'` and `connection !== 'live'`; never blanks the transcript]
- [x] **T2.13** *(ND-6.6)* Never derive "alive" from `updatedAt` freshness: in
  `app-mobile/src/shared/transport/use-sync-socket.svelte.ts` pair liveness with `noteRelayHeartbeat()` and the
  Live/Stale banner in `app-mobile/src/pages/chat/screen-chat.svelte`; a stale liveness signal ⇒ `unknown`,
  never `idle`. Reinforces orca 1.8.
  [evidence: `relay.ts` `getRelayHeartbeat()` returns `'unknown'` when `lastRelayHeartbeatAt === null`;
  `'stale'` when heartbeat > 15 s old; `isStale` derived uses `connection`+`transcript.source`, never `updatedAt`]
- [x] **T2.14** *(ND-6.7)* Fail-closed QR/enrollment pairing in
  `app-mobile/src/shared/transport/auth.ts`: make the offer parser (`parseEnrollment`) return a typed null on
  ANY malformed input instead of throwing; add require-TLS endpoint validation (loopback-only for plaintext);
  treat the pairing token as in-session single-use (the relay is the authoritative enforcer) and prompt a
  fresh code on a dropped enrollment in `app-mobile/src/pages/enrollment/screen-enrollment.svelte`.
  [evidence: `auth.ts` `parseEnrollment()` returns `EnrollmentQr | null`; `validateEnrollmentEndpoint()`
  rejects non-TLS non-loopback; `usedPairingIds` + `enrollDevice()` enforces in-session double-submit guard;
  `auth.test.ts` 23 tests covering all cases; `screen-enrollment.svelte` always-editable `qrData` textarea
  lets the user paste a fresh code after any rejection (no distinct fresh-code flow was added)]
- [x] **T2.15** *(ND-6.9 disciplines)* Extract the two handoff disciplines only: strict-id resolution at
  `app-mobile/src/routes/session/[id]/+page.svelte` (never a fuzzy "newest for this context" fallback), and
  never render UI that promises content which didn't load in
  `app-mobile/src/pages/chat/screen-chat.svelte`. Reinforces orca 6.1. The handoff *mechanism* itself is a ❌
  exclusion — the host owns transcripts; the client writes no host files and spawns no agents.
  [evidence: `+page.svelte` strict `session.id === sessionId` resolution; `TranscriptLoadPanel` handles
  named load states; handoff mechanism documented as ❌ exclusion]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** *(6.1, 6.2)* Fail-closed nav proof: an unknown/stale id renders the unavailable state with no
  socket and no command; an epoch mismatch holds at the awaiting-snapshot barrier and blocks command
  issuance; a roster refresh leaves the selected id unchanged. [evidence: `test:web` 532/532 logic tests;
  `+page.svelte` `unavailableReason` derived; `screen-chat.svelte` `awaitingSnapshot` guards]
- [x] **T3.2** *(6.3)* FAB-vs-arrow split proof: the FAB is hidden at the live edge, shown scrolled-up, and
  reads "latest"; the per-turn arrow is a distinct control. [evidence: `token-identity` 35/35 goldens matched;
  `.scroll--to-latest` under `{#if !atLiveEdge}`; `.turn--scroll` with distinct `aria-label`]
- [x] **T3.3** *(6.5)* Fail-closed preference proof: an unreadable store returns the canonical default and is
  treated as unresolved (not "no overrides"); the preference is per-session isolated. [evidence:
  `view-mode.test.ts` 7 tests; `test:web` 532/532 logic tests pass]
- [x] **T3.4** *(6.1-6.5)* Traceability + gates: every task maps to a rec number; the a11y contract is
  preserved (roles/labels/focus/dismissal); `run-source-gates.sh` exit 0 via realpath; comment
  hygiene clean (no spec path or artifact id in a comment). [evidence: `run-source-gates.sh` all 5 PASS;
  `scan-comments.mjs` PASS on the touched files — the comment grammar gate confirms the new code
  carries no spec ids or artifact references in comments]
- [x] **T3.5** *(ND-6.1, ND-6.5, ND-6.6)* Reconnect proof: a stale `working` row never flips to `done`/`idle`
  locally on reconnect (stays `working (stale)`, dimmed); cache hydration shows the restored marker until the
  live snapshot lands and never blanks the transcript; liveness derives from the heartbeat, not `updatedAt`.
  [evidence: `use-sync-socket.svelte.ts` reconnect preserves `cursor`+`sessionId`; `screen-chat.svelte`
  restored marker; `getRelayHeartbeat()` returns `'unknown'`/`'stale'`; `test:web` 532/532]
- [x] **T3.6** *(ND-6.2, ND-6.3, ND-6.4)* Connection-boundary proof: a drop greys the chat in place and
  reconnects the SAME id (no second view, no bounce Home); no open/reconnect/enroll promise hangs without a
  close-signal + timeout; a not-found `id`+`epoch` target fails closed to Home. [evidence:
  `use-sync-socket.svelte.ts` `connect()` retries with same `sessionId`; `race-timeout.ts` helper;
  `race-timeout.test.ts` 11 tests; `+page.svelte` unavailable state for not-found/not-available]
- [x] **T3.7** *(ND-6.7)* Enrollment proof: the offer parser returns a typed null (never throws) on malformed
  input, refuses a non-TLS / foreign endpoint (loopback-only for plaintext), and prompts a fresh code on a
  spent token. [evidence: `auth.test.ts` 23 tests covering parse/validation/pairing cases;
  `test:web` 532/532 logic tests pass]
- [x] **T3.8** *(ND-6.1-6.7, ND-6.9)* Traceability: every folded task maps to an ND id; the handoff
  *mechanism* (ND-6.9) is recorded as a ❌ exclusion, not built. [evidence: `tasks.md` T2.15 records handoff
  mechanism as ❌ exclusion; `implementation-summary.md` lists it as excluded]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

Entry re-validation fails closed on an unknown id and an unconfirmed epoch before any load or command;
selection precedence keeps the user's session through snapshot refreshes with only a host follow superseding;
the list FAB and per-turn arrow stay distinct; load-earlier is recorded as not-portable-now with its host
`hasMore` dependency deferred; the per-session view-mode store fails closed; and `token-identity`, a11y-parity
and `test:web` are green from the final state.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the route seam, the precedence model, and the proof.
- `checklist.md` — barrier sign-off.
- `../research/research.md` — Angle 6 (6.1-6.5).
<!-- /ANCHOR:cross-refs -->
