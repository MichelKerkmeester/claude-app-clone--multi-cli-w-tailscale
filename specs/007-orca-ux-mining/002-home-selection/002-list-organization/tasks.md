---
title: "Home list organization tasks — sectioning/filter/search/favorite/new-session chrome, planned open"
description: "Open task ledger for time buckets (1.3), status filter chips (1.4), search chrome + two empty states (1.5), device-local favorite (1.14), and new-session chrome (1.13). Every task open, each citing its rec number and the real app file it will touch. The useful-search query and session-create RPC are logged as host dependencies, not built here."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-ux-mining/002-home-selection/002-list-organization"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the open task ledger for the five list-organization recs; nothing built."
    next_safe_action: "Start T1.1 (the organize pipeline + differential test) when the operator says go."
    blockers:
      - "T2.4 useful search (1.5) and T2.5 create (1.13) wait on host fields/RPC in 007-host-requests"
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Home list organization tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Every task is OPEN — this is a plan;
nothing is implemented until the operator says "go". Each task cites its rec number and the file it touches.
The two ⚠️ paths (useful search query, session-create) are called out as host-blocked, not deferred tasks.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [ ] **T1.1** (recs 1.3, 1.4, 1.14) Add a pure `organize(items, { filter, query, favorites })` pipeline —
  time buckets from `updatedAt`/`status`, status filter over `status`, favorite float within a section —
  with a differential test vs. a canonical implementation — `shared/format/view-helpers.ts` (bucket helper)
  + a new `shared/state/` favorite-preference helper.
- [ ] **T1.2** (rec 1.14) Add the fail-closed favorite read: an unreadable `localStorage` store yields an
  explicit "favorites unavailable" (empty set surfaced), never a silent host-order default — the new
  favorite-preference helper.
- [ ] **T1.3** Capture the `token-identity` and `test:web` baselines before any `.svelte` edit.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [ ] **T2.1** (rec 1.3) Render the roster in Active/Today/Yesterday/Older sections with per-section counts,
  omitting empty sections — `pages/home/screen-home.svelte`.
- [ ] **T2.2** (rec 1.4) Add status filter chips (Active=`running` · Idle=`idle` · Interrupted=`interrupted`)
  that compose with the buckets over existing `status` — `pages/home/screen-home.svelte`.
- [ ] **T2.3** (rec 1.14) Wire the device-local favorite so tapping a favorite reorders the local list
  within its section and persists in `localStorage` — `pages/home/screen-home.svelte` + the favorite helper.
- [ ] **T2.4** (rec 1.5) Add the search-box chrome and the two distinct empty states — "no sessions match"
  (query non-empty, all filtered) vs. "no sessions here" (list empty) — matching only client-held data —
  `pages/home/screen-home.svelte` + `pages/home/empty-state.svelte`.  [host-blocked: a useful query over
  `title`/`preview` needs a host field — requested in `007-host-requests`; the chrome ships without it]
- [ ] **T2.5** (rec 1.13) Add the "New session" control, disabled until `connection === 'live'`, with a
  host-picker when multiple hosts exist, and an inert click target with a fail-closed "unavailable" state —
  `pages/home/screen-home.svelte`.  [host-blocked: the actual create needs a host session-create RPC —
  requested in `007-host-requests`; the client never owns create]
- [ ] **T2.6** Record the useful-search field and the session-create RPC as host dependencies in
  `007-host-requests`, each with the UI it unlocks and the fail-closed fallback.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [ ] **T3.1** Run the `organize` pipeline differential/boundary tests (empty · one · all-filtered ·
  favorite-in-section) and confirm bucket × filter × favorite compose without double-count or lost float.
- [ ] **T3.2** Run the fail-closed favorite test (unreadable store → favorites unavailable, not host-order)
  and the two-search-empty-state test (match vs. empty distinguished).
- [ ] **T3.3** Run the inert-"New session" test (present · disabled until live · never calls create), and
  `token-identity` (0-diff across light/dark/system) for the new chrome CSS.
- [ ] **T3.4** Run `test:web` and the a11y-parity check (chip group, labelled search input, section
  headings) from the final state; confirm no `status` write and no client-invented host field.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

The ✅ chrome lands: the roster sections into Active/Today/Yesterday/Older with counts, status chips and the
device-local favorite compose over existing fields, and the search box shows two distinct empty states —
with token-identity 0-diff, `test:web` green, and a11y-parity from the final state. The two ⚠️ paths (useful
search query, session-create) are logged to `007-host-requests` and left fail-closed; no client-owned create
or invented title exists.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the composed pure pipeline and the fail-closed chrome.
- `checklist.md` — barrier sign-off.
- `../../research/research.md` — recs 1.3, 1.4, 1.5, 1.13, 1.14.
- `../../007-host-requests/` — the useful-search field and the session-create RPC.
<!-- /ANCHOR:cross-refs -->
