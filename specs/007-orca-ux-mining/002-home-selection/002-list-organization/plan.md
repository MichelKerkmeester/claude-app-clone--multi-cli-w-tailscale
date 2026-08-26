---
title: "Home list organization plan — one composed pure pipeline for the ✅ chrome, ⚠️ paths deferred and fail-closed"
description: "How the sectioning/filtering chrome is built and proven: bucket (1.3), filter (1.4), and favorite (1.14) as one composed pure pipeline over the immutable snapshot (differential-tested); the search box and its two empty states as ✅ chrome matching only client-held data with the useful query deferred to the host (1.5); the 'New session' control as inert-until-live chrome with no client-owned create (1.13). Proven by the pipeline differential tests plus token-identity 0-diff, test:web green, and a11y-parity."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-ux-mining/002-home-selection/002-list-organization"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Planned a composed pure bucket×filter×favorite pipeline + fail-closed search/create chrome."
    next_safe_action: "Build the bucket/filter/favorite pipeline with differential tests when the operator says go."
    blockers:
      - "Useful search (1.5) and session-create (1.13) need host fields/RPC — requested in 007-host-requests"
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Home list organization plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Build the three data-shaped recs — time buckets (1.3), status filter (1.4), device-local favorite (1.14) —
as ONE composed pure pipeline over the immutable session snapshot, so the whole `bucket × filter ×
favorite` composition is differential-testable in one place. Build the search box and its two empty states
(1.5) and the "New session" control (1.13) as chrome: the search matches only client-held data with the
useful `title`/`preview` query deferred to the host, and the create control stays inert-until-live with no
client-owned create. Prove it with the pipeline differential tests plus `token-identity`, `test:web`, and
a11y-parity.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

The composed pipeline (bucket → filter → search → favorite float) is differential-tested against a
canonical implementation and boundary-tested so empty/one-item/all-filtered inputs render the right state
(and the two search empty states are distinguished). The favorite path is boundary-tested with an
unreadable preference store to prove it fails closed (favorites unavailable, not a silent host-order
default). The "New session" control is tested to stay inert and to never call a create. `token-identity`
resolves 0-diff across light/dark/system for the new chrome CSS, `test:web` is green, and the a11y contract
(chip group, labelled search input, section headings) is preserved — all from the final state.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

**One pure pipeline over the snapshot.** Bucketing, filtering, and the favorite float are all pure
transforms of the `SessionCardDto[]` snapshot, so they compose as a single
`organize(items, { filter, query, favorites })` that returns sectioned, filtered, favorite-floated groups
with counts. Buckets come from `updatedAt` (Active also reads `status === 'running'`); the filter reads
`status`; the favorite is a `localStorage` set that reorders within a section. This is the cross-cutting
guardrail — extract home filter/sort/group as pure functions over immutable snapshots — extended from
`001`'s sort seam. `shared/format/view-helpers.ts` gains the bucket helper next to `relativeTime`; the
favorite preference helper lives in `shared/state/` beside the existing composer-preference pattern.

**Search matches only what the client holds.** The input filters the snapshot; with no host `title`/
`preview`, the only legitimate match target is the opaque `id`, so the placeholder and empty copy are
scoped to that and the *useful* query is gated on the host field (`007-host-requests`). The two empty
states are a pure branch on `query.length > 0 && visible.length === 0` (no match) vs. `items.length === 0`
(empty here), extending `empty-state.svelte`.

**Chrome that cannot create.** "New session" is a disabled-until-live button plus a host picker when
multiple hosts exist; its click target is inert (an "unavailable until the host supports it" state) because
a client-owned session-create is ❌ and the host RPC does not exist yet. When the RPC lands via
`007-host-requests`, only the click handler changes — the chrome is already correct.

**Fail-closed favorite.** Reading the favorite set is wrapped so an unreadable store yields an explicit
"favorites unavailable" (empty set, surfaced), never a silent "no overrides" that looks like the host order.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · setup
Add the pure `organize(...)` pipeline (bucket + filter + favorite float) and the fail-closed favorite
preference helper, each with differential/boundary tests. Capture the `token-identity`/`test:web`
baselines before any `.svelte` edit.

### Phase 2 · implementation
Render the sectioned/filtered/favorited roster (1.3, 1.4, 1.14) in `screen-home.svelte`; add the status
chips and the search input; extend `empty-state.svelte` with the two empty states (1.5); add the
"New session" inert-until-live control with the host picker chrome (1.13). Log the useful-search and
session-create host dependencies into `007-host-requests`.

### Phase 3 · verification
Run the pipeline differential/boundary tests, the fail-closed favorite test, the two-empty-state test, the
inert-create test, `token-identity`, `test:web`, and the a11y-parity check — all from the final state.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

New unit tests for the composed `organize` pipeline (differential vs. canonical; boundary on
empty/one/all-filtered/favorite-in-section) and for the fail-closed favorite read. New interaction/render
tests for the two search empty states and for the inert "New session" control (present, disabled until
live, never calls create). Existing `test:web` proves no roster regression; `token-identity` proves the new
chrome's rendered values; the a11y-parity check proves the chip group, search input, and section headings
are correctly exposed. All run from the final state.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The recency-sort seam from `001-list-behavior` (buckets group the already-sorted roster).
- The `SessionCardDto` fields `status`/`updatedAt` and the `localStorage` preference pattern in
  `shared/state/state.ts` (read-only reference).
- `007-host-requests` for the useful-search `title`/`preview` field and the session-create RPC.
- The `token-identity` resolver, `test:web`, and the a11y-parity check harness.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

The change touches `app-mobile/src/pages/home/**` and the cited `shared/**` helpers plus their tests.
`git checkout -- app-mobile/src/pages/home app-mobile/src/shared` restores the prior list; the favorite is
a `localStorage` key that can be cleared. No host, data, or migration step — the ⚠️ paths were never wired.
<!-- /ANCHOR:rollback -->
