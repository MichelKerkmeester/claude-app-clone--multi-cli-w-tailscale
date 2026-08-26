---
title: "Phase 1 tasks — six pure seams, each with a differential + boundary test"
description: "Confirm the snapshot contract, extract or author each seam, then prove each with a differential test (incremental == full rebuild) and a boundary test (stale/unknown/mismatched stays unresolved). Every task cites its rec and the real app file it touches. All open — nothing implemented."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-ux-mining/001-tested-seams"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Wrote the open task ledger for six seams; nothing implemented."
    next_safe_action: "Await operator go, then start T1.1 (confirm the snapshot contract per seam)."
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
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [ ] **T3.1** [guardrail] Differential test each incremental seam: at every prefix of a representative stream, the incremental result equals a canonical full rebuild. Covers message grouping (`transcript-helpers.ts` / `normalize-transcript-blocks.ts`), draft reconciliation and the scope-guard (`state.ts` `transcriptReducer`). → proof: `test:web` suite asserting equality at every prefix (orca `native-chat-incremental-assembler.test.ts:22` shape).
- [ ] **T3.2** [guardrail / fail-closed] Boundary test each seam: epoch change mid-stream → `awaitingSnapshot`; `unknown-session` gap → error, not empty; unknown block kind → `kind:'unknown'`, `richEligible:false`; settlement after a session switch → dropped; a `running` card 30 min past `updatedAt` → decayed presentation, `status` untouched. Touches `shared/state/state.ts`, `shared/format/view-helpers.ts`, the home roster + card seams. → proof: each fail-closed case asserted; nothing promoted to success.
- [ ] **T3.3** [rec 05-invariants] Confirm the extraction changed no rendered value or behaviour: `token-identity` 0-diff vs the pre-phase baseline and the a11y contract unchanged (no CSS or markup touched by this phase). → proof: `token-identity.mjs diff` 0 CHANGED / 0 VANISHED / 0 ADDED; no `.svelte` markup diff.
- [ ] **T3.4** [guardrail] `test:web` green and `validate.sh <packet> --strict` from the final state; confirm every task cites a rec number. → proof: `test:web` all pass (new suites + existing); `validate.sh <packet> --strict` exit 0 via realpath.
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
