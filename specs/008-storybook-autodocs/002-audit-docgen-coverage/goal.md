---
title: "Goal: Audit docgen coverage"
description: "The durable directive for this phase, and the criteria that decide when it is done."
trigger_phrases:
  - "packet goal"
  - "durable directive"
  - "completion criteria"
importance_tier: "important"
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/008-storybook-autodocs/002-audit-docgen-coverage"
    last_updated_at: "2026-08-30T10:10:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Phase closed"
    next_safe_action: "None; the phase is closed."
    completion_pct: 100
---
# Goal: Audit docgen coverage

<!-- SPECKIT_TEMPLATE_SOURCE: goal | v2.2 -->

> Everything above the log is DURABLE.

---

<!-- ANCHOR:directive -->
## 1. DURABLE DIRECTIVE

**Objective:** Measure what the docgen actually produces for every tagged component, so prose is spent where the generated table falls short rather than wherever someone happens to look.

### Decisions

| ID | Decision |
|----|----------|
| D1 | Every tagged component is measured, never sampled. |
| D2 | The measurement is a re-runnable script whose output is a file, not a transcript. |
| D3 | The script ranks; it does not judge. A context-driven component legitimately has few props. |
| D4 | No tag is added or removed here, and no prose is written. |
<!-- /ANCHOR:directive -->

---

<!-- ANCHOR:completion -->
## 2. COMPLETION CRITERIA

- [ ] A script reports every `autodocs`-tagged component exactly once.
- [ ] Two consecutive runs produce the same ranking.
- [ ] The script exits non-zero only on its own failure, never on a component's low score.
- [ ] The report names, for each thin page, which of prop count, missing descriptions or opaque types made it thin.
- [ ] The question of whether docs pages need their own render gate is answered with evidence either way.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:log -->
## 3. LOG

Everything below is VOLATILE.

### Progress

| Item | State | Evidence |
|------|-------|----------|
| Audit all 100 docs pages | Done | 0 duplicates, 0 page errors, identical ranking across two runs |

### Deviations and findings

| Item | Note |
|------|------|
| - | - |
<!-- /ANCHOR:log -->
