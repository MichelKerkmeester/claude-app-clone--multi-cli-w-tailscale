---
title: "Phase G tasks — comment brevity ledger"
description: "Trim and verify the verbose inline comments across the backend and shared code. Each task carries its evidence inline."
trigger_phrases:
  - "comment brevity task ledger"
  - "comment brevity packet"
  - "task ledger"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-relay-source-structure/007-comment-brevity"
    last_updated_at: "2026-08-25T03:30:44.319Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Comments trimmed; AST-identical, fences 277, suites green."
    next_safe_action: "None — the backend and shared source-structure group is complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase G tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Each task carries its evidence inline.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Build the file lists — 37 `app-relay/src` files and 47 repo-root code files. [evidence: `trim-relay-files.txt` (37) and `root-all-code.txt` (47) enumerated]
- [x] **T1.2** Prepare the AST re-print comparator (`removeComments`) for the comment-only proof. [evidence: `tokdiff.cjs` parses each file and hashes `printFile` output with comments removed]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** Dispatch the cli-cursor (composer-2.5) comment-trim over the 37 `app-relay/src` files. [evidence: executor trimmed 32 files, ~112 comment lines removed; comment lines 913 → 770]
- [x] **T2.2** Dispatch the cli-cursor (composer-2.5) comment-trim over the 47 repo-root code files. [evidence: executor trimmed the verbose root files, banners and shebangs kept]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** AST re-print comparison per file — comment-only proof. [evidence: `tokdiff.cjs` — app-relay `37/37` AST-identical, 0 code changed; root files AST-identical]
- [x] **T3.2** Confirm the fence count stays 277 and shebangs stay on line 1. [evidence: `scan-comments.mjs` guardrailFences 277; root shebangs unchanged]
- [x] **T3.3** Typecheck and run the affected suites from the final state. [evidence: `tsc` rc 0; app-relay `vitest run tests` 46 files / 307; root `npm test` green]
- [x] **T3.4** `validate.sh --strict` exit 0 through its realpath. [evidence: `validate.sh <packet> --strict` exit 0, run through its realpath]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

Every touched file is AST-identical modulo comments, the fence count is 277, the comment-line count
dropped, and typecheck and the affected suites are green from the final state.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the trim approach and the AST-re-print proof.
- `checklist.md` — barrier sign-off.
<!-- /ANCHOR:cross-refs -->
