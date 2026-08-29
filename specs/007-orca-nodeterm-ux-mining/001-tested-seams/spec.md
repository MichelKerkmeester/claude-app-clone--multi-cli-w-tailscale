---
title: "Phase 1 — Tested pure-function seams: the fail-closed foundation phases 002–006 build on"
description: "Extract the six view-logic seams — home filter/sort/group, session-card projection, message grouping, draft reconciliation, id+epoch scope-guard, and stale-decay — as PURE functions over immutable snapshots that each carry session id + host epoch + revision. Each seam gets a differential test (every incremental result equals a canonical full rebuild) and a boundary test (stale / unknown / mismatched data stays visibly unresolved, never promoted to success). Every seam reads existing DTO fields only, so nothing here is blocked on a host field. Plan only; no implementation until the operator says go."
trigger_phrases:
  - "tested seams spec requirements"
  - "tested seams packet"
  - "spec requirements"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/001-tested-seams"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Folded eight nodeterm seams into the plan alongside the six orca seams; nothing built."
    next_safe_action: "Await operator go, then extract the fourteen seams and author their tests (PHASE 1)."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 1 — Tested pure-function seams

> **Phase links** — Parent: [`../spec.md`](../spec.md) · First phase — 002–006 build their view affordances on these seams

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `007-orca-nodeterm-ux-mining` |
| Level | 2 |
| Writer | Claude (seam extraction, differential + boundary tests, behaviour-preservation verification, git) |
| Source rec | `research/research.md` → "Cross-cutting engineering guardrail" (orca's own test discipline) |
| Barrier | six pure seams each carry id+epoch+revision · differential test (incremental == full rebuild) · boundary test (stale/unknown/mismatched stays unresolved) · token-identity 0-diff · test:web green · a11y-parity preserved · every task → a rec |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

The verified synthesis names one cross-cutting practice as HIGH value: extract the client's view-logic
seams as **pure functions over immutable snapshots** and prove each one both ways — a differential test
that every incremental result equals a canonical full rebuild, and a boundary test that stale, unknown, or
mismatched data stays *visibly unresolved* rather than being promoted to a success value. orca ships
exactly this discipline (`native-chat-incremental-assembler.test.ts:22`,
`mobile-native-chat-draft-reconcile.test.ts:25`, `mobile-session-last-tab-close.test.ts:9`).

This phase is sequenced first because it is the foundation the later phases stand on. Every "drop-in view
affordance" in 002–006 (recency-sort, time buckets, status filter, stale-decay, card relabel, tool-run
folding, optimistic-echo reconciliation, id+epoch re-validation at chat entry) is only as trustworthy as
the seam under it. Building those affordances against tested pure functions keeps them provably faithful
and fail-closed; building them against ad-hoc inline logic would let a stale or mismatched snapshot render
as if it were live.

Some of these seams already exist as pure code and only need a named entry point plus tests
(`transcriptReducer`, `normalizeTranscript`, `groupNormalizedTranscript`); others are new pure functions
authored here but deliberately not yet wired into any view — their consumer lands in a later phase, and
the test is the proof they are correct the moment that phase wires them.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope — the six seams, each as a pure function over an immutable snapshot carrying session `id`, host
`epoch` (or the list revision analog), and per-item `revision`/`seq`:**

1. **Home filter/sort/group** — a new pure module beside `pages/home/screen-home.svelte` that maps a
   `SessionListState` (`state.ts`) into an ordered, bucketed, filtered roster from existing fields only:
   recency-sort by `updatedAt`, Active/Today/Yesterday/Older time buckets, and a status segment over
   `status`. Backs recs 1.1 / 1.3 / 1.4 (phase 002).
2. **Session-card projection** — a pure `SessionCardDto` → card view-model beside
   `shared/format/view-helpers.ts` (which already holds `sessionStatusLabel`, `compactId`, `relativeTime`):
   `messageCount` label, ISO `datetime`, absolute-on-tap value, and the "recoverable-empty" boundary.
   Backs recs 2.1 / 1.7 / 2.4 (phase 002/003).
