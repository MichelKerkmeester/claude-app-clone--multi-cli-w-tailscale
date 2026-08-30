---
title: "Task Ledger: Phase 4 — Skill and repo integration"
description: "The task ledger for making the docs layer discoverable, each task closed against observed output."
trigger_phrases:
  - "skill integration tasks"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/008-storybook-autodocs/004-skill-and-repo-integration"
    last_updated_at: "2026-08-30T13:10:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Closed every task with observed evidence"
    next_safe_action: "None; the packet is closed."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Task Ledger: Phase 4 — Skill and repo integration

---

<!-- ANCHOR:notation -->
## Task Notation

`[ ]` open · `[x]` complete. Each closed task names the output that proves it.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:tasks -->
## Tasks

- [x] T-001 Write the reference. Evidence: `references/storybook/docs-layer.md`, leading with the generated-versus-written split.
- [x] T-002 Route it from the folder entry. Evidence: a row in `storybook.md`.
- [x] T-003 Route it from the leaf list. Evidence: listed in the skill's `SKILL.md` manifest block and folder routing row.
- [x] T-004 Regenerate skill root metadata. Evidence: 14 checked, 14 passed, 0 failed, 1 fixed.
- [x] T-005 Check every cited path. Evidence: all 5 script paths resolve in the repository the reference describes.
- [x] T-006 State the guarantee in the repository rules. Evidence: the storybook section of `REPO RULES.md` names which half can rot and that no gate sweeps a docs page.
- [x] T-007 Land cross-repo safely. Evidence: isolated worktree, allocator-issued branch, pushed to the release line and main; the pre-push routing guard reported all hubs fresh on both.
<!-- /ANCHOR:tasks -->

---

<!-- ANCHOR:completion -->
## Completion Criteria

Seven tasks closed against observed output, the skill's own router resolving to the new reference, and
both branches carrying it at the same commit.
<!-- /ANCHOR:completion -->
