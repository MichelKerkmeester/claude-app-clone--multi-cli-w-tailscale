---
title: "Source structure — CSS ownership, comment grammar, and the surface skill"
description: "Phase parent for finishing the migration's one-file-per-component intent: move single-owner CSS into its component's scoped style, standardise the section-comment vocabulary, and teach both in the surface skill."
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "005-sveltekit-spa-migration/020-source-structure"
    last_updated_at: "2026-08-24T06:40:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Phase parent scoped; three children created."
    next_safe_action: "Run 001-css-ownership: move the 82 single-owner classes into their components."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Source structure — phase parent

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `005-sveltekit-spa-migration` |
| Mode | Phase parent |
| Children | `001-css-ownership`, `002-comment-structure`, `003-skill-update` |
| Status | In Progress |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

The migration's north star is that a designer opens one `.svelte` file and sees the whole component —
its markup, its own scoped CSS, and its logic together. That is 96% true: 66 of 96 components carry a
scoped `<style>`. But `app.css` still holds 3,197 lines, and 82 of the 150 classes it defines are used
by exactly one component. Those rules belong with their component, not in a shared file a designer has
to cross-reference.

This packet finishes that intent, then makes the section comments consistent enough to read the same
way in every file, then teaches both conventions in the surface skill so the next edit stays on
pattern. It changes no rendered value and no behaviour: every move is proven by token identity holding
at zero diffs and by the nine gates staying green.

Each concern is a phase because each has a different verification and a different failure mode — a CSS
move is proven by token identity, a comment change by a comment-only diff, a skill change by a
reference scan and a loading dispatch — and mixing them would blur which gate is protecting what.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:phases -->
## 3. PHASE DOCUMENTATION MAP

| Phase | Child | Scope |
|---|---|---|
| A | `001-css-ownership` | Move the 82 single-owner classes from `app.css` into their components' scoped `<style>`, prop-classes via `:global()`. `app.css` keeps tokens, theme, resets and the 44 shared classes. |
| B | `002-comment-structure` | Standardise the Svelte section-comment vocabulary and order across components; comment-only, no value change. |
| C | `003-skill-update` | Teach the `app.css` ownership rule and the section vocabulary in `sk-code-mobile-cli`; merge to the live skill line. |
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:invariants -->
## 4. INVARIANTS

Inherited from the program goal, non-negotiable across every phase:

- Token identity resolves to 0 CHANGED / 0 VANISHED / 0 ADDED across light, dark and system.
- No rendered value, security invariant, routing behaviour or accessibility contract changes.
- The nine program gates stay green, run whole from the final state.
- Comment hygiene: no spec path or artifact id in any code comment.
<!-- /ANCHOR:invariants -->

---

<!-- ANCHOR:cross-refs -->
## 5. CROSS-REFERENCES

- Program goal: `../goal.md` — the one-file-per-component north star this packet completes.
- `../012-naming-and-structure/` — the earlier CSS decomposition this continues.
- `../019-surface-skill-refresh/` — the surface skill phase C updates.
<!-- /ANCHOR:cross-refs -->
