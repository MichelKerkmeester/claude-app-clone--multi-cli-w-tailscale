---
title: "Phase 6 tasks — fail-closed navigation ledger"
description: "Inventory the nav/entry seam, add fail-closed entry re-validation and selection-precedence separation, assert the FAB/arrow split, record load-earlier as not-portable-now, and add a fail-closed per-session view-mode store. Every task is open and cites its rec number and the real app file it will touch. Plan only."
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/006-navigation"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Folded nodeterm ND-6.1-6.7,6.9 nav rows into the task ledger, all open"
    next_safe_action: "On operator go, start the reconnect-undecided ND-6.1 task first"
    blockers: []
    completion_pct: 0
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

- [ ] **T1.1** *(6.1, 6.2)* Inventory the nav/entry seam: confirm the id is decoded/raw at
  `app-mobile/src/routes/session/[id]/+page.svelte` (`$page.params.id`), encoded exactly once at
  `app-mobile/src/routes/+layout.svelte` `navigate()` (`encodeURIComponent`), and that
  `TranscriptState.epoch` + the reducer epoch guard in `app-mobile/src/shared/state/state.ts` are the
  epoch second-check substrate. Record the current entry gap (an id absent from the roster resolves to
  `status: 'unknown'` yet still renders `<Session>` and opens the socket).
- [ ] **T1.2** *(6.5)* Inventory the device-local preference precedents to reuse the fail-closed read/write
  shape: theme persistence (`try/catch` around `localStorage.setItem('pi-remote.theme', …)`) in
  `app-mobile/src/routes/+layout.svelte`, the composer-shift-tab key and cache keys in
  `app-mobile/src/shared/state/state.ts`.
- [ ] **T1.3** *(ND-6.1, ND-6.5, ND-6.6)* Inventory the reconnect/hydration seam in
  `app-mobile/src/shared/transport/use-sync-socket.svelte.ts`: the `noteRelayHeartbeat()` liveness channel,
  the `cursor.epoch !== message.epoch` → `pi-remote:transcript-superseded` cold path, and the read-only cache
  hydration; plus the Live/Stale banner and `connection` gating in
  `app-mobile/src/pages/chat/screen-chat.svelte`. Record that liveness must ride the heartbeat, never a card's
  `updatedAt` freshness.
- [ ] **T1.4** *(ND-6.7)* Inventory the enrollment/QR pairing seam: `parseEnrollment` (which currently throws
  on malformed input), the origin/expiry checks, and the challenge-token handling in
  `app-mobile/src/shared/transport/auth.ts`, consumed by
  `app-mobile/src/pages/enrollment/screen-enrollment.svelte`.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [ ] **T2.1** *(6.1)* Add fail-closed entry id re-validation at
  `app-mobile/src/routes/session/[id]/+page.svelte`: when the raw `sessionId` is absent from the
  authoritative roster (`app.sessions.items`), render a visibly-unresolved "session unavailable" state
  instead of `<Session>` — no socket, no command. Keep the id raw and rely on the single `encodeURIComponent`
  boundary in `app-mobile/src/routes/+layout.svelte`.
- [ ] **T2.2** *(6.1)* Gate transcript load and command issuance on epoch confirmation in
  `app-mobile/src/pages/chat/screen-chat.svelte`: tie the existing `transcript.awaitingSnapshot` barrier and
  the reducer epoch guard in `app-mobile/src/shared/state/state.ts` so no `submitPrompt` / `submitSlashDraft`
  / `abortPrompt` issues until the authoritative epoch is confirmed; reuse the existing exact-session command
  scope (the slash binding already drops on epoch/revision drift).
- [ ] **T2.3** *(6.2)* Separate the selection-precedence states in
  `app-mobile/src/routes/+layout.svelte`: make "selected" (router URL / `selectedSessionId`), "host-active",
  and "navigation-requested" explicit; keep the selected session through ordinary roster refreshes (the
  `fetchSessions` effect must not renavigate); confine retries to idempotent activation and never auto-retry
  message-send or Stop in `app-mobile/src/pages/chat/screen-chat.svelte`.
