---
title: "Child 005 plan — views and shell"
description: "How App.tsx's five views were extracted, why the socket lifecycle is the layer's defining risk, and how a three-URL routing surface replaced hand-rolled history management."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/005-views-and-shell"
    last_updated_at: "2026-08-23T10:30:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed retrospectively."
    next_safe_action: "None; child shipped and superseded by later layers."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 005 plan — views and shell

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

The 2,612-line `App.tsx` held five views, the routing, the virtualizer and the socket wiring as
functions in one file. This child pulls them apart: four views in parallel, the session view alone,
and a shell that mounts the providers once.

The session view is separated not because of file conflicts but because it owns the socket. A socket
that opens twice or fails to close is the one defect here that no render check can see.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

| Gate | Result |
|---|---|
| App runs end-to-end against the relay — enroll, home, live session, review, inbox | pass |
| All three URLs resolve, including the `/attention/[lookupId]` deep link | pass |
| `svelte-check` | clean |
| token-identity on touched surfaces | 0 diffs |
| No socket leak under HMR | verified |
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

**Routing becomes file-based, and the history code disappears.** React hand-rolled `pushState` and
`popstate`. SvelteKit supplies the three URLs as files — `+page.svelte`, `session/[id]/+page.svelte`,
`attention/[lookupId]/+page.svelte` — and navigation is a single `goto` in the shell
(`+layout.svelte:91`). The route params arrive through the `page` store and flow into `$derived`, so
nothing subscribes to history events at all. Review and Inbox stay overlay booleans and Enrollment
stays an auth branch, exactly as in React; only the three real URLs became routes.

**The socket lives in one place.** `useSyncSocket.svelte.ts` owns open and teardown together: an
`AbortController` created on entry, every async continuation guarded on `controller.signal.aborted`,
and a cleanup that aborts and closes. Svelte has no StrictMode double-mount, so the React-era
defensive scaffolding around double-invocation was not carried over — but the abort guard is not
about StrictMode, it is about a teardown that beats an in-flight open.

**The virtualizer swap has a shape change, not just a name change.** `@tanstack/svelte-virtual`'s
`createVirtualizer` returns a *store*, not a rune. Reactive count is applied through
`$effect(() => $virtualizer.setOptions({ count, … }))` — `setOptions` merges, so the injected
observers survive — and rows measure via `{@attach}` plus `data-index` rather than a ref callback.
Dynamic `measureElement` is preserved, which is what keeps variable-height transcript rows correct.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1: Four views in parallel — Done

`Enrollment`, `Home`, `Review` and `Inbox`, each extracted from its `App.tsx` function into its own
page directory.

### Phase 2: Session alone — Done

The conversation view plus the transcript stack: the virtualizer swap, the socket factory, the block
renderers and the pure render-grouping helpers.

### Phase 3: Shell and routes — Done

`+layout.svelte` mounting both context providers once, theme, service-worker registration and the
shared app-state store; the three route files; and `goto`-based navigation.

### Phase 4: Barrier — Done

End-to-end run against the relay, all three URLs resolving, `svelte-check`, token-identity, and an
HMR socket-leak check.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

The barrier here is an end-to-end run rather than a suite, because this is the layer where the app
first exists as an app. Enroll, reach home, open a session with a live socket, open review and inbox —
if any seam between the views is wrong, that path finds it.

Deep-link resolution is checked directly, since `/attention/[lookupId]` arriving cold through the SPA
fallback is a different code path from navigating to it in-app, and only the cold path exercises the
fallback.

Socket-leak checking under HMR is manual and deliberately so. An automated assertion would have to
model the dev server's reload semantics, which is more machinery than the risk warrants at this layer;
the ported `catalogLifecycle` and `runtime` suites in 007 later gave the socket lifecycle real
regression coverage, and it was those tests that exposed two self-invalidating effects.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- 004 for the chrome and composer that the session view composes.
- 003 for the transcript's feature directories.
- 002 for `relay.ts` and the reducers the shell store wraps.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

This is the first layer where the Svelte app becomes runnable end-to-end, but React is still the
shipping runtime — the cutover is 007. Reverting removes an alternative app that no user reaches.

The one shared surface is `+layout.svelte`, which is a barrier file: Claude-owned, never touched by a
parallel dispatch, so it has a single-writer history and reverts cleanly.
<!-- /ANCHOR:rollback -->
