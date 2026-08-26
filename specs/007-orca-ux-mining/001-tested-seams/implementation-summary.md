---
title: "Phase 1 implementation summary — tested pure-function seams (PLANNED)"
description: "Planned stub. The six view-logic seams — home filter/sort/group, session-card projection, message grouping, draft reconciliation, id+epoch scope-guard, and stale-decay — will be extracted or authored as pure functions over immutable id+epoch+revision snapshots, each with a differential test (incremental == full rebuild) and a boundary test (stale/unknown/mismatched stays unresolved), proven behaviour-preserving by token-identity 0-diff and test:web. No implementation until the operator says go."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-ux-mining/001-tested-seams"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the planned-stub doc; implementation deferred until the operator says go."
    next_safe_action: "Await operator go, then implement PHASE 1–3 and fill this doc from the final state."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 1 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `007-orca-ux-mining` |
| Level | 2 |
| Status | Planned — implementation deferred until the operator says go |
| Requirements to ship | REQ-001 … REQ-005 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Nothing yet — this is a planned stub. When the operator says go, six view-logic seams will become pure
functions over immutable snapshots that each carry session `id`, host `epoch` (or the home `updatedAt`
revision), and per-item `revision`/`seq`: (1) home filter/sort/group beside `pages/home/screen-home.svelte`;
(2) session-card projection beside `shared/format/view-helpers.ts`; (3) message grouping — the already-pure
`groupNormalizedTranscript` (`pages/chat/transcript/transcript-helpers.ts`) and the call↔result pairing in
`normalizeTranscript` (`pages/chat/rich-content/normalize-transcript-blocks.ts`); (4) draft reconciliation
extracted from `transcriptReducer` (`shared/state/state.ts`); (5) the id+epoch scope-guard extracted from
that same reducer; (6) stale-decay beside `shared/format/view-helpers.ts`. The three new seams will be
authored pure and left unwired — their rendered consumers land in phases 002/003.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

To be delivered. The plan is: fix the snapshot contract per seam and thread an injected `now` into the
time-dependent ones; extract the scope-guard and draft-reconcile into pure functions the reducer then calls
(one source of truth); author the three new pure seams beside their cited files; then prove each seam two
ways — a differential test that every incremental prefix equals a canonical full rebuild (orca's
`native-chat-incremental-assembler.test.ts` shape) and a boundary test that stale/unknown/mismatched input
stays visibly unresolved. Behaviour preservation will be proven by `token-identity` 0-diff (no CSS touched),
`test:web` green from the final state, and an unchanged a11y contract.
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
