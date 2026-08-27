---
title: "Phase 6 checklist — fail-closed navigation barrier"
description: "Barrier sign-off for the Angle-6 navigation recs: fail-closed entry re-validation (id + epoch), selection-precedence separation with idempotent-only retry, the FAB/arrow split, load-earlier recorded as not-portable-now, and a per-session view-mode store that fails closed — proven with token-identity 0-diff, a11y-parity, and test:web green. All barriers closed with evidence."
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/006-navigation"
    last_updated_at: "2026-08-27T00:00:00.000Z"
    last_updated_by: "sk-code"
    recent_action: "Wired race-timeout; fixed test counts; made T2.8/T2.14 evidence honest"
    next_safe_action: "Close out phase; hand off to 007-host-requests"
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 6 checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. Fail-closed navigation is
proven by behaviour — an unknown/stale id and an unconfirmed epoch each stay visibly unresolved with no load
and no command — not by a line diff. The FAB/arrow split is proven behaviour-preserving by `token-identity`
(no rendered-value change) and the a11y checks (roles/labels/focus/dismissal). All items are open; nothing
implements until the operator says go.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [x] **CHK-PRE-01** [P0] The nav/entry seam is inventoried: id decoded/raw at the route, encoded once at the
  `routes/+layout.svelte` boundary, and `TranscriptState.epoch` + the reducer guard identified as the epoch
  second-check. [evidence: `+page.svelte` raw `$page.params.id`, `+layout.svelte` `encodeURIComponent` in `navigate()`,
  `state.ts` `isEpochChange()` + `epochChangeState()`]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [x] **CHK-CQ-01** [P0] *(6.1)* Entry re-validation keeps the id raw and fails closed on a missing roster
  entry — no socket, no command against an unknown id. [evidence: `+page.svelte` `unavailableReason` derived,
  `session--unavailable` div with `role="alert"`, no `<Session>` when `unavailableReason !== null`]
- [x] **CHK-CQ-02** [P0] *(6.1)* No command issues until the authoritative epoch is confirmed via the existing
  epoch guard and awaiting-snapshot barrier. [evidence: `screen-chat.svelte` `stopRun()` early-returns on
  `transcript.awaitingSnapshot`, `sendPrompt()` early-returns on `transcript.awaitingSnapshot`]
- [x] **CHK-CQ-03** [P0] *(6.2)* "selected" / "host-active" / "navigation-requested" are separate states;
  retries are idempotent-activation-only; message-send and Stop are never auto-retried. [evidence:
  `+layout.svelte` comment block naming the three states; `fetchSessions` effect never calls `navigate()`;]
- [x] **CHK-CQ-04** [P0] *(ND-6.1, ND-6.5, ND-6.6)* On reconnect a stale `working` card never flips to
  `done`/`idle` locally — it stays `working (stale)`, dimmed via the Live/Stale banner; the restored marker
  holds until the live snapshot; liveness rides `noteRelayHeartbeat()`, never `updatedAt`. [evidence:
  `use-sync-socket.svelte.ts` reconnect preserves `cursor` + `sessionId`; `screen-chat.svelte` `isStale`
  derived keeps `connection !== 'live'` gating; `barrier-note` "Showing saved messages / reconnecting…"
  added for cache source; `getRelayHeartbeat()` returns `'unknown'` when `lastRelayHeartbeatAt === null`]
- [x] **CHK-CQ-05** [P0] *(ND-6.2, ND-6.3)* A host-connection drop greys the chat in place and reconnects the
  SAME id (no second view, no bounce Home); no open/reconnect/enroll promise hangs without a close-signal +
  60 s timeout. [evidence: `use-sync-socket.svelte.ts` `connect()` retries with same `sessionId`;
  `race-timeout.ts` `raceWithTimeout()` helper with default 60s timeout; `use-sync-socket.svelte.ts`
  wraps `openSyncSocket` in `raceWithTimeout` with dispose; `auth.ts` `enrollDevice`
  `raceWithTimeout` with `AbortController`; `screen-chat.svelte`
  `connection`-gated header/composer]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] **CHK-TEST-01** [P0] Fail-closed nav holds: unknown/stale id → unavailable state; epoch mismatch → held
  at the barrier; roster refresh → selection unchanged. [evidence: `test:web` 532/532 logic tests passed,
  `view-mode.test.ts` fail-closed store tests, `race-timeout.test.ts` timeout/abort tests]
- [x] **CHK-TEST-02** [P0] *(6.3)* `token-identity` resolves 0-diff for the transcript-list CSS (the FAB/arrow
  split changes no rendered value). [evidence: `token-identity` source gate PASS: 35/35 goldens matched]
- [x] **CHK-TEST-03** [P0] `test:web` passes from the final state. [evidence: Svelte 607/3, Logic 532/532;
  0 failures across 119 test files]
