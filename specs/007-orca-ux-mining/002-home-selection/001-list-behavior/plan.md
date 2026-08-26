---
title: "Home list behaviour plan — pure helpers for order/state, local interaction for the rest, proven behaviour-preserving"
description: "How the six ✅ list-behaviour recs are built and proven: a pure recency-sort helper and a pure four-kind list-state derivation (both differential- and boundary-tested per the cross-cutting guardrail), pull-to-refresh wired to keep the last-good snapshot, a cache-filled inert resume slot, single-flight Open as local interaction state, and a no-op-safe haptics wrapper — verified by the interaction tests plus token-identity 0-diff, test:web green, and a11y-parity where the card chrome is touched."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-ux-mining/002-home-selection/001-list-behavior"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Planned pure helpers + local interaction approach for the six list-behaviour recs."
    next_safe_action: "Build the sort + list-state helpers with differential tests when the operator says go."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Home list behaviour plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Build the two data-shaped recs as PURE functions over the immutable session snapshot — a recency-sort
(1.1) and a four-kind list-state derivation (1.9) — so each is differential- and boundary-testable per the
cross-cutting guardrail. Build the four interaction recs as local view state: pull-to-refresh that keeps
the last-good snapshot (1.2), a cache-filled resume slot inert until live (1.10), single-flight Open
(1.11), and a no-op-safe haptics wrapper (1.12). Nothing reads a new host field; nothing writes `status`.
Prove it with the interaction tests plus `token-identity`, `test:web`, and an a11y-parity check on the
roster.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

The recency-sort helper is differential-tested against a canonical sort and boundary-tested on empty /
single / equal-`updatedAt` inputs. The list-state derivation is boundary-tested so a failed or
capability-gated fetch stays *visibly unresolved* — never rendered as "no sessions". Pull-to-refresh is
tested to keep the prior items on a rejected refresh. Single-flight Open is tested to disable siblings
while one launch is pending. `token-identity` resolves 0-diff across light/dark/system for any card CSS
touched (resume slot, skeleton), `test:web` is green, and the roster's a11y contract (live region, list
semantics, focus order) is preserved — all from the final state.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

**Pure seam first.** Order and list-state are the two recs that carry data, so they become pure functions
over the `SessionListState` snapshot from `shared/state/state.ts` (`items`, `phase`, `source`, `updatedAt`,
`error`). `sortByRecency(items)` returns a new array most-recent-first by `updatedAt` with a stable tie
break. `deriveListState(sessionState, connection)` returns one of `loading | error+retry | host-too-old |
ready` plus the items to show, encoding "keep prior items while refetching" and "host-too-old ≠ empty" in
one place. Both are the guardrail's "extract filter/sort/group as pure functions over immutable snapshots"
applied to home.

**Interaction as local state, host route untouched.** Pull-to-refresh calls the existing list-load path;
on rejection it dispatches nothing to the item list (keeping last-good) and lets the existing `isStale`
derivation in `screen-home.svelte` show Stale via `freshness.svelte`. The resume slot reads the `cache`
and `connection` props already threaded into `screen-home.svelte`, renders from cache immediately, and
gates its Open on `connection === 'live'`. Single-flight Open holds a `launchingId` in local component
state, disables every card's Open while it is set, and clears it on navigation or timeout. Haptics is a
thin `haptics.ts`-style wrapper around `navigator.vibrate` that returns immediately when the API is
absent.

**No status writes.** None of these derive a *stored* status; the sort and state derivation read
`updatedAt`/`status`/`phase` and produce view output only.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · setup
Add the pure helpers with their differential/boundary tests: `sortByRecency` (1.1) and `deriveListState`
(1.9). Establish the token-identity and `test:web` baselines before any `.svelte` edit.

### Phase 2 · implementation
Wire recency-sort into the roster render; extend `empty-state.svelte`/`screen-home.svelte` to render the
four states keeping prior items on refetch; add pull-to-refresh keeping last-good (1.2); add the
cache-filled inert resume slot (1.10); add single-flight Open with per-row spinner and `stopPropagation`
(1.11); add the no-op-safe haptics wrapper and fire it on selection/success/error/edge-bump (1.12).

### Phase 3 · verification
Run the helper differential/boundary tests, the pull-to-refresh keep-last-good test, the single-flight
test, `token-identity`, `test:web`, and the a11y-parity check on the roster — all from the final state.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

New unit tests for the two pure helpers (differential vs. a canonical implementation; boundary on
empty/single/equal/stale/unknown). New interaction tests for keep-last-good on a rejected refresh and for
single-flight Open. Existing `test:web` proves no roster behaviour regressed; `token-identity` proves the
card chrome's rendered values are unchanged; the a11y-parity check proves the list's AT tree and focus
order are preserved. All run from the final state before the phase closes.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The `SessionListState` and `ConnectionPhase` shapes in `shared/state/state.ts` (read-only).
- The existing list-load / refresh path (reused by pull-to-refresh) and the `cache` prop already threaded
  into `screen-home.svelte`.
- The `token-identity` CSS resolver, the `test:web` suite, and the a11y-parity check harness.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

The change touches `app-mobile/src/pages/home/**` and the two cited `shared/**` helpers plus their tests.
`git checkout -- app-mobile/src/pages/home app-mobile/src/shared` restores the prior behaviour; there is
no host, data, or migration step — every rec is client-local.
<!-- /ANCHOR:rollback -->