3. **Message grouping** — the already-pure `groupNormalizedTranscript` / `groupNormalizedSequence`
   (`pages/chat/transcript/transcript-helpers.ts`) plus the call↔result pairing in
   `normalizeTranscript` (`pages/chat/rich-content/normalize-transcript-blocks.ts`,
   `pendingResultCallIds`). Named as the differential seam. Backs rec 3.4 (phase 003).
4. **Draft reconciliation** — the optimistic-echo path (`promptOptimistic` / `promptAccepted` /
   `promptRejected`) in `transcriptReducer` (`shared/state/state.ts`), extracted into a pure
   reconcile function beside it: echo reconciled by host id, exact raw draft restored on reject.
   Backs recs 4.1 / 5.3 (phase 004/005).
5. **id+epoch scope-guard** — the `state.sessionId !== message.sessionId` and `state.epoch !==
   message.epoch` guards inside `transcriptReducer` (`shared/state/state.ts`), extracted into a single
   pure predicate the reducer calls. Backs recs 6.1 / 6.2 / 5.1 (phase 005/006).
6. **Stale-decay** — a new pure function beside `shared/format/view-helpers.ts` that decays a `running`
   card to a dimmed/idle *presentation* after 30 min of `updatedAt` silence, taking an injected `now`,
   **without writing `status`**. Backs rec 1.8 (phase 002).

Each seam ships with a **differential test** and a **boundary test** (see §4). The scope-guard and
message-grouping/draft-reconcile extractions route their existing call sites through the new pure entry so
there is exactly one source of truth.

**Also in scope — nodeterm-derived seams (fold-in, all ✅ pure over existing DTO fields + a device-local
bit):** eight seams mined from the nodeterm research pass (`../research-nodeterm/research.md`), added
alongside the six orca seams above, each with its own differential + boundary test:

- **ND-1.1** status-bucketing (`buildStatusList` analog) — flatten the roster and bucket by live `status`
  into always-present counted sections. Beside `pages/home/screen-home.svelte`.
- **ND-1.3** first-match membership precedence — attention → working → unread → idle → unknown; a
  running-but-unread card stays under Running. Beside `screen-home.svelte`.
- **ND-2.3** unread-aware bucket lattice — membership priority ≠ display order, over `status` + a
  device-local unread bit. Beside `screen-home.svelte`.
- **ND-1.11** flattened-list dedup / single-owner — reconcile cache vs live (`SessionListState.source`),
  emit each `id` once. Beside `screen-home.svelte`.
- **ND-2.1** stale-decider — decay a `running` card to *Unknown* at 20 min over `updatedAt`, never writing
  `status`. Beside `shared/format/view-helpers.ts`. **SUPERSEDES orca 1.8** (30-min → idle): a lost agent
  is unknown, not idle.
- **ND-2.6** done-holdoff reconciliation — a late `running` within 3 s of `idle` with no new-turn marker is
  ignored. Beside `shared/state/state.ts`.
- **ND-2.7** asymmetric idle-rescue — a presumed-idle signal may only downgrade `running`, never clear a
  needs-you card. Beside `shared/state/state.ts`.
- **ND-6.1** reconnect-decide — default `undecided`; distrust only live rows, never locally promote a stale
  `running` to done/idle. Beside `shared/state/state.ts`.

The richer needs-you / approval-vs-question axis (ND-2.2) and an end-reason (ND-2.9) remain ⚠️ host fields
already **requested in `../007-host-requests`** — not invented here; every seam above reads only existing
DTO fields plus the device-local unread bit.

**Out of scope:** any view affordance itself (sort UI, buckets UI, filter chrome, stale-decay styling,
card relabel markup, tool-folding layout, ask-wizard) — those are phases 002–006; any new host field or
RPC (every seam here reads existing DTO fields, so none is needed); wiring a newly-authored seam (home
roster, card projection, stale-decay) into a rendered surface; app-relay and root code; anything under
`specs/context/**`.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — Each seam is a **pure function**: identical snapshot in → identical result out, no I/O, no
  hidden global or clock read (any "now" is an injected parameter), and the input snapshot is treated as
  immutable (never mutated in place). `relativeTime` and stale-decay, which read `Date.now()` today, must
  thread `now` so their results are deterministic under test.