- [ ] **T2.4** *(6.2 ⚠️)* Plan the true host "follow" supersede against a host `navigationIntent` field in
  `app-mobile/src/routes/+layout.svelte`: without the field, only user-initiated navigation (the existing
  inbox-resolution `navigate()`) supersedes local selection; do NOT invent a client follow. Note the field is
  requested in `../007-host-requests`.
- [ ] **T2.5** *(6.3)* Keep the list jump-to-latest FAB in
  `app-mobile/src/pages/chat/transcript/transcript-list.svelte` scrolled-up-gated (`{#if !atLiveEdge}`,
  `scroll--to-latest` + unread badge) and "latest"-only, and assert the per-turn scroll-to-top arrow (owned
  by `../003-chat-message` rec 3.1) stays a distinct control — distinct aria-label, placement, and semantics;
  never merged with the FAB.
- [ ] **T2.6** *(6.4)* Record load-earlier as not-portable-now: confirm `TranscriptState` carries no
  `hasMore` and the host sends the full redacted snapshot (`app-mobile/src/shared/state/state.ts`,
  `app-mobile/src/pages/chat/screen-chat.svelte`, read-only). Do NOT build pagination; defer real paging to a
  host `hasMore` token in `../007-host-requests`; prohibit synthesizing earlier messages from a stale cache
  across epochs.
- [ ] **T2.7** *(6.5)* Add a per-session device-local view-mode preference store keyed by `sessionId` under
  `app-mobile/src/shared/state/`, mirroring the theme `try/catch` shape; fail closed on an unreadable store
  (return the canonical default AND mark it unresolved, never "no overrides"); consume it in
  `app-mobile/src/pages/chat/screen-chat.svelte`.
- [ ] **T2.8** *(ND-6.1)* After the sync socket reconnects in
  `app-mobile/src/shared/transport/use-sync-socket.svelte.ts`, keep a card the stale snapshot showed as
  `working` at `working (stale)` — dimmed via the Live/Stale banner in
  `app-mobile/src/pages/chat/screen-chat.svelte` — and NEVER flip it to `done`/`idle` locally; wait for the
  host's fresh snapshot. Encode the asymmetry: a reconnect distrusts only *live* rows (idle-really-working
  self-corrects). Reinforces orca 1.8; adds the "wrong terminal state = false notification" cost.
- [ ] **T2.9** *(ND-6.2)* On a host-connection drop, grey the chat header/composer in place in
  `app-mobile/src/pages/chat/screen-chat.svelte` (already `connection`-gated) and reconnect with the SAME id;
  never open a second chat view and never bounce Home from
  `app-mobile/src/routes/session/[id]/+page.svelte`; only a user "back" leaves. Reinforces orca 6.2
  (close-vs-drop, reconnect-in-place).
- [ ] **T2.10** *(ND-6.3)* Race any pending open/reconnect/enroll promise against a close-signal + a 60 s
  timeout and dispose the half-open socket on failure: audit the FIRST-open path in
  `app-mobile/src/shared/transport/use-sync-socket.svelte.ts` and the enrollment-pending path in
  `app-mobile/src/pages/enrollment/screen-enrollment.svelte` / `app-mobile/src/shared/transport/auth.ts` for a
  no-timeout hang (a "waiting for approval / first snapshot" state that only resolves on success).
- [ ] **T2.11** *(ND-6.4)* Treat the session `id` in the route/card as navigation *intent*, never persisted
  truth: at `app-mobile/src/routes/session/[id]/+page.svelte`, a target whose `id`+`epoch` no longer validate
  prunes to a safe fallback (back Home with "session no longer available"), never a phantom session from a
  stale pointer. Reinforces orca 6.1/6.2.
- [ ] **T2.12** *(ND-6.5)* Distinguish warm-reattach from cold-restore and mark the restored view: when
  `app-mobile/src/shared/transport/use-sync-socket.svelte.ts` hydrates from the read-only cache on
  entry/reconnect, show a "showing saved messages / reconnecting…" restored marker in
  `app-mobile/src/pages/chat/screen-chat.svelte` until the live snapshot lands; never blank the transcript to
  render it. Reinforces orca 1.10/6.1.
