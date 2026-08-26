---
title: "Phase 1 plan — extract six pure seams behind differential + boundary tests, behaviour-preserving"
description: "How the six view-logic seams become pure functions over immutable snapshots and how the fail-closed claim is proven: each snapshot carries id+epoch+revision, each seam gets a differential test (every incremental prefix equals a canonical full rebuild) and a boundary test (stale/unknown/mismatched stays unresolved), the extracted scope-guard and grouping/reconcile paths route their old call sites through one source of truth, and token-identity 0-diff + test:web + a11y-parity prove no rendered behaviour changed."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/001-tested-seams"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Added the extraction + test approach for eight nodeterm seams; no code written."
    next_safe_action: "Await operator go, then extract the nodeterm seams and author paired tests (PHASE 1–2)."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 1 plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Turn the six view-logic seams into pure functions over immutable snapshots that each carry session `id`,
host `epoch` (or the home list revision), and per-item `revision`/`seq`. Three seams already exist as pure
code and are given a named entry point plus tests (message grouping, draft reconciliation, id+epoch
scope-guard); three are authored new but left unwired for their later consumer (home roster, card
projection, stale-decay). Each seam ships with a differential test (every incremental prefix equals a
canonical full rebuild) and a boundary test (stale / unknown / mismatched stays visibly unresolved). The
extraction is proven behaviour-preserving by `token-identity` 0-diff, `test:web`, and the a11y contract.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

Every seam is a pure function (same snapshot in → same result out, `now` injected, input never mutated) and
refuses to merge data whose `id`/`epoch` mismatches the snapshot. Each has a **differential test** —
applying the seam to each successive prefix of a stream equals a canonical single-shot rebuild over that
prefix — and a **boundary test** — stale/unknown/mismatched/out-of-epoch/unknown-kind input resolves to
`awaitingSnapshot`, a `kind:'unknown'` block, a dropped envelope, a decayed (never re-flagged) card, or an
`unknown-session` error, never a success value. `token-identity` resolves 0-diff (no CSS touched),
`test:web` is green from the final state, the a11y contract is unchanged, and every task cites a rec — all
from the final state before the phase closes.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

The immutable-snapshot contract is literal for the transcript seams and analogous for the home seams. The
transcript snapshot (`TranscriptState` in `shared/state/state.ts`) already carries `sessionId`, `epoch`,
`coversThrough`, and blocks with `revision`+`seq`; the home snapshot (`SessionListState`) carries
`updatedAt` as its revision and items keyed by `id`. Each seam takes such a snapshot and returns a derived
view value; none owns or edits session truth.

**Already-pure seams — name and test, do not rewrite.** `groupNormalizedTranscript` /
`groupNormalizedSequence` (`transcript-helpers.ts`) and `normalizeTranscript` →
`pendingResultCallIds` (`normalize-transcript-blocks.ts`) are pure today; the phase adds their differential
and boundary tests. The **scope-guard** — the repeated `state.sessionId !== message.sessionId` and
`state.epoch !== message.epoch` checks in `transcriptReducer` — is extracted into one pure predicate the
reducer then calls, so the guard has a single tested source. The **draft-reconcile** path
(`promptOptimistic` / `promptAccepted` / `promptRejected`) is extracted into a pure function beside the
reducer, which the reducer calls; the exact raw draft is restored on reject.

**New seams — author pure, leave unwired.** The **home roster** (recency-sort by `updatedAt`, time buckets,
status segment) lives beside `screen-home.svelte`; **card projection** and **stale-decay** live beside
`view-helpers.ts` (stale-decay takes `now`, returns a presentation state, and never writes `status`). Their
rendered consumers land in phases 002/003 — this phase ships only the tested function.

The canonical rebuild each differential test compares against is a deliberately simple, obviously-correct
reference (e.g. a full re-group from scratch, a full re-reduce from the empty state) — never the seam under
test — so the two implementations disagreeing surfaces a real defect.

