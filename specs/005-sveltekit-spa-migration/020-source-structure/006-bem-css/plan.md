---
title: "Phase F plan — BEM CSS rename via a shared map, proven behaviour-preserving"
description: "How the 402 app-mobile classes are renamed to block--element BEM and how the pure-relabel claim is proven: a deterministic injective name-map, a mechanical token-boundary apply, per-site dynamic-class fixes, then zero-orphan, over-rename scan, token-identity, a before/after screenshot diff and test:web — the screenshot diff being the only gate that catches a broken dynamic-class binding."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/020-source-structure/006-bem-css"
    last_updated_at: "2026-08-25T07:46:27.261Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Classes renamed; 4 screenshot regressions fixed; behaviour preserved."
    next_safe_action: "None — the source-structure group is complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase F plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Rename the app-mobile CSS classes to a dash-delimited BEM form using one deterministic, injective name-map
applied across every file by a mechanical token-boundary pass, with the dynamic class-construction sites
fixed per-site. The relabel is proven complete and behaviour-preserving with a zero-orphan check, an
over-rename scan, token-identity, a before/after screenshot diff and test:web.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

The name-map is injective (0 collisions). After the rename, no old class token remains in a class context
(zero-orphan) and no over-renamed `--` token exists outside the map's values (over-rename scan).
token-identity resolves identically (65 tokens × 3 themes, 0 diffs), the before/after screenshot diff
shows no rename-induced change (514/534 frame-pairs pixel-identical; the rest proven noise by an
after-vs-after control and a computed-style tree-diff), `test:web` is green, and the fence count stays
277 — all from the final state.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

The block/element boundary is decided once, globally: a class with child classes is a block and keeps its
name; a leaf becomes `block--part`, where the block is the nearest ancestor that is a standalone class or
groups two or more classes. A few words are unified for literalness (glyph→icon, kicker→eyebrow,
grabber→handle, chip→pill). The `is-*` STATE family is kept single-dash — `is-` is a state-modifier
prefix, not a BEM block, so forcing it into `is--part` is both non-idiomatic and inconsistent (the
heuristic kept some, renamed others). The result is a single injective old→new map.

The static occurrences are applied by a mechanical token-boundary pass (longest-first). The DYNAMIC
sites are the hazard and are fixed per-site, because a class is built three ways — `\`block-${x}\``
template, `'block-' + x` concat, and ternary — and the interpolated value must resolve to a class the
map actually renamed. Two traps only the screenshot diff exposed: interpolated STATE kinds
(`is-${kind}`) whose map treatment was mixed, and underscore/compound kinds (`file_diff`,
`needs_input`) that never entered the map so their selectors stayed single-dash. Ids and keys
(`approval-${id}`) and custom properties (`--diff-add`) that share a class's string are left untouched.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · map
Extract every class, build the injective block--element map with the word fixes and the `is-*`
state-family kept single-dash.

### Phase 2 · apply
Apply the map with a mechanical token-boundary pass over every file; fix each dynamic class-construction
site per-site (template, concat, ternary), reverting any id/key/custom-property that shares a class's
string. Update the class-selector consumers in `scripts/`.

### Phase 3 · verification
Run zero-orphan (class-context), the over-rename scan, token-identity, the before/after screenshot diff
(with an after-vs-after control and a computed-style tree-diff to separate real change from render
noise), `test:web`, and the fence count. Fix each screenshot-caught regression and re-run.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

No new tests — a rename keeps behaviour. Zero-orphan proves the relabel is complete; the catalog and the
screenshot diff prove the render is unchanged; `test:web` proves behaviour; the fence count proves no
guardrail moved. All run from the final state before the phase closes.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The extracted class set (app.css + every scoped `<style>`) and the injective name-map.
- The token-identity CSS resolver and a before/after Storybook screenshot-diff harness (detached-HEAD
  pre-BEM build vs the working tree), with an after-vs-after control and a computed-style tree-diff.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

The rename touches `app-mobile/` (source + tests) and the class-selector consumers in `scripts/`.
`git checkout -- app-mobile scripts` restores the prior class names; there is no migration or data step.
<!-- /ANCHOR:rollback -->
