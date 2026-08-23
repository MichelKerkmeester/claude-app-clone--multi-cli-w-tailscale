---
title: "Child 006 implementation summary — Storybook catalog"
description: "What replacing the bespoke catalog delivered, why fixtures beat a global mock decorator, and the blind spot the render gate carries by design."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/006-catalog"
    last_updated_at: "2026-08-23T10:40:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed retrospectively."
    next_safe_action: "None; child shipped, extended by 009."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 006 implementation summary

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

Storybook 9 on `@storybook/sveltekit`, with the a11y, themes and designs addons, replacing a bespoke
React catalog that could render six of sixty-four surfaces.

Stories were authored per surface group in disjoint dispatches: rich content (which also carried the
new render gate), transcript (9 files), artifacts (12), views (8), chrome (11) and the attachment
tile. 74 story files exist today.

`catalog-smoke-cdp.mjs` is the gate: it drives a real browser over every story in both themes and
fails on any thrown exception or console error. The barrier closed at 404 frames with zero throws.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## How It Was Delivered

Parallel executor dispatches, one surface group each. The render gate shipped with the *first* group
rather than last, so every subsequent group was gated on arrival instead of accumulating unverified
stories to check at the end.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## Key Decisions

**The gate renders; it does not merely build.** `storybook build` proves the stories type-check and
bundle, which is a much weaker claim than it appears — a story can build perfectly and draw nothing.
The gate therefore drives a real browser and fails on `Runtime.exceptionThrown` or any console error.

**One theme mechanism for both readers.** `withThemeByDataAttribute` stamps `data-theme` on `<html>`,
giving humans a toolbar toggle and the gate a `globals=theme:*` parameter. Because both read the same
global, the automated check cannot drift from what a person sees.

**Fixtures per story, not one global mock decorator.** The spec called for a single mock-context
decorator injecting a runtime everywhere. What shipped seeds each story from `demo.ts` fixtures
directly, with a dedicated host component only where a surface needs imperative setup. A shared global
mock would mean a change in one place could quietly alter what dozens of unrelated stories display —
the stories would agree with each other rather than with the product.

**Fixture provenance is maintained deliberately.** A story whose fixture no longer traces back to
`demo.ts` has quietly become fiction, so provenance was restored when it slipped.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## Verification

| Check | Result |
|---|---|
| Catalog smoke, every story, both themes | 404 frames, 0 throws |
| Gate failure modes covered | thrown exceptions and console errors |
| `svelte-check` across story files | clean |
| Story files | 74 |
| Stories seeding from `demo.ts` fixtures | 55 files |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## Known Limitations

**A story that renders nothing passes.** The gate treats an empty frame as success by design. That is
not a bug in the script so much as a limit of what "did it throw" can tell you — and it is exactly the
failure a decorator-ordering mistake produces. Mounting a context provider inside the component that
needs it, rather than outside, yields an empty render with no error at all. The blind spot stayed open
until 009 added a render test that composes the real decorator pipeline and asserts specific roles are
present.

**Coverage was reported, not enforced.** This child counted live surfaces and named exclusions, but
nothing stopped a new component from shipping without a story. The enforcing coverage gate and its
allowlist arrived in 009.

**Two spec assumptions did not survive contact.** The single mock-context decorator was replaced by
per-story fixtures for the reasons above, and the `/catalog` route it was meant to coexist with was
dropped in child 005 once Storybook became a separate application.
<!-- /ANCHOR:limitations -->
