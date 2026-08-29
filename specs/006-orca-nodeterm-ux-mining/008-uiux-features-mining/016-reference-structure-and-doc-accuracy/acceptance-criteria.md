---
title: "Acceptance Criteria: Phase 16 Reference structure and documentation accuracy"
description: "The criteria this phase must satisfy before it may be closed, each one met by a resolver reading the real tree rather than by inspection."
trigger_phrases:
  - "acceptance criteria"
  - "closure gate"
  - "ac traceability"
  - "waiver adr"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/008-uiux-features-mining/016-reference-structure-and-doc-accuracy"
    last_updated_at: "2026-08-29T17:20:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Authored the closure gate; all eight criteria met by resolver output."
    next_safe_action: "Packet closed; no follow-up owed inside this phase."
    completion_pct: 100
---
# Acceptance Criteria: Phase 16 Reference structure and documentation accuracy

<!-- SPECKIT_TEMPLATE_SOURCE: acceptance-criteria | v2.2 -->
<!-- HVR_REFERENCE: .opencode/skills/sk-doc/shared/references/hvr-rules.md -->

> This document decides whether the packet may close. A packet is closeable when
> every row below is `Met`, `Waived` or `Superseded`. A `Waived` or `Superseded`
> row MUST name an ADR that exists in `decision-record.md`.

---

<!-- ANCHOR:metadata -->
## 1. METADATA

**Packet:** 006-orca-nodeterm-ux-mining/008-uiux-features-mining/016-reference-structure-and-doc-accuracy
**Level:** 2
**Status:** Complete
**Date:** 2026-08-29
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:criteria -->
## 2. CRITERIA

One row per criterion. `AC-ID` is stable once written: supersede a criterion, never renumber it.

| AC-ID | REQ | Given / When / Then | Verification | Status | Waiver |
|-------|-----|---------------------|--------------|--------|--------|
| AC-001 | REQ-001 | Given a reference document, When it moves into a subject folder, Then its content is unchanged and only its location and links differ | The move used `git mv`, so the diff shows renames plus link-only edits; no assertion in any moved document was rewritten | Met | - |
| AC-002 | REQ-002 | Given the moved set, When every relative link inside `references/` is resolved, Then all of them resolve | 68 relative `.md` links checked against the real tree, 0 broken — counted rather than sampled | Met | - |
| AC-003 | REQ-003 | Given a sibling surface holding same-named documents, When the referrer sweep runs, Then that surface is byte-unchanged | An over-broad sweep did catch `sk-code-obsidian`; it was reverted with `git checkout --` and `git status` for that path is empty | Met | - |
| AC-004 | REQ-004 | Given an app document, When each repository path it claims is resolved, Then every one exists | `scan-skill-references.mjs` on the skill README went from `broken : 9` at `origin/main` to `broken : 0`; the five scripts and four npm scripts cited by `ARCHITECTURE.md` and `STORYBOOK.md` were each confirmed present | Met | - |
| AC-005 | REQ-005 | Given a new folder, When a reader opens its entry document, Then a table routes them to the right contract by what they are doing | `design-system.md`, `conventions.md` and `svelte.md` each open with a pick-by-what-you-are-doing table; `verification.md` already served that role | Met | - |
| AC-006 | REQ-006 | Given the routing surfaces, When they are searched for the old flat paths, Then none remains outside the historical changelog | `SKILL.md`, `README.md`, `ROUTER.md`, `leaf-manifest.json`, three sibling references, 25 playbook scenarios and three asset checklists repointed; `ci-skill-root-metadata.cjs` reports `checked=14 passed=14 failed=0` | Met | - |
| AC-007 | REQ-007 | Given `ARCHITECTURE.md`, When its validation section is read, Then the presentation gates appear alongside the machine gates | A seven-row Presentation Gates table plus the one-theme and non-byte-stable caveats, where the section previously listed none of them | Met | - |
| AC-008 | REQ-008 | Given `STORYBOOK.md`, When a designer reads it, Then the playground, state controls, editable seams and the screenshot archive are described | A For designers section and a screenshot archive section were added; the verification ladder went from two commands to six | Met | - |
<!-- /ANCHOR:criteria -->

---

<!-- ANCHOR:closure -->
## 3. CLOSURE STATEMENT

**Closeable:** Yes

The criterion that carried this packet is AC-004. The reference regrouping is an ergonomic
improvement and would have been worth doing on its own, but the documents describing the app to a
newcomer had been naming directories the repository has not had since the SvelteKit migration —
`apps/pi-remote-web/`, `src/style.css`, a `docs/` folder holding six files that live in the skill.
A map that confidently names things that do not exist is worse than no map, and no gate was looking
at it, because prose read by humans is exactly what the machine suite does not check.

Consciously left out: the sibling `sk-code-obsidian` surface, which has the same flat shape and its
own owner, and the five pre-existing broken links the repository-wide guard reports, four of which
are in that sibling. Both are recorded as open questions rather than silently absorbed.
<!-- /ANCHOR:closure -->
