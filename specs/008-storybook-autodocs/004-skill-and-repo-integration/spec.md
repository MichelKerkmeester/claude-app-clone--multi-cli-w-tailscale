---
title: "Phase 4 — Skill and repo integration"
description: "Land the docs layer in the surface skill and the repo rules so the next agent finds it without being told, and knows which half of it is generated."
trigger_phrases:
  - "skill integration docs layer"
  - "sk-code-mobile-cli docs"
  - "repo rules storybook docs"
importance_tier: "important"
contextType: "specification"
_memory:
  continuity:
    packet_pointer: "specs/008-storybook-autodocs/004-skill-and-repo-integration"
    last_updated_at: "2026-08-30T09:30:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Landed the routed reference on main and v4"
    next_safe_action: "None; the packet is closed."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Phase 4 — Skill and repo integration

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
| **Phase** | 4 of 4 |
| **Predecessor** | `../003-author-component-prose/spec.md` |
| **Successor** | None |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
A capability nobody knows about is not a capability. `sk-code-mobile-cli` is where an agent looks for this repository's design-system and source-convention evidence, and `REPO RULES.md` is what it reads before running anything. Neither mentions that the catalog has a documentation layer, what it guarantees, or that its props tables are derived and therefore trustworthy in a way prose is not.

### Purpose
Make the layer discoverable through the routes agents already take, and state its guarantee precisely enough that nobody has to re-derive it.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- A reference document in `sk-code-mobile-cli` covering the docs layer: what generates, what is authored, and where each lives.
- A routing entry in that skill's `SKILL.md` so its router resolves to the new reference.
- A line in `REPO RULES.md` stating the guarantee and its limit.
- Landing the skill change through the Public monorepo's own flow.

### Out of Scope
- Any change to the catalog, the gates, or the application.
- Documenting Storybook itself. The reference covers this repository's use of it.

### Files to Change
- `.opencode/skills/sk-code/sk-code-mobile-cli/` in the Public monorepo.
- `REPO RULES.md` in this repository.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers
- REQ-001 The skill's own router resolves to the new reference; a document nothing routes to is not integrated.
- REQ-002 The distinction between the generated half and the authored half is stated explicitly.

### P1 - Required
- REQ-003 The skill's leaf manifest and root metadata are regenerated and pass their audit.
- REQ-004 The change lands on both the release line and main, through an isolated worktree.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- The skill's metadata audit passes and every cited path resolves.
- An agent reading only `REPO RULES.md` learns the layer exists and where to go for depth.
- The packet validates strict.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- This phase crosses into the Public monorepo, which needs an isolated worktree, the sk-git branch allocator and three pre-push gates. It cannot be committed from this repository's checkout.
- A reference document that duplicates the skill's existing content is the failure mode here; the layer needs a pointer, not a second catalog guide.
<!-- /ANCHOR:risks -->
