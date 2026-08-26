# nodeterm UX mining — authoritative synthesis

> Manual deep-research pass (six parallel angle agents, orchestrated directly after the deep-loop harness
> proved unusable in this session). Every finding was mined READ-ONLY from `specs/context/nodeterm-main`,
> mapped onto our host-authoritative / fail-closed mobile client, and deduped against the completed orca
> pass (`../research/research.md`). Full per-angle tables live in `findings/angle-{1..6}.md`.

## How to read this

Each finding carries: a stable id `ND-<angle>.<n>`, the nodeterm source (`file:line`), a **constraint tag** —
**(a)** view over existing DTO fields · **(b)** pure interaction/layout · **(c)** needs a new host read-only
field/RPC — and a **portability verdict**: **✅ drop-in** · **⚠️ needs a host field** · **❌ not portable**.

**THE CONSTRAINT.** Our client is host-authoritative and fail-closed; it owns no editable session metadata.
Our live home DTO is `SessionCardDto { id, status: 'idle'|'running'|'interrupted'|'unknown', updatedAt,
messageCount }` (verified `packages/pi-rpc-protocol/src/types.ts:428`), rendered as `compactId(id)` + "N blocks
· <relative>" under "Opaque identifiers only." A ✅ reads those fields or is pure interaction; a ⚠️ needs a new
host-published read-only field (plan the UI + the fail-closed fallback; request only if not already in orca's
`007-host-requests`); a ❌ would need the client to own mutable session truth.

**What nodeterm is.** An Electron terminal-canvas app whose headline is "every project doubles as a Trello-style
board of live Claude Code sessions." It SPAWNS/OWNS local PTYs, runs tmux/SSH, and writes host files — so its
canvas, drag-kanban, and process ownership are largely ❌ for us. The prize is its **derivation logic, presence
model, card content model, dictation pipeline, and reconnect/fail-closed discipline**, which are strikingly
aligned with our stance because nodeterm's own phone companion faces the same host-authoritative problem.

## Scope of this pass

**58 findings across 6 angles** — roughly **44 ✅ ship-now**, **11 ⚠️ host-dependent**, **3 ❌ exclusions**
(a finding can carry a ✅ core with a ⚠️ sub-case). Per-angle: Angle 1 = 12 (✅10/⚠️1/❌1) · Angle 2 = 10
(✅6/⚠️4) · Angle 3 = 10 (✅3/⚠️6/❌1) · Angle 4 = 8 (all ✅, a few ⚠️ sub-cases) · Angle 5 = 9 (✅6/mixed3) ·
Angle 6 = 9 (✅8/❌1).

---

## Top wins (highest leverage, ship-now unless noted)

1. **Model the home as a *derived status-grouped list* — `buildStatusList` (`renderer/lib/sessionList.ts:418`).** ✅
   nodeterm's real portable "board" is not the drag-kanban (that's ❌ — client-owned placement) but a pure
   projection that buckets sessions by live status. Fixed **attention-first sections that are always present**
   (`attention → unread → working → idle → unknown`), each with a count, so the list never jumps as sessions
   move. `ND-1.1/1.2/1.9`. Complements orca's *time* buckets with *status* buckets — stronger for a live-agent
   home.
2. **First-match membership precedence ≠ display order (`sessionList.ts:62-75`).** ✅ A still-running-but-unread
   session stays under **Running**, never double-classified as Unread — the concrete rule behind orca 1.6
   ("never badge a running session unread"). `ND-1.3/2.3`.
3. **Stale-working decays to *Unknown*, not a fake "done", at 20 min (`shared/agents/stale.ts` `WORKING_STALE_MS`).** ✅
   A single decider, one number, purely presentational over `updatedAt` (never writes `status`). **Supersedes
   orca 1.8** (30-min→idle): a lost agent is *unknown*, not "idle", and nodeterm's header names our exact
   "3 surfaces / 3 timeouts" bug (mobile + notch + Live Activity). `ND-1.6/2.1`.
4. **Reconnect defaults to *undecided*; never locally promote an uncertain `working` card to done (`core/remote-ssh/agent-resync-decide.ts`).** ✅
   "A wrong 'ended' costs a false 'finished' notification." Only *live* rows can be stranded by a lost event;
   idle-really-working self-corrects — so a reconnect distrusts only the live cards. The correct fail-closed
   default, not merely cautious. `ND-6.1`.
