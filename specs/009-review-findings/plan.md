---
title: "Implementation Plan: Review findings"
description: "Close each gap by making its check able to fail, and verify by watching the check change verdict rather than by inspection."
trigger_phrases:
  - "review findings plan"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/009-review-findings"
    last_updated_at: "2026-08-30T15:00:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Executed; every gap closed with a measured before and after"
    next_safe_action: "None; the packet is closed."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Implementation Plan: Review findings

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Each finding is a check that reports success without looking. The fix in every case is to make the
check able to see, then read what it says — which is why each step below has a before and an after
number rather than a description.

Deliberately excluded: reformatting the 488 non-conforming files. The gap was that the formatter could
not parse Svelte and could reach vendored repositories; conforming the codebase is separate work with a
large diff, and folding it in here would be the "while we're here" failure.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:approach -->
## 2. APPROACH

| Step | Action | Before | After |
|------|--------|--------|-------|
| 1 | Add the catalog config directory to the typecheck include | 1253 files | 1267 files, 6 errors surfaced |
| 2 | Fix all six — one mine, four pre-existing index-access, one pre-existing narrowing | 6 errors | 0 errors |
| 3 | Declare `playwright` after an install removed it | undeclared leftover | root devDependency |
| 4 | Install the Svelte parser and configure it | "No parser could be inferred" | reports style issues |
| 5 | Exclude `specs/` and `screenshots/` from the formatter | 22,719 warnings, vendored repos in range | 488, own source only |
| 6 | Declare `react` where the manager bundle uses it | hoisted transitive | web devDependency |
| 7 | Reconcile the autodocs goal logs | 4 logs reading "not started" | 4 matching their packet |
<!-- /ANCHOR:approach -->

---

<!-- ANCHOR:rollback -->
## 3. ROLLBACK PLAN

- **Trigger**: typecheck cannot reach 0 with the new coverage, or a declared dependency conflicts.
- **Procedure**: each step is one line in one config file and independently reversible. Removing the include line restores the previous coverage exactly; removing the ignore lines restores the previous formatter scope.
- **Data reversal**: none. No application source behaviour changes.
<!-- /ANCHOR:rollback -->
