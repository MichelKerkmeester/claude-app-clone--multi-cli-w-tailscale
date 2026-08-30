---
title: "Phase 1 — Enable the docs layer"
description: "Install and configure the docs addon so the docgen output the build already computes is finally rendered, and prove the four presentation gates and the screenshot archive are untouched by it."
trigger_phrases:
  - "enable docs layer"
  - "install addon-docs"
  - "docs entries generate"
  - "docgen renders"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/008-storybook-autodocs/001-enable-docs-layer"
    last_updated_at: "2026-08-30T09:20:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Enabled the docs layer; fixed a story and a gate the addon exposed."
    next_safe_action: "Begin phase 2: measure docgen coverage across the tagged components."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Phase 1 — Enable the docs layer

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 1 |
| **Priority** | P2 |
| **Status** | Complete |
| **Created** | 2026-08-30 |
| **Parent Spec** | `../spec.md` |
| **Phase** | 1 of 4 |
| **Predecessor** | None |
| **Successor** | `../002-audit-docgen-coverage/spec.md` |
| **Scope** | `app-mobile/.storybook/main.ts`, the web workspace manifest, and whatever the addon breaks |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
`@storybook/svelte-vite` runs `storybook:svelte-docgen-plugin` over every `.svelte` file on every
build, reading `$props()` runes and the TypeScript types for each component's name, type,
optionality, default and JSDoc. That output is computed and then discarded, because
`@storybook/addon-docs` is not installed. Meanwhile 100 story files carry `tags: ['autodocs']` and
the catalog index contains zero docs entries.

### Purpose
Render what is already being extracted, and establish by measurement that doing so costs nothing the
existing gates care about.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- Installing `@storybook/addon-docs` into the web workspace and adding it to the addon list.
- Proving docs entries generate and a props table renders real types.
- Proving the smoke, state-visibility, token, coverage and geometry gates and the archive are unaffected.
- Repairing anything the addon exposes as already broken.

### Out of Scope
- Which components should carry the tag. That is phase 2.
- Any prose. That is phase 3.
- The surface skill and repo rules. That is phase 4.

### Files to Change
- `app-mobile/.storybook/main.ts`, `app-mobile/package.json`, `package-lock.json`.
- `scripts/catalog-smoke-cdp.mjs` and `scripts/story-coverage-allowlist.json`, for the defects found.
- `app-mobile/src/pages/chat/chrome/dock-recent-sessions{.stories.ts,-story-host.svelte}`.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers
- REQ-001 Docs entries generate and a props table renders types derived from the component, not from anything hand-written.
- REQ-002 The archive moves zero shots, and every presentation gate returns the verdict it returned before.
- REQ-003 No story is renamed, added or removed; no token value moves.

### P1 - Required
- REQ-004 The build-time cost is measured rather than assumed.
- REQ-005 Anything the addon exposes as broken is fixed at its cause, and the fix is negative-controlled.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- `index.json` reports a non-zero docs count with the story count unchanged.
- A docs page renders a props table containing a real component type, with zero page errors.
- A full re-capture moves zero shots, and typecheck plus both web suites stay green.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- The addon changes the preview's render path. A story that depended on the old path can break, and Storybook renders such a failure as a panel rather than a throw, so a throw-based gate can miss it entirely.
- `playwright` is undeclared in this repository, and an install can remove it, silently disabling four gates. Its presence is checked after installing.
<!-- /ANCHOR:risks -->