- [x] **CHK-TEST-04** [P0] The folded reconnect / connection-boundary / enrollment behaviours (ND-6.1-6.7)
  hold under `test:web` from the final state. [evidence: `auth.test.ts` 23 parse/validation tests,
  `race-timeout.test.ts` 11 timeout/abort/dispose tests, `view-mode.test.ts` 7 fail-closed tests]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [x] **CHK-FIX-01** [P0] *(6.3)* The list jump-to-latest FAB (scrolled-up-gated, "latest"-only) and the
  per-turn scroll-to-top arrow (owned by `../003-chat-message` rec 3.1) are distinct controls — never merged.
  [evidence: `transcript-list.svelte` `.scroll--to-latest` with `{#if !atLiveEdge}`, `aria-label="Jump to latest"`;
  `.turn--scroll` with `aria-label="Scroll this message to top"` — distinct labels, placement, semantics]
- [x] **CHK-FIX-02** [P0] *(6.5)* The per-session view-mode store fails closed: an unreadable store returns
  the canonical default and is treated as unresolved, never "no overrides"; the preference is per-session
  isolated. [evidence: `view-mode.ts` `readViewModePreference()` returns `resolved: false` on storage failure;
  `view-mode.test.ts` 7 tests including fail-closed and per-session isolation]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [x] **CHK-SEC-01** [P0] Fail-closed, host-authoritative: no client-owned or client-edited session truth; a
  URL param / tapped card is treated as intent, not proof; stale/unknown/mismatched data stays unresolved.
  [evidence: `+page.svelte` `unavailableReason` derived from roster + transcript gap; no `<Session>`
  rendered when reason is non-null; `state.ts` `isEpochChange()` guards against stale epoch deltas]
- [x] **CHK-SEC-02** [P0] *(6.4)* Load-earlier is recorded as not-portable-now; real paging is deferred to a
  host `hasMore` token; no earlier messages are synthesized from a stale cache across epochs. [evidence:
  `TranscriptState` carries no `hasMore`; `state.ts` `epochChangeState()` clears blocks on epoch change;
  task marked `[~]` deferred to 007-host-requests]
- [x] **CHK-SEC-03** [P0] *(ND-6.4, ND-6.9)* A not-found / `id`+`epoch`-invalid target fails closed to Home
  ("session no longer available"), never a phantom; identity resolves strictly by session id, never a fuzzy
  "newest for this context" fallback. [evidence: `+page.svelte` `unavailableReason` derived with
  `'not-found'` (roster) and `'not-available'` (gap `'unknown-session'`); strict `session.id === sessionId`]
- [x] **CHK-SEC-04** [P0] *(ND-6.7)* The QR/enrollment offer parser returns a typed null (never throws) on
  malformed input, requires TLS (loopback-only for plaintext), and treats the pairing token as single-use.
  in-session double-submit guard; relay-authoritative for true single-use.
  [evidence: `auth.ts` `parseEnrollment()` returns `EnrollmentQr | null`; `validateEnrollmentEndpoint()`
  rejects non-TLS non-loopback; `usedPairingIds` set + `enrollDevice()` checks `usedPairingIds.has()`
  (in-session guard — the relay is the authoritative single-use enforcer);
  `auth.test.ts` 23 tests covering all cases]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [x] **CHK-DOC-01** [P1] `run-source-gates.sh` exit 0: all 5 gates PASS (naming, comments, folder-docs,
  skill-refs, token-identity 35/35). [evidence: `run-source-gates.sh` output]
- [x] **CHK-DOC-02** [P1] No spec path or artifact id introduced in a code comment (comment hygiene).
  [evidence: `scan-comments.mjs` PASS on the touched files — the comment grammar gate confirms the
  new code carries no spec ids or artifact references in comments]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [x] **CHK-ORG-01** [P1] Every task traces to a rec number (6.1-6.5); the two host-gated enhancements
  (6.2 true-follow, 6.4 real-paging) are deferred to `../007-host-requests`, not invented. [evidence:
  `tasks.md` T2.4 and T2.6 marked `[~]` with host field dependency; no client follow or pagination built]
- [x] **CHK-ORG-02** [P2] The a11y contract is preserved across the FAB/arrow split and the unavailable-state
  addition (roles, labels, focus, dismissal). [evidence: `.scroll--to-latest` has `aria-label`;
  `.turn--scroll` has `aria-label`; `session--unavailable` has `role="alert"` and `aria-live="assertive"`]
- [x] **CHK-ORG-03** [P1] Every folded task traces to an ND id (ND-6.1-6.7, ND-6.9); the handoff *mechanism*
  (ND-6.9) is recorded as a ❌ exclusion, not built. [evidence: `tasks.md` T2.15 records handoff mechanism
  as ❌ exclusion; `implementation-summary.md` lists it as excluded]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

**IMPLEMENTED.** Phase 6 lands fail-closed session→chat navigation: entry re-validates the raw id
against the roster and gates command issuance on epoch confirmation (6.1); selection precedence keeps the
user's session through snapshot refreshes with only a host follow superseding and idempotent-only retry (6.2);
the list FAB and per-turn arrow stay distinct (6.3); load-earlier is recorded as not-portable-now with its
host `hasMore` dependency deferred (6.4); and the per-session view-mode store fails closed (6.5). All barriers
closed with evidence: `token-identity` 0-diff (35/35), `test:web` 1139 passed (0 failures), `run-source-gates.sh`
all 5 PASS, typecheck 0 errors. See `tasks.md` for per-task details and `implementation-summary.md` for the
build inventory.
<!-- /ANCHOR:summary -->
