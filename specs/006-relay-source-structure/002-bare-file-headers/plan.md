---
title: "Phase B plan — bare file headers, proven comment-only"
description: "How the MODULE header and numbered sections land on the 16 unbannered files and how the comment-only claim is proven: a code-line multiset baseline, a mechanical header pass by a CLI executor, then a per-file byte-identity check plus typecheck and the app-relay suite."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-relay-source-structure/002-bare-file-headers"
    last_updated_at: "2026-08-24T19:45:13.934Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Plan executed; headers added and proven comment-only."
    next_safe_action: "Proceed to 003-attachments-readme."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase B plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Give the 16 files with no header — 15 test suites and `src/runtime/plan-status.ts` — a `// MODULE:`
banner and the same numbered section markers the rest of the source carries. A CLI executor inserts the
banners; the orchestrator proves the pass changed no code by diffing the non-comment source before and
after.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

Three independent checks, all from the final state: the per-file code-line multiset is identical before
and after; `git diff` over the 16 files shows only comment and blank lines added and zero deletions;
typecheck passes and `vitest run tests` runs green on the explicit `tests` directory, matching the
46-file / 307-test baseline.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

The pass mirrors phase A over a different file set, so the same proof anchor applies: for each file the
sorted non-comment, non-blank lines are hashed before the pass and diffed after. A source file uses the
imports / types / constants / helpers / core-logic vocabulary; a test file opens with a `<Name> TESTS`
header and uses imports / fixtures / helpers / setup / tests, with the tests banner placed once before
the first top-level `describe`. Because a test file's behaviour is easy to shift with a stray line, the
full suite is the decisive third check.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · baseline
Enumerate the 16 unheadered files and record the code-line multiset hash per file.

### Phase 2 · header pass
One cli-codex (gpt-5.6-luna, max) executor adds the `// MODULE:` header and numbered sections to each of
the 16 files, one file at a time, in the box-drawing form. Comments only.

### Phase 3 · verification
Recompute the multiset and diff against the baseline; check the `git diff` shape; run typecheck and the
app-relay suite from the final state.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

No new tests — this is a comment pass. The phase closes only after the multiset is identical across all
16 files, the `git diff` adds only comments, `tsc` is clean, and `vitest run tests` is green. One
intermittent failure in the unmodified `tests/auth.test.ts` is the documented timing flake and is
confirmed, not chased.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The list of 16 files with no `// MODULE:` header — 15 test suites and `src/runtime/plan-status.ts`.
- The repo's box-drawing banner form and the test-section vocabulary.
- cli-codex at gpt-5.6-luna, max, fast — the live executor route.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

The pass is comment-only and isolated to the 16 files. `git checkout -- <files>` restores them; nothing
else depends on the change, and there is no migration, data or irreversible step.
<!-- /ANCHOR:rollback -->
