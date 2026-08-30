---
title: "Review findings — close the gaps an independent read exposed"
description: "An independent review of a day's work found two shipped defects and five gaps behind green gates. The defects are fixed; this packet closes the gaps that let them through — an unchecked config directory, a formatter that could rewrite vendored repos, two undeclared dependencies, and goal logs that contradicted their own packet."
trigger_phrases:
  - "review findings"
  - "storybook typecheck gap"
  - "prettier svelte parser"
  - "undeclared playwright react"
importance_tier: "important"
contextType: "specification"
_memory:
  continuity:
    packet_pointer: "specs/009-review-findings"
    last_updated_at: "2026-08-30T15:00:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Closed the five gaps behind the shipped defects"
    next_safe_action: "None; the packet is closed."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Review findings — close the gaps an independent read exposed

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 1 |
| **Priority** | P1 |
| **Status** | Complete |
| **Created** | 2026-08-30 |
| **Scope** | Tooling configuration and dependency declarations; one packet's goal logs |
| **Constraint** | Close the gaps, do not reformat the codebase. Level 1 by `recommend-level.sh` (28/100), phase score 0/50 — phases explicitly not recommended |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
An independent review of a day's work found two defects that every green gate had missed, and both
sat in gaps rather than in the code: one in a gate that had stopped executing, one behind a test whose
name promised an assertion it did not make. The defects were fixed immediately. The gaps that let them
through were not, and each is a place where a check reports success without having looked:

- `app-mobile/.storybook/` sat outside the typecheck `include`, so config and manager code was never
  type-checked at all.
- `prettier` had no Svelte parser, so every `.svelte` file failed to parse rather than being checked —
  which is how tab-indented lines were written into space-indented files unnoticed.
- `format:check` reported **22,617** warnings because it swept `specs/`, including six read-only
  research repositories vendored for reference. Its sibling `npm run format` would have rewritten them.
- `playwright` and `react` were both undeclared and resolved from hoisted leftovers. An ordinary
  `npm install` during this work removed `playwright`, silently breaking four gates.
- The autodocs packet's four goal logs still read "Phase not started · Pending" while the packet
  reported complete. `validate.sh` returned `PASSED` throughout, because that check is syntactic.

### Purpose
Make each of those checks capable of failing honestly, and declare the two dependencies the repository
was relying on by accident.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- Typecheck coverage for the catalog configuration directory, and the errors that surfaced when it gained coverage.
- A Svelte parser for the formatter, and an ignore list that keeps it away from vendored repositories.
- Declaring `playwright` and `react`.
- Reconciling one packet's goal logs with its own recorded state.

### Out of Scope
- Reformatting the codebase. 488 files do not conform to prettier; that is a large mechanical diff which would move screenshots and is worth doing deliberately, not as a side effect.
- The 26 packets in this repository failing `ANCHORS_VALID`. Pre-existing, untouched by this work.
- The catalog's written descriptions. Nothing gates them against the components they describe; that gap is recorded, not closed.

### Files to Change
- `app-mobile/tsconfig.json`, `.prettierrc.json`, `.prettierignore`, `package.json`, `app-mobile/package.json`.
- `app-mobile/.storybook/{preview.ts,editable-seams.svelte,token-playground.svelte}` for the errors coverage exposed.
- `specs/008-storybook-autodocs/**/goal.md`.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers
- REQ-001 The catalog configuration directory is type-checked, and typecheck exits 0 with it covered.
- REQ-002 `playwright` and `react` are declared where they are used, so an install cannot silently remove them.
- REQ-003 The formatter cannot reach `specs/`, and `npm run format` cannot rewrite a vendored research repository.

### P1 - Required
- REQ-004 The formatter parses Svelte, so a style check on a `.svelte` file reports style rather than a parser error.
- REQ-005 The autodocs packet's goal logs match the state its own documents record.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- `npm run typecheck` covers more files than before and exits 0.
- Removing either declared dependency is visible in a manifest rather than silent.
- `format:check` scans only this repository's own source, and its warning count reflects that.
- No goal log contradicts its packet.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- Adding a directory to the typecheck include surfaces errors that were always there. Four of the six found were pre-existing; leaving them would trade an invisible gap for a permanently red gate.
- Configuring the Svelte parser makes `format:check` report real non-conformance for the first time. It was already failing, so this is not a regression, but it is now failing for a reason worth acting on.
- Declaring `react` records a dependency the repository already had through Storybook's manager. It does not reach the application bundle, and the no-`.tsx` property is unaffected.
<!-- /ANCHOR:risks -->
