---
title: "Phase 3 — Author component prose"
description: "Write component descriptions for the pages the audit names, starting with contracts that are invisible in the rendering, and stop there."
trigger_phrases:
  - "author component prose"
  - "component description docs"
  - "two-mode component documentation"
importance_tier: "important"
contextType: "specification"
_memory:
  continuity:
    packet_pointer: "specs/008-storybook-autodocs/003-author-component-prose"
    last_updated_at: "2026-08-30T09:30:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Scoped the phase; not yet planned in detail."
    next_safe_action: "Plan this phase when phase 2 closes."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Phase 3 — Author component prose

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
| **Phase** | 3 of 4 |
| **Predecessor** | `../002-audit-docgen-coverage/spec.md` |
| **Successor** | `../004-skill-and-repo-integration/spec.md` |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
The generated half of a docs page states what a component accepts. It cannot state what the component does at a width you are not looking at, what it renders when a capability is absent, or which of its lines are load-bearing. Those are the failures that have cost real time here: a control passed every geometric check while rendering as an unreadable mark, because its behaviour changed at a breakpoint invisible from the catalog.

### Purpose
Write the sentences a generator cannot, only where their absence has a cost, so the maintained surface stays small enough to stay true.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- Component descriptions for the pages the audit ranks lowest, plus any component whose contract is invisible in its rendering.
- A written rule for what earns prose, so the next author does not have to guess.

### Out of Scope
- Restating the props table in sentences. A description that duplicates generated output earns nothing and costs maintenance.
- Any component the audit shows is already served by its generated table.

### Files to Change
- Story files, for `parameters.docs.description.component`.
- Component files, for JSDoc on props where that is the better home.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers
- REQ-001 Prose is written only where the audit or an invisible contract justifies it, and the justification is recorded.
- REQ-002 No description restates the generated table.

### P1 - Required
- REQ-003 Two-mode, capability-gated and fenced components are covered.
- REQ-004 Every description is checked against the component as it renders, not as it is remembered.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- Each authored page renders its description with zero page errors.
- Each description names something a reader could not have learned from the props table or the rendered story.
- The set of authored pages matches the audit's list plus recorded exceptions.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- Prose is the half that decays. Every sentence written here is a maintenance liability, which is why the bar is what it is.
- A description written from memory rather than from the rendering repeats the exact failure that motivated this packet.
<!-- /ANCHOR:risks -->
