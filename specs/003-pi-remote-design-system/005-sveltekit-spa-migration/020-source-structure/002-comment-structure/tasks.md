---
title: "Phase B tasks — the seven-batch ledger"
description: "One task per directory batch, plus setup and the barrier. Each batch harmonizes its section banners and is proven fence-stable and @ds-unchanged before the next lands."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/020-source-structure/002-comment-structure"
    last_updated_at: "2026-08-24T11:01:11Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "All seven batches landed; fences 277; whole gate green."
    next_safe_action: "None for Phase B — proceed to Phase C (skill update)."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase B tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Each batch carries its evidence
inline, so the ledger reads without the plan.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Freeze the canonical vocabulary, order, synonym map, and coverage split (significant vs trivial). [evidence: contract frozen — 9 canonical labels + 6 preserved domain names, `LOCAL STATE` before `DERIVED STATE`, 14 significant bare files to banner, 31 trivial primitives skipped]
- [x] **T1.2** Capture the baseline fence count (277) and `@ds` line count before any batch, so the delta is provable. [evidence: baseline `scan-comments.mjs` fences 277 and 1030 `@ds` lines captured before any batch]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** Batch 1 — `pages/chat/artifacts/*`. Fences 277 and `@ds` unchanged after. [evidence: artifacts harmonized incl. domain files `markdown-preview` / `image-status` preserved; code-line multiset identical]
- [x] **T2.2** Batch 2 — `pages/chat/chrome/*`. Fences 277 and `@ds` unchanged after. [evidence: chrome harmonized; the `command-palette` ranker `@ds guardrail` moved with its `const ranked` derivation, fences held 277]
- [x] **T2.3** Batch 3 — `pages/chat/transcript/*`. Fences 277 and `@ds` unchanged after. [evidence: transcript harmonized; code-line multiset identical]
- [x] **T2.4** Batch 4 — `pages/chat/rich-content/*`, `features/ask-question/*`, `attachments/*`. [evidence: harmonized; `card-code` and `attachment-draft-provider` kept `DERIVED` before `LOCAL` for TDZ safety]
- [x] **T2.5** Batch 5 — `pages/home/*`, `pages/review/*`, `pages/enrollment/*`, `routes/*`. [evidence: pages and routes harmonized; `screen-enrollment` gained banners]
- [x] **T2.6** Batch 6 — `shared/chrome/*`. [evidence: `header` and `theme-control` gained banners; `status-pill` / `session-state-icon` left bare as trivial]
- [x] **T2.7** Batch 7 — `shared/primitives/*`, significant files only; trivial primitives stay bare. [evidence: `button` gained banners, `menu-content` normalized; menu/sheet/choice item primitives left bare]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** A grep for the old synonym labels (`PUBLIC PROPS`, `RENDER STATE`, `PROPS AND STATE`) returns zero. [evidence: synonym grep returns zero across `app-mobile/src`]
- [x] **T3.2** The guardrail fence count is 277 and the total `@ds` line count matches baseline, whole from the final state. [evidence: `scan-comments.mjs` fences 277; `@ds` line count 1030, unchanged]
- [x] **T3.3** Build, typecheck, `npm test`, `test:web`, token identity and catalog smoke are green from the final state. [evidence: build RC 0; typecheck 1124 files 0 errors; `test:web` 545 + 189 passed RC 0; token identity 0-diff × 3 themes; catalog smoke 534 frames 0 throws]
- [x] **T3.4** The significant bare files gained banners; the trivial-primitive skip list is recorded. [evidence: 14 files gained banners (`51 -> 65` bannered); 31 trivial primitives recorded in the implementation summary]
- [x] **T3.5** `validate.sh --strict` exit 0 through its realpath. [evidence: `validate.sh --strict` exit 0 through its realpath]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

Every batch landed with fences at 277 and the `@ds` set unchanged, the synonym grep at zero, and the
whole gate green from the final state.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the batch map and per-batch verification.
- `checklist.md` — barrier sign-off.
<!-- /ANCHOR:cross-refs -->
