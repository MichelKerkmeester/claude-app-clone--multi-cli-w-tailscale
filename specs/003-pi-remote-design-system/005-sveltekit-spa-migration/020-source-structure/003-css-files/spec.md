---
title: "Phase C — CSS files: each component's styles move to a co-located .css file"
description: "Extract every component's scoped <style> block into a co-located .css file it imports, so the CSS is browsable per component as the operator asked. Global scope, unchanged class names and values, proven by the token-identity gate holding at zero diffs."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/020-source-structure/003-css-files"
    last_updated_at: "2026-08-24T12:29:51Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "65 components extracted to co-located .css; every gate green."
    next_safe_action: "Proceed to the test-conventions phase."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase C — CSS files

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `020-source-structure` |
| Level | 2 |
| Writer | Claude (extraction transformer, tooling, verification, git) |
| Barrier | token identity 0-diff + fences 277 + the whole gate green |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

The operator asked repeatedly to see the CSS as browsable per-component files, not buried in each
component's `<style>` block. Phase A moved single-owner rules out of `app.css` into components, but the
result was invisible in the file tree because Svelte scopes CSS inside `<style>`. This phase extracts
every component's `<style>` into a co-located `.css` file the component imports, so the CSS is a real,
browsable file per component while every rendered value stays identical.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:** each component's `<style>` body moves to a co-located `<name>.css`, imported by the
component; `:global(...)` wrappers are unwrapped because the file is plain global CSS. Class names,
selectors and values are unchanged. The CSS-corpus test reader and the four tests that read a
component's `<style>` are repointed to the `.css` files.

**Out of scope:** `app.css` (the global foundation stays as-is). No rendered value change, no class
rename, no markup change. CSS Modules are explicitly rejected: they would rewrite every component's
markup to `class={styles.x}` and break the tests, token identity and CDP, which assert real class names.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — Each component's `<style>` body moves verbatim to a co-located `.css` file the
  component imports; the component keeps no `<style>` block.
- **REQ-002** — `:global(...)` wrappers are unwrapped with balanced parentheses, so a selector like
  `:global(.a:not(.b))` becomes `.a:not(.b)`, valid in plain CSS.
- **REQ-003** — A component that mentions `<style>` inside a markup comment is located by its real
  `<style>` element, never the comment, so no markup is swallowed.
- **REQ-004** — Token identity resolves to 0 CHANGED / 0 VANISHED / 0 ADDED across the three themes
  over the corpus of `app.css` plus every component `.css`.
- **REQ-005** — The guardrail fence count stays 277; fences that lived in a `<style>` now live in the
  `.css` and are still counted.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. Every component with styles has a co-located `.css` file it imports; no `.svelte` keeps a `<style>`.
2. Token identity holds at zero diffs across three themes, whole from the final state.
3. The fence count is 277; build, typecheck, `test:web`, catalog smoke and CDP stay green.
4. The CSS-corpus reader and the four `<style>`-reading tests read the `.css` files and pass.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **Globalizing a scoped class collides with another component's same-named class.** The migration uses
  unique semantic names, so this is unlikely, and token identity is the oracle: any collision changes a
  resolved value and fails the gate. It held at zero diffs.
- **A markup comment mentioning `<style>` mis-locates the block.** One file (`rich-block-frame`) has
  this; the transformer blanks HTML comments before locating the real block. Verified by typecheck.
- **A test that read a component `<style>` breaks.** The CSS-corpus reader and four tests are repointed
  to the `.css` files; `test:web` is the check.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

None. The operator chose separate `.css` files over scoped `<style>`, accepting global scope (safe here
because names are unique), and the CSS-Modules alternative was rejected on the test-breakage cost.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `../spec.md` — the phase parent.
- `../001-css-ownership/` — Phase A, which first moved single-owner rules out of `app.css`.
- `../../007-verify-and-cutover/` — the token-identity baseline this phase diffs against.
<!-- /ANCHOR:cross-refs -->
