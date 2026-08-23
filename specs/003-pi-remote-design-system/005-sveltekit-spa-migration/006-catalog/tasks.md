---
title: "Child 006 tasks — Storybook catalog"
description: "Task ledger for standing up Storybook, authoring stories per surface, and the CDP render gate that replaced a build-only check."
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

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 006 tasks — Storybook catalog

---

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred or superseded with a stated reason.
Commit hashes given where a task maps to one. Story dispatches were disjoint, one surface group each.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Confirm L2 through L5 complete — components must exist before they can have stories.
- [x] **T1.2** Stand up Storybook 9 for the Svelte app (`34ed6f0`) with `@storybook/sveltekit` and the
      a11y, themes and designs addons.
- [x] **T1.3** `preview.ts` imports `app.css` once, so surfaces resolve against the real `--pi-*`
      tokens while each component's own rules travel inside its scoped `<style>`.
- [x] **T1.4** Disable Storybook's `backgrounds` addon deliberately — the tokens own the surface
      background and Storybook's would fight them.
- [x] **T1.5** Wire the theme toggle through `withThemeByDataAttribute`, stamping `data-theme` on
      `<html>`. Its `theme` global name is the same one the CDP gate sets via `globals=theme:*`, so
      the gate and the toolbar can never drift apart.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** Rich-content stories plus the CDP render-smoke gate (`bf539a4`) — the gate landed with
      the first surface group rather than at the end, so every later group was gated on arrival.
- [x] **T2.2** Transcript stories, 9 files, render-verified (`8a956b9`).
- [x] **T2.3** Artifacts stories, 12 files, render-verified (`cd0cec9`).
- [x] **T2.4** Views stories, 8 files, render-verified (`3a3d156`).
- [x] **T2.5** Chrome stories, 11 files, render-verified (`670b450`).
- [x] **T2.6** `AttachmentTile` stories, render-verified (`a3ce08e`).
- [x] **T2.7** Fixture provenance preserved in the transcript list and block stories (`90b8579`) —
      a story whose fixture no longer traces to `demo.ts` is a story that can drift from reality.
- [x] **T2.8** Story meta typing corrected to the `Meta<typeof …>` form (`67e9118`).
- [x] **T2.9** Render-gate blank-frame cap tightened to 2.5s (`e67424b`).
- [~] **T2.10** The planned single **mock-context decorator** was not built. Stories seed from
      `demo.ts` fixtures directly — 55 story files reference them — with a dedicated host component
      only where a surface needs imperative setup, as in `AttachmentDraftStoryHost.svelte`. One global
      decorator would make every story depend on a single shared mock, so a change there could quietly
      alter what dozens of unrelated stories show.
- [~] **T2.11** The `/catalog` route does not coexist as the spec assumed; child 005 dropped it once
      Storybook became a separate application.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Catalog smoke across every story in both themes — 404 frames, 0 throws (`2c7a91e`).
- [x] **T3.2** The gate drives a real browser rather than trusting the build. `storybook build` proves
      stories compile; only a rendered frame proves they draw.
- [x] **T3.3** Gate fails on `Runtime.exceptionThrown` and on any console error, not just on a
      non-zero build exit.
- [x] **T3.4** Both themes exercised per story, so theme-only breakage cannot hide.
- [x] **T3.5** Live surface count reported with exclusions named rather than silently dropped.
- [~] **T3.6** The gate treats an **empty frame as a pass** by design, so a story that renders nothing
      is green. A decorator-ordering mistake that leaves a component without its context produces
      exactly that. Closed later by the `story-render` test in 009, which composes the real decorator
      pipeline and asserts specific roles are present.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

The barrier passed at 404 frames with zero throws, and coverage far exceeded the target: the spec
aimed at roughly 60 of 64 surfaces, and there are 74 story files today after 009's coverage work.

Two spec assumptions did not survive contact: the single mock-context decorator, and the coexisting
`/catalog` route. Both are recorded above rather than reconciled backwards.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` — scope, requirements and the barrier definition.
- `plan.md` — why the gate uses a real browser and why fixtures beat a global decorator.
- `checklist.md` — sign-off with evidence.
- `implementation-summary.md` — what shipped and the gate's blind spot.
- `../009-storybook-experience/` — the coverage gate and the render test that closed that blind spot.
- Program goal: `../goal.md`.
<!-- /ANCHOR:cross-refs -->
