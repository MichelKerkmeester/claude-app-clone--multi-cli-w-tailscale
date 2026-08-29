---
title: "Phase F tasks — BEM CSS rename ledger"
description: "Build the map, apply it per batch, and prove the rename behaviour-preserving. Each task carries its evidence inline."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/020-source-structure/006-bem-css"
    last_updated_at: "2026-08-25T07:46:27.261Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "402 classes renamed; screenshot diff caught 4 regressions, all fixed; test:web green."
    next_safe_action: "None — the source-structure group is complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase F tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Each task carries its evidence inline.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Extract every class and build the injective block--element name-map with the word fixes and the `is-*` state family kept single-dash. [evidence: `bem-map.cjs` — 499 classes, `402` renamed, 97 kept, 0 collisions]
- [x] **T1.2** Decide the `is-*` state family stays single-dash for consistency (state prefix, not a BEM block). [evidence: 25 `is-*` classes kept single-dash; map injective after revert]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** Apply the map mechanically at token boundaries across every app-mobile file and fix the dynamic class-construction sites per-site (template, concat, ternary). [evidence: mechanical apply over 351 files → `zero-orphan.cjs` 0; dynamic sites in `block.svelte`, `card-code.svelte`, `code-preview.svelte`, `button-plan-mode.svelte`, `screen-*.svelte` realigned]
- [x] **T2.2** Update the class-selector consumers outside app-mobile and leave shared strings alone. [evidence: 6 `scripts/*-cdp.mjs` + `release-verify.mjs` selectors updated; backend `reason: 'approval-pending'`, DOM ids and `--diff-add` left untouched]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Zero-orphan (class-context) and over-rename scan over all `402` renamed classes. [evidence: `zero-orphan.cjs` — `0` class-context orphans; over-rename scan `0` tokens outside the map's values]
- [x] **T3.2** Confirm CSS resolution is unchanged. [evidence: `token-identity.mjs` diff vs pre-BEM baseline — `0` diffs across 65 tokens × 3 themes (light/dark/system)]
- [x] **T3.3** Before/after screenshot diff, and fix every real regression it surfaces. [evidence: `sb-screenshot-diff.mjs` 534 frame-pairs, `514` pixel-identical; caught 4 dynamic-class regressions (plan-mode tint, code tokens, chat file-diff chrome, attention icon), all fixed; 4 residuals proven noise by after-vs-after control + `0`-node `style-tree-diff.mjs`]
- [x] **T3.4** `test:web`, the fence count, and `validate.sh --strict` from the final state. [evidence: `test:web` `734/734` pass (3 skip); `scan-comments.mjs` fences `277`; `validate.sh <packet> --strict` exit `0` via realpath]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

All 402 target classes read as `block--part`, no old class token remains in a class context, token-identity
and the before/after screenshot diff show no rename-induced change, and `test:web` and the fence count are
green from the final state.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the map, the per-batch application and the proof.
- `checklist.md` — barrier sign-off.
<!-- /ANCHOR:cross-refs -->
