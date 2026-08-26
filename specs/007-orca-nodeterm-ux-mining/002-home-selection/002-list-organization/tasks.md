---
title: "Home list organization tasks — sectioning/filter/search/favorite/new-session chrome, implemented"
description: "Task ledger for time buckets (1.3), status filter chips (1.4), search chrome + two empty states (1.5), device-local favorite (1.14), and new-session chrome (1.13). All tasks complete; useful-search and session-create stay host-blocked and fail-closed."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/002-home-selection/002-list-organization"
    last_updated_at: "2026-08-26T18:40:00.000Z"
    last_updated_by: "cursor-grok-4.6"
    recent_action: "Shipped time-bucket, filter, search, favorite, and inert New-session chrome"
    next_safe_action: "None — phase implemented; sibling card-polish can decorate the cards"
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Home list organization tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Every task is complete; each cites its rec number and the file it touches.
The two ⚠️ paths (useful search query, session-create) shipped fail-closed chrome; they remain host-blocked.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** (recs 1.3, 1.4, 1.14) Add a pure `organize(items, { filter, query, favorites })` pipeline —
  time buckets from `updatedAt`/`status`, status filter over `status`, favorite float within a section —
  with a differential test vs. a canonical implementation — `shared/format/view-helpers.ts` (`timeBucket`)
  + `pages/home/session-list-seams.ts` (`organize`) + `shared/state/favorite-preference.ts`. Proof:
  `session-list-seams.test.ts` organize matches canonical; empty/one/all-filtered/favorite-in-section.
- [x] **T1.2** (rec 1.14) Add the fail-closed favorite read: an unreadable `localStorage` store yields an
  explicit "favorites unavailable" (empty set surfaced), never a silent host-order default —
  `shared/state/favorite-preference.ts`. Proof: `favorite-preference.test.ts` throw + corrupt JSON →
  `available: false`.
- [x] **T1.3** Capture the `token-identity` and `test:web` baselines before any `.svelte` edit —
  snapshot `/tmp/ti-list-org-baseline.json` (65 resolved / theme, unresolved 0); starting `test:web`
  svelte 70 / 553 + 3 skipped, logic 27 / 270 from the prior home-list phase.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** (rec 1.3) Render the roster in Active/Today/Yesterday/Older sections with per-section counts,
  omitting empty sections — `pages/home/screen-home.svelte` recency mode via `buildTimeList`. Proof:
  `screen-home.svelte.test.ts` time-bucket sections + counts; empty Today omitted.
- [x] **T2.2** (rec 1.4) Add status filter chips (Active=`running` · Idle=`idle` · Interrupted=`interrupted`)
  that compose with the buckets over existing `status` — `pages/home/screen-home.svelte`. Proof:
  `screen-home.svelte.test.ts` Active chip hides idle/interrupted; `role="group"` Status filter.
- [x] **T2.3** (rec 1.14) Wire the device-local favorite so tapping a favorite reorders the local list
  within its section and persists in `localStorage` — `pages/home/screen-home.svelte` +
  `favorite-preference.ts`. Proof: pin moves older card to front of Older; fail-closed test disables Pin.
- [x] **T2.4** (rec 1.5) Add the search-box chrome and the two distinct empty states — "no sessions match"
  (query non-empty, all filtered) vs. "no sessions here" (list empty) — matching only client-held data —
  `pages/home/screen-home.svelte` + `pages/home/empty-state.svelte`. Proof: `empty-state.svelte.test.ts` +
  `screen-home.svelte.test.ts` labelled searchbox; no invented title match.
- [x] **T2.5** (rec 1.13) Add the "New session" control, disabled until `connection === 'live'`, with a
  host-picker when multiple hosts exist, and an inert click target with a fail-closed "unavailable" state —
  `pages/home/screen-home.svelte`. Proof: disabled while connecting; live click does not call `onSelect`;
  combobox appears for two hosts.
- [x] **T2.6** Record the useful-search field and the session-create RPC as host dependencies in
  `007-host-requests`, each with the UI it unlocks and the fail-closed fallback. Evidence: title /
  `lastMessagePreview` already requested there (unlocks useful search; fallback is id-only match);
  session-create is already noted as a related ⚠️ item owned outside that packet. This phase did not
  edit that folder.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Run the `organize` pipeline differential/boundary tests (empty · one · all-filtered ·
  favorite-in-section) and confirm bucket × filter × favorite compose without double-count or lost float.
  Proof: `session-list-seams.test.ts` organize suite (37 tests in file).
- [x] **T3.2** Run the fail-closed favorite test (unreadable store → favorites unavailable, not host-order)
  and the two-search-empty-state test (match vs. empty distinguished). Proof: `favorite-preference.test.ts`;
  `empty-state.svelte.test.ts`; `screen-home.svelte.test.ts`.
- [x] **T3.3** Run the inert-"New session" test (present · disabled until live · never calls create), and
  `token-identity` (0-diff across light/dark/system) for the new chrome CSS. Proof:
  `screen-home.svelte.test.ts`; token-identity CHANGED 0 / VANISHED 0 / ADDED 0 vs `/tmp/ti-list-org-baseline.json`.
- [x] **T3.4** Run `test:web` and the a11y-parity check (chip group, labelled search input, section
  headings) from the final state; confirm no `status` write and no client-invented host field. Proof:
  svelte 71 files / 563 passed + 3 skipped; logic 28 files / 288 passed; typecheck 1133 files 0 errors.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

The ✅ chrome lands: the roster sections into Active/Today/Yesterday/Older with counts, status chips and the
device-local favorite compose over existing fields, and the search box shows two distinct empty states —
with token-identity 0-diff, `test:web` green, and a11y-parity from the final state. The two ⚠️ paths (useful
search query, session-create) stay fail-closed; no client-owned create or invented title exists.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the composed pure pipeline and the fail-closed chrome.
- `checklist.md` — barrier sign-off.
- `../../research/research.md` — recs 1.3, 1.4, 1.5, 1.13, 1.14.
- `../../007-host-requests/` — the useful-search field and the session-create RPC.
<!-- /ANCHOR:cross-refs -->
