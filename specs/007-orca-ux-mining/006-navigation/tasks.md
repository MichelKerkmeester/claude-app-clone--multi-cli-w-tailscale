---
title: "Phase 6 tasks — fail-closed navigation ledger"
description: "Inventory the nav/entry seam, add fail-closed entry re-validation and selection-precedence separation, assert the FAB/arrow split, record load-earlier as not-portable-now, and add a fail-closed per-session view-mode store. Every task is open and cites its rec number and the real app file it will touch. Plan only."
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-ux-mining/006-navigation"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Task ledger drafted; all tasks open; nothing implemented."
    next_safe_action: "On operator go, start T2.1 (6.1 entry id re-validation)."
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
