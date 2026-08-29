---
title: "Phase C implementation summary — CSS files"
description: "65 components' scoped <style> blocks extracted to co-located .css files they import, proven value-identical by token identity 0-diff across three themes, fences held at 277, and green across the whole gate including the repointed CSS-corpus reader and four tests."
contextType: "implementation"
importance_tier: "normal"
trigger_phrases:
  - "css files implementation summary"
  - "css files packet"
  - "implementation summary"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/020-source-structure/003-css-files"
    last_updated_at: "2026-08-24T18:40:12.122Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "65 components extracted; tooling repointed; whole gate green."
    next_safe_action: "Proceed to the test-conventions phase."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase C implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `020-source-structure` |
| Level | 2 |
| Status | Complete |
| Requirements shipped | REQ-001 … REQ-005 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Every component's `<style>` block moved into a co-located `.css` file the component imports — 67 `.css`
files total, `0` `<style>` blocks left in `app-mobile/src`. The CSS is now a browsable file per
component, which is what the operator asked for three times. `app.css` (the global foundation) is
unchanged. Class names, selectors and values are identical; the only structural change is the container.

The extraction was a pure relocation proven by the token-identity gate holding at 0 CHANGED / 0
VANISHED / 0 ADDED across light, dark and system — so the globalized CSS resolves to exactly the values
it did when Svelte-scoped.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

A single deterministic transformer did the mechanical work — more reliable than agents for a pure file
relocation. It blanks HTML comments before locating the `<style>` element (so a comment mentioning
`<style>` never mis-anchors the match), unwraps `:global(...)` with balanced parentheses, writes the
co-located `.css`, removes the `<style>`, and inserts the import after the last import in the instance
script. A pilot on `card-code` proved the chain before the fan-out.

The CSS-corpus test reader now assembles `app.css` plus every component `.css`, and the four tests that
read a component `<style>` directly were repointed to the `.css` files; their `normalizeSvelteCss`
helper already returns raw source when there is no `<style>`, so the repoint was a path change.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Global co-located `.css`, not CSS Modules.** Modules would scope but rewrite every component's markup
to `class={styles.x}` and break the 700+ tests, token identity and CDP, which assert real class names.
Plain global `.css` keeps names, markup and every gate intact; the names are unique semantic names that
were global before the migration, so global scope is safe and token identity proves no collision.

**The transformer is comment-safe and paren-balanced.** One file (`rich-block-frame`) mentions `<style>`
in a markup comment; the first pass swallowed markup and orphaned a `-->`. Blanking HTML comments before
matching fixed it. Balanced-paren `:global` unwrap is needed because some `:global()` wrap a `:not(...)`.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Token identity | 0 changed / 0 vanished / 0 added across light, dark, system |
| `@ds guardrail` fences | 277, preserved (`scan-comments` walks `.css`) |
| Build | RC 0 |
| Typecheck | 1124 files, 0 errors |
| `npm run test:web` | 68 files / 545 passed + 3 skipped and 17 files / 189 passed, RC 0 |
| Catalog smoke | 267 stories × 2 themes = 534 frames, 0 throws |
| Runtime CDP 390px | 4 of 4 surfaces, 0 errors |
| `validate.sh --strict` | exit 0 through its realpath |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

**CSS is now global, not Svelte-scoped.** This is the accepted trade of separate files: the isolation is
by-file, not compiler-enforced. The migration's unique semantic names make collisions unlikely and token
identity is the standing guard. **The `@ds surface` prose that said "decomposed into this scoped block"
was corrected to "co-located CSS file"** across 57 files to match the new current state.
<!-- /ANCHOR:limitations -->
