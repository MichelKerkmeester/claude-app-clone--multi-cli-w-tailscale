---
title: "Implementation Plan: Phase 1 — Enable the docs layer"
description: "Measure the build first, install and configure the addon, then re-run every gate and the archive against the recorded baseline; repair at cause whatever the addon exposes."
trigger_phrases:
  - "enable docs layer plan"
  - "addon-docs install plan"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/008-storybook-autodocs/001-enable-docs-layer"
    last_updated_at: "2026-08-30T09:20:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Executed the plan; both exposed defects fixed and negative-controlled."
    next_safe_action: "Begin phase 2: measure docgen coverage."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Implementation Plan: Phase 1 — Enable the docs layer

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Record the build time and the gate verdicts before touching anything, because "unaffected" is a claim
about a delta and there is no delta without a baseline. Install the addon into the web workspace, list
it, rebuild, and compare. Anything the addon exposes as broken is repaired at its cause rather than
worked around, and each repair is negative-controlled by restoring the failure.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:approach -->
## 2. APPROACH

| Step | Action | Proof |
|------|--------|-------|
| 1 | Time two clean catalog builds | Two figures, not one |
| 2 | Install `@storybook/addon-docs` in the web workspace | Recorded in the workspace manifest |
| 3 | Confirm `playwright` survived the install | It is undeclared here, and an install can remove it |
| 4 | Add the addon to `main.ts` | Docs entries appear in `index.json` |
| 5 | Read a props table in a browser | Real component types, zero page errors |
| 6 | Re-run every gate and re-capture the archive | Same verdicts, zero shots moved |
| 7 | Repair what the addon exposed | Each fix negative-controlled |
<!-- /ANCHOR:approach -->

---

<!-- ANCHOR:rollback -->
## 3. ROLLBACK PLAN

- **Trigger**: a gate changes verdict, the archive moves shots that are not the known flakes, or a docs page cannot render.
- **Procedure**: remove the addon from the `main.ts` list. That alone returns the catalog to story-only; the dependency can stay installed harmlessly. The story-host and smoke-gate repairs are independently correct and are kept either way.
- **Data reversal**: none. No application source, token or story is touched.
<!-- /ANCHOR:rollback -->
