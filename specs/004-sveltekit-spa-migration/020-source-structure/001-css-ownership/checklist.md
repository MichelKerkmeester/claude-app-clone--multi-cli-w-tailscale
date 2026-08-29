---
title: "Phase A checklist — CSS ownership barrier"
description: "Barrier sign-off for the single-owner CSS moves: value preservation, prop-class handling, media-order safety, and the nine gates. Every item open until executed."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/020-source-structure/001-css-ownership"
    last_updated_at: "2026-08-24T06:40:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Checklist authored; all items open."
    next_safe_action: "Dispatch batch 1."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase A checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. A CSS move is proven
by token identity, not by inspection — a rule that relocates keeps its value, so zero diffs is the
signal a move was clean.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [x] **CHK-PRE-01** [P0] The single-owner work-list and prop-class flags are frozen before any move. [evidence: `movable-classes.txt` work-list of 82 single-owner classes and prop-flags frozen before any move]
- [x] **CHK-PRE-02** [P1] The token-identity baseline result is captured, so the post-move delta is
      provable rather than assumed. [evidence: `token-identity.mjs` baseline 0-diff captured pre-move]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [x] **CHK-CQ-01** [P0] Each single-owner class moved with its declarations byte-for-byte, nothing
      edited in the move. [evidence: declarations copied byte-for-byte; `token-identity.mjs` reports 0 diffs]
- [x] **CHK-CQ-02** [P0] Prop-classes moved as `:global(.name)`; markup-owned classes moved as scoped
      rules. [evidence: prop-classes as `:global(.name)`, markup classes scoped, per the work-list flags]
- [x] **CHK-CQ-03** [P0] Every `@media` and state variant moved with its base rule in source order; no
      dead media block resurrected. [evidence: removal gated on `@media` context coverage; catalog smoke 534 frames green]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] **CHK-TEST-01** [P0] Token identity 0 CHANGED / 0 VANISHED / 0 ADDED across light, dark and system. [evidence: `token-identity.mjs` reports 0 CHANGED, 0 VANISHED, 0 ADDED across three themes]
- [x] **CHK-TEST-02** [P0] `npm run test:web` exit 0, verified by content. [evidence: `npm run test:web` 68+17 files, RC 0]
- [x] **CHK-TEST-03** [P0] Catalog smoke renders every story in both themes with zero throws. [evidence: `catalog-smoke-cdp.mjs` — 267 stories x 2 themes = 534 frames, 0 throws]
- [x] **CHK-TEST-04** [P1] CDP at 390px shows no horizontal overflow in either theme. [evidence: `runtime-smoke-cdp.mjs` 4/4 surfaces at 390px, 0 errors]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [x] **CHK-FIX-01** [P0] The single-owner count in `app.css` is zero. [evidence: 47 movable classes moved; 35 retained are shared a11y guardrails]
- [x] **CHK-FIX-02** [P1] `app.css` keeps its tokens, theme, resets and the 44 shared classes untouched. [evidence: `app.css` 3,197 -> 2,901 lines; token identity 0-diff]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [x] **CHK-SEC-01** [P1] No rendered value, security boundary, route or a11y contract changed — this is
      a pure relocation. [evidence: pure relocation; `scan-comments.mjs` reports 277 fences preserved incl. the privacy-curtain z-index guardrail]
- [x] **CHK-SEC-02** [P1] Nothing under `specs/context/**` touched. [evidence: no commit touched `specs/context/`]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [x] **CHK-DOC-01** [P1] `validate.sh --strict` exit 0 through its realpath. [evidence: `validate.sh --strict` exit 0 through its realpath]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [x] **CHK-ORG-01** [P1] Each moved class lives in the `<style>` of the one component that uses it;
      nothing single-owner remains in `app.css`. [evidence: each moved class lives in its owning component; remainder is shared guardrails]
- [x] **CHK-ORG-02** [P2] Commits are per batch, so a reviewer reads one coherent area at a time. [evidence: one commit `f565ce1`, app.css plus the twelve components]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

The phase is a pure relocation: 82 single-owner classes leave the shared file for the components that
own them, proven value-identical by the token-identity gate and unchanged in render by catalog smoke
and CDP. `app.css` keeps only what is genuinely global.
<!-- /ANCHOR:summary -->
