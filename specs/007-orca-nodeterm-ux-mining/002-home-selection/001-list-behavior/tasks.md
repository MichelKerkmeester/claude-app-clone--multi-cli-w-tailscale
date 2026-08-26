---
title: "Home list behaviour tasks — the six ✅ list-behaviour recs, implemented"
description: "Task ledger for recency-sort (1.1), pull-to-refresh keep-last-good (1.2), the four-kind list state machine (1.9), the resume slot (1.10), single-flight Open (1.11), haptics (1.12), and the status-grouped roster. All 22 tasks complete."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/002-home-selection/001-list-behavior"
    last_updated_at: "2026-08-26T17:50:00.000Z"
    last_updated_by: "cursor-grok-4.6"
    recent_action: "Wired phase-1 seams into the home roster and verified test:web"
    next_safe_action: "None — phase implemented; sibling list-organization can decorate this list"
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Home list behaviour tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Every task is complete; each cites its rec number and the file it touches.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** (rec 1.1) Add a pure `sortByRecency(items)` helper ordering the roster most-recent-first by
  `updatedAt`, with a stable tie break, plus a differential test vs. a canonical sort — `pages/home/session-list-seams.ts`;
  proof: `session-list-seams.test.ts` sortByRecency matches canonical, empty/single/equal/absent-clock.
- [x] **T1.2** (rec 1.9) Add a pure `deriveListState(sessionState, connection)` returning `loading |
  error+retry | host-too-old | ready` plus the items to show, encoding keep-prior-on-refetch and
  host-too-old ≠ empty — `pages/home/session-list-seams.ts`; proof: `session-list-seams.test.ts` keep-prior,
  error-retry, never host-too-old without a capability signal.
- [x] **T1.3** Capture the `token-identity` and `test:web` baselines before any `.svelte`
  edit — snapshot `/tmp/home-list-behavior-token-baseline.json` (65 resolved / theme, unresolved 0);
  final diff 0/0/0 light/dark/system.
- [x] **T1.4** (ND-1.1/1.2/1.3/2.3) Add a pure `buildStatusList(items, unreadById)` that buckets the roster
  into fixed, always-present, attention-first sections with first-match membership — composed over existing
  `sessionStatusGroup` in `pages/home/session-list-seams.ts`; proof: `session-list-seams.test.ts` always-present
  sections + running-but-unread stays Running.
- [x] **T1.5** (ND-1.4/1.9) Add within-section newest-`updatedAt`-first sort (absent clock sinks last, never
  faked as "just now") and per-section counts derived by the SAME precedence function as the rows —
  `buildStatusList` in `session-list-seams.ts`; proof: count===rows and absent-clock-sinks tests.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** (rec 1.1) Render `sortByRecency(sessions.items)` in the `{#each}` — `pages/home/screen-home.svelte`
  recency mode; proof: `session-list-seams.test.ts` + `screen-home.svelte.test.ts`.
- [x] **T2.2** (rec 1.9) Drive the roster from `deriveListState`, keeping prior items during a refetch and
  separating host-too-old from no-sessions — `screen-home.svelte` + `empty-state.svelte`; proof: keep-prior
  and Catalog-unavailable vs No-sessions tests.
- [x] **T2.3** (rec 1.2) Add pull-to-refresh that re-requests the host list and, on failure, keeps the
  last-good snapshot and lets the existing `isStale` derivation show Stale — `screen-home.svelte` +
  `routes/+page.svelte` `onRefresh`; proof: `screen-home.svelte.test.ts` rejected refresh keeps row + Stale.
- [x] **T2.4** (rec 1.10) Add the reserved resume slot, filled from the `cache` prop on first paint and
  rendered inert until `connection === 'live'` — `screen-home.svelte`; proof: resume-slot inert test.
- [x] **T2.5** (rec 1.11) Add single-flight Open: hold `launchingId` in local state, disable every card's
  Open while set, spinner on the chosen row, `stopPropagation` on the tap — `card-session.svelte` +
  `screen-home.svelte`; proof: sibling Opens disabled test.
- [x] **T2.6** (rec 1.12) Add a no-op-safe haptics wrapper (selection · success · error · edge-bump) and
  fire it on pick / open-refresh success / fail-closed error / overscroll — `shared/chrome/haptics.ts`;
  proof: `haptics.test.ts`.
- [x] **T2.7** (ND-1.1/1.2) Render the status-grouped roster from `buildStatusList`: fixed, attention-first
  section headers with counts, empty sections still shown — `screen-home.svelte`; proof:
  `screen-home.svelte.test.ts` five sections + empty Unread/Attention.
- [x] **T2.8** (ND-1.10) Add a device-local "sort by recency / group by status" toggle, localStorage-backed
  and fail-closed on parse — `shared/format/roster-view-preference.ts` called from `screen-home.svelte`;
  proof: `roster-view-preference.test.ts`.
- [x] **T2.9** (ND-1.8) Derive each card's live status from a per-id `$derived` keyed on that id —
  `pages/home/card-session.svelte` `const session = $derived(selectSession(sessionId))`.
- [x] **T2.10** (ND-2.4/2.5) Carry the unread bit as a pure client device-local overlay, never folded into
  `status` — `shared/state/unread-overlay.ts` + `screen-home.svelte`; grouping ignores it until a host
  `attention` field exists; proof: `unread-overlay.test.ts` + fail-closed Unread section test.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Run the `sortByRecency` and `deriveListState` differential/boundary tests (empty · single ·
  equal `updatedAt` · stale · unknown) — `session-list-seams.test.ts` 28 tests passing.
- [x] **T3.2** Run the keep-last-good test (a rejected refresh keeps prior items + shows Stale) and the
  single-flight test (one launch disables sibling Opens) — `screen-home.svelte.test.ts`.
- [x] **T3.3** Run `token-identity` (0-diff across light/dark/system) for card CSS and `test:web` from the
  final state — token-identity 0/0/0; svelte 69 files / 552 passed + 3 skipped; logic 27 files / 270 passed.
- [x] **T3.4** Run the a11y-parity check on the roster (live region, list semantics, focus order preserved)
  and confirm no rec wrote `status` or any session field — `role="list"` / `role="status"` live region in
  `screen-home.svelte`; unread overlay never assigns `status`.
- [x] **T3.5** (ND-1.3/2.3) Test first-match membership precedence — a running-but-unread session stays
  under Running and is never double-classified — `session-list-seams.test.ts` + `screen-home.svelte.test.ts`.
- [x] **T3.6** (ND-1.9/1.4) Assert each section count equals its row membership under the same precedence
  function, and an absent `updatedAt` sinks last and is never rendered as "just now" —
  `session-list-seams.test.ts` + `screen-home.svelte.test.ts` unknown-time assertion.
- [x] **T3.7** (ND-2.5/1.10) Assert no path folds the unread overlay into `status`, and the recency/status
  toggle fails closed on an unreadable/unparseable store — `unread-overlay.test.ts` +
  `roster-view-preference.test.ts`.
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
