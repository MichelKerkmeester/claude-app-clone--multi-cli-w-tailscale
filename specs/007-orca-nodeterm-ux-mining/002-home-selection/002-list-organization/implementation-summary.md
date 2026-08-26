---
title: "Home list organization implementation summary — IMPLEMENTED"
description: "Decorated the status-grouped home list with time-bucket sections, status filter chips, search chrome + two empty states, a device-local favorite, and inert New-session chrome. Status Implemented. Useful-search and session-create stay host-blocked and fail-closed."
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

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Home list organization implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `002-home-selection` |
| Level | 2 |
| Status | Implemented |
| Requirements planned | REQ-001 … REQ-006 |
| Host dependency | Partial — useful search (1.5) + session-create (1.13) remain ⚠️; the chrome + 1.3/1.4/1.14 shipped ✅ |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Decorated the existing status-grouped home list with sectioning and filtering chrome. Recency mode now
renders Active / Today / Yesterday / Older from `updatedAt` (running status also places a card in Active)
with per-section counts and empty sections omitted. Status grouping remains on the device-local toggle.
Status chips filter over existing `status` (Active=`running`, Idle=`idle`, Interrupted=`interrupted`).
Search matches only client-held data (opaque id, compact id, optional device-local label) and shows two
distinct empty states: "No sessions here" vs "No sessions match". A device-local favorite reorders the
local list within a section and fails closed to "Favorites unavailable" when the store is unreadable.
"New session" is present, disabled until live, inert on click, with a host picker when multiple hosts
are supplied. Nothing writes `status` or invents a title.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Bucketing, filtering, and the favorite float are one composed PURE pipeline over the immutable session
snapshot (`organize(items, { filter, query, favorites })` in `session-list-seams.ts`), differential- and
boundary-tested, building on the recency-sort seam. `timeBucket` lives next to `relativeTimeAt` in
`view-helpers.ts`. The favorite preference helper follows the unread-overlay pattern in `shared/state/`.
Home calls `organize` from `$derived`; cards still select per id. Search and New session are chrome: the
search never synthesizes a title, and create never runs on the client. Verification ran the pipeline
tests, the fail-closed favorite test, the two-empty-state and inert-create tests, `token-identity`
(0-diff), `test:web`, and an a11y-parity check — all from the final state.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Time buckets only; folder/project grouping deferred.** Buckets need nothing new (`updatedAt` plus
existing `status` for Active); folder/project/agent grouping needs `cwd`/`projectLabel`/`agent` and a
redacted-path product decision, so it stayed out of scope.

**Search chrome now, useful query later.** Matching the opaque `id` alone is low value; the input is
scoped to what it can match and the real query stays gated on a host `title`/`preview` field, rather
than synthesizing a client-side title.

**A favorite is a view preference, not session truth.** The device-local favorite reorders the local
list and fails closed on an unreadable store; a cross-device authoritative pin would be a new host
mutation and stayed out of scope.

**"New session" chrome cannot create.** Copying a worktree-creating "New Workspace" stayed out of
scope; the control is inert-until-live chrome whose click target waits on a host session-create RPC.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| `organize` pipeline differential/boundary | Passed — matches canonical; empty/one/all-filtered/favorite-in-section (`session-list-seams.test.ts`) |
| Fail-closed favorite | Passed — unreadable store → `available: false` + "Favorites unavailable"; Pin disabled |
| Two search empty states | Passed — "No sessions match" vs "No sessions here" (`empty-state.svelte.test.ts`, `screen-home.svelte.test.ts`) |
| Inert "New session" | Passed — present; disabled until live; live click never calls `onSelect` |
| Token identity | Passed — 0 CHANGED / 0 VANISHED / 0 ADDED across light/dark/system vs `/tmp/ti-list-org-baseline.json` |
| `test:web` | Passed — svelte 71 files / 563 passed + 3 skipped; logic 28 files / 288 passed |
| `typecheck` | Passed — 0 errors (`svelte-check` COMPLETED 1133 FILES 0 ERRORS) |
| scoped lint | Passed — eslint on the files this phase changed exits 0; repo-wide `eslint .` still has pre-existing findings outside this phase |
| a11y-parity | Passed — chip `role="group"`, labelled search input, time/status section headings |
| `validate.sh --strict` | Run at closeout via realpath; authored-doc rules. `description.json` / `graph-metadata.json` left unedited |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

Two paths inside this chrome remain host-blocked and fail closed: a useful search needs a host
`title`/`preview` field, and "New session" needs a host session-create RPC — both already recorded in
`007-host-requests`. Until they land, search matches only client-held data and the create control is
inert. Folder/project grouping and a cross-device pin stay out of this sub-phase's scope. Repo-wide
`npm run lint` still reports pre-existing errors outside the files this phase changed.
<!-- /ANCHOR:limitations -->
