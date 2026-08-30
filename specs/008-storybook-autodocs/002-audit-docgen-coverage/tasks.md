---
title: "Task Ledger: Phase 2 — Audit docgen coverage"
description: "The task ledger for measuring and ranking the catalog's docs pages, each task closed against observed output."
trigger_phrases:
  - "docgen coverage tasks"
  - "docs audit ledger"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/008-storybook-autodocs/002-audit-docgen-coverage"
    last_updated_at: "2026-08-30T11:40:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Closed every task with observed command evidence."
    next_safe_action: "Begin phase 3 against the ranked list."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Task Ledger: Phase 2 — Audit docgen coverage

---

<!-- ANCHOR:notation -->
## Task Notation

`[ ]` open · `[x]` complete. Each closed task names the output that proves it.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:tasks -->
## Tasks

- [x] T-001 Enumerate the docs entries. Evidence: 100 docs beside 337 stories in the built index.
- [x] T-002 Measure every page once. Evidence: 100 of 100 audited, no duplicates.
- [x] T-003 Catch the metric that looked right. Evidence: counting non-empty cells scored `theme-control` 2 of 2 where its real answer is 0 of 2.
- [x] T-004 Classify prose against type. Evidence: `card-plan-ready` documents 3 of 6 props and reports 3 of 6; `theme-control` documents none and reports 0 of 2.
- [x] T-005 Rank deterministically. Evidence: two consecutive runs produced identical ranking and identical scores.
- [x] T-006 Record the catalog totals. Evidence: 910 props, 118 with prose, 25 pages with any, 73 with none, 2 with no props at all.
- [x] T-007 Answer the render-gate question. Evidence: 0 page errors across 100 pages; the gate is declined and the reason recorded.
- [x] T-008 Keep the exit code honest. Evidence: exit 0 with 73 thin pages present — a low score is the finding, not an error.
<!-- /ANCHOR:tasks -->

---

<!-- ANCHOR:completion -->
## Completion Criteria

Eight tasks closed against observed output, the ranking reproducible across runs, and the classifier
checked against components whose answers were known before the ranking was believed.
<!-- /ANCHOR:completion -->
