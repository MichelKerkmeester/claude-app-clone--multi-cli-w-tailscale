---
title: "Home list behaviour tasks — the six ✅ list-behaviour recs, planned open"
description: "Open task ledger for recency-sort (1.1), pull-to-refresh keep-last-good (1.2), the four-kind list state machine (1.9), the resume slot (1.10), single-flight Open (1.11), and haptics (1.12). Every task open, each citing its rec number and the real app file it will touch. Nothing implemented."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/002-home-selection/001-list-behavior"
    last_updated_at: "2026-08-26T14:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Added ten nodeterm status-grouping task rows beside the orca list-behaviour ledger"
    next_safe_action: "Start buildStatusList helper plus its precedence test when the operator says go"
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
- [ ] **T1.4** (ND-1.1/1.2/1.3/2.3) Add a pure `buildStatusList(items, unreadById)` that buckets the roster
  into fixed, always-present, attention-first sections (`attention → unread → working → idle → unknown`)
  with first-match membership precedence (`attention → working → unread → idle → unknown`) so a
  running-but-unread session stays under Running — new `app-mobile/src/shared/format/session-list.ts`, plus a
  precedence/lattice unit test. Unread/needs-you input is ⚠️ host `attention` (requested in
  `007-host-requests`); fails closed to an empty Unread section until it lands.
- [ ] **T1.5** (ND-1.4/1.9) Add within-section newest-`updatedAt`-first sort (absent clock sinks last, never
  faked as "just now") and per-section counts derived by the SAME precedence function as the rows
  (anti-drift) — `app-mobile/src/shared/format/session-list.ts`, plus a boundary test on
  empty/single/equal/absent-clock inputs.
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
- [ ] **T2.7** (ND-1.1/1.2) Render the status-grouped roster from `buildStatusList`: fixed, attention-first
  section headers with counts, empty sections still shown so the list never jumps — `app-mobile/src/pages/
  home/screen-home.svelte` (+ `pages/home/empty-state.svelte`). These *status* sections COMPLEMENT orca
  1.3's *time* buckets (sibling `002-list-organization`), an orthogonal grouping axis, not a replacement.
- [ ] **T2.8** (ND-1.10) Add a device-local "sort by recency / group by status" toggle, localStorage-backed
  and fail-closed on parse, selecting orca 1.1's flat recency view or the ND-1.1 status-grouped view — a
  `shared/` preference helper called from `app-mobile/src/pages/home/screen-home.svelte`; the host never
  learns it exists.
- [ ] **T2.9** (ND-1.8) Derive each card's live status from a per-id `$derived` keyed on that id, never a
  whole-roster reactive object, so one session's flip invalidates only that card —
  `app-mobile/src/pages/home/screen-home.svelte` (card render).
- [ ] **T2.10** (ND-2.4/2.5) Carry the unread bit as a pure client device-local overlay, set on a transition
  to idle/needs-you only when that session's chat is NOT foreground+active ("never mark unread while
  watching"), never folded into `status` — a `shared/` unread-state helper + `app-mobile/src/pages/home/
  screen-home.svelte`. ⚠️ the needs-you input is host `attention` (requested in `007-host-requests`).
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
- [ ] **T3.5** (ND-1.3/2.3) Test first-match membership precedence — a running-but-unread session stays
  under Running and is never double-classified; membership-priority ≠ display-order holds.
- [ ] **T3.6** (ND-1.9/1.4) Assert each section count equals its row membership under the same precedence
  function (anti-drift), and an absent `updatedAt` sinks last and is never rendered as "just now".
- [ ] **T3.7** (ND-2.5/1.10) Assert no path folds the unread overlay into `status`, and the recency/status
  toggle fails closed on an unreadable/unparseable store.
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
