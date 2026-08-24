---
title: "Phase B tasks — the header ledger"
description: "Setup, the header pass, and the verification barrier for the 16 unbannered files. Each task carries its evidence inline."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-relay-source-structure/002-bare-file-headers"
    last_updated_at: "2026-08-24T19:45:13.934Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "16 bare files headered; non-comment source byte-identical; suite green."
    next_safe_action: "Proceed to 003-attachments-readme."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase B tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Each task carries its evidence inline,
so the ledger reads without the plan.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Enumerate the 16 files with no `// MODULE:` header — 15 test suites and `plan-status.ts`. [evidence: files with no `^// MODULE:` in the first lines — `15/15` tests plus `src/runtime/plan-status.ts`]
- [x] **T1.2** Capture the code-line multiset baseline (sorted non-comment lines) per file. [evidence: per-file `sha256` of sorted code lines stored before any edit]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** Dispatch the cli-codex (gpt-5.6-luna, max) header pass across the 16 files, comment-only. [evidence: executor edited `16/16` files, 3–6 banners each]
- [x] **T2.2** Confirm test files use the `<Name> TESTS` header and the tests banner sits before the first `describe`. [evidence: test files use imports / fixtures / helpers / setup / tests; the tests banner precedes the first top-level `describe`]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Recompute the code-line multiset and diff against the baseline. [evidence: `0/16` files differ — non-comment source byte-identical]
- [x] **T3.2** Confirm the `git diff` adds only comment or blank lines and deletes nothing. [evidence: 0 deletions, `237` comment lines added, 0 non-comment non-blank additions over the 16 files]
- [x] **T3.3** Confirm every file now opens with a `// MODULE:` header. [evidence: `grep '^// MODULE:'` matched `16/16`]
- [x] **T3.4** Typecheck and run the app-relay suite from the final state. [evidence: `tsc --noEmit` rc 0; `vitest run tests` 46 files / 307 tests passed]
- [x] **T3.5** Confirm the one intermittent failure is the pre-existing flake, not a regression. [evidence: `tests/auth.test.ts` unmodified, in neither file set; passed `1/5` isolated runs and the full suite re-ran all-green]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

Every bare file opens with a `// MODULE:` header and numbered sections, the non-comment source is
byte-identical per file, and typecheck and the full suite are green from the final state.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the header approach and per-check verification.
- `checklist.md` — barrier sign-off.
<!-- /ANCHOR:cross-refs -->
