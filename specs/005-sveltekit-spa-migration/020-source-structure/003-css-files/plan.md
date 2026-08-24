---
title: "Phase C plan — one deterministic transformer, token identity as the oracle"
description: "Extract 65 component <style> blocks to co-located .css files with one deterministic transformer (balanced :global unwrap, comment-safe block location), then repoint the CSS-corpus reader and four tests, proven value-identical by token identity."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/020-source-structure/003-css-files"
    last_updated_at: "2026-08-24T18:40:12.122Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Extraction and tooling landed; every gate green."
    next_safe_action: "Proceed to the test-conventions phase."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase C plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Move every component's `<style>` body into a co-located `.css` file it imports. A single deterministic
transformer does the mechanical work — more reliable than agents for a pure file relocation — and token
identity proves the globalized CSS resolves to the same values it did scoped.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

Token identity 0-diff across three themes over `app.css` plus every component `.css`; fences 277; build;
typecheck; `test:web`; catalog smoke; CDP 390px. All run whole from the final state before the phase
closes.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

Svelte scopes only CSS written inside a `<style>` block, so a separate `.css` file is global. The
migration's class names are unique semantic names that were global before the migration, so global
scope is safe — and token identity is the proof: it resolves the whole corpus per theme, so a name
collision that changed a value would fail the gate. It held at zero diffs.

The transformer blanks HTML comments before locating the `<style>` element, so a markup comment that
mentions `<style>` never mis-anchors the match. It unwraps `:global(...)` with balanced parentheses so
`:global(.a:not(.b))` becomes `.a:not(.b)`. The import is inserted after the last import in the instance
script.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · pilot
Extract one component (`card-code`) end-to-end and prove token identity 0-diff, build, and its test.

### Phase 2 · fan-out
Run the transformer over the remaining 64 components; re-verify token identity, fences, build, typecheck.

### Phase 3 · tooling
Repoint the CSS-corpus reader and the four tests that read a component `<style>` to the `.css` files.

### Phase 4 · whole gate
Run `test:web`, catalog smoke and CDP from the final state; fix the stale "scoped block" comment prose.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

No new tests — this is a relocation, and token identity plus the existing suite is the oracle. The
CSS-corpus reader now assembles `app.css` plus every component `.css`; the four `<style>`-reading tests
read the `.css` directly (their `normalizeSvelteCss` helper already falls back to raw source).
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The `007-verify-and-cutover` token-identity baseline.
- The deterministic transformer with balanced `:global` unwrap and comment-safe block location.
- `scan-comments.mjs`, whose fence walk already covers `.css` (no change needed).
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

The change is one commit. Reverting it restores every `<style>` block and deletes the `.css` files and
the tooling repoint together; nothing else depends on it. No data, no irreversible step — a pure source
relocation.
<!-- /ANCHOR:rollback -->
