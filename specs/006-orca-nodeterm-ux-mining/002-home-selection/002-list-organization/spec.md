---
title: "Home list organization — time-bucket sections, status filter chips, search chrome, device-local favorite, new-session chrome"
description: "Home list sectioning and filtering from the verified orca synthesis: time-bucket sections with counts (Active/Today/Yesterday/Older) derived from updatedAt (1.3), status filter chips over existing status (1.4), the search-box chrome with two distinct empty states (1.5, chrome ✅ / useful query ⚠️), a device-local favorite as pure view-state that only reorders the local list (1.14), and the 'New session' chrome disabled-until-live (1.13, chrome ✅ / create needs a host RPC ⚠️). The chrome shipped; the two ⚠️ paths stay fail-closed."
contextType: "implementation"
importance_tier: "normal"
trigger_phrases:
  - "list organization spec requirements"
  - "list organization packet"
  - "spec requirements"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/002-home-selection/002-list-organization"
    last_updated_at: "2026-08-26T18:40:00.000Z"
    last_updated_by: "cursor-grok-4.6"
    recent_action: "Implemented list-organization chrome over existing DTO fields"
    next_safe_action: "None — phase implemented; sibling card-polish can decorate the cards"
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Home list organization

> **Phase links** — Parent: [`../spec.md`](../spec.md) · Siblings: `001-list-behavior`, `003-card-polish`

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `002-home-selection` |
| Level | 2 |
| Status | Implemented |
| Recs | 1.3 time buckets · 1.4 status filter chips · 1.5 search chrome · 1.13 new-session chrome · 1.14 device-local favorite |
| Host dependency | Partial — useful search (1.5) + session-create (1.13) are ⚠️; the chrome and 1.3/1.4/1.14 are ✅ |
| Barrier | sectioning/filter/favorite behaviour proven · two search empty states distinct · new-session inert-until-live + no client create · token-identity 0-diff · test:web green · a11y-parity |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

Once the roster is recency-sorted (`001-list-behavior`), it is still one undifferentiated run of cards.
The verified orca synthesis (Angle 1) adds the sectioning and filtering chrome that lets a user *triage*:
time buckets tell recent from old, status chips narrow to what is active or stuck, a search box scopes a
long list, a device-local favorite floats the sessions a user cares about, and a "New session" control
gives home an action. All of the chrome is ✅ — it reads existing `SessionCardDto` fields (`status`,
`updatedAt`) or is a pure client preference.

Two paths inside this chrome are ⚠️ and are deferred rather than faked: a *useful* search needs the host
to publish a `title`/`preview` to match against (searching the opaque `id` alone is low value), and the
actual session-create behind the "New session" control needs a host RPC (copying orca's "New Workspace" is
❌ — it creates a git worktree, not a chat session). Both are requested in `007-host-requests`; until they
land, the search chrome matches only what it can and the create control stays inert. Nothing here invents
a client-side title or a client-owned create.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:**
- **1.3 Time-bucket sections.** Group the recency-sorted roster into Active / Today / Yesterday / Older
  with per-section counts, derived purely from `updatedAt` (and `status` for Active). A pure grouping
  helper over the snapshot; touches `pages/home/screen-home.svelte` (the roster render) and
  `shared/format/view-helpers.ts` (a relative/bucket helper alongside `relativeTime`). Folder/project/agent
  grouping is ⚠️ and explicitly **out of scope** (needs `cwd`/`projectLabel`/`agent`).
- **1.4 Status filter chips.** Chips for Active / Idle / Interrupted (mapped to `running` / `idle` /
  `interrupted`) that filter the roster over existing `status`. A pure filter over the snapshot;
  `pages/home/screen-home.svelte`. Real scope tabs (Workspace/Project) are ⚠️ and out of scope.
- **1.5 Search-box chrome + two empty states.** A search input with two distinct empty states — "no
  sessions match" (a non-empty query filtered everything out) vs. "no sessions here" (the list is empty) —
  extending `pages/home/empty-state.svelte`. The chrome and the empty-state split are ✅. The *match
  target* is ⚠️: today it can only match the opaque `id` (low value); a useful query over host `title`/
  `preview` is requested in `007-host-requests`. The input never searches host context the client does not
  have.
- **1.14 Device-local favorite.** A pin/favorite stored in `localStorage` (per the app's existing
  preference pattern in `shared/state/state.ts`) that only reorders the local list — a pure client
  view-preference, not session truth. Fails closed if the preference store is unreadable (treats
  unreadable as "no favorites", never as authoritative). `pages/home/screen-home.svelte` +
  a `shared/state/` preference helper.
