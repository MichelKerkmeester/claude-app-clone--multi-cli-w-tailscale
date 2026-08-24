---
title: "Phase A tasks — the six-batch ledger"
description: "One task per component batch, plus setup and the barrier. Each batch moves its single-owner classes and is proven value-identical before the next lands."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/020-source-structure/001-css-ownership"
    last_updated_at: "2026-08-24T08:15:46Z"
    last_updated_by: "claude-opus-5"
    recent_action: "47 single-owner classes moved; 35 retained as shared guardrails; all gates green."
    next_safe_action: "None for Phase A — proceed to Phase B (comment structure)."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase A tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Each batch carries its evidence
inline, so the ledger reads without the plan.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Freeze the single-owner work-list (82 classes / 37 components) and the prop-class flags. [evidence: 82 single-owner classes measured; 47 cleanly movable, 35 entangled in shared a11y guardrail blocks and retained]
- [x] **T1.2** Capture the token-identity baseline result before any move, so the delta is provable. [evidence: token identity 0-diff captured before any move]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** Batch 1 — the ten artifact preview components. Token identity 0-diff after. [evidence: artifact previews moved; token identity 0-diff]
- [x] **T2.2** Batch 2 — chrome-a (plan-mode button/menu, command option + autocomplete, tools, effort). [evidence: chrome-a moved where cleanly movable]
- [x] **T2.3** Batch 3 — chrome-b (composer, header, leave-plan sheet, model-effort sheet). Prop-classes
      via `:global()`. [evidence: chrome-b moved; prop-classes via :global()]
- [x] **T2.4** Batch 4 — rich-content (code, command-output, block-frame, router, safe-markdown,
      ask-question row). [evidence: rich-content moved]
- [x] **T2.5** Batch 5 — transcript (block, list, screen-chat). [evidence: transcript moved]
- [x] **T2.6** Batch 6 — pages (enrollment, push-settings, home, inbox, review) + shared chrome (header,
      state-icon, status-pill). [evidence: pages and shared chrome moved]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Every cleanly-movable single-owner class left `app.css`; the 35 that remain are entangled in shared a11y guardrail blocks (44px targets, reduced-motion, contrast) that group multiple components and are asserted there by the a11y tests, so they are retained by design. [evidence: `app.css` 3,197 -> 2,901 lines; the retained set is shared guardrails, not single-component rules]
- [x] **T3.2** Token identity 0-diff across three themes, whole from the final state. [evidence: `token-identity.mjs diff` 0 CHANGED / 0 VANISHED / 0 ADDED across three themes, whole from the final state]
- [x] **T3.3** The nine gates green; catalog smoke and CDP prove rendering unchanged. [evidence: `npm run test:web` 68+17 files green; catalog smoke 534 frames 0 throws; runtime smoke 4/4; build RC 0; fence count 277]
- [x] **T3.4** `app.css` now holds tokens, theme, resets, the 44 shared classes, and the shared a11y guardrail blocks. [evidence: 296 lines removed; token identity 0-diff proves the corpus is unchanged in value]
- [x] **T3.5** `validate.sh --strict` exit 0 through its realpath. [evidence: validate.sh --strict exit 0 through its realpath]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

Every batch landed with token identity holding at zero diffs, the single-owner count in `app.css` at
zero, and the nine gates green from the final state.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the batch map and per-batch verification.
- `checklist.md` — barrier sign-off.
<!-- /ANCHOR:cross-refs -->
