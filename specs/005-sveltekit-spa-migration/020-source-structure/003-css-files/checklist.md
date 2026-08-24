---
title: "Phase C checklist — CSS files barrier"
description: "Barrier sign-off for the co-located CSS extraction: value preservation, fence stability, comment-safe block location, tooling repoint, and the whole gate."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "005-sveltekit-spa-migration/020-source-structure/003-css-files"
    last_updated_at: "2026-08-24T12:29:51Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "All barrier items proven; every gate green."
    next_safe_action: "Proceed to the test-conventions phase."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase C checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. A relocation is proven
by token identity, not inspection — a rule that only moves keeps its value.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [x] **CHK-PRE-01** [P0] The token-identity baseline is captured before any extraction. [evidence: `token-identity.mjs` baseline 0-diff captured pre-extraction]
- [x] **CHK-PRE-02** [P1] The pilot proves the chain before fan-out. [evidence: `card-code` pilot — `token-identity.mjs` 0-diff, build RC 0, `CodeCard.svelte.test.ts` passed]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [x] **CHK-CQ-01** [P0] Each component's `<style>` body moved verbatim to a co-located `.css`; no `<style>` remains. [evidence: `0` `<style>` blocks in `app-mobile/src`; 67 `.css` files]
- [x] **CHK-CQ-02** [P0] `:global(...)` is unwrapped with balanced parentheses; no `:global(` survives in any `.css`. [evidence: balanced-paren unwrap; transformer reports no unbalanced `:global`]
- [x] **CHK-CQ-03** [P1] A markup comment mentioning `<style>` never mis-locates the block. [evidence: `rich-block-frame.svelte` handled; HTML comments blanked before matching; typecheck `0` errors]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] **CHK-TEST-01** [P0] Token identity 0 CHANGED / 0 VANISHED / 0 ADDED across light, dark and system. [evidence: `token-identity.mjs diff` 0 diffs across three themes]
- [x] **CHK-TEST-02** [P0] `npm run test:web` exit 0, verified by content. [evidence: `test:web` 68 + 17 files, 545 + 189 passed, RC 0]
- [x] **CHK-TEST-03** [P1] Catalog smoke and CDP prove rendering unchanged. [evidence: `catalog-smoke-cdp.mjs` 534 frames 0 throws; `runtime-smoke-cdp.mjs` 4/4 surfaces]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [x] **CHK-FIX-01** [P0] Every component with styles has a co-located `.css` it imports. [evidence: 65 extracted plus the `card-code` pilot; imports inserted in the instance script]
- [x] **CHK-FIX-02** [P1] The fence count is 277; fences moved from `<style>` to `.css` are still counted. [evidence: `scan-comments.mjs` fences 277; `walkAll` covers `.css`]
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

- [x] **CHK-ORG-01** [P1] Each `.css` sits beside the component that imports it. [evidence: `card-code.css` beside `card-code.svelte`; one `.css` per styled component]
- [x] **CHK-ORG-02** [P2] The CSS-corpus reader assembles `app.css` plus every component `.css`. [evidence: `css-corpus.ts` walks `app-mobile/src` for `.css`, excludes `app.css`, adds it separately]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

Every component's styles now live in a co-located `.css` file it imports — browsable per component, as
the operator asked — proven value-identical by token identity holding at zero diffs and unchanged in
render by catalog smoke and CDP.
<!-- /ANCHOR:summary -->