- **1.13 "New session" chrome.** A "New session" control on home, disabled until `connection === 'live'`,
  with a host-picker affordance when several hosts exist. The chrome (button + disabled state + picker) is
  ✅; the *create action* it would trigger needs a host session-create RPC (⚠️) and is left inert with a
  fail-closed "unavailable until the host supports it" state until `007-host-requests` lands.
  `pages/home/screen-home.svelte`.

**Out of scope:** folder/project/agent grouping and real scope tabs (⚠️, need host path/project fields);
the actual session-create and useful search *query* (⚠️, `007-host-requests`); a cross-device
authoritative pin (⚠️); any list-behaviour rec (→ `001`); any card-content enrichment (→ `003`); writing
`status` or any session field; every file outside `app-mobile/src/pages/home/**` and the cited `shared/**`.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** (1.3) — The roster groups into Active / Today / Yesterday / Older with per-section counts,
  derived by a pure helper over `updatedAt`/`status`; empty sections are omitted; the grouping is
  differential-tested.
- **REQ-002** (1.4) — Status filter chips filter the roster over existing `status` (Active=`running`,
  Idle=`idle`, Interrupted=`interrupted`); the filter is a pure function and composes with the buckets and
  search.
- **REQ-003** (1.5) — The search box renders two distinct empty states — "no sessions match" (query
  non-empty, all filtered) vs. "no sessions here" (list empty). The match target is only what the client
  legitimately holds; a useful `title`/`preview` query is deferred (host field requested in
  `007-host-requests`).
- **REQ-004** (1.14) — A device-local favorite reorders the local list only, persists in `localStorage`,
  and fails closed when the store is unreadable (no favorites, never authoritative). It never becomes
  session truth.
- **REQ-005** (1.13) — The "New session" control is present and disabled until live, with a host-picker
  when multiple hosts exist; the create action stays inert with a fail-closed unavailable state until a
  host session-create RPC exists (requested in `007-host-requests`). No client-owned create.
- **REQ-006** — No requirement writes `status` or invents a host field; `token-identity` resolves 0-diff,
  `test:web` stays green, and the a11y contract of the chrome (chips as a group, search as a labelled
  input, section headings) is preserved from the final state.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. The roster sections into Active/Today/Yesterday/Older with correct counts, proven by a differential test.
2. Status chips and the favorite compose correctly with the buckets and search over existing fields.
3. The search box shows the two distinct empty states; it matches only client-held data, never invents a title.
4. "New session" is inert until live and never performs a client-owned create; the ⚠️ paths are logged to `007-host-requests`.
5. `token-identity` is 0-diff, `test:web` is green, and a11y-parity holds from the final state.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **Searching the opaque `id` looks broken.** Matching only the compacted `id` returns almost nothing,
  which reads as a bug. Mitigation: scope the input's placeholder/empty copy to what it can match, and gate
  the *useful* query on the host `title`/`preview` field (requested in `007-host-requests`) — do not
  synthesize a searchable title on the client.
- **A device-local favorite mistaken for authoritative.** If the preference store is unreadable and the
  code treats that as "no overrides = show host order", a user's favorites silently vanish without signal.
  Mitigation: fail closed — an unreadable store is an explicit "favorites unavailable" state, not a silent
  default. A cross-device pin is a separate ⚠️ host mutation, out of scope.
- **"New session" implying a client can create.** The control must never wire a client-owned create;
  copying orca's worktree-creating "New Workspace" is ❌. It stays inert until a host RPC lands.
- **Composition order of bucket × filter × search × favorite.** Four pure transforms must compose without
  double-counting or losing the favorite float. Mitigation: one composed pure pipeline over the snapshot,
  differential-tested; the favorite reorders *within* its section.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

- Will product lift the "no paths on home" rule for a redacted `projectLabel`? If yes, folder/project
  grouping (currently out of scope, ⚠️) becomes buildable — tracked in `007-host-requests`, not here.
- Does the favorite float sit above or within its time bucket? Assumed: within its section (a favorite is
  a local reorder, not a new section) unless the operator prefers a dedicated "Favorites" band.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `../spec.md` — the home-selection phase parent.
- `../../research/research.md` — the verified synthesis; recs 1.3, 1.4, 1.5, 1.13, 1.14 (Angle 1).
- `../../007-host-requests/` — where the useful-search query and the session-create RPC are requested.
- `plan.md`, `tasks.md`, `checklist.md` — the how, the ledger, and the barrier.
<!-- /ANCHOR:cross-refs -->
