---
title: "Phase D — Styles into Svelte: component CSS folds back into scoped <style>"
description: "Reverse the co-located .css extraction: each component's rules move back into its .svelte scoped <style> block, so a component is one file again — markup, its own Svelte-scoped CSS, and logic. app.css stays the global layer. Proven value-identical by the token-identity gate."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "005-sveltekit-spa-migration/020-source-structure/004-styles-into-svelte"
    last_updated_at: "2026-08-24T18:30:39Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "66 component .css folded back into scoped <style>; every gate green."
    next_safe_action: "None — the source-structure group is complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase D — Styles into Svelte

> **Phase links** — Parent: [`../spec.md`](../spec.md) · Predecessor: `003-css-files`

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `020-source-structure` |
| Level | 2 |
| Writer | Claude (git-based restore, tooling, verification) |
| Barrier | token identity 0-diff + fences 277 + the whole gate green |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

Phase C extracted every component's `<style>` into a co-located `.css` file so the CSS was browsable as
files. On reflection the operator preferred the migration's original north star: one `.svelte` file per
component — markup, its own Svelte-scoped CSS, and logic together — with the compiler-enforced scoping
that separate global `.css` files gave up. This phase folds the component CSS back into scoped `<style>`
blocks. `app.css` stays the global layer (tokens, theme, resets, shared classes, a11y guardrails).
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:** the 66 component `.css` files fold back into their `.svelte` `<style>` blocks with correct
`:global()` on prop-classes; the `.css` files and their imports are removed; the CSS-corpus reader and
the four `<style>`-reading tests are repointed from `.css` back to `<style>`.

**Out of scope:** `app.css` (unchanged), any rendered value, class name, or markup change. This is a
pure relocation — the inverse of Phase C.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — Each component's rules return to its `.svelte` `<style>` block value-identical, restored
  from the pre-extraction commit (the `.svelte` files were touched by nothing but the extraction).
- **REQ-002** — Prop-classes are `:global()` again (Svelte cannot hash a class it does not see literally);
  markup-owned classes are scoped rules.
- **REQ-003** — Every component `.css` file and its import are removed; `app.css` is untouched.
- **REQ-004** — Token identity resolves to 0 CHANGED / 0 VANISHED / 0 ADDED across the three themes over
  `app.css` plus every scoped `<style>`.
- **REQ-005** — The CSS-corpus reader and the four tests read `<style>` again; the guardrail fence count
  stays 277.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. No component `.css` remains; every component carries its scoped `<style>` block.
2. Token identity holds at zero diffs across three themes, whole from the final state.
3. Fences 277; build, typecheck, `test:web`, catalog smoke stay green.
4. The CSS-corpus reader and the four tests pass reading `<style>`.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **A prop-class loses its `:global()` and stops matching.** Restoring the pre-extraction `<style>`
  blocks brings back the original `:global()` placement, so this cannot regress; token identity is the
  standing check.
- **A stale tooling repoint.** The CSS-corpus reader and four tests must read `<style>` again; `test:web`
  is the check.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

None. The operator chose scoped `<style>` (one-file-per-component) over separate `.css` files, accepting
that CSS is no longer browsable as standalone files.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `../003-css-files/` — Phase C, the extraction this reverses.
- `../../007-verify-and-cutover/` — the token-identity baseline this phase diffs against.
<!-- /ANCHOR:cross-refs -->
