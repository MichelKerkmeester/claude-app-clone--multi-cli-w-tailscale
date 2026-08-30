---
title: "Storybook autodocs — the catalog's documentation layer"
description: "The catalog renders 337 stories and documents none of them. A docgen plugin already extracts every component's props from its runes and types on every build; nothing renders that output. Turn the docs layer on, find where the generated tables are thin, write prose only where a component's contract is invisible in its rendering, and teach the surface skill that the layer exists."
trigger_phrases:
  - "storybook autodocs"
  - "component docs page"
  - "props table"
  - "docgen coverage"
  - "catalog documentation layer"
importance_tier: "important"
contextType: "specification"
_memory:
  continuity:
    packet_pointer: "specs/008-storybook-autodocs"
    last_updated_at: "2026-08-30T08:10:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "All four phases closed"
    next_safe_action: "None; the packet is closed."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: phase-parent.spec | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Storybook autodocs — the catalog's documentation layer

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 3 |
| **Priority** | P2 |
| **Status** | Complete |
| **Created** | 2026-08-30 |
| **Phases** | 4 |
| **Scope** | `app-mobile/.storybook/`, component prose, the `sk-code-mobile-cli` skill, `REPO RULES.md` |
| **Constraint** | Additive. No story renames, no token values, no change to what the four presentation gates measure |
| **Evidence** | Level 3 by `recommend-level.sh` (71/100, confidence 82%); phase score 30/50 against a threshold of 25 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
The catalog holds **337 story entries and zero docs entries**. A component's contract — what it
accepts, what it requires, what it does at a width you are not currently looking at — exists only in
its source. Someone reviewing a surface in the catalog sees a picture and nothing else.

Two facts make this cheap to fix and expensive to keep ignoring. First, `@storybook/svelte-vite`
already runs `storybook:svelte-docgen-plugin` on every `.svelte` file in the build. It reads `$props()`
runes and the TypeScript types and attaches name, type, optionality, default value and JSDoc
description to each component. That extraction is happening on every build today and nothing renders
it, because `@storybook/addon-docs` is not installed. Second, **100 story files already carry
`tags: ['autodocs']`**. The tag is inert. Source that says a component is documented, when no
documentation exists, is worse than source that says nothing.

The cost is not hypothetical. During the home-balance phase a control passed every geometric check
while still rendering as an unreadable mark, because its behaviour changed at a breakpoint nobody
could see from the catalog. A page stating "this control has two modes, here is the breakpoint" would
have made that obvious immediately.

### Purpose
Give the catalog a documentation layer that is generated rather than maintained. The props table
comes from the types and cannot drift. Prose is written only where a component's contract is
genuinely invisible in its rendering, so the part that can decay stays small and deliberate.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- Installing and configuring `@storybook/addon-docs` so docs entries generate.
- Measuring what the existing docgen actually produces per component, and where it produces nothing useful.
- Prose descriptions for the components whose contract is not visible in their rendering.
- Teaching `sk-code-mobile-cli` and `REPO RULES.md` that the layer exists and what it guarantees.

### Out of Scope
- Story renames, additions or removals. The docs layer reads the stories that exist.
- Token values, class grammar, and any application source change.
- What the four presentation gates measure. They filter `entry.type === 'story'`, and that stays true.
- The screenshot archive. `capture-screenshots.mjs` filters the same way, so docs pages are never captured.

### Files to Change
- `app-mobile/.storybook/main.ts`, `app-mobile/package.json`, `package-lock.json`.
- Component and story files, for prose only.
- `.opencode/skills/sk-code/sk-code-mobile-cli/` in the Public monorepo, and `REPO RULES.md` here.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers
- REQ-001 Docs entries generate, and the props table populates from the existing runes docgen rather than from anything hand-written.
- REQ-002 The four presentation gates and the screenshot archive are provably unaffected.
- REQ-003 No story is renamed, added or removed, and no token value moves.

### P1 - Required (complete OR user-approved deferral)
- REQ-004 Every component whose docgen output is empty or misleading is identified by measurement, not by sampling.
- REQ-005 Prose is written where a component's contract is invisible in its rendering, and nowhere else.
- REQ-006 The surface skill routes to the docs layer, and `REPO RULES.md` states what it guarantees and what it does not.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:phase-map -->
## 5. PHASE DOCUMENTATION MAP

| Phase | Folder | Level | Status | Description |
|-------|--------|-------|--------|-------------|
| 1 | `001-enable-docs-layer/` | 1 | complete | Install `@storybook/addon-docs`, configure it, and prove docs entries generate while every gate and the archive stay untouched |
| 2 | `002-audit-docgen-coverage/` | 1 | complete | Measure what the docgen produces for all 100 tagged components; produce the ranked list of where a generated table is thin or absent, and why |
| 3 | `003-author-component-prose/` | 1 | complete | Write descriptions for the components the audit names, starting with contracts invisible in the rendering — two-mode surfaces, capability gates, fenced lines |
| 4 | `004-skill-and-repo-integration/` | 1 | complete | Land the layer in `sk-code-mobile-cli` and `REPO RULES.md` so the next agent finds it without being told |

The phases are risk-ascending. Phase 1 is reversible in one commit and touches configuration only.
Phase 4 crosses into another repository with its own landing flow and pre-push gates, so it is last
and separate.
<!-- /ANCHOR:phase-map -->

---

<!-- ANCHOR:success-criteria -->
## 6. SUCCESS CRITERIA

- The built index reports a non-zero docs entry count, and a sampled docs page renders a props table with real types and zero page errors.
- A full re-capture moves zero screenshots, and the smoke, state-visibility, token and audit gates return the same verdicts as before.
- Every component named by the audit either carries prose or has a recorded reason it does not need any.
- An agent reading the surface skill can find the docs layer and knows which half of it is generated.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 7. RISKS & DEPENDENCIES

- The docgen is a build-time TypeScript pass over every `.svelte` file. Adding the renderer could measurably slow the catalog build; the delta is measured in phase 1 rather than assumed.
- A docs page can throw where its stories do not, because it renders every story of a component on one page plus an args table. Nothing currently sweeps docs entries, so phase 1 owns proving they render.
- Prose is the half that decays. Phase 3 keeps it small on purpose; a description that restates the props table earns nothing and costs maintenance.
- Phase 4 lands in the Public monorepo, which needs an isolated worktree, the sk-git branch allocator and three pre-push gates. It cannot be committed from this repository's checkout.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `001-enable-docs-layer/spec.md` - the mechanism.
- `002-audit-docgen-coverage/spec.md` - what the generator actually produces.
- `003-author-component-prose/spec.md` - the part a person writes.
- `004-skill-and-repo-integration/spec.md` - making it findable.
- `../009-home-balance-and-controls/` under `006` - the phase whose invisible-mode defect motivated this work.
<!-- /ANCHOR:cross-refs -->
