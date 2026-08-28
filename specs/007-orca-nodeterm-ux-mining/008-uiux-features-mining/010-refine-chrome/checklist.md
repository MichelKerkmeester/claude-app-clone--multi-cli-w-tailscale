---
title: "Verification checklist - Phase 10 Refine chrome"
description: "Verification checklist for refine chrome; every item needs evidence naming a real artifact."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/010-refine-chrome"
    last_updated_at: "2026-08-28T20:00:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Authored the refine chrome checklist."
    next_safe_action: "Await operator go, then start T1.1."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Verification Checklist: Phase 10 Refine chrome

<!-- ANCHOR:protocol -->
## Verification Protocol

Every completed item carries evidence naming a real artifact: a command and its output, a file and line, or the shot whose diff proves the change. A claim without one is not evidence.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [ ] CHK-001 [P0] Requirements documented in spec.md with acceptance criteria
- [ ] CHK-002 [P0] Sequenced approach defined in plan.md
- [ ] CHK-003 [P1] Before baseline captured for every shot in scope
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [ ] CHK-010 [P0] Code passes eslint/format checks
- [ ] CHK-011 [P0] No console errors or warnings introduced
- [ ] CHK-012 [P1] Fixes land in the component; a story changed only where it hid the state
- [ ] CHK-013 [P1] Scoped styles stay with their component; shared rules stay in app.css
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [ ] CHK-019 [P0] Every component in this group is mapped to the shot that renders it
- [ ] CHK-020 [P0] Every shot in scope carries a recorded verdict
- [ ] CHK-021 [P0] Every accepted fix carries a before and after image diff
- [ ] CHK-022 [P0] No unrelated screenshot changed
- [ ] CHK-023 [P0] Two capture runs byte-identical, zero unstable, zero failed
- [ ] CHK-024 [P0] Both test suites green from the final state, confirmed by content
- [ ] CHK-025 [P1] token-identity passes with its input file named
- [ ] CHK-026 [P1] story coverage passes
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [ ] CHK-030 [P0] Each defect classed as component, story, or honest behaviour before any fix
- [ ] CHK-031 [P0] A defect found on one surface is checked for on its sibling surfaces
- [ ] CHK-032 [P1] A state recorded as honest sameness is written down, not silently left
- [ ] CHK-033 [P1] Every fix names the shot that proves it
- [ ] CHK-034 [P1] No fix relies on a story change to look correct
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [ ] CHK-040 [P0] The markdown sanitization boundary is unchanged
- [ ] CHK-041 [P0] No capability check relaxed to make a surface render
- [ ] CHK-042 [P1] No host field invented and no protocol type widened
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [ ] CHK-050 [P1] spec/plan/tasks synchronized with what shipped
- [ ] CHK-051 [P1] Code comments carry durable WHY only, no spec or finding ids
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [ ] CHK-060 [P1] Changes confined to the surfaces this phase owns
- [ ] CHK-061 [P1] No task-created residue in the diff
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Field | Value |
|-------|-------|
| **Scope** | 50 screenshots |
| **Evidence** | Image diff per change plus the scripted gate |
| **Status** | Planned |
<!-- /ANCHOR:summary -->
