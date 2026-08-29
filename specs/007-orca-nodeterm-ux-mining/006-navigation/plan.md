---
title: "Phase 6 plan — fail-closed session→chat navigation, proven by fail-closed + interaction tests"
description: "How the Angle-6 navigation recs land: keep the id raw through the router and re-validate id + epoch at chat entry before any load or command; separate the selection-precedence states so a snapshot refresh cannot move the user and only a host follow supersedes; keep the list FAB distinct from the per-turn arrow; record load-earlier as not-portable-now; and add a per-session view-mode store that fails closed. Proven by fail-closed unit/behaviour tests, token-identity 0-diff, a11y-parity and test:web — plan only, nothing implements until the operator says go."
trigger_phrases:
  - "navigation plan approach"
  - "navigation packet"
  - "plan approach"
importance_tier: "normal"
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/006-navigation"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Extended the plan with undecided-reconnect and connection-boundary hardening"
    next_safe_action: "On operator go, land ND-6.1 reconnect-undecided at the sync-socket seam"
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 6 plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Land the five Angle-6 navigation recommendations at the existing route + chat seams. The router already
encodes the id once (`encodeURIComponent` in `routes/+layout.svelte`) and delivers it raw to
`routes/session/[id]/+page.svelte`; the plan adds a fail-closed re-validation at that page (6.1), separates
the selection-precedence states in the layout so presentation intent never becomes session truth (6.2), keeps
the list jump-to-latest FAB in `transcript-list.svelte` distinct from the per-turn arrow (6.3), records
load-earlier as not-portable-now because the host sends the full snapshot (6.4), and adds a per-session
device-local view-mode store that fails closed (6.5). Each change reads existing DTO fields or is pure
interaction / local preference; the two host-gated enhancements (6.2 true-follow, 6.4 real-paging) are
planned as fallbacks and deferred to `../007-host-requests`.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

Fail-closed is proven, not asserted: an unknown/stale id and an epoch mismatch each land a visibly-unresolved
state at entry with no transcript load and no command issued; an ordinary snapshot refresh does not change the
selected session; the list FAB is hidden at the live edge and shown scrolled-up with "latest" semantics; and
an unreadable view-mode store falls back to the canonical default rather than "no overrides." CSS-touching
work (the FAB/arrow split) resolves `token-identity` at 0-diff across the themed corpus, the a11y contract is
preserved (roles, labels, focus, dismissal), and `test:web` is green — all from the final state, with
`validate.sh --strict` exit 0 via realpath.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

**The route seam (6.1).** The id stays raw end-to-end: `navigate()` in `routes/+layout.svelte` is the single
encode point; `routes/session/[id]/+page.svelte` receives `$page.params.id` decoded. Re-validation splits in
two. First, an id check at the page: if the raw id is not in the authoritative roster
(`app.sessions.items`), render a fail-closed unavailable state instead of `<Session>` — do not open the
socket or route a command against an id the host does not vouch for. Second, an epoch check that reuses what
already exists: `TranscriptState.epoch` and the reducer guard that turns an epoch mismatch into an
awaiting-snapshot error (`state.ts`), plus the `transcript.awaitingSnapshot` barrier that `screen-chat.svelte`
already honours in `canSubmit` and in the slash-binding drop. No command issues until the epoch is confirmed.

**Selection precedence (6.2).** "selected" is the router URL (`selectedSessionId` derived from
`$page.params.id`), and it is presentation only. The roster-fetch effect in `routes/+layout.svelte` is keyed
on the selected id but never renavigates, so a snapshot refresh already cannot move the user — the plan makes
that guarantee explicit by naming three states: *selected* (URL), *host-active* (what the host reports as the
live session), and *navigation-requested* (a pending supersede). Only a host-issued follow may promote
navigation-requested over selected; today the sole superseding path is the user-initiated inbox-resolution
`navigate()`. Retries are confined to idempotent activation (roster fetch, runtime refresh); message-send and
Stop are never auto-retried. The true host follow needs a host `navigationIntent` field (⚠️), planned as a
fallback and requested in `../007-host-requests`.

**FAB vs per-turn arrow (6.3).** `transcript-list.svelte` already renders the list FAB (`scroll--to-latest`)
under `{#if !atLiveEdge}` with a live-edge threshold (`nearBottom` < 96px) and an unread badge — that is the
"latest"-only control. The per-turn scroll-to-top arrow is a separate affordance built under
`../003-chat-message` (rec 3.1); this phase's contribution is the invariant that the two never merge:
distinct aria-labels, distinct placement, distinct semantics. No new FAB behaviour is added here.

**Load-earlier (6.4).** `TranscriptState` carries no `hasMore`; the host sends the full redacted snapshot and
the reducer reconciles against it. Load-earlier is therefore recorded as not built. Real paging is a host
`hasMore` token (⚠️, deferred); synthesizing earlier turns from a stale cache across epochs is prohibited (❌).

