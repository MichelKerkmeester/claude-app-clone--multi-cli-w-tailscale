---
title: "Phase A — CSS ownership: single-owner classes move to their component"
description: "Move the 82 classes that app.css defines but only one component uses into that component's scoped style block, proven value-identical by the token-identity gate. app.css keeps tokens, theme, resets and the 44 genuinely shared classes."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/020-source-structure/001-css-ownership"
    last_updated_at: "2026-08-24T08:15:46Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Phase A scoped; work-list frozen at 82 classes."
    next_safe_action: "Dispatch the first component batch and verify token identity holds."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase A — CSS ownership

> **Phase links** — Parent: [`../spec.md`](../spec.md) · Successor: `002-comment-structure`


---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `020-source-structure` |
| Level | 2 |
| Writer | executor (`app-mobile/src/**` component `<style>` blocks) + Claude (verification, git, `app.css`) |
| Barrier | token identity 0-diff + the nine gates green |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

`app.css` defines 150 classes. 82 of them are referenced by exactly one component. Those rules sit in
a shared file a designer must cross-reference to understand one component — the opposite of the
migration's one-file intent. Moving each into its owning component's scoped `<style>` completes that
intent without changing a rendered value: the token-identity gate resolves the whole corpus (`app.css`
plus every scoped block) together, so a rule that only moves resolves to the same value it did before.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:** the 82 single-owner classes in the frozen work-list, moved into their components'
`<style>` blocks. A class applied to the component's own markup is scoped normally; a class passed as a
`class` prop to a child primitive (Button, Sheet, Menu, Popover) is moved as a `:global()` rule,
because Svelte cannot hash a class it does not see literally.

**Out of scope:** the 44 shared classes (2+ renderers), the ~262 lines of tokens, theme remaps, fonts
and resets — all stay in `app.css`. No comment restructuring (that is Phase B). No rendered value
change, no new token.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — Each single-owner class moves from `app.css` into its owning component's `<style>`, its
  declarations byte-for-byte, including any `@media` and state variants that belong to it.
- **REQ-002** — A prop-class (passed to a child primitive) moves as `:global(.name)`; a markup-owned
  class moves as a normal scoped rule.
- **REQ-003** — Every `@media` block moves with the base rule it modifies, preserving source order, so
  no dead media block is resurrected and no live one is dropped.
- **REQ-004** — Token identity resolves to 0 CHANGED / 0 VANISHED / 0 ADDED across the three themes
  after every batch.
- **REQ-005** — `app.css` shrinks only by the moved rules; its tokens, theme, resets and shared classes
  are untouched.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. All 82 single-owner classes live in their components; the single-owner count in `app.css` is zero.
2. Token identity holds at zero diffs across three themes, run whole from the final state.
3. The nine gates stay green; catalog smoke and CDP prove rendering is unchanged.
4. `app.css` is roughly half its prior size and contains only tokens, theme, resets and shared classes.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **A mis-scoped prop-class silently loses its styling.** A class passed to a child primitive that is
  moved as a scoped rule instead of `:global()` stops matching, and the token-identity gate — which
  resolves values, not selector reach — cannot see it. Catalog smoke and CDP are the backstop; the
  work-list flags every prop-class up front.
- **A resurrected dead `@media` block causes a silent narrow-width regression.** Moving a media block
  out of source order can activate one that was dead. Media blocks move with their base rule, in order.
- **A class with a non-literal use (a `classList` write, a data-attribute selector) breaks when scoped.**
  These are single-owner by grep, but Svelte scoping only rewrites literal markup. The rendering gates
  catch a broken selector that value resolution cannot.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

None. The single-owner set, the prop-class flags, and the keep-in-`app.css` set are all measured and
frozen; the operator approved single-owner-only scope.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `../spec.md` — the phase parent.
- Program goal `../../goal.md` §1 — the one-file-per-component intent.
- `../../012-naming-and-structure/` — the earlier decomposition and its documented traps.
<!-- /ANCHOR:cross-refs -->
