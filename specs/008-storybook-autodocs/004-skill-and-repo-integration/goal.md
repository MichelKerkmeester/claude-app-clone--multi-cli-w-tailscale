---
title: "Goal: Skill and repo integration"
description: "The durable directive for this phase, and the criteria that decide when it is done."
trigger_phrases:
  - "packet goal"
  - "durable directive"
  - "completion criteria"
importance_tier: "important"
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/008-storybook-autodocs/004-skill-and-repo-integration"
    last_updated_at: "2026-08-30T10:10:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Phase closed"
    next_safe_action: "None; the phase is closed."
    completion_pct: 100
---
# Goal: Skill and repo integration

<!-- SPECKIT_TEMPLATE_SOURCE: goal | v2.2 -->

> Everything above the log is DURABLE.

---

<!-- ANCHOR:directive -->
## 1. DURABLE DIRECTIVE

**Objective:** Make the docs layer discoverable through the routes agents already take, and state its guarantee precisely enough that nobody re-derives it.

### Decisions

| ID | Decision |
|----|----------|
| D1 | The skill's own router must resolve to the new reference; a document nothing routes to is not integrated. |
| D2 | The generated half and the authored half are distinguished explicitly, because only one of them can rot. |
| D3 | The reference points; it does not become a second catalog guide. |
| D4 | Landing happens in an isolated worktree via the sk-git allocator, never from the Mobile CLI checkout. |
<!-- /ANCHOR:directive -->

---

<!-- ANCHOR:completion -->
## 2. COMPLETION CRITERIA

- [ ] `sk-code-mobile-cli`'s `SKILL.md` routes to a docs-layer reference and every cited path resolves.
- [ ] The skill's leaf manifest and root metadata regenerate and pass their audit.
- [ ] `REPO RULES.md` names the layer, its guarantee, and its limit.
- [ ] The change reaches both the release line and main.
- [ ] `validate.sh --strict` reports `RESULT: PASSED` for the parent and all four children.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:log -->
## 3. LOG

Everything below is VOLATILE.

### Progress

| Item | State | Evidence |
|------|-------|----------|
| Route the reference from the surface skill | Done | Landed on the release line and main; 14 skill roots audited, 14 passed |

### Deviations and findings

| Item | Note |
|------|------|
| - | - |
<!-- /ANCHOR:log -->
