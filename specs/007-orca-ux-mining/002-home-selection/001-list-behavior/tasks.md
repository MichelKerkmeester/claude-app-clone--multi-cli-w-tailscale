---
title: "Home list behaviour tasks — the six ✅ list-behaviour recs, planned open"
description: "Open task ledger for recency-sort (1.1), pull-to-refresh keep-last-good (1.2), the four-kind list state machine (1.9), the resume slot (1.10), single-flight Open (1.11), and haptics (1.12). Every task open, each citing its rec number and the real app file it will touch. Nothing implemented."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-ux-mining/002-home-selection/001-list-behavior"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the open task ledger for the six list-behaviour recs; nothing built."
    next_safe_action: "Start T1.1 (sortByRecency helper + differential test) when the operator says go."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Home list behaviour tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Every task is OPEN — this is a plan;
nothing is implemented until the operator says "go". Each task cites its rec number and the file it touches.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [ ] **T1.1** (rec 1.1) Add a pure `sortByRecency(items)` helper ordering the roster most-recent-first by
  `updatedAt`, with a stable tie break, plus a differential test vs. a canonical sort — touches a new
  `shared/format/` (or `pages/home/`) sort helper alongside `shared/format/view-helpers.ts`.
- [ ] **T1.2** (rec 1.9) Add a pure `deriveListState(sessionState, connection)` returning `loading |
  error+retry | host-too-old | ready` plus the items to show, encoding keep-prior-on-refetch and
  host-too-old ≠ empty — reads `SessionListState` from `shared/state/state.ts`.
- [ ] **T1.3** Capture the `token-identity` and `test:web` baselines before any `.svelte` edit — records
  the pre-change roster render for the 0-diff comparison.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [ ] **T2.1** (rec 1.1) Render `sortByRecency(sessions.items)` in the `{#each}` — `pages/home/screen-home.svelte`.
- [ ] **T2.2** (rec 1.9) Drive the roster from `deriveListState`, keeping prior items during a refetch and
  separating host-too-old from no-sessions — `pages/home/screen-home.svelte` + `pages/home/empty-state.svelte`.
- [ ] **T2.3** (rec 1.2) Add pull-to-refresh that re-requests the host list and, on failure, keeps the
  last-good snapshot and lets the existing `isStale` derivation show Stale — `pages/home/screen-home.svelte`
  with `pages/home/freshness.svelte` unchanged as the readout.
- [ ] **T2.4** (rec 1.10) Add the reserved resume slot, filled from the `cache` prop on first paint and
  rendered inert until `connection === 'live'` — `pages/home/screen-home.svelte`.
- [ ] **T2.5** (rec 1.11) Add single-flight Open: hold `launchingId` in local state, disable every card's
  Open while set, spinner on the chosen row, `stopPropagation` on the tap — `pages/home/screen-home.svelte`
  around the existing `onSelect(session.id)` route.
- [ ] **T2.6** (rec 1.12) Add a no-op-safe haptics wrapper (selection · success · error · edge-bump) and
  fire it on pick / open-refresh success / fail-closed error / overscroll — a new `shared/` haptics helper,
  called from `pages/home/screen-home.svelte`.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [ ] **T3.1** Run the `sortByRecency` and `deriveListState` differential/boundary tests (empty · single ·
  equal `updatedAt` · stale · unknown) — proves the pure seam is faithful and fail-closed.
- [ ] **T3.2** Run the keep-last-good test (a rejected refresh keeps prior items + shows Stale) and the
  single-flight test (one launch disables sibling Opens).
- [ ] **T3.3** Run `token-identity` (0-diff across light/dark/system) for any card CSS touched by the
  resume slot / skeleton, and `test:web` from the final state.
- [ ] **T3.4** Run the a11y-parity check on the roster (live region, list semantics, focus order preserved)
  and confirm no rec wrote `status` or any session field.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

All six recs land as ✅ client-local behaviour: the roster is recency-sorted, pull-to-refresh keeps
last-good, the four list states are distinct with host-too-old ≠ empty, the resume slot is cache-filled and
inert until live, Open is single-flight, and haptics fire and degrade silently — with token-identity 0-diff,
`test:web` green, and a11y-parity preserved from the final state, and no `status` write anywhere.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the pure-seam-plus-local-interaction approach and the proof.
- `checklist.md` — barrier sign-off.
- `../../research/research.md` — recs 1.1, 1.2, 1.9, 1.10, 1.11, 1.12.
<!-- /ANCHOR:cross-refs -->
