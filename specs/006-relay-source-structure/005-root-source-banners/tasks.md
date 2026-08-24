---
title: "Phase E tasks — the root banner ledger"
description: "Setup, the banner pass, and the verification barrier for the 47 repo-root code files. Each task carries its evidence inline."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-relay-source-structure/005-root-source-banners"
    last_updated_at: "2026-08-24T21:41:27.992Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "47 root files headered and bannered; source byte-identical; suites green."
    next_safe_action: "Proceed to 006-root-folder-docs."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase E tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Each task carries its evidence inline.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Enumerate the 47 repo-root code files (excluding built `dist/`) and split into MODULE-present and bare. [evidence: `31/47` carry `^// MODULE:`, `16/47` bare, across packages/scripts/extensions/release/tests]
- [x] **T1.2** Capture the code-line multiset baseline (sorted non-comment lines) per file. [evidence: per-file `sha256` of sorted code lines stored before any edit; 13,880 code lines]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** Dispatch the cli-codex (gpt-5.6-luna, max) header+banner pass across the 47 files, comment-only. [evidence: executor edited `47/47` files, keeping shebangs on line 1]
- [x] **T2.2** Confirm test files use the `<Name> TESTS` header and source files the source vocabulary. [evidence: `/tests/` files use imports/fixtures/helpers/setup/tests; source files use imports/types/constants/helpers/core-logic/exports]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Recompute the code-line multiset and diff against the baseline. [evidence: `0/47` files differ — non-comment source byte-identical]
- [x] **T3.2** Confirm the `git diff` adds only comment or blank lines and deletes nothing. [evidence: 0 deletions, only comment lines added across the 47 files]
- [x] **T3.3** Confirm every file now opens with a `// MODULE:` header and shebangs stay on line 1. [evidence: `grep '^// MODULE:'` matches `47/47`; shebang scripts keep `#!` on line 1]
- [x] **T3.4** Typecheck and run the affected suites from the final state. [evidence: `tsc --noEmit` rc 0; root, package and extension `vitest run` green]
- [x] **T3.5** `validate.sh --strict` exit 0 through its realpath. [evidence: `validate.sh <packet> --strict` exit 0, run through its realpath]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

Every repo-root code file opens with a `// MODULE:` header and numbered sections, the non-comment source
is byte-identical per file, and typecheck and the affected suites are green from the final state.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the banner approach and per-check verification.
- `checklist.md` — barrier sign-off.
<!-- /ANCHOR:cross-refs -->
