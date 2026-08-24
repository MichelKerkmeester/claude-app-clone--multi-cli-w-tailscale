---
title: "Phase A tasks — the six-batch ledger"
description: "One task per component batch, plus setup and the barrier. Each batch moves its single-owner classes and is proven value-identical before the next lands."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/020-source-structure/001-css-ownership"
    last_updated_at: "2026-08-24T06:40:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Task ledger authored; all batches open."
    next_safe_action: "Dispatch batch 1."
    blockers: []
    completion_pct: 0
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

- [ ] **T1.1** Freeze the single-owner work-list (82 classes / 37 components) and the prop-class flags.
- [ ] **T1.2** Capture the token-identity baseline result before any move, so the delta is provable.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [ ] **T2.1** Batch 1 — the ten artifact preview components. Token identity 0-diff after.
- [ ] **T2.2** Batch 2 — chrome-a (plan-mode button/menu, command option + autocomplete, tools, effort).
- [ ] **T2.3** Batch 3 — chrome-b (composer, header, leave-plan sheet, model-effort sheet). Prop-classes
      via `:global()`.
- [ ] **T2.4** Batch 4 — rich-content (code, command-output, block-frame, router, safe-markdown,
      ask-question row).
- [ ] **T2.5** Batch 5 — transcript (block, list, screen-chat).
- [ ] **T2.6** Batch 6 — pages (enrollment, push-settings, home, inbox, review) + shared chrome (header,
      state-icon, status-pill).
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [ ] **T3.1** The single-owner count in `app.css` is zero — the scan reports no class defined there and
      used by exactly one component.
- [ ] **T3.2** Token identity 0-diff across three themes, whole from the final state.
- [ ] **T3.3** The nine gates green; catalog smoke and CDP prove rendering unchanged.
- [ ] **T3.4** `app.css` contains only tokens, theme, resets and the 44 shared classes.
- [ ] **T3.5** `validate.sh --strict` exit 0 through its realpath.
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
