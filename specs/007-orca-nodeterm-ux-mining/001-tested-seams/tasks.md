---
title: "Phase 1 tasks — six pure seams, each with a differential + boundary test"
description: "Confirm the snapshot contract, extract or author each seam, then prove each with a differential test (incremental == full rebuild) and a boundary test (stale/unknown/mismatched stays unresolved). Every task cites its rec and the real app file it touches. All open — nothing implemented."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/001-tested-seams"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Added open task rows for eight nodeterm seams; nothing implemented."
    next_safe_action: "Await operator go, then start T1.1 and T1.4 (snapshot + nodeterm-seam contracts)."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 1 tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Every task is OPEN — this is a plan; no
seam is implemented until the operator says go. Each task cites its rec number and the real app file it
touches, and states the proof that will close it.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [ ] **T1.1** [guardrail] Confirm the immutable-snapshot contract per seam: which field is the session `id`, the host `epoch` (or the home `updatedAt` revision analog), and the per-item `revision`/`seq`. Touches `shared/state/state.ts` (`TranscriptState`, `SessionListState`), `pages/chat/rich-content/normalize-transcript-blocks.ts` (`NormalizedBase.revision`/`sequence`). → proof: a one-row-per-seam contract table, each naming its id/epoch/revision source.
- [ ] **T1.2** [guardrail] Inventory the existing call sites of the three already-pure seams so the extraction can route them through one source of truth. Touches `shared/state/state.ts` (`transcriptReducer` scope-guard + prompt* cases), `pages/chat/transcript/transcript-helpers.ts`, `pages/chat/rich-content/normalize-transcript-blocks.ts`. → proof: the call-site list and the canonical reference chosen for each differential test.
- [ ] **T1.3** [rec 1.8 / 2.1] Thread an injected `now` into the time-dependent seams so tests are deterministic. Touches `shared/format/view-helpers.ts` (`relativeTime`, and the new stale-decay signature). → proof: no seam reads `Date.now()` internally; `now` is a parameter.
- [ ] **T1.4** [ND-2.3 / ND-2.1 / ND-2.6] Confirm the nodeterm-seam contracts: the device-local unread bit source (never host truth) and the fixed timing constants — stale-working 20 min (`WORKING_STALE_MS`), done-holdoff 3 s (`DONE_HOLDOFF_MS`). Touches `shared/state/state.ts` (`SessionListState.source` cache-vs-relay), `shared/format/view-helpers.ts`. → proof: a contract row naming the unread bit's device-local store and each timing constant; `now` injected, no constant read from the host.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [ ] **T2.1** [rec 1.1 / 1.3 / 1.4] Author the home filter/sort/group seam as a pure function over `SessionListState` — recency-sort by `updatedAt`, Active/Today/Yesterday/Older time buckets, status segment over `status`, all from existing fields. New module beside `pages/home/screen-home.svelte`; reads `SessionListState` from `shared/state/state.ts`. Left unwired (view is phase 002). → proof: pure signature, no host field, no `screen-home.svelte` render change.
- [ ] **T2.2** [rec 2.1 / 1.7 / 2.4] Author the session-card projection seam: `SessionCardDto` → card view-model (message-count label, ISO `datetime`, absolute-on-tap value, resting-done presentation, recoverable-empty boundary) from existing fields. New module beside `shared/format/view-helpers.ts`. Left unwired (view is phase 002/003). → proof: pure signature; a zero-`messageCount` session projects a visibly-unresolved "recoverable" marker, not a hidden card.
- [ ] **T2.3** [rec 1.8] Author the stale-decay seam: decay a `running` card to a dimmed/idle presentation after 30 min of `updatedAt` silence, taking `now`, WITHOUT writing `status`. New module beside `shared/format/view-helpers.ts`. Left unwired (view is phase 002). → proof: returns a presentation state only; `status` is never mutated; matches orca `AGENT_STATUS_STALE_AFTER_MS = 30*60*1000`.
- [ ] **T2.4** [rec 6.1 / 6.2 / 5.1] Extract the id+epoch scope-guard from `transcriptReducer` into one pure predicate and route the reducer's `snapshot`/`delta`/`gap`/`prompt*` cases through it. Touches `shared/state/state.ts`. → proof: a single tested predicate; the reducer's behaviour is byte-identical (differential test + `test:web`).
- [ ] **T2.5** [rec 4.1 / 5.3] Extract the draft-reconcile path (`promptOptimistic` / `promptAccepted` / `promptRejected`) into a pure function beside the reducer: echo reconciled by host id, exact raw draft restored on reject, settlement after a session switch dropped. Touches `shared/state/state.ts`. → proof: one source of truth; reducer routed through it; behaviour preserved.
- [ ] **T2.6** [rec 3.4 / guardrail] Name the message-grouping seam (already pure) as the differential surface: `groupNormalizedTranscript` / `groupNormalizedSequence` and the call↔result pairing (`pendingResultCallIds`). Touches `pages/chat/transcript/transcript-helpers.ts`, `pages/chat/rich-content/normalize-transcript-blocks.ts`. → proof: a stable exported entry the differential test drives; an unpaired tool call stays visibly in-flight.
- [ ] **T2.7** [ND-1.1] Author the status-bucketing seam (`buildStatusList` analog): a pure function over `SessionListState` that flattens the roster and buckets it purely by live `status` — attention / unread / working / idle / unknown — always-present sections each carrying a count, no persisted assignments. New module beside `pages/home/screen-home.svelte`; reads `SessionListState.items[].status`. Left unwired (view is phase 002). → proof: pure signature over existing fields; header count derived by the same bucketing as the rows; complements orca 1.3 time buckets (T2.1), does not replace them.
- [ ] **T2.8** [ND-1.3] Author the first-match membership-precedence classifier (`sessionStatusGroup` analog): first match wins over attention → working → unread → idle → unknown, so a still-running-but-unread card stays under Running, never double-classified. Pure fn feeding T2.7's bucketing. New module beside `pages/home/screen-home.svelte`. Left unwired. → proof: a running+unread session classifies as working, not unread; the concrete mechanism behind orca 1.6.
- [ ] **T2.9** [ND-2.3] Author the unread-aware bucket lattice: membership priority (attention → working → unread → idle → unknown, first match) is DISTINCT from display order (attention → unread → working → idle → unknown). Pure over `status` + the device-local unread bit; a running card is never displayed as unread. New module beside `pages/home/screen-home.svelte`. Left unwired. → proof: display order ≠ membership order asserted; the full lattice orca 1.6 left implicit. The richer needs-you / approval-vs-question axis (ND-2.2) stays ⚠️ requested in `../007-host-requests`.
- [ ] **T2.10** [ND-1.11] Author the flattened-list dedup / single-owner seam: when the roster reconciles cache vs live (`SessionListState.source` cache→relay), key membership on a single-owner map and emit each `id` at most once, closing the window where a just-committed snapshot and the live rows both emit the same id. New module beside `pages/home/screen-home.svelte`; reads `SessionListState.items[].id` + `source`. Left unwired. → proof: an id present in both cache and live sets emits once; the concrete algorithm behind orca's immutable id+epoch snapshots.
- [ ] **T2.11** [ND-2.1] Author the stale-decider seam: a single pure decider over `updatedAt` decays a `running` card to an UNKNOWN presentation (never a fake "done"/"idle") after 20 min of silence, taking injected `now`, WITHOUT writing `status`. New module beside `shared/format/view-helpers.ts`. Left unwired. SUPERSEDES orca 1.8 (T2.3): nodeterm decays to unknown at 20 min, more honest than the 30-min→idle dim — a lost agent is unknown, not idle. Constant differs (20 vs 30). → proof: returns a presentation state only; `status` untouched; matches nodeterm `WORKING_STALE_MS = 20*60_000`; a stale end is never celebrated as a completion.
- [ ] **T2.12** [ND-2.6] Author the done-holdoff reconciliation seam: a late `running` re-reported within 3 s of `idle` with no genuine new-turn marker is IGNORED — only a real new turn moves idle → running. Pure over `{status, updatedAt, epoch}` with an injected `now`. New module beside `shared/state/state.ts` (feeds `sessionListReducer` loaded/hydrate). Left unwired. → proof: a non-new-turn running within the holdoff window keeps idle; a genuine new-turn running advances; matches nodeterm `DONE_HOLDOFF_MS = 3000`.
- [ ] **T2.13** [ND-2.7] Author the asymmetric idle-rescue seam: a lower-confidence "presumed idle" reconciliation may only DOWNGRADE a `running` card, never clear an attention / needs-you card. Pure over `status`. New module beside `shared/state/state.ts`. Left unwired. → proof: a presumed-idle signal downgrades running but leaves `interrupted` untouched; the needs-you extension (once ND-2.2's host field lands) stays ⚠️ requested in `../007-host-requests`.
- [ ] **T2.14** [ND-6.1] Author the reconnect-decide seam: after a reconnect the verdict defaults to `undecided` and changes nothing; a card the stale snapshot showed as `running` stays running (stale-marked), NEVER flipped to done/idle locally — distrust only LIVE rows (idle-really-working self-corrects on the next live event), wait for the host's fresh snapshot. Pure over `{status, updatedAt}` + `source`. New module beside `shared/state/state.ts`. Left unwired. → proof: undecided default leaves the roster unchanged; a live `running` row stays running-stale on reconnect; idle rows are not re-verified.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [ ] **T3.1** [guardrail] Differential test each incremental seam: at every prefix of a representative stream, the incremental result equals a canonical full rebuild. Covers message grouping (`transcript-helpers.ts` / `normalize-transcript-blocks.ts`), draft reconciliation and the scope-guard (`state.ts` `transcriptReducer`). → proof: `test:web` suite asserting equality at every prefix (orca `native-chat-incremental-assembler.test.ts:22` shape).
- [ ] **T3.2** [guardrail / fail-closed] Boundary test each seam: epoch change mid-stream → `awaitingSnapshot`; `unknown-session` gap → error, not empty; unknown block kind → `kind:'unknown'`, `richEligible:false`; settlement after a session switch → dropped; a `running` card 30 min past `updatedAt` → decayed presentation, `status` untouched. Touches `shared/state/state.ts`, `shared/format/view-helpers.ts`, the home roster + card seams. → proof: each fail-closed case asserted; nothing promoted to success.
- [ ] **T3.3** [rec 05-invariants] Confirm the extraction changed no rendered value or behaviour: `token-identity` 0-diff vs the pre-phase baseline and the a11y contract unchanged (no CSS or markup touched by this phase). → proof: `token-identity.mjs diff` 0 CHANGED / 0 VANISHED / 0 ADDED; no `.svelte` markup diff.
- [ ] **T3.4** [guardrail] `test:web` green and `validate.sh <packet> --strict` from the final state; confirm every task cites a rec number. → proof: `test:web` all pass (new suites + existing); `validate.sh <packet> --strict` exit 0 via realpath.
- [ ] **T3.5** [ND-1.1 / ND-1.11 / ND-2.6 / ND-6.1] Differential test the incremental nodeterm seams: at every prefix of a status-event / roster stream, the incremental result equals a canonical full rebuild — status bucketing (`screen-home.svelte` module), single-owner dedup, done-holdoff, and reconnect reconciliation (`state.ts` module). → proof: `test:web` suite asserting incremental == full rebuild at every prefix (orca `native-chat-incremental-assembler.test.ts:22` shape).
- [ ] **T3.6** [ND-2.1 / ND-2.3 / ND-2.7 / ND-6.1 / ND-1.11] Boundary test the nodeterm seams (fail-closed): a stale `running` card → UNKNOWN presentation, `status` untouched, never "done"; a running-but-unread card stays under Running, never Unread; a presumed-idle signal downgrades only running, never clears needs-you; a reconnect keeps a live `running` row as running-stale, never locally promoted; an id in both cache and live emits once. Touches the home roster, `shared/state/state.ts`, and `shared/format/view-helpers.ts` seams. → proof: each fail-closed case asserted; nothing promoted to a resolved / success value.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

All six seams are pure functions over immutable snapshots carrying `id`+`epoch`+`revision`; each has a
differential test (incremental == canonical full rebuild) and a boundary test (stale/unknown/mismatched
stays visibly unresolved); the scope-guard and draft-reconcile have one source of truth; `token-identity`
is 0-diff, `test:web` is green, and the a11y contract is unchanged — all from the final state. No seam is
blocked on a host field.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the extraction approach and the differential/boundary test design.
- `checklist.md` — barrier sign-off.
- `../research/research.md` — the "Cross-cutting engineering guardrail" rec and the downstream recs each seam backs.
<!-- /ANCHOR:cross-refs -->
