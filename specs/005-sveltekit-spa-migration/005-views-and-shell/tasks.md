---
title: "Child 005 tasks — views and shell"
description: "Task ledger for extracting App.tsx's views, the transcript and virtualizer port, and the three-URL routing surface."
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

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 005 tasks — views and shell

---

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred or superseded with a stated reason.
Commit hashes are given where a task maps to one. Barrier files were Claude-owned throughout.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Confirm the L3 barrier green, since the session view composes the chrome and composer.
- [x] **T1.2** Identify which of `App.tsx`'s five view functions are genuinely independent, and which
      one owns shared machinery. Four are independent; the session view owns the socket and the
      virtualizer.
- [x] **T1.3** Declare `+layout.svelte` and the route files barrier-only — Claude-owned, never inside
      a parallel dispatch — so the shell keeps a single-writer history.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

### Views — four in parallel

- [x] **T2.1** `Enrollment`, `Home`, `Review`, `Inbox` plus the push, header and theme surfaces ported
      together (`6bee6a5`). Review and Inbox stay overlay booleans; Enrollment stays an auth branch —
      only the three real URLs become routes.
- [x] **T2.2** `useRuntime` converted to a runes factory (`d105455`), following the 002 twin pattern.

### Session — alone

- [x] **T2.3** Pure transcript render-grouping helpers extracted first (`a6d0165`), so the grouping
      logic could be ported without a component around it.
- [x] **T2.4** Transcript leaf renderers and format helpers (`2e0cb01`), then the block renderers and
      view router (`2fe96d2`), then the `TodoProjectionBlock` wrapper (`240a3ec`).
- [x] **T2.5** `TranscriptList` ported with the virtualizer swap (`94a82c8`).
      `@tanstack/svelte-virtual`'s `createVirtualizer` returns a **store**, not a rune: reactive count
      goes through `$effect(() => $virtualizer.setOptions({ count, … }))`, which merges rather than
      replaces so injected observers survive, and rows measure via `{@attach}` plus `data-index`
      (`TranscriptList.svelte:207`). Dynamic `measureElement` preserved.
- [x] **T2.6** `useSyncSocket` extracted as a runes factory owning the socket lifecycle (`c2b9131`):
      an `AbortController` on entry (`:145`), every async continuation guarded on
      `controller.signal.aborted` (`:157`), and a cleanup that aborts and closes (`:261-263`).
- [x] **T2.7** Session view ported, composing `useSyncSocket` (`df6acea`).

### Shell and routes

- [x] **T2.8** Shared app-state store with the shell reducers and UI state (`aaf7cbc`).
- [x] **T2.9** App shell ported to `+layout.svelte` (`aa5fd59`) — both context providers mounted once,
      theme, service-worker registration, connection and session stores.
- [x] **T2.10** Route pages added (`3355ac2`): `/`, `/session/[id]`, `/attention/[lookupId]`.
- [x] **T2.11** `pushState` and `popstate` replaced by a single `goto` in the shell
      (`+layout.svelte:91`), with route params arriving through the `page` store and flowing into
      `$derived` — so nothing subscribes to history events at all.
- [~] **T2.12** The `/catalog` route with its `+layout@.svelte` reset was **not** built. The catalog
      became Storybook in child 006, which runs as its own application, so there is no in-app route
      that could white-screen the runtime and nothing for a layout reset to protect.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** App runs end-to-end against the relay: enroll, home, session with a live socket, review
      and inbox. This is the layer's real barrier — it is where the app first exists as an app, so any
      wrong seam between views shows up on that path.
- [x] **T3.2** All three URLs resolve, including `/attention/[lookupId]` arriving cold through the SPA
      fallback — a different code path from navigating to it in-app, and the only one that exercises
      the fallback.
- [x] **T3.3** `svelte-check` clean; token-identity re-verified on touched surfaces — 0 diffs.
- [x] **T3.4** No socket leak under HMR.
- [~] **T3.5** The HMR socket check was manual. Automating it would mean modelling the dev server's
      reload semantics, which is more machinery than the risk warranted here. Real regression coverage
      arrived with the ported `runtime` and `catalogLifecycle` suites in 007 — and those tests then
      exposed two `$effect` self-invalidations in this layer's factories.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

All four requirements hold and the barrier passed: the app runs end-to-end, all three URLs resolve,
and the socket lifecycle is centralised with guarded teardown.

One scope item was dropped rather than delivered — the `/catalog` route — because child 006 made it
unnecessary. That is recorded above rather than reconciled backwards into the spec.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` — scope, requirements and the barrier definition.
- `plan.md` — routing, socket ownership and the virtualizer shape change.
- `checklist.md` — sign-off with evidence.
- `implementation-summary.md` — what shipped and the two latent effects it left behind.
- `../006-catalog/` — the Storybook catalog that replaced the planned `/catalog` route.
- Program goal: `../goal.md`.
<!-- /ANCHOR:cross-refs -->
