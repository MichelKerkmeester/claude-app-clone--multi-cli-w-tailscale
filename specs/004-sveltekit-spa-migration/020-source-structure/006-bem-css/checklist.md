---
title: "Phase F checklist — BEM CSS rename barrier"
description: "Barrier sign-off for renaming the app-mobile CSS classes to block--element: zero class-context orphans, over-rename 0, token-identity 0-diff, before/after screenshot diff no rename-induced change, fences 277, test:web green."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/020-source-structure/006-bem-css"
    last_updated_at: "2026-08-25T07:46:27.261Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Barrier proven; 402 renamed, 4 screenshot regressions fixed, gates green."
    next_safe_action: "None — the source-structure group is complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase F checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. A pure class rename is
proven behaviour-preserving by a value oracle (token-identity), a completeness scan (zero-orphan and
over-rename), a before/after pixel diff, and `test:web` — not by a line diff. The screenshot diff is the
authoritative gate: it is the only one that catches a dynamic-class binding that fell out of lockstep.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [x] **CHK-PRE-01** [P0] The name-map is injective before any file is touched. [evidence: `bem-map.cjs` — `499` classes, `402` renamed, 97 kept, `0` value collisions]
- [x] **CHK-PRE-02** [P0] The token-identity baseline is captured from the pre-BEM `app.css`. [evidence: `token-identity.mjs snapshot` — `65` tokens × 3 themes, unresolved `0`]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [x] **CHK-CQ-01** [P0] Every renamed class uses `block--part`; the `is-*` state family stays single-dash. [evidence: `402` renamed to `block--element`; `25` `is-*` classes kept single-dash as a state prefix]
- [x] **CHK-CQ-02** [P0] No old class token remains in a class context. [evidence: `zero-orphan.cjs` class-context scan `0`; the raw hits are all import paths / component filenames]
- [x] **CHK-CQ-03** [P0] No over-renamed `--` token exists outside the map's values. [evidence: over-rename scan of `bem-namemap.json` values — `0` tokens across app-mobile]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] **CHK-TEST-01** [P0] Token identity holds at zero diffs across three themes. [evidence: `token-identity.mjs diff` vs baseline — light/dark/system all `0` CHANGED / `0` VANISHED / `0` ADDED]
- [x] **CHK-TEST-02** [P0] The before/after screenshot diff shows no rename-induced change. [evidence: `sb-screenshot-diff.mjs` — `514/534` frame-pairs pixel-identical; the 4 residuals proven noise by an after-vs-after control and a `0`-node `style-tree-diff.mjs`]
- [x] **CHK-TEST-03** [P0] `test:web` passes from the final state. [evidence: `test:web` 68 files / 545 passed + 3 skipped, and 17 files / 189 passed — `734` pass]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [x] **CHK-FIX-01** [P0] Every dynamic class-construction site resolves to a rule that exists. [evidence: the screenshot diff caught 4 broken bindings — plan-mode `is--plan` tint, code-preview `is--`+kind tokens, chat `block--file_diff` chrome, `attention--needs_input` icon — each fixed and re-diffed clean]
- [x] **CHK-FIX-02** [P0] Ids, keys and custom properties sharing a class's string are left as data. [evidence: `slash-option-${}` id and `--diff-add` property reverted; caught by `test:web` and token-identity respectively]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [x] **CHK-SEC-01** [P0] No rendered value, a11y contract, route or behaviour changed — a pure relabel. [evidence: token identity `0/0/0`; `style-tree-diff` `0` node changes on the composed chat view; `test:web` green]
- [x] **CHK-SEC-02** [P0] Nothing under `specs/context/**` touched; the backend wire enum is left alone. [evidence: `git status` — changes only under `app-mobile/` and `scripts/`; `reason: 'approval-pending'` unchanged]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [x] **CHK-DOC-01** [P1] `validate.sh --strict` exit 0 through its realpath. [evidence: `validate.sh <packet> --strict` exit `0`, run through its realpath]
- [x] **CHK-DOC-02** [P1] The rename introduced no spec path or artifact id in a comment. [evidence: `scan-comments.mjs` guardrailFences `277`, comment-hygiene clean]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [x] **CHK-ORG-01** [P1] The class-selector consumers outside app-mobile are updated in lockstep. [evidence: `6` `scripts/*-cdp.mjs` + `release-verify.mjs` selectors renamed; all `node --check` OK; `0` stale selectors repo-wide]
- [x] **CHK-ORG-02** [P2] The block/element boundary is consistent and the word fixes are applied. [evidence: has-children block rule in `bem-map.cjs`; `glyph→icon`, `kicker→eyebrow`, `grabber→handle`, `chip→pill`]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

The app-mobile CSS classes were renamed to a `block--element` BEM form — `402` of `499`, with the `is-*`
state family kept single-dash for consistency — proven behaviour-preserving by token identity at zero
diffs, zero class-context orphans, an over-rename scan at zero, and a before/after screenshot diff with
`514/534` frame-pairs pixel-identical (the 4 residuals proven render noise). The diff surfaced four
dynamic-class regressions that no other gate saw; each was fixed and re-verified. `test:web` is green and
the fence count is `277`.
<!-- /ANCHOR:summary -->
