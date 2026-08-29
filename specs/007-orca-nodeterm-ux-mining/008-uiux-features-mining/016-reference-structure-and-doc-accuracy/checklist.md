---
title: "Verification checklist - Phase 16 Reference structure and documentation accuracy"
description: "Verification checklist for the reference regrouping and the app-document path corrections; every completed item carries evidence naming a real artifact."
trigger_phrases:
  - "reference structure and doc accuracy verification checklist"
  - "reference structure and doc accuracy phase"
  - "verification checklist"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/016-reference-structure-and-doc-accuracy"
    last_updated_at: "2026-08-29T17:20:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Grouped the loose references and corrected the stale app-document paths."
    next_safe_action: "Packet closed; no follow-up owed inside this phase."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Verification Checklist: Phase 16 Reference structure and documentation accuracy

<!-- ANCHOR:protocol -->
## Verification Protocol

Every completed item carries evidence naming a real artifact: a command and its output, a file and line, or the measurement that proves it. Documentation has no unit test, so every claim here is a resolver reading the real tree.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] CHK-001 [P0] Requirements documented with acceptance criteria [evidence: `spec.md` section 4 states REQ-001 through REQ-008]
- [x] CHK-002 [P0] Sequenced approach defined [evidence: `plan.md` section 4 orders setup, implementation, verification]
- [x] CHK-003 [P1] The existing convention was read before extending it [evidence: `references/` already used `<folder>/<folder>.md` in `operations/` and `setup/`; the four new folders follow it]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] No document changed what it asserts [evidence: the diff shows `git mv` renames plus link-only edits; no prose claim was rewritten except the stale paths this phase exists to fix]
- [x] CHK-011 [P0] The duplicate reference-table row is gone [evidence: `comment-grammar.md` appeared twice in the 17-row table; the folder-first table has 11 rows and no duplicate]
- [x] CHK-012 [P0] No ephemeral artifact pointer entered any document [evidence: `No ephemeral-artifact pointers in code comments` passes on the pull request]
- [x] CHK-013 [P1] The changelog keeps historically accurate paths [evidence: `changelog/v0.1.6.0.md` retains the flat paths that were correct when it shipped; only `v0.1.8.0.md` was repointed]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] CHK-020 [P0] No broken markdown link was introduced [evidence: `check-markdown-links.cjs` reports 8,491 files and 15,191 links with 5 broken, all 5 pre-existing in `sk-code-obsidian/SKILL.md` and a `.state` README]
- [x] CHK-021 [P0] Every relative link inside `references/` resolves [evidence: 68 relative `.md` links checked, 0 broken]
- [x] CHK-022 [P0] Every app path claim resolves [evidence: `scan-skill-references.mjs` reports `broken : 0` for SKILL.md and the four entry documents]
- [x] CHK-023 [P0] The skill README no longer claims dead paths [evidence: the same scanner went from `broken : 9` at `origin/main` to `broken : 0`]
- [x] CHK-024 [P0] The skill metadata audit passes [evidence: `ci-skill-root-metadata.cjs` reports `checked=14 passed=14 failed=0`]
- [x] CHK-025 [P1] Every command the app documents cite exists [evidence: the five `scripts/*.mjs` paths and four npm scripts named in `STORYBOOK.md` and `ARCHITECTURE.md` were each confirmed present]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-030 [P0] The loose set is fully grouped [evidence: `references/` holds ten folders and three workflow symlinks; no loose subject document remains]
- [x] CHK-031 [P0] Each new folder routes rather than only lists [evidence: `design-system.md`, `conventions.md` and `svelte.md` each open with a pick-by-what-you-are-doing table]
- [x] CHK-032 [P0] Every referrer was repointed [evidence: `SKILL.md`, `README.md`, `ROUTER.md`, `leaf-manifest.json`, three sibling references, 25 playbook scenarios and three asset checklists]
- [x] CHK-033 [P1] `ARCHITECTURE.md` records the presentation gates [evidence: a seven-row Presentation Gates table plus the one-theme and non-byte-stable caveats, where the section previously listed none]
- [x] CHK-034 [P1] `STORYBOOK.md` covers the designer surfaces and the archive [evidence: a For designers section and a screenshot archive section; the gate ladder went from two commands to six]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-040 [P0] No behaviour changed [evidence: documentation only, apart from the regenerated `leaf-manifest.json`, which the metadata audit produced]
- [x] CHK-041 [P0] The security reference is unmoved and still reachable [evidence: `references/standards/security.md` is untouched; `ARCHITECTURE.md` section 9 now names it at its real path]
- [x] CHK-042 [P0] No sibling surface was modified [evidence: an over-broad sweep caught `sk-code-obsidian`, which holds same-named documents; it was reverted and `git status` for that path is empty]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-050 [P1] The version was bumped and a changelog written [evidence: `SKILL.md` version 0.1.9.0 and `changelog/v0.1.9.0.md`]
- [x] CHK-051 [P1] The changelog states why the folders exist [evidence: `changelog/v0.1.9.0.md` records that routing across a flat list of fourteen costs fourteen descriptions, where four routers cost four]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-060 [P1] The new folders follow the established naming [evidence: four purpose-named folders beside the six existing ones, each with a `<folder>/<folder>.md` entry]
- [x] CHK-061 [P1] A document that is its own entry kept its filename [evidence: `verification.md` became `verification/verification.md` with no content edit]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

All items complete. The two open questions in `spec.md` are decisions for the operator rather than gaps: whether the sibling `sk-code-obsidian` surface should get the same treatment, and whether the removed session goal files should be purged from history rather than only from the tip.
<!-- /ANCHOR:summary -->