5. **Transcript-wide find bar — search-in-conversation (`terminal/useTerminalSearch.ts` + `components/FindBar.tsx`).** ✅
   Orca has **no** in-conversation search on either surface (orca 3.7 negative) — the clearest thing nodeterm
   has that we lack. Build a flat line index decoupled from the DOM (our list is virtualized), lowercase once
   per snapshot, `{i}/{count}` with wraparound + role-tagged snippet. `ND-4.1`.
6. **Context-window fill meter on the card face (`ContextMeter.tsx`; host `agent-status-mirror.ts:342` `contextPercent`).** ⚠️ (new host field)
   A model label + mini-bar + "NN%" that says *which session is near its token limit / needs /compact* — a
   per-session signal our home entirely lacks. Renders nothing when absent (fail-closed). The single best
   content-model idea orca never raised. `ND-3.1`.
7. **Live "activity" line — "Running npm test" (host `agent-status-mirror.ts:337` `activity`/`tool`).** ⚠️ (new host field)
   Upgrades our bare "Working…" to the concrete current action, host-derived + basename-redacted. Distinct
   from orca's `lastMessagePreview` (last message) — request both (idle→preview, working→activity). `ND-3.2`.
8. **On-device dictation with a fail-closed insertion contract (`.../DictationOverlay.tsx`).** ✅
   Net-new for us (we have zero dictation today). Transcript is inserted as an **editable draft, no auto-submit**
   (`pty.sendText(id, text, { enter: false })`) routed through the normal send-gate — the discipline that makes
   on-device STT legal under fail-closed. Batch transcribe (RMS-equalizer "partial", no reconcile bug),
   ask-permission-before-record, model-download/None-row setup, 400 ms accidental-tap cancel. `ND-5.1..5.5`.
9. **Drop the peek-accordion for an always-inline detail row (`kanban/SessionCard.tsx:22` — "the expand step was dropped").** ✅
   **Supersedes orca 2.5**: nodeterm tried the expand-to-peek step and removed it — for a small card the
   always-on detail (title + activity/preview + context%) beats an accordion and sidesteps orca's "empty
   accordion when the host sends no preview" trap. `ND-3.8`.
10. **Close-vs-drop → reconnect-in-place, never vanish or duplicate the view (`renderer/session/relay-tab.ts`).** ✅
    A host-connection drop greys the chat in place and reconnects with the *same id* (never a second view,
    never a bounce to Home); only a user "back" leaves the session. Reinforces orca 6.2. `ND-6.2`.
11. **Never hang on a dead connection that never errors (`relay-tab.ts` — race `ready()` vs close-signal + 60s).** ✅
    Any open/reconnect/enroll promise that only resolves on success needs an explicit close-signal + timeout
    backstop, disposing the half-open socket on failure — audit our first-open / enrollment path. `ND-6.3`.
12. **Two free ✅ card wins with no host field:** a **device-local "changed since you looked" dot** over
    `updatedAt` (persist `lastSeenUpdatedAt`; unreadable store ⇒ no dot, fail-closed) `ND-3.7`, and a
    **deterministic hue from the opaque `id`** for at-a-glance card recognition `ND-3.9`.

---

## Per-angle summary

- **Angle 1 — Session board (`findings/angle-1.md`, 12).** The portable board is the *derived* status-grouped
  list, not the drag-kanban (❌, `ND-1.12`). Attention-first always-present sections, first-match precedence,
  newest-transition-first sort that never fabricates a timestamp, per-card own-id subscription (`ND-1.8`), and
  a two-toggle local view preference (recency vs status grouping).
- **Angle 2 — Presence & status derivation (`findings/angle-2.md`, 10).** Real derivation lives in
  `shared/agents/{normalize,stale}.ts` + `sessionList.ts` (NOT `core/presence/`, which is multiplayer cursors).
  Unread-aware bucket lattice, "never mark unread while watching" edge gate, done-holdoff out-of-order
  reconciliation, asymmetric idle-rescue (only downgrade a running card, never clear a needs-you). The
  needs-you axis (`ND-2.2`) reinforces orca's `attention` and adds an approval-vs-question sub-kind.
- **Angle 3 — Card content model (`findings/angle-3.md`, 10).** New host asks: `contextPercent`, `activity`+
  `tool`, `prompt` (the "You:" turn-opening line). Reinforces orca's `title`/`agent`+`model`/`attention`
  (note: model rides the same usage payload as `contextPercent` — bundle them). Always-inline detail row +
  device-local seen-dot + deterministic color are free ✅. Board metadata (labels/priority/assignee) is ❌.
