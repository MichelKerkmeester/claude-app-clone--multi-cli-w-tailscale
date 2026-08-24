---
title: "Phase A checklist — CSS ownership barrier"
description: "Barrier sign-off for the single-owner CSS moves: value preservation, prop-class handling, media-order safety, and the nine gates. Every item open until executed."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/020-source-structure/001-css-ownership"
    last_updated_at: "2026-08-24T06:40:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Checklist authored; all items open."
    next_safe_action: "Dispatch batch 1."
    blockers: []
    completion_pct: 0
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

- [ ] **CHK-PRE-01** [P0] The single-owner work-list and prop-class flags are frozen before any move.
- [ ] **CHK-PRE-02** [P1] The token-identity baseline result is captured, so the post-move delta is
      provable rather than assumed.
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [ ] **CHK-CQ-01** [P0] Each single-owner class moved with its declarations byte-for-byte, nothing
      edited in the move.
- [ ] **CHK-CQ-02** [P0] Prop-classes moved as `:global(.name)`; markup-owned classes moved as scoped
      rules.
- [ ] **CHK-CQ-03** [P0] Every `@media` and state variant moved with its base rule in source order; no
      dead media block resurrected.
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [ ] **CHK-TEST-01** [P0] Token identity 0 CHANGED / 0 VANISHED / 0 ADDED across light, dark and system.
- [ ] **CHK-TEST-02** [P0] `npm run test:web` exit 0, verified by content.
- [ ] **CHK-TEST-03** [P0] Catalog smoke renders every story in both themes with zero throws.
- [ ] **CHK-TEST-04** [P1] CDP at 390px shows no horizontal overflow in either theme.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [ ] **CHK-FIX-01** [P0] The single-owner count in `app.css` is zero.
- [ ] **CHK-FIX-02** [P1] `app.css` keeps its tokens, theme, resets and the 44 shared classes untouched.
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [ ] **CHK-SEC-01** [P1] No rendered value, security boundary, route or a11y contract changed — this is
      a pure relocation.
- [ ] **CHK-SEC-02** [P1] Nothing under `specs/context/**` touched.
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [ ] **CHK-DOC-01** [P1] `validate.sh --strict` exit 0 through its realpath.
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [ ] **CHK-ORG-01** [P1] Each moved class lives in the `<style>` of the one component that uses it;
      nothing single-owner remains in `app.css`.
- [ ] **CHK-ORG-02** [P2] Commits are per batch, so a reviewer reads one coherent area at a time.
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

The phase is a pure relocation: 82 single-owner classes leave the shared file for the components that
own them, proven value-identical by the token-identity gate and unchanged in render by catalog smoke
and CDP. `app.css` keeps only what is genuinely global.
<!-- /ANCHOR:summary -->
