---
title: "Child 005 checklist — views and shell sign-off"
description: "Barrier sign-off for the view extraction, socket lifecycle, virtualizer swap and three-URL routing surface."
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

# Verification Checklist: Child 005 — views and shell

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

The barrier here is an end-to-end run, not a suite, because this is the layer where the app first
exists as an app. Enroll, home, live session, review, inbox — a wrong seam between views shows up on
that path and nowhere else.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] **CHK-PRE-01** [P0] L3 barrier confirmed green, since the session view composes the chrome and composer. [evidence: `004-chrome-and-composer` barrier — catalog render pass, focus assertions pass, `svelte-check` clean]
- [x] **CHK-PRE-02** [P0] Views classified by what they own, not by size. [evidence: 4/5 views run parallel; `pages/chat/Chat.svelte` owns the socket and virtualizer and runs alone]
- [x] **CHK-PRE-03** [P0] Shell and route files declared barrier-only so they keep a single-writer history. [evidence: `+layout.svelte` and `src/routes/*` Claude-owned, never inside a parallel dispatch]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] **CHK-CQ-01** [P0] Type check clean across the layer. [evidence: `svelte-check` clean]
- [x] **CHK-CQ-02** [P1] Views extracted from the 2612-line `App.tsx` into their own page directories. [evidence: `pages/home` 9 files, `pages/review` 3, `pages/inbox` 3, `pages/enrollment` 3]
- [x] **CHK-CQ-03** [P1] Pure transcript grouping logic extracted before the components that use it. [evidence: commit `a6d0165` lands the render-grouping helpers ahead of the renderers]
- [x] **CHK-CQ-04** [P1] Route files stay thin, delegating to page components. [evidence: `session/[id]/+page.svelte` 38 lines, `attention/[lookupId]/+page.svelte` 54, `+page.svelte` 20]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [x] **CHK-TEST-01** [P0] App runs end-to-end against the relay. [evidence: `vite preview` against the relay — enroll to home to live session to review and inbox, 5/5 reachable]
- [x] **CHK-TEST-02** [P0] All three URLs resolve, including the cold deep link. [evidence: 3/3 — `/`, `/session/[id]`, `/attention/[lookupId]` through the SPA fallback]
- [x] **CHK-TEST-03** [P0] No token value moved on the touched surfaces. [evidence: `token-identity.mjs` 0 diffs]
- [~] **CHK-TEST-04** [P1] HMR socket-leak check was manual. [deferred: automating it means modelling the dev server's reload semantics; real regression coverage arrived with the ported `runtime` and `catalogLifecycle` suites in 007]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] **CHK-FIX-01** [P0] Socket open and teardown centralised in one factory rather than spread across the view. [evidence: `useSyncSocket.svelte.ts` owns both — commit `c2b9131`]
- [x] **CHK-FIX-02** [P0] Async open guarded against a teardown that beats it. [evidence: `AbortController` at `useSyncSocket.svelte.ts:145`, continuation guard at `:157`, abort and close at `:261-263`]
- [x] **CHK-FIX-03** [P0] Dynamic row measurement preserved through the virtualizer swap. [evidence: `TranscriptList.svelte:207` calls `measureElement` via `{@attach}` plus `data-index`]
- [x] **CHK-FIX-04** [P1] Reactive count applied without clobbering injected observers. [evidence: `$effect` calls `setOptions`, which merges rather than replaces]
- [~] **CHK-FIX-05** [P0] Two `$effect` self-invalidations survived this layer undetected. [deferred: the `useRuntime` mount refresh and the `hostCommandCatalog` mount plus reconnect effects were only exposed by the 007 port, and both caused a duplicate fetch on mount]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] **CHK-SEC-01** [P0] Enrollment remains an auth branch rather than a route, so no URL exposes an unauthenticated shell. [evidence: 3/3 route files are `/`, `/session/[id]`, `/attention/[lookupId]`; enrollment is a branch inside `+layout.svelte`]
- [x] **CHK-SEC-02** [P0] The attention deep link resolves a lookup id without carrying content in the URL. [evidence: `attention/[lookupId]/+page.svelte` resolves then redirects via `goto`]
- [x] **CHK-SEC-03** [P1] Backend suite green across the layer. [evidence: `npm test` exit code 0]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] **CHK-DOC-01** [P1] The virtualizer's store-not-rune shape documented where the next editor meets it. [evidence: `pages/chat/transcript/CODE.md` explains the store, the merging `setOptions` and the `{@attach}` measurement]
- [x] **CHK-DOC-02** [P2] Route files carry `@ds route:` markers and a short purpose note. [evidence: `@ds route: /session/[id]` at the top of the session route]
- [x] **CHK-DOC-03** [P2] The routes directory carries its own map. [evidence: `src/routes/README.md`]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] **CHK-ORG-01** [P1] Three URLs became three route files; overlays and the auth branch did not. [evidence: `+page.svelte`, `session/[id]`, `attention/[lookupId]` — review and inbox stay overlay booleans]
- [x] **CHK-ORG-02** [P1] Hand-rolled history management removed entirely. [evidence: 1 `goto` call at `+layout.svelte:91`; no `pushState` or `popstate` subscriber remains]
- [~] **CHK-ORG-03** [P2] The planned `/catalog` route and its layout reset were never built. [deferred: child 006 made the catalog a separate Storybook application, so no in-app route exists that could white-screen the runtime]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

The barrier passed: the app runs end-to-end, all three URLs resolve including the cold deep link, and
the socket lifecycle is centralised with guarded teardown.

Two qualifications. The `/catalog` route was dropped because 006 made it unnecessary. And two
`$effect` self-invalidations in this layer's own factories survived undetected until the 007 port
exposed them — the end-to-end barrier could not see a duplicate fetch on mount.
<!-- /ANCHOR:summary -->