- **Angle 4 — Chat interactions (`findings/angle-4.md`, 8, all ✅).** Transcript-wide find bar (headline,
  fills an orca gap), quantified copy receipt ("Copied N lines/chars"), URL-vs-file link split ("relay-remote
  = URL-only" is exactly our case), 5-state transcript load taxonomy (a reload never blanks a rendered thread),
  native-`<details>` tool folding, portal-with-edge-flip action menu with disabled-plus-hint rows.
- **Angle 5 — Composer / dictation (`findings/angle-5.md`, 9).** nodeterm has no chat composer, so
  history/@-mentions/slash stay orca-owned; the prize is the real dictation pipeline (net-new for us): batch
  transcribe, fail-closed setup/permission, editable-draft-no-auto-submit insertion, misfire-hardened
  capture, transport-frame-budget recording cap. Paste-image reinforces orca 4.5 (no re-request).
- **Angle 6 — Lifecycle / nav (`findings/angle-6.md`, 9).** Default-undecided reconnect (the fail-closed gem),
  close-vs-drop reconnect-in-place, race-open-against-close+timeout, session-id-is-a-runtime-bookmark →
  prune-stale-binding-to-safe-fallback, warm-reattach-vs-cold-restore decision table + "restored" marker,
  `updatedAt`-is-not-liveness (pair with a heartbeat), fail-closed QR/enrollment pairing, clear-signals-are-
  edges reconnect reconciliation. The handoff *mechanism* is ❌; its two disciplines are ✅.

---

## Needs host support (deduped against orca `007-host-requests`)

**Net-new host fields nodeterm surfaces (NOT in the orca request set):**
- **`contextPercent`** (0–100, optional) on `SessionCardDto` — HIGH. The context-window fill meter. `ND-3.1`.
- **`activity`** (+ raw `tool`) — MED-HIGH. The live present-tense action line. `ND-3.2`.
- **`prompt`** — MED. The current turn's opening "You:" line (host-clipped/redacted). `ND-3.3`.
- **Attention sub-kind + end-reason** — extend orca's requested `attention` enum with the approval-vs-question
  split (`ND-2.2`) and an end-reason so a presumed-*stale* end isn't mistaken for a natural finish (`ND-2.9`).
- Lower priority / optional: a cross-surface **read-ack RPC** (`ND-2.10`), a second **`stateEnteredAt`** clock
  for accurate in-state age (`ND-2.8/1.5`). Model rides the same usage payload as `contextPercent` — bundle.

**Reinforced, already in orca-007 — do NOT re-request:** `title` (must be a host projection of the session's
own name, never client-sliced — `ND-3.4`), `agent`+optional `model` (`ND-3.5`), the `attention`/needs-you enum
(`ND-1.7/2.2/3.6`). The Inbox Open-Q#1 is re-confirmed: `AttentionItemDto` keys on `lookupId`, carries no
`sessionId`.

**❌ backlog exclusions:** the drag-assignment kanban board (`ND-1.12`), client-authored card metadata —
labels/priority/due/assignee (`ND-3.10`), the handoff/PTY/SSH mechanism (`ND-6.9`). Portable only as
device-local view preferences (category b), never as host truth.

---

## Verification notes

- Every angle agent grounded its findings in directly-read source with `file:line` cites (Angle 5 carries an
  explicit verification note confirming load-bearing constants were read, not inferred).
- Independent spot-check of the standout findings against the real nodeterm tree, all CONFIRMED:
  `buildStatusList` at `sessionList.ts:418`; `WORKING_STALE_MS = 20 * 60_000` at `stale.ts:21`;
  `contextPercent?: number` at `agent-status-mirror.ts:342` + ContextMeter "renders nothing until … usage";
  `useTerminalSearch.ts` + `FindBar.tsx` present; `pty.sendText(id, text, { enter: false })` in
  `DictationOverlay.tsx`; `ResyncVerdict = 'ended'|'working'|'undecided'` with undecided-default in
  `agent-resync-decide.ts`.
- Dedup discipline: every finding is tagged against the orca pass — net-new, reinforces, or supersedes. No
  verdict conflicts with the completed orca synthesis; nodeterm mostly *reinforces or sharpens* orca's home /
  status / navigation work and *adds* three genuinely new surfaces (context meter, activity line,
  in-conversation search) plus a full dictation pipeline.
- Method note: produced by manual multi-agent orchestration after the deep-loop runtime failed with
  `ERR_MODULE_NOT_FOUND: loop-lock.js` (executor-independent harness bug); one genuine `deepseek-v4-flash-max`
  iteration (`iteration-001`) was produced before that and folded into Angle 1 as a seed.
</content>
