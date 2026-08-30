---
title: "Implementation Plan: Phase 3 — Author component prose"
description: "Narrow the audit's 75 thin pages to those hiding a contract, write descriptions only for those, and record why the rest need none."
trigger_phrases:
  - "component prose plan"
  - "which pages get descriptions"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/008-storybook-autodocs/003-author-component-prose"
    last_updated_at: "2026-08-30T12:40:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Executed; 26 written, 49 recorded as needing none."
    next_safe_action: "Begin phase 4."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Implementation Plan: Phase 3 — Author component prose

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

A thin table is not the same as a hidden contract. The audit's 75 thin pages include components whose
two typed props and rendered story tell a reader everything; writing prose for those buys nothing and
costs maintenance forever. Narrow the list by asking which pages hide something a reader cannot reach
from the canvas, write for those, and record the reason for the rest so the decision is auditable
rather than assumed.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:approach -->
## 2. APPROACH

| Step | Action | Proof |
|------|--------|-------|
| 1 | Scan every thin page's component for hiding signals | no-props, viewport-content, capability-gated |
| 2 | Reject the fence signal | It marks a line not to edit, not an invisible contract |
| 3 | Dispatch the writing with the bar stated as a defect condition | "Restates the props table" is named as failure, not left to taste |
| 4 | Re-measure rather than accept the executor's claim | The count of described pages must equal the count of files declaring one |
| 5 | Record the reason for pages left undescribed | Re-derivable by re-running the audit and the scan |
<!-- /ANCHOR:approach -->

---

<!-- ANCHOR:rollback -->
## 3. ROLLBACK PLAN

- **Trigger**: a description proves wrong about the component it describes.
- **Procedure**: remove that `parameters.docs.description.component` block. Descriptions are additive metadata in story files; removing one affects no story, no gate and no rendering.
- **Data reversal**: none.
<!-- /ANCHOR:rollback -->
