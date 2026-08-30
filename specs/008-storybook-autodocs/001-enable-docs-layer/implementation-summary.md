---
title: "Implementation Summary: Phase 1 — Enable the docs layer"
description: "The docs layer is on: 100 docs entries render props tables derived from the runes docgen. Enabling it exposed a story that set context outside component init and a gate that could not see the resulting failure; both are fixed at their cause."
trigger_phrases:
  - "docs layer enabled"
  - "lifecycle outside component story"
  - "smoke gate settle"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/008-storybook-autodocs/001-enable-docs-layer"
    last_updated_at: "2026-08-30T09:20:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Closed phase 1 with the archive unmoved and both exposed defects fixed."
    next_safe_action: "Begin phase 2: measure docgen coverage across the tagged components."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Implementation Summary: Phase 1 — Enable the docs layer

---

<!-- ANCHOR:metadata -->
## Metadata

| Field | Value |
|-------|-------|
| **Spec Folder** | 001-enable-docs-layer |
| **Level** | 1 |
| **Status** | Complete |
| **Date** | 2026-08-30 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## What Was Built

`@storybook/addon-docs` is installed in the web workspace and listed in `main.ts`. The catalog index
went from **337 stories and 0 docs** to **337 stories and 100 docs** — the story count is unchanged,
which is the point: the docs layer reads the stories that exist.

The props table is derived, not authored. On the theme control's docs page the table renders `value*`
— required, marked as such — carrying the union `"system" | "light" | "dark"`, read out of the
`ThemePreference` type by the docgen plugin that was already running. Zero page errors on the pages
sampled.

Build cost was measured rather than assumed: **7.60s and 7.68s** before, **7.99s and 8.94s** after.

### Files Changed

| File | Change |
|------|--------|
| `app-mobile/.storybook/main.ts` | Added the addon, with the reason the props table cannot drift |
| `app-mobile/package.json`, `package-lock.json` | The dependency |
| `app-mobile/src/pages/chat/chrome/dock-recent-sessions-story-host.svelte` | New story host that establishes context during its own init |
| `app-mobile/src/pages/chat/chrome/dock-recent-sessions.stories.ts` | Renders through the host instead of calling `setContext` from `render` |
| `scripts/catalog-smoke-cdp.mjs` | Look again after mount, so a late failure is not reported as a clean frame |
| `scripts/story-coverage-allowlist.json` | The new host, with its reason |
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## How It Was Delivered

Two defects surfaced only because the addon changed the preview's render path. Neither was caused by
it; both were latent.

**A story set context outside component initialisation.** `dock-recent-sessions.stories.ts` called
`setAppState` and `setAppActions` — `setContext` wrappers — inside its `render` function. Svelte 5
permits `setContext` only during a component's init, and `render` is called by the preview rather
than during one. It happened to work before and stopped working here, throwing
`lifecycle_outside_component`. The repair follows the repository's existing `*-story-host.svelte`
convention: a host component does the root layout's job at the only moment Svelte allows it.

**A gate could not see that failure.** Storybook catches a render error and paints a panel instead of
throwing, so `catalog-smoke-cdp` reported `674 frames, 0 throws` while two stories were failing. Only
the screenshot archive noticed, because the panel filled the frame and the committed shots grew from
`398x136` to `402x874`. The cause was timing: `waitForStory` returned on the first `mounted` and
collected errors immediately, before the failure had been emitted. It now looks once more after a
settle.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Keep the tag on all 100 files | The generated half — props table, stories, controls — costs nothing to maintain and cannot drift. Only prose can rot, and prose is optional per component |
| Fix the story rather than avoid the addon | Calling `setContext` from `render` is undefined behaviour that happened to work. The addon exposed it; it was not the cause |
| Point the story host's meta at the real component | The host takes the dock's props and makes its fixture inputs optional, so the docs page documents `DockRecentSessions` rather than its scaffolding |
| Revert the capture-walker change | It was written for a cause that proved wrong. Re-running the archive without it moved only the two shots REPO RULES already names as flaky, so it solved nothing and was cut |
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## Verification

| Check | Result |
|-------|--------|
| Index entry types | `{"docs":100,"story":337}` |
| Props table | `value*` with `"system" \| "light" \| "dark"`, 0 page errors |
| Screenshot archive | 0 shots moved |
| `catalog-smoke-cdp` | 337 stories x 2 themes = 674 frames, 0 throws |
| `catalog-state-visibility` | PASS |
| `token-identity` | 39 goldens matched across light/dark/system |
| `css-comment-integrity` | 1 css + 129 svelte files clean |
| `story:coverage` | PASS |
| Home geometry harness | VERDICT PASS |
| `typecheck` | 0 errors, 8 warnings (was 9) |
| `test:web` | 783 passed / 3 skipped, and 776 passed |

The smoke-gate repair was negative-controlled: with the story restored to its broken form the gate
reports `FAIL: 4/674 frames threw or showed an error overlay`. Worth recording precisely — it catches
it through `err:2` console errors rather than through the overlay branch, because the settle is what
gives the errors time to land. The overlay branch still did not fire.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## Known Limitations

The overlay detection in `waitForStory` remains unproven: in the one real failure available it never
fired, and the settle is what closed the gap. A story that fails silently, with a visible panel and no
console output, would still pass. Nothing in this phase demonstrates such a case exists.

The docs pages themselves are unswept. Every gate filters `entry.type === 'story'`, which is what
keeps them unaffected, and equally means 100 docs pages now render with nothing checking them. Three
were sampled by hand. Phase 2 owns deciding whether that warrants a gate.
<!-- /ANCHOR:limitations -->
