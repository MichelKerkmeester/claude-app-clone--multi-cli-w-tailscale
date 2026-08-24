---
title: "Phase D checklist — styles-into-svelte barrier"
description: "Barrier sign-off for folding component CSS back into scoped <style>: value preservation, correct :global restore, tooling repoint, and the whole gate."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/020-source-structure/004-styles-into-svelte"
    last_updated_at: "2026-08-24T18:30:39Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "All barrier items proven; every gate green."
    next_safe_action: "None — the source-structure group is complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase D checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. A relocation is proven
by token identity, not inspection — a rule that only moves keeps its value.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [x] **CHK-PRE-01** [P0] The token-identity baseline is captured before the fold-back. [evidence: `token-identity.mjs` baseline 0-diff captured pre-fold-back]
- [x] **CHK-PRE-02** [P1] The `.svelte` files are confirmed untouched since the extraction, so a git restore is value-identical. [evidence: `git log <extraction>..HEAD` on the `.svelte` is empty]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [x] **CHK-CQ-01** [P0] Each component's `<style>` block is restored value-identical; no component `.css` remains. [evidence: `66` `.svelte` restored; `0` component `.css`; `67` `.svelte` with `<style>`]
- [x] **CHK-CQ-02** [P0] Prop-classes are `:global()` again, restored with the pre-extraction blocks. [evidence: restored from the pre-extraction commit, which carried the original `:global()` placement; `token-identity.mjs` 0-diff]
- [x] **CHK-CQ-03** [P1] The component-only flip left the `app.css` reads as `.css`. [evidence: `app.svelte`/`style.svelte` over-flips reverted; `0` remaining]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] **CHK-TEST-01** [P0] Token identity 0 CHANGED / 0 VANISHED / 0 ADDED across light, dark and system. [evidence: `token-identity.mjs diff` 0 diffs across three themes]
- [x] **CHK-TEST-02** [P0] `npm run test:web` exit 0, verified by content. [evidence: `test:web` 68 + 17 files, 545 + 189 passed, RC 0]
- [x] **CHK-TEST-03** [P1] Catalog smoke renders every story with zero throws. [evidence: `catalog-smoke-cdp.mjs` 534 frames 0 throws]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [x] **CHK-FIX-01** [P0] Every component with styles carries a scoped `<style>` and imports no `.css`. [evidence: `0` `.svelte` importing a component `.css`; `67` with `<style>`]
- [x] **CHK-FIX-02** [P1] The fence count is 277 and `app.css` is unchanged. [evidence: `scan-comments.mjs` fences 277; `app.css` untouched]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [x] **CHK-SEC-01** [P1] No rendered value, security boundary, route or a11y contract changed — a pure relocation. [evidence: `token-identity.mjs` 0-diff; `test:web` and catalog smoke green]
- [x] **CHK-SEC-02** [P1] Nothing under `specs/context/**` touched. [evidence: no change under `specs/context/`]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [x] **CHK-DOC-01** [P1] `validate.sh --strict` exit 0 through its realpath. [evidence: `validate.sh --strict` exit 0 through its realpath]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [x] **CHK-ORG-01** [P1] Each component is one `.svelte` — markup, scoped `<style>`, and logic together. [evidence: `card-code.svelte` and the other 65 carry their `<style>` again; `0` component `.css`]
- [x] **CHK-ORG-02** [P2] The CSS-corpus reader assembles `app.css` plus every `<style>` again. [evidence: `css-corpus.ts` restored to read `<style>` blocks]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

The phase folds every component's CSS back into its scoped `<style>` — one file per component again —
proven value-identical by token identity holding at zero diffs and unchanged in render by catalog smoke.
<!-- /ANCHOR:summary -->
