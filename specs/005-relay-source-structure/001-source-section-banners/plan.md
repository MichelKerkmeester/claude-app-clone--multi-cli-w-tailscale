---
title: "Phase A plan — source section banners, proven comment-only"
description: "How the numbered section banners land on the 36 module files and how the comment-only claim is proven: a code-line multiset baseline, a mechanical banner pass by a CLI executor, then a per-file byte-identity check plus typecheck and the app-relay suite."
trigger_phrases:
  - "source section banners plan approach"
  - "source section banners packet"
  - "plan approach"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-relay-source-structure/001-source-section-banners"
    last_updated_at: "2026-08-24T19:42:47.201Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Plan executed; banners added and proven comment-only."
    next_safe_action: "Proceed to 002-bare-file-headers."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase A plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Add numbered `// N. SECTION` banners to the 36 `app-relay/src` files that already carry a `// MODULE:`
header, so imports, types, constants, helpers and core logic read as marked sections. A CLI executor
inserts the banners; the orchestrator proves the pass changed no code by diffing the non-comment source
before and after.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

Three independent checks, all from the final state: the per-file code-line multiset (sorted non-comment,
non-blank lines) is identical before and after; `git diff` over the 36 files shows only comment and blank
lines added and zero deletions; typecheck passes and the app-relay suite runs green on its explicit
`tests` directory, matching the 46-file / 307-test baseline.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

A comment-only pass has one real risk: that a "comment" edit silently moves or changes code. The plan
removes that risk with a proof anchor captured before any edit. For each file the sorted set of
non-comment, non-blank lines is hashed; this multiset is invariant under a pure banner insertion, because
a banner is a whole `//` line the filter drops. Recomputing and diffing it per file after the pass proves
no code line moved. The `git diff` shape (only comment and blank additions, no deletions) and the full
suite are the second and third independent proofs — a banner accidentally placed inside a template
literal would change a string value and fail the suite even though the multiset might not see it.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · baseline
Enumerate the 36 files and record the code-line multiset hash per file.

### Phase 2 · banner pass
One cli-codex (gpt-5.6-luna, xhigh) executor inserts the numbered banners across the 36 files, one file
at a time, matching the box-drawing form of each file's `// MODULE:` header. Comments only.

### Phase 3 · verification
Recompute the multiset and diff against the baseline; check the `git diff` shape; run typecheck and the
app-relay suite from the final state.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

No new tests — this is a comment pass, and the existing suite plus the byte-identity check is the oracle.
The phase closes only after the multiset is identical across all 36 files, the `git diff` adds only
comments, typecheck is clean, and `vitest run tests` is green from the final state.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The list of 36 `app-relay/src` files that already carry a `// MODULE:` header.
- The repo's box-drawing banner form (67 `─` after `// `), taken from the existing headers.
- cli-codex at gpt-5.6-luna, xhigh, fast — the live executor route.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

The pass is comment-only and isolated to the 36 files. `git checkout -- <files>` restores them; nothing
else depends on the change, and there is no migration, data or irreversible step.
<!-- /ANCHOR:rollback -->
