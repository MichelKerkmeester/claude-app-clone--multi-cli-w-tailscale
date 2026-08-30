---
title: "Implementation Plan: Phase 2 — Audit docgen coverage"
description: "Measure every docs page in a browser, classify what its table actually conveys, and let the same run answer whether docs pages need a render gate."
trigger_phrases:
  - "docgen coverage plan"
  - "docs page audit approach"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/008-storybook-autodocs/002-audit-docgen-coverage"
    last_updated_at: "2026-08-30T11:40:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Executed the plan; ranking reproducible and render gate declined."
    next_safe_action: "Begin phase 3 against the ranked list."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Implementation Plan: Phase 2 — Audit docgen coverage

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Measure the rendered page rather than the docgen payload behind it, because what reaches a reader is
the thing being ranked and a payload that renders to nothing is exactly the defect worth catching.
Load all 100 docs pages in a browser, read each args table, and classify every Description cell as
prose or type — they are mutually exclusive there, and conflating them marks every prop documented.
Record page errors in the same pass so the render-gate question is answered with evidence rather than
caution.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:approach -->
## 2. APPROACH

| Step | Action | Proof |
|------|--------|-------|
| 1 | Enumerate docs entries from the built index | 100, distinct from the 337 stories |
| 2 | Load each page and wait past the args-table skeleton | Sampling early reads placeholder text as content |
| 3 | Classify each Description cell as prose or type | Checked against two components with known answers |
| 4 | Record page errors per page | Zero errors is itself the render-gate answer |
| 5 | Rank deterministically and write the report | Two runs must produce identical ranking and scores |
<!-- /ANCHOR:approach -->

---

<!-- ANCHOR:rollback -->
## 3. ROLLBACK PLAN

- **Trigger**: the ranking disagrees between runs, or the classifier misreads a component whose answer is known.
- **Procedure**: delete `scripts/docgen-coverage.mjs` and its report. The audit reads the catalog and writes one JSON file; it changes no application source, no story and no gate.
- **Data reversal**: none.
<!-- /ANCHOR:rollback -->
