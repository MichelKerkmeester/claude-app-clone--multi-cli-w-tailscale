---
title: "Phase F — BEM CSS: rename the web-client classes to a block--element convention"
description: "Rename the app-mobile CSS classes to a dash-delimited BEM form (block--element / block--modifier) with a few literal-name fixes, everywhere they appear — markup, dynamic class construction, class directives, scoped and global CSS, and the class-selector consumers in scripts/. State-prefix classes (is-*) stay single-dash. A pure relabel, proven behaviour-preserving by zero-orphan, over-rename scan, token-identity, a before/after screenshot diff, and test:web."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/020-source-structure/006-bem-css"
    last_updated_at: "2026-08-25T07:46:27.261Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "402 classes renamed to block--element; 4 screenshot regressions fixed; test:web green."
    next_safe_action: "None — the source-structure group is complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase F — BEM CSS

> **Phase links** — Parent: [`../spec.md`](../spec.md) · Predecessor: `005-comment-brevity`

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `020-source-structure` |
| Level | 2 |
| Writer | Claude (map, mechanical apply, dynamic-site + consumer fixes, verification, git) |
| Barrier | zero old class token remains + binding preserved + token-identity 0 diffs + screenshot diff no real change + test:web + fences 277 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

The web client's CSS classes are clean semantic kebab-case but do not signal the block, element and
modifier structure the operator wants. This phase renames them to a dash-delimited BEM form — a block
keeps its name, an element or modifier of it is `block--part` — and fixes a few names to be more literal
and consistent (glyph → icon, kicker → eyebrow, grabber → handle, chip → pill). It is a pure relabel:
every rendered value, rule and behaviour stays identical; only the class names change.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:** the app-mobile CSS classes — 402 of 499 renamed — updated at every occurrence: CSS
selectors in `app.css` and every scoped `<style>` (including `:global()`), static markup class
attributes, dynamic class construction (`block-${x}` boundaries realigned to `block--${x}` in all three
forms — template, `'prefix' + var` concat, and ternary), `class:` directives, and class-name string
literals. The 97 kept classes are blocks, singletons, and the `is-*` STATE family (25 classes) —
`is-` is a state-modifier prefix, not a BEM block, so it stays single-dash for consistency. The
class-selector consumers in `scripts/*-cdp.mjs` and `release-verify.mjs` are updated in lockstep.

**Out of scope:** any rendered value, rule, markup structure, element or behaviour change; app-relay and
the root code (no CSS); DOM ids and CSS custom-property names that share a class's string (data, not
classes); the backend `reason: 'approval-pending'` wire enum; the comment-brevity phase already shipped.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — Each renamed class uses `block--part` with a `--` delimiter between the block and its
  element or modifier; single `-` stays inside a compound block or part. No BEM underscore.
- **REQ-002** — The rename is applied at every occurrence, so no old (renamed) class token remains
  anywhere in the app-mobile source — markup, CSS, dynamic construction, directives, strings or tests.
- **REQ-003** — The markup-to-CSS binding is preserved: every element that carried a class now carries
  its renamed class, and every rule that matched a class now matches the renamed class.
- **REQ-004** — Dynamic class construction realigns the boundary before the interpolation, so the runtime
  class matches the renamed rule; a non-class interpolation (id, key) is untouched. Every interpolated
  kind — including underscore/compound kinds (`file_diff`, `needs_input`) and state kinds (`plan`,
  `diff-add`) — must resolve to a class that has a matching CSS rule.
- **REQ-005** — token-identity resolves identically (65 tokens × 3 themes, 0 diffs), the before/after
  screenshot diff shows no rename-induced visual change, `test:web` stays green, and the guardrail fence
  count stays 277.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. All 402 target classes read as `block--part`; the 97 kept classes (blocks, singletons, `is-*` state) keep their names.
2. Zero old class tokens remain in a class context; the binding is preserved under the rename map.
3. token-identity is 0 diffs and the before/after screenshot diff shows no rename-induced change; `test:web` is green.
4. The fence count is 277; the name-map is injective with 0 collisions.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **A dynamic class falls out of lockstep with its rule (materialised, then fixed).** The map's
  block-heuristic and its underscore-blind extraction left `is-plan`/`is-executing` single while the
  markup emitted `is--plan`, and left `.block-file_diff`/`.attention-needs_input` un-renamed against
  `block--file_diff`/`attention--needs_input` markup. Neither zero-orphan, token-identity nor `test:web`
  saw it — only the before/after screenshot diff did. Fixed by the `is-*` single-dash decision and by
  renaming the two underscore-kind selectors.
- **A DOM id or custom property sharing a class's string is over-renamed.** Caught by test (`slash-option`
  id) and token-identity (`--diff-add` property); both reverted — they are data, not classes.
- **Two classes merge under the map.** Guarded by the map's injectivity check — 0 collisions.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

None. The dash delimiter and the clear-win word fixes were chosen by the operator; the block/element
boundary follows the has-children rule (a class with child classes is a block).
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `../spec.md` — the phase parent.
- `../005-comment-brevity/` — the comment pass that preceded this rename.
- `../../007-verify-and-cutover/` — the token-identity baseline for the CSS corpus.
<!-- /ANCHOR:cross-refs -->
