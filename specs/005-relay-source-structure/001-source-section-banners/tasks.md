---
title: "Phase A tasks — the banner ledger"
description: "Setup, the banner pass, and the verification barrier for the 36 module files. Each task carries its evidence inline."
trigger_phrases:
  - "source section banners task ledger"
  - "source section banners packet"
  - "task ledger"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-relay-source-structure/001-source-section-banners"
    last_updated_at: "2026-08-24T19:42:47.201Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "36 module files bannered; non-comment source byte-identical; suite green."
    next_safe_action: "Proceed to 002-bare-file-headers."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase A tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Each task carries its evidence inline,
so the ledger reads without the plan.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Enumerate the 36 `app-relay/src` files that carry a `// MODULE:` header. [evidence: 36 files matched `^// MODULE:` under `src`, excluding fixtures]
- [x] **T1.2** Capture the code-line multiset baseline (sorted non-comment, non-blank lines) per file. [evidence: per-file sha256 of sorted code lines stored before any edit; 19,571 code lines across the pass]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** Dispatch the cli-codex (gpt-5.6-luna, xhigh) banner pass across the 36 files, comment-only. [evidence: executor edited 36/36 files, 2–5 banners each]
- [x] **T2.2** Confirm each banner matches the box-drawing form of the file's `// MODULE:` header. [evidence: 67-`─` rule copied from each file's existing header]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Recompute the code-line multiset and diff against the baseline. [evidence: 0 of 36 files differ — non-comment source byte-identical]
- [x] **T3.2** Confirm the `git diff` adds only comment or blank lines and deletes nothing. [evidence: 0 deletions, 462 comment lines added, 0 non-comment non-blank additions over the 36 files]
- [x] **T3.3** Confirm banner coverage: every file gained numbered section banners. [evidence: 36/36 files carry `// N.` banners]
- [x] **T3.4** Typecheck and run the app-relay suite from the final state. [evidence: `tsc --noEmit` rc 0; `vitest run tests` 46 files / 307 tests passed]
- [x] **T3.5** `validate.sh --strict` exit 0 through its realpath. [evidence: packet validated exit 0 recursively]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

The 36 module files carry numbered section banners, the non-comment source is byte-identical per file,
and typecheck and the full suite are green from the final state.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the banner approach and per-check verification.
- `checklist.md` — barrier sign-off.
<!-- /ANCHOR:cross-refs -->
