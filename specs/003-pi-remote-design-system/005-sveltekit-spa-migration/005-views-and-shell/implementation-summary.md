---
title: "Child 005 implementation summary — views and shell"
description: "What the shell layer delivered, the virtualizer's store-shaped surprise, and the two latent effects that a working app could not reveal."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/005-views-and-shell"
    last_updated_at: "2026-08-23T10:30:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed retrospectively."
    next_safe_action: "None; child shipped and superseded by later layers."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 005 implementation summary

---

<!-- ANCHOR:metadata -->
## Metadata

| Field | Value |
|---|---|
| Parent | `005-sveltekit-spa-migration` |
| Level | 2 |
| Status | Complete |
| Requirements shipped | REQ-001 … REQ-004 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## What Was Built

`App.tsx` was 2,612 lines holding five views, the routing, the virtualizer and the socket wiring as
functions in one file. This child pulled all of it apart.

**Four views in parallel** — enrollment, home, review and inbox — each into its own page directory,
along with the push, header and theme surfaces (`6bee6a5`).

**The session view alone**, because it owns the shared machinery: pure render-grouping helpers
extracted first (`a6d0165`), then the leaf renderers (`2e0cb01`), block renderers and view router
(`2fe96d2`), the `TodoProjectionBlock` wrapper (`240a3ec`), `TranscriptList` with the virtualizer swap
(`94a82c8`), the `useSyncSocket` factory (`c2b9131`) and finally the view itself (`df6acea`).

**The shell**: a shared app-state store (`aaf7cbc`), `+layout.svelte` mounting both context providers
once with theme and service-worker registration (`aa5fd59`), and the three route files (`3355ac2`).
`pushState` and `popstate` disappeared entirely, replaced by a single `goto` at `+layout.svelte:91`
plus route params flowing from the `page` store into `$derived`.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## How It Was Delivered

Four parallel executor dispatches for the independent views, then the session stack sequentially in
dependency order — helpers before renderers, renderers before the list, the socket factory before the
view that composes it. The shell and route files were Claude-owned barrier files throughout, never
inside a parallel dispatch, so they keep a single-writer history.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## Key Decisions

**Only real URLs became routes.** Review and Inbox stayed overlay booleans and Enrollment stayed an
auth branch, exactly as in React. Promoting them to routes would have invented navigation the product
does not have, and it would have put an unauthenticated shell behind a URL.

**The socket got a single owner.** Open and teardown live together in `useSyncSocket.svelte.ts` — an
`AbortController` on entry, every async continuation guarded on `signal.aborted`, and a cleanup that
aborts and closes. Svelte has no StrictMode double-mount, so the React-era double-invocation
scaffolding was dropped; the abort guard remains because it protects against something else entirely,
a teardown that beats an in-flight open.

**The virtualizer swap was a shape change, not a rename.** `@tanstack/svelte-virtual`'s
`createVirtualizer` returns a *store*, not a rune. Reactive count therefore goes through
`$effect(() => $virtualizer.setOptions({ count, … }))`, and `setOptions` merges rather than replaces,
which is what keeps the injected observers alive. Rows measure via `{@attach}` and `data-index`
instead of a ref callback. Dynamic `measureElement` survives, which is what keeps variable-height
transcript rows correct.

**The `/catalog` route was dropped, not deferred.** Child 006 makes the catalog a separate Storybook
application. There is no in-app catalog route that could white-screen the runtime, so the planned
`+layout@.svelte` reset protects nothing.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## Verification

| Check | Result |
|---|---|
| End-to-end against the relay | enroll, home, live session, review, inbox all reachable |
| Three URLs, including the cold deep link | 3/3 resolve |
| `svelte-check` | clean |
| token-identity on touched surfaces | 0 diffs |
| Socket leak under HMR | none observed (manual check) |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## Known Limitations

**A working app cannot reveal a duplicate fetch.** Two `$effect` self-invalidations shipped in this
layer's own factories and survived the end-to-end barrier untouched. In `useRuntime` the mount effect
calls `refresh('initial')`, which synchronously reads `runtime.models.length` and then writes
`runtime` before its `await` — so the effect invalidates itself, the snapshot fetch fires twice where
React fired once, and the re-run cleanup clears the Retry-After timer. In `hostCommandCatalog` both
the mount and reconnect effects had the same shape. Neither is visible in a running app: the second
fetch succeeds, the UI looks correct. Both were only exposed when 007 ported the suites that assert
exact call counts.

**The HMR socket check was manual.** Automating it would have meant modelling the dev server's reload
semantics. That was a reasonable trade at this layer, but it means the socket lifecycle had no
regression coverage until 007.

**`afterNavigate` was never needed.** The spec named it alongside `goto`; in practice the `page` store
feeding `$derived` covers every case, so nothing in the app subscribes to navigation events. Worth
recording so a future reader does not go looking for a subscriber that was never written.
<!-- /ANCHOR:limitations -->
