---
title: "Phase 2 — Audit docgen coverage"
description: "Measure what the docgen actually produces for every tagged component, so prose is written where the generated table is thin rather than wherever someone happens to look."
trigger_phrases:
  - "audit docgen coverage"
  - "props table empty"
  - "which components need prose"
  - "docgen quality report"
importance_tier: "important"
contextType: "specification"
_memory:
  continuity:
    packet_pointer: "specs/008-storybook-autodocs/002-audit-docgen-coverage"
    last_updated_at: "2026-08-30T09:30:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Scoped the phase; not yet planned in detail."
    next_safe_action: "Plan this phase when phase 1 closes."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Phase 2 — Audit docgen coverage

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 1 |
| **Priority** | P2 |
| **Status** | Draft |
| **Created** | 2026-08-30 |
| **Parent Spec** | `../spec.md` |
| **Phase** | 2 of 4 |
| **Predecessor** | `../001-enable-docs-layer/spec.md` |
| **Successor** | `../003-author-component-prose/spec.md` |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
The docs layer renders 100 pages, and nothing says which of them are useful. A component whose props are a typed `Props` interface produces a real table; one that spreads `...rest`, takes a single opaque object, or renders entirely from context produces a table that says almost nothing. Writing prose by intuition would spend effort on the pages that least need it.

### Purpose
Produce a ranked, re-runnable measurement of what each docs page actually offers a reader, so phase 3 spends its effort where the generator falls short.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- A script that reads each component's docgen output and reports prop count, how many props carry a description, and whether any type resolves to `any` or an opaque object.
- A ranked report: pages where the generated table already suffices, and pages where it does not.
- A decision on whether the 100 docs pages warrant a render gate of their own, given every existing gate filters `entry.type === 'story'`.

### Out of Scope
- Writing any prose. That is phase 3.
- Adding or removing an `autodocs` tag. The tag stays on all 100; the audit ranks them.
- Any application source change.

### Files to Change
- A new script under `scripts/`.
- A report committed with the packet.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers
- REQ-001 Every tagged component is measured, not sampled.
- REQ-002 The measurement is re-runnable and its output is a file, not a transcript.

### P1 - Required
- REQ-003 The report ranks components by how little the generated table conveys.
- REQ-004 The question of a docs-page render gate is answered with evidence either way.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- The script runs from a built catalog and exits non-zero only on its own failure, never on a component's low score.
- Every one of the tagged components appears in the report exactly once.
- The ranking is reproducible across two runs.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- A low prop count is not automatically a defect: a component driven entirely by context legitimately has few props. The report must rank, not judge.
- The docgen reads types; a component typed as `any` will look poor for a reason worth recording rather than fixing here.
<!-- /ANCHOR:risks -->
