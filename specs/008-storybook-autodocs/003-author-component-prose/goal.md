---
title: "Goal: Author component prose"
description: "The durable directive for this phase, and the criteria that decide when it is done."
trigger_phrases:
  - "packet goal"
  - "durable directive"
  - "completion criteria"
importance_tier: "important"
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/008-storybook-autodocs/003-author-component-prose"
    last_updated_at: "2026-08-30T10:10:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Authored the durable directive"
    next_safe_action: "Execute against the completion criteria"
    completion_pct: 0
---
# Goal: Author component prose

<!-- SPECKIT_TEMPLATE_SOURCE: goal | v2.2 -->

> Everything above the log is DURABLE.

---

<!-- ANCHOR:directive -->
## 1. DURABLE DIRECTIVE

**Objective:** Write the sentences a generator cannot — what a component does at a width you are not looking at, what it renders when a capability is absent — and stop there.

### Decisions

| ID | Decision |
|----|----------|
| D1 | Prose is written only where the audit ranks a page thin or a contract is invisible in the rendering, and the justification is recorded. |
| D2 | No description restates the props table. |
| D3 | Every description is checked against the component as it renders, not as it is remembered. |
| D4 | Two-mode, capability-gated and fenced components are covered first. |
<!-- /ANCHOR:directive -->

---

<!-- ANCHOR:completion -->
## 2. COMPLETION CRITERIA

- [ ] Every authored page renders its description with zero page errors.
- [ ] Each description names something unavailable from the props table or the rendered story.
- [ ] The authored set matches the audit's list plus recorded exceptions.
- [ ] `catalog-smoke-cdp` still reports 674 frames with 0 throws.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:log -->
## 3. LOG

Everything below is VOLATILE.

### Progress

| Item | State | Evidence |
|------|-------|----------|
| Phase not started | Pending | - |

### Deviations and findings

| Item | Note |
|------|------|
| - | - |
<!-- /ANCHOR:log -->
