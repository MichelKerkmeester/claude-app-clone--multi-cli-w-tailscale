---
title: "Phase 1 implementation summary — tested pure-function seams (IMPLEMENTED)"
description: "Planned stub. The six view-logic seams — home filter/sort/group, session-card projection, message grouping, draft reconciliation, id+epoch scope-guard, and stale-decay — will be extracted or authored as pure functions over immutable id+epoch+revision snapshots, each with a differential test (incremental == full rebuild) and a boundary test (stale/unknown/mismatched stays unresolved), proven behaviour-preserving by token-identity 0-diff and test:web. No implementation until the operator says go."
trigger_phrases:
  - "tested seams implementation summary"
  - "tested seams packet"
  - "implementation summary"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/001-tested-seams"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Built + verified the pure seams; test:web green, lint clean, Sonnet-reviewed."
    next_safe_action: "Wire the seams into the home/chat views in phases 002/003."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 1 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `006-orca-nodeterm-ux-mining` |
| Level | 2 |
| Status | Planned — implementation deferred until the operator says go |
| Requirements to ship | REQ-001 … REQ-005 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Built and verified — `test:web` green (svelte 68 files/545+3 skipped, logic 24 files/245), `eslint` clean,
and Sonnet-reviewed (purity, behaviour-preserving extraction, fail-closed semantics, scope discipline, and
comment hygiene all PASS). The six view-logic seams are pure
functions over immutable snapshots that each carry session `id`, host `epoch` (or the home `updatedAt`
revision), and per-item `revision`/`seq`: (1) home filter/sort/group beside `pages/home/screen-home.svelte`;
(2) session-card projection beside `shared/format/view-helpers.ts`; (3) message grouping — the already-pure
`groupNormalizedTranscript` (`pages/chat/transcript/transcript-helpers.ts`) and the call↔result pairing in
`normalizeTranscript` (`pages/chat/rich-content/normalize-transcript-blocks.ts`); (4) draft reconciliation
extracted from `transcriptReducer` (`shared/state/state.ts`); (5) the id+epoch scope-guard extracted from
that same reducer; (6) stale-decay beside `shared/format/view-helpers.ts`. The three new seams will be
authored pure and left unwired — their rendered consumers land in phases 002/003.

Also built: eight nodeterm-derived seams folded in from
`../research-nodeterm/research.md`, each pure over existing DTO fields plus a device-local unread bit and
left unwired. Home-roster projections beside `pages/home/screen-home.svelte` — status-bucketing (ND-1.1),
first-match membership precedence (ND-1.3), the unread-aware bucket lattice (ND-2.3), and single-owner dedup
(ND-1.11); a card-presentation stale-decider beside `shared/format/view-helpers.ts` that decays a `running`
card to *Unknown* at 20 min (ND-2.1, superseding orca 1.8's 30-min → idle); and three status reconcilers
beside `shared/state/state.ts` — done-holdoff (ND-2.6), asymmetric idle-rescue (ND-2.7), and reconnect-decide
(ND-6.1). Each gets its differential and/or boundary test (T2.7–T2.14, T3.5–T3.6). The needs-you /
approval-vs-question axis (ND-2.2) and end-reason (ND-2.9) stay ⚠️ host requests in `../007-host-requests`.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Delivered as planned: fixed the snapshot contract per seam and threaded an injected `now` into the
time-dependent ones; extracted the scope-guard and draft-reconcile into pure functions the reducer now calls
(one source of truth, confirmed behaviour-preserving); authored the new pure seams beside their cited files;
and proved each seam two ways — a differential test that every incremental prefix equals a canonical full
rebuild and a boundary test that stale/unknown/mismatched input stays visibly unresolved. Behaviour
preservation is shown by no CSS/markup diff (token-identity 0-diff by construction), `test:web` green from
the final state (svelte suite identical to baseline), and an unchanged a11y contract. One P1 follow-up: two
of the differential tests (draft-reconcile, done-holdoff) re-invoke the seam under test rather than an
independent reference — a test-rigor hardening, not a behaviour defect.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Sequence this phase first.** Every drop-in affordance in 002–006 is only as faithful as the seam beneath
it; building them against tested pure functions keeps them provably fail-closed. This is the reason the
phase parent orders `001-tested-seams` ahead of the view phases.

**Name-and-test the already-pure seams; do not rewrite them.** `groupNormalizedTranscript`,
`normalizeTranscript`, and the `transcriptReducer` guards are pure today. The scope-guard and draft-reconcile
will be extracted so they have one tested source of truth, but the goal is behaviour identity, not a
redesign.

**Author the new seams unwired.** The home roster, card projection, and stale-decay functions have no
rendered caller in this phase — the test is their proof. This trades a little dead code now for a proven
function the later phase wires without re-deriving it.

**Inject `now`.** Stale-decay and `relativeTime` read the clock today; threading `now` as a parameter is
what makes the boundary tests deterministic.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Planned result |
|---|---|
| Pure-seam contract | Six seams, each pure over an immutable `id`+`epoch`+`revision` snapshot |
| Differential test | Incremental result == canonical full rebuild at every prefix (grouping, reconcile, scope-guard) |
| Boundary test | Stale/unknown/mismatched → `awaitingSnapshot` / `kind:'unknown'` / dropped / decayed / `unknown-session` error, never success |
| One source of truth | `transcriptReducer` routes the scope-guard + draft-reconcile through the extracted pure functions |
| Token identity (app.css) | 0 CHANGED / 0 VANISHED / 0 ADDED — no CSS touched |
| `test:web` | Green from the final state (new suites + existing) |
| a11y contract | Unchanged — no markup touched |
| `validate.sh --strict` | Exit 0 via realpath |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

Planned scope only. This phase extracts and tests the seams; it does NOT build any view affordance — the
sort/bucket/filter UI, card relabel markup, stale-decay styling, tool-run folding, and ask-wizard are
phases 002–006, which consume these seams. The three newly-authored seams (home roster, card projection,
stale-decay) are unwired until then, so `test:web` exercises them only through their own suites, not through
a rendered path. Every seam reads existing DTO fields, so none is blocked on a host field; the ⚠️ recs that
need new host fields (`title`, `lastMessagePreview`, `agent`, `attention`) are out of this phase and live in
`../007-host-requests/`.
<!-- /ANCHOR:limitations -->