- **REQ-002** — Each snapshot input **carries its identity** — session `id`, host `epoch` for the
  transcript seams (or the list `updatedAt` revision for the home seams), and per-item `revision`/`seq` —
  and the function **refuses to merge data whose `id` or `epoch` does not match** the snapshot's, matching
  the existing `transcriptReducer` guards.
- **REQ-003** — **Differential test.** For every incremental seam (message grouping, draft reconciliation,
  transcript assembly), applying the seam to each successive prefix of an input stream yields the same
  result as a canonical single-shot rebuild over that prefix — checked at every prefix, as orca's
  incremental-assembler test does.
- **REQ-004** — **Boundary test.** Stale, unknown, mismatched, out-of-epoch, or unknown-kind input stays
  **visibly unresolved** — `awaitingSnapshot`, a `kind:'unknown'` block, a dropped mismatched envelope, a
  decayed (not re-flagged) card, an `unknown-session` error rather than an empty "no sessions" — and is
  **never silently promoted** to a resolved or success value.
- **REQ-005** — The extraction is **behaviour-preserving**: `token-identity` resolves 0-diff (no CSS
  changed), `test:web` stays green from the final state, the a11y contract is unchanged, and **every task
  traces to a numbered rec** in `research/research.md`.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. All six seams are exported pure functions over immutable snapshots that carry `id`+`epoch`+`revision` (or the home revision analog); the scope-guard and the extracted grouping/reconcile paths have exactly one source of truth (the reducer/normalizer call the extracted seam).
2. Each seam has a differential test (incremental == canonical full rebuild at every prefix) and a boundary test (stale/unknown/mismatched stays visibly unresolved).
3. `token-identity` is 0-diff, `test:web` is green from the final state, and the a11y contract is unchanged — the extraction changed no rendered value or behaviour.
4. Every task cites a rec number; no seam is blocked on a host field (all read existing DTO fields).
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **An extracted seam drifts from the inline logic it replaced.** Pulling the `transcriptReducer` scope-guard
  or the draft-reconcile path into a standalone pure function risks two subtly-different copies. Mitigated by
  routing the reducer through the extracted predicate (one source of truth) and by the differential test that
  replays the same streams the reducer already handles.
- **A newly-authored seam is dead code until its consumer lands.** The home roster, card projection, and
  stale-decay functions have no rendered caller in this phase (that is 002/003). Accepted deliberately: this
  phase ships the *tested* seam ahead of its view so the later phase wires a proven function. The test is the
  proof; `test:web` will not exercise an unwired UI path.
- **Non-determinism from the clock.** Stale-decay and relative-time read `Date.now()` today; a test that does
  not inject `now` would be flaky. REQ-001 threads `now` as a parameter so both are deterministic.
- **A late settlement crosses a session switch.** Draft reconciliation must drop a `promptAccepted` /
  `promptRejected` whose `sessionId` differs from the current snapshot — the guard already present in
  `transcriptReducer`; the boundary test asserts it so the extraction cannot lose it.
- **Dependencies:** the `SessionCardDto` / `SyncSnapshot` / `SyncDelta` / `TranscriptBlock` shapes from
  `@pi-remote/pi-rpc-protocol`; the existing `test:web` (vitest) harness and the `token-identity` CSS resolver.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

None blocking. One placement decision is settled in `plan.md`: each new pure seam is **co-located beside the
file it serves** (home roster beside `screen-home.svelte`, card projection and stale-decay beside
`view-helpers.ts`, scope-guard and draft-reconcile beside `state.ts`), following the source-structure
convention rather than a central `seams/` directory. No host field is required by any seam, so there is no
host dependency to resolve first.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `../spec.md` — the phase parent (constraint, phase map, invariants).
- `../research/research.md` — "Cross-cutting engineering guardrail" (the rec this phase implements) and recs 1.1/1.3/1.4/1.7/1.8/2.1/2.4/3.4/4.1/5.1/5.3/6.1/6.2 (the affordances these seams back).
- `../../004-sveltekit-spa-migration/020-source-structure/` — the source/comment conventions the new pure modules follow.
- `../002-home-selection/`, `../003-chat-message/`, `../004-composer/`, `../005-streaming-ask/`, `../006-navigation/` — the phases that consume these seams.
<!-- /ANCHOR:cross-refs -->
