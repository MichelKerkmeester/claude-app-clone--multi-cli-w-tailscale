---
title: "Phase E plan — root source banners, proven comment-only"
description: "How headers and numbered sections land on the 47 repo-root code files and how the comment-only claim is proven: a code-line multiset baseline, a mechanical pass by a CLI executor, then a per-file byte-identity check plus typecheck and the affected suites."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-relay-source-structure/005-root-source-banners"
    last_updated_at: "2026-08-24T21:41:27.992Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Plan executed; headers and banners added and proven comment-only."
    next_safe_action: "Proceed to 006-root-folder-docs."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase E plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Give the 47 repo-root code files a `// MODULE:` header where missing and numbered `// N. SECTION`
banners, matching the two apps. A CLI executor inserts the banners; the orchestrator proves the pass
changed no code by diffing the non-comment source before and after.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

Three independent checks from the final state: the per-file code-line multiset is identical before and
after; `git diff` over the 47 files shows only comment and blank lines added and zero deletions; and
typecheck plus the affected suites (root, package, extension) run green.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

The proof anchor is captured before any edit: for each file the sorted non-comment, non-blank lines are
hashed, a multiset invariant under a pure banner insertion. Recomputing and diffing it per file proves no
code moved. Two file kinds need care beyond the app passes: scripts carry a shebang that must stay on
line 1 (the banner goes after it), and the shared `pi-rpc-protocol` package feeds both apps, so a value
change would ripple — typecheck across the workspace is the ripple guard. The `git diff` shape and the
suites are the second and third independent proofs.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · baseline
Enumerate the 47 files (excluding built `dist/`), split into MODULE-present (31) and bare (16), and
record the code-line multiset hash per file.

### Phase 2 · banner pass
One cli-codex (gpt-5.6-luna, max) executor adds headers where missing and numbered sections across the 47
files, one file at a time, keeping shebangs on line 1. Comments only.

### Phase 3 · verification
Recompute the multiset and diff against the baseline; check the `git diff` shape; run typecheck and the
affected suites from the final state.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

No new tests — this is a comment pass. The phase closes only after the multiset is identical across all
47 files, the `git diff` adds only comments, typecheck is clean, and the affected suites are green. The
scripts are smoke-checked to confirm they still parse with the shebang intact.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The list of 47 repo-root code files, split into MODULE-present and bare.
- The repo's box-drawing banner form and the test-section vocabulary.
- cli-codex at gpt-5.6-luna, max, fast — the live executor route.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

The pass is comment-only and isolated to the 47 files. `git checkout -- <files>` restores them; nothing
else depends on the change, and there is no migration, data or irreversible step.
<!-- /ANCHOR:rollback -->