**Nodeterm-derived seams — author pure, leave unwired, test both ways.** Eight further seams
(`../research-nodeterm/research.md`) extend the same discipline. Four are **home-roster projections** beside
`screen-home.svelte`, layered over `SessionListState`: status-bucketing into always-present counted sections
(ND-1.1); a first-match membership-precedence classifier (attention → working → unread → idle → unknown) so a
running-but-unread card stays under Running (ND-1.3); the unread-aware bucket lattice whose membership
priority is deliberately distinct from display order, over `status` + a device-local unread bit (ND-2.3); and
a single-owner dedup that emits each `id` once when the roster reconciles cache vs live via
`SessionListState.source` (ND-1.11). One is a **card-presentation decider** beside `view-helpers.ts`: the
20-min stale → *Unknown* decay over `updatedAt` with injected `now`, never writing `status` — which
**supersedes** orca's 30-min → idle dim (T2.3) as the more honest fail-closed behaviour. Three are **status
reconcilers** beside `state.ts`, feeding `sessionListReducer`: done-holdoff (a late `running` within 3 s of
`idle` with no new-turn marker is ignored, ND-2.6), asymmetric idle-rescue (a presumed-idle signal may only
downgrade `running`, never clear a needs-you card, ND-2.7), and reconnect-decide (default `undecided`,
distrust only live rows, never locally promote a stale `running`, ND-6.1).

Each nodeterm seam is authored pure over existing DTO fields plus the device-local unread bit and left
unwired, matching the orca seams' pattern. The incremental ones (bucketing, dedup, done-holdoff,
reconnect-decide) get a **differential test** — every prefix of a roster / status-event stream equals a
canonical full rebuild — and every seam gets a **boundary test** for its fail-closed case (stale → Unknown
not "done"; running-but-unread stays Running; presumed-idle downgrades only running; reconnect keeps a live
`running` stale; a doubled `id` emits once). The needs-you / approval-vs-question axis (ND-2.2) and end-reason
(ND-2.9) stay ⚠️ host requests in `../007-host-requests`, so no seam here is blocked on a host field.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · setup
Confirm the snapshot contract for each seam (which field is `id`, `epoch`, and the `revision`/`seq` analog),
inventory the existing call sites of the three already-pure seams, and fix the canonical reference
implementation for each differential test. Thread `now` into `relativeTime` and the stale-decay signature.

### Phase 2 · extraction
Extract the scope-guard predicate and the draft-reconcile function from `transcriptReducer` and route the
reducer through them (one source of truth). Author the three new pure seams (home roster, card projection,
stale-decay) beside their cited files, unwired. Keep every rendered value and behaviour identical.

### Phase 3 · verification
Author each seam's differential + boundary test; run `test:web`; run `token-identity` against the pre-phase
baseline; confirm the a11y contract is unchanged; confirm every task cites a rec; run
`validate.sh <packet> --strict` from the final state.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

The tests ARE the deliverable, so they are specified precisely. For each incremental seam the differential
test feeds a representative stream and asserts, at **every** prefix, that the incremental result equals the
canonical full rebuild — the shape orca uses in `native-chat-incremental-assembler.test.ts`. For each seam
the boundary test drives the fail-closed cases: an epoch change mid-stream (→ `awaitingSnapshot`), an
`unknown-session` gap (→ error, not empty), an unknown block kind (→ `kind:'unknown'`, `richEligible:false`),
a settlement arriving after a session switch (→ dropped), and a `running` card 30 min past `updatedAt`
(→ decayed presentation, `status` untouched). Determinism comes from an injected `now`. `test:web` proves
the extraction left existing behaviour green; `token-identity` proves no CSS moved.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The protocol shapes from `@pi-remote/pi-rpc-protocol` (`SessionCardDto`, `SyncSnapshot`, `SyncDelta`,
  `SyncGap`, `TranscriptBlock`) and the existing state snapshots (`SessionListState`, `TranscriptState`).
- The `test:web` (vitest) harness for the new differential/boundary suites, and the `token-identity` CSS
  resolver plus its pre-phase baseline.
- No host field or RPC — every seam reads existing DTO fields, so this phase has no host dependency.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

The change adds new pure modules beside `pages/home/screen-home.svelte`, `shared/format/view-helpers.ts`,
and `shared/state/state.ts`, adds test files, and rewires two internal call sites inside
`transcriptReducer`. `git checkout -- app-mobile` restores the pre-phase state; there is no migration, no
data step, and no host change to reverse. The three newly-authored seams are unwired, so reverting them
affects no rendered surface.
<!-- /ANCHOR:rollback -->
