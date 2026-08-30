---
title: "Implementation Plan: Phase 4 — Skill and repo integration"
description: "Write the reference, route it from the folder entry and the leaf list, and land it cross-repo through an isolated worktree."
trigger_phrases:
  - "skill integration plan"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/008-storybook-autodocs/004-skill-and-repo-integration"
    last_updated_at: "2026-08-30T13:10:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Executed; landed on both branches"
    next_safe_action: "None; the packet is closed."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Implementation Plan: Phase 4 — Skill and repo integration

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Write one reference that states the generated-versus-written split and routes onward, wire it so the
skill's own router resolves to it, add the rules entry in this repository, and land the cross-repo
half through an isolated worktree on an allocated branch.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:approach -->
## 2. APPROACH

| Step | Action | Proof |
|------|--------|-------|
| 1 | Write the reference against the folder's existing shape | Uppercase section headings, router-style prose |
| 2 | Add a row to the folder's entry document | The router names it |
| 3 | Add it to the skill's leaf list | The manifest carries it |
| 4 | Regenerate skill root metadata | Fleet audit passes |
| 5 | Check every cited path against the described repository | Each resolves |
| 6 | Land from an isolated worktree on an allocated branch | Both branches at the same commit |
<!-- /ANCHOR:approach -->

---

<!-- ANCHOR:rollback -->
## 3. ROLLBACK PLAN

- **Trigger**: the reference proves wrong, or the routing edit breaks the skill's manifest audit.
- **Procedure**: revert the single commit on both branches. It adds one document and two routing lines; no code, no gate and no application source is touched.
- **Data reversal**: none.
<!-- /ANCHOR:rollback -->
