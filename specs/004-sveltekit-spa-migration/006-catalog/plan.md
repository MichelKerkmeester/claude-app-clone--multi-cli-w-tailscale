---
title: "Child 006 plan — Storybook catalog"
description: "How the bespoke React catalog was replaced by Storybook, why stories are seeded from pure data rather than a live socket, and why compiling is not the same as rendering."
trigger_phrases:
  - "catalog plan approach"
  - "catalog packet"
  - "plan approach"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/006-catalog"
    last_updated_at: "2026-08-23T10:40:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed retrospectively."
    next_safe_action: "None; child shipped, extended by 009."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 006 plan — Storybook catalog

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

The React app had a bespoke catalog that could render six of sixty-four surfaces, because most
surfaces need a runtime the catalog could not supply. Storybook replaces it, and the point of the
replacement is coverage: a surface nobody can look at in isolation is a surface nobody can safely
change.

The enabling decision is that **stories are seeded from pure data**. No story reaches a live socket,
so every surface — including the socket-coupled ones — becomes viewable without a relay.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

| Gate | Result |
|---|---|
| Catalog smoke — every story renders in both themes | 404 frames, 0 throws |
| Live surface count reported, exclusions listed with reasons | reported |
| `svelte-check` across story files | clean |
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

**Compiling is not rendering, so the gate uses a real browser.** `storybook build` proves the stories
type-check and bundle. It says nothing about whether a surface actually draws. `catalog-smoke-cdp.mjs`
drives a real browser over every story in both themes and fails on any thrown exception or console
error — which is the only way to catch a story that builds fine and renders nothing.

**Themes come from the addon, driven by the same global the gate reads.** `withThemeByDataAttribute`
stamps `data-theme` on `<html>`, giving both a toolbar toggle for humans and a `globals=theme:*`
parameter the CDP gate can set. One mechanism serves both readers, so the gate can never drift from
what a person sees in the toolbar.

**The global stylesheet is imported once; component CSS travels with the component.** `preview.ts`
imports `app.css` so surfaces resolve against the real `--pi-*` tokens, and each component's own rules
come along inside its scoped `<style>`. Storybook's own `backgrounds` addon is disabled deliberately —
the tokens own the surface background, and letting Storybook paint its own would fight them.

**Socket-coupled surfaces get fixtures, not a global runtime decorator.** The plan called for one
mock-context decorator injecting a runtime everywhere. What shipped instead seeds each story from
`demo.ts` fixtures directly, with a dedicated host component only where a surface genuinely needs
imperative setup. A global decorator would have made every story depend on one shared mock, so a
change to that mock could quietly alter what fifty unrelated stories show.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1: Stand up Storybook — Done

`@storybook/sveltekit` with the a11y, themes and designs addons, plus `preview.ts` importing `app.css`
and disabling the competing backgrounds addon.

### Phase 2: Stories per surface, in parallel — Done

Rich content first, since it also carried the new CDP render gate; then transcript, artifacts, views,
chrome and the attachment tile — one dispatch per surface group, disjoint by construction.

### Phase 3: Barrier — Done

Catalog smoke across every story in both themes, with the live count reported and exclusions named.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

The catalog is itself a test instrument, so the question is what tests the instrument.

`catalog-smoke-cdp.mjs` renders every story in both themes and fails on `Runtime.exceptionThrown` or
any console error. That catches the common failure — a story that throws — and it catches theme-only
breakage, which is why both themes run rather than one.

It has a known blind spot worth stating plainly: **a story that renders nothing passes**. The gate
treats an empty frame as success by design, so a decorator ordering mistake that leaves a component
without its context produces a blank story and a green gate. Closing that needed a different
instrument — the `story-render` test added in 009, which composes the real decorator pipeline and
asserts specific roles are present.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- 002 through 005 — the components must exist before they can have stories.
- `demo.ts`, ported in 002, which supplies every fixture.
- `catalog-registry.ts` as the pure-data surface index.
- Storybook dependencies, installed once in L0.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Purely additive and entirely outside the shipped app: story files, a `.storybook/` directory and one
gate script. Storybook is a separate application that no user reaches, so reverting any part of it
cannot affect the runtime — the strongest rollback position in the program.
<!-- /ANCHOR:rollback -->
