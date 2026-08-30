---
title: "Task Ledger: Review findings"
description: "The task ledger for closing the review's gaps, each task closed against a measured before and after."
trigger_phrases:
  - "review findings tasks"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/009-review-findings"
    last_updated_at: "2026-08-30T15:00:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Closed every task with a measured delta"
    next_safe_action: "None; the packet is closed."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Task Ledger: Review findings

---

<!-- ANCHOR:notation -->
## Task Notation

`[ ]` open · `[x]` complete. Each closed task names the measured change that proves it.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:tasks -->
## Tasks

- [x] T-001 Cover the catalog config directory. Evidence: typecheck went from 1253 to 1267 files.
- [x] T-002 Fix what coverage exposed. Evidence: 6 errors to 0; four were pre-existing index-access strictness, one a pre-existing narrowing, one the docgen payload cast written yesterday.
- [x] T-003 Declare `playwright`. Evidence: an ordinary install removed it mid-session and four gates broke; it is now a root devDependency and `catalog-state-visibility` passes again.
- [x] T-004 Give the formatter a Svelte parser. Evidence: `prettier --check` on a component went from "No parser could be inferred" to reporting style issues.
- [x] T-005 Keep the formatter out of vendored repositories. Evidence: 22,719 warnings to 488; `specs/` accounted for 22,232 of them, and `npm run format` would have rewritten six read-only research repositories.
- [x] T-006 Declare `react`. Evidence: recorded in the web workspace manifest rather than resolved from a hoisted transitive dependency.
- [x] T-007 Reconcile the goal logs. Evidence: four logs read "Phase not started · Pending" against a packet reporting complete; all four now match.
- [x] T-008 Verify from the final state. Evidence: typecheck 0, both web suites green, catalog smoke 674 frames 0 throws, 39 token goldens, archive runs and moves only explained shots.
<!-- /ANCHOR:tasks -->

---

<!-- ANCHOR:completion -->
## Completion Criteria

Eight tasks closed against measured deltas, every check now able to fail honestly, and no reformatting
folded in alongside.
<!-- /ANCHOR:completion -->