**Per-session view-mode (6.5).** A small device-local preference helper keyed by `sessionId`, mirroring the
theme persistence in `routes/+layout.svelte` (a `try { localStorage.setItem(...) } catch {}` shape) and the
existing composer/cache keys. Fail-closed is the whole point: an unreadable store returns the canonical
default AND marks the preference unresolved, so a later reader cannot mistake "unreadable" for "the user
cleared all overrides." `screen-chat.svelte` consumes it; the concrete mode set is minimal today (orca's
chat-vs-terminal split is ❌ for us), so this ships the fail-closed seam future per-session presentation
toggles read through.

**Reconnect defaults to *undecided* (ND-6.1, ND-6.5, ND-6.6).** The sync socket already re-pushes a fresh
snapshot on reconnect and carries `noteRelayHeartbeat()` as a liveness channel distinct from a card's
`updatedAt`. The plan locks in the fail-closed reconnect discipline: a card the stale snapshot showed as
`working` stays `working (stale)` — dimmed via the Live/Stale banner — and is never flipped to `done`/`idle`
locally; only the host's fresh snapshot moves it. The asymmetry is explicit — a reconnect distrusts only *live*
rows (idle-really-working self-corrects within seconds), so the cost avoided is a false "finished"
notification, not merely caution. Cache hydration (`use-sync-socket.svelte.ts` reads the read-only cache when
its cursor is superseded) gains the UX half: a "showing saved messages / reconnecting…" restored marker until
the live snapshot lands, never blanking the transcript. Liveness is derived from the heartbeat, never from
`updatedAt` freshness — a stale liveness signal resolves to `unknown`, never `idle`.

**Connection-boundary hardening (ND-6.2, ND-6.3, ND-6.4, ND-6.7, ND-6.9).** Four rules harden the seams orca's
Angle 6 never touched. (1) Close-vs-drop: a host-connection drop greys the chat in place and reconnects the
SAME id — never a second view, never a bounce Home; only a user "back" leaves. (2) Never hang: any pending
open/reconnect/enroll promise races a close-signal + a 60 s timeout and disposes the half-open socket on
failure, so a dead connection that never errors cannot strand a silent spinner — audit the first-open and
enrollment-pending paths. (3) Prune-to-fallback: the route id is navigation intent; a target whose `id`+`epoch`
no longer validate prunes to Home ("session no longer available"), never a phantom, and identity resolves
strictly by session id (ND-6.9), never a fuzzy "newest for this context" fallback. (4) Fail-closed pairing: the
enrollment offer parser returns a typed null on malformed input (never throws), the relay endpoint is
TLS-validated (loopback-only for plaintext), and the pairing token is single-use (a dropped enrollment prompts
a fresh code). All folded rules are ✅ pure interaction/logic and need no new host field; the nodeterm handoff
*mechanism* stays a ❌ exclusion — the host owns transcripts.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · setup
Inventory the current nav/entry seam (raw id in, single encode boundary, `TranscriptState.epoch` + reducer
guard) and the device-local preference precedents to reuse the fail-closed read/write shape. No code changes.

### Phase 2 · implementation
Add fail-closed entry re-validation (6.1: id check at the route, epoch gate on command issuance); separate the
selection-precedence states and confine retries to idempotent activation (6.2, with the ⚠️ true-follow
fallback); assert the FAB/arrow split (6.3); record load-earlier as not-portable-now (6.4); and add the
per-session fail-closed view-mode store (6.5).

### Phase 3 · verification
Prove fail-closed nav (unknown id and epoch mismatch stay unresolved; snapshot refresh keeps selection),
prove the FAB/arrow split and its token-identity 0-diff, prove the view-mode store fails closed, and confirm
a11y-parity, traceability (every task → a rec), `test:web`, and `validate.sh --strict`.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

Behaviour tests carry the fail-closed proof: an unknown/stale id renders the unavailable state with no socket
and no command; an epoch mismatch holds at the awaiting-snapshot barrier and blocks command issuance; a roster
refresh leaves the selected id unchanged; the list FAB hides at the live edge and shows scrolled-up; and an
unreadable view-mode store returns the canonical default while flagging unresolved. token-identity proves the
FAB/arrow split changes no rendered value; a11y-parity checks preserve roles/labels/focus/dismissal; `test:web`
proves overall behaviour. All run from the final state before the phase closes.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The authoritative roster `app.sessions.items` and its `SessionCardDto` (`status`, `epoch` where present).
- `TranscriptState.epoch` and its reducer epoch guard (`state.ts`), plus the `transcript.awaitingSnapshot`
  barrier already honoured by `screen-chat.svelte`.
- The device-local preference precedents: theme persistence in `routes/+layout.svelte`, the composer-shift-tab
  key and cache keys.
- **Deferred (⚠️, not required for the ✅ scope):** a host `navigationIntent` field (6.2 true-follow) and a
  transcript `hasMore` page token (6.4 real paging), both requested in `../007-host-requests`.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

The changes touch `app-mobile/src/routes/session/[id]/+page.svelte`, `app-mobile/src/routes/+layout.svelte`,
`app-mobile/src/pages/chat/screen-chat.svelte`, `app-mobile/src/pages/chat/transcript/transcript-list.svelte`,
and a new device-local preference helper under `app-mobile/src/shared/state/`. `git checkout -- app-mobile`
restores the prior navigation behaviour; there is no migration or data step, and no host contract changes.
<!-- /ANCHOR:rollback -->