- [ ] **T2.13** *(ND-6.6)* Never derive "alive" from `updatedAt` freshness: in
  `app-mobile/src/shared/transport/use-sync-socket.svelte.ts` pair liveness with `noteRelayHeartbeat()` and the
  Live/Stale banner in `app-mobile/src/pages/chat/screen-chat.svelte`; a stale liveness signal ⇒ `unknown`,
  never `idle`. Reinforces orca 1.8.
- [ ] **T2.14** *(ND-6.7)* Fail-closed QR/enrollment pairing in
  `app-mobile/src/shared/transport/auth.ts`: make the offer parser (`parseEnrollment`) return a typed null on
  ANY malformed input instead of throwing; add require-TLS endpoint validation (loopback-only for plaintext);
  treat the pairing token as single-use and prompt a fresh code on a dropped enrollment in
  `app-mobile/src/pages/enrollment/screen-enrollment.svelte`.
- [ ] **T2.15** *(ND-6.9 disciplines)* Extract the two handoff disciplines only: strict-id resolution at
  `app-mobile/src/routes/session/[id]/+page.svelte` (never a fuzzy "newest for this context" fallback), and
  never render UI that promises content which didn't load in
  `app-mobile/src/pages/chat/screen-chat.svelte`. Reinforces orca 6.1. The handoff *mechanism* itself is a ❌
  exclusion — the host owns transcripts; the client writes no host files and spawns no agents.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [ ] **T3.1** *(6.1, 6.2)* Fail-closed nav proof: an unknown/stale id renders the unavailable state with no
  socket and no command; an epoch mismatch holds at the awaiting-snapshot barrier and blocks command
  issuance; a roster refresh leaves the selected id unchanged. [evidence: `test:web` behaviour cases — planned]
- [ ] **T3.2** *(6.3)* FAB-vs-arrow split proof: the FAB is hidden at the live edge, shown scrolled-up, and
  reads "latest"; the per-turn arrow is a distinct control. [evidence: `token-identity` 0-diff on the
  transcript-list CSS + `test:web` — planned]
- [ ] **T3.3** *(6.5)* Fail-closed preference proof: an unreadable store returns the canonical default and is
  treated as unresolved (not "no overrides"); the preference is per-session isolated. [evidence: `test:web`
  store cases — planned]
- [ ] **T3.4** *(6.1-6.5)* Traceability + gates: every task maps to a rec number; the a11y contract is
  preserved (roles/labels/focus/dismissal); `validate.sh <packet> --strict` exit 0 via realpath; comment
  hygiene clean (no spec path or artifact id in a comment). [evidence: planned]
- [ ] **T3.5** *(ND-6.1, ND-6.5, ND-6.6)* Reconnect proof: a stale `working` row never flips to `done`/`idle`
  locally on reconnect (stays `working (stale)`, dimmed); cache hydration shows the restored marker until the
  live snapshot lands and never blanks the transcript; liveness derives from the heartbeat, not `updatedAt`.
  [evidence: `test:web` behaviour cases — planned]
- [ ] **T3.6** *(ND-6.2, ND-6.3, ND-6.4)* Connection-boundary proof: a drop greys the chat in place and
  reconnects the SAME id (no second view, no bounce Home); no open/reconnect/enroll promise hangs without a
  close-signal + timeout; a not-found `id`+`epoch` target fails closed to Home. [evidence: `test:web` — planned]
- [ ] **T3.7** *(ND-6.7)* Enrollment proof: the offer parser returns a typed null (never throws) on malformed
  input, refuses a non-TLS / foreign endpoint (loopback-only for plaintext), and prompts a fresh code on a
  spent token. [evidence: `test:web` parse/pairing cases — planned]
- [ ] **T3.8** *(ND-6.1-6.7, ND-6.9)* Traceability: every folded task maps to an ND id; the handoff
  *mechanism* (ND-6.9) is recorded as a ❌ exclusion, not built. [evidence: planned]
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
