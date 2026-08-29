---
title: "Phase 16 - Reference structure and documentation accuracy"
description: "Group the surface skill's fourteen loose reference documents into four subject folders with routing entry documents, and correct the two app documents that describe a repository layout the SvelteKit migration replaced. Chain: after 015-storybook-designer-adjustability."
trigger_phrases:
  - "reference structure and doc accuracy spec requirements"
  - "reference structure and doc accuracy phase"
  - "skill reference folders"
  - "architecture storybook doc accuracy"
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

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 16 - Reference structure and documentation accuracy

> **Phase links** - Parent: [`../spec.md`](../spec.md) · Master plan: [`../plan.md`](../plan.md) · Previous: [`../015-storybook-designer-adjustability/spec.md`](../015-storybook-designer-adjustability/spec.md)

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent** | `008-uiux-features-mining` |
| **Level** | 2 |
| **Priority** | P2 |
| **Status** | Complete |
| **Created** | 2026-08-29 |
| **Scope** | The `sk-code-mobile-cli` surface skill in the Public monorepo, plus two app documents |
| **Constraint** | Documentation only. No app source, no gate behaviour, no sibling skill may change |
| **Evidence** | A path claim is proven by a resolver that reads the real tree, not by inspection |
| **Phase chain** | after `015-storybook-designer-adjustability` |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
The surface skill's reference folder held fourteen loose documents beside six grouped ones, and the two documents that describe the app to a newcomer named directories the SvelteKit migration had removed. Both are the same failure: documentation that has stopped describing the thing it names. Choosing among the fourteen cost fourteen filename reads, and the table listing them had grown to seventeen rows carrying a duplicate. On the app side, `README.md` and `ARCHITECTURE.md` cite `apps/pi-remote-web/`, `apps/pi-remote-relay/`, `src/style.css` and a `docs/` folder, none of which the repository has had since the SvelteKit migration. A map that names directories that do not exist is worse than no map.

### Purpose
Make the reference set answer a question rather than list filenames, and make every path an app document claims resolve against the real tree. Both are measured by a resolver rather than by reading.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- Grouping the fourteen loose reference documents into four subject folders, each with a routing entry document.
- Rewriting the skill's reference table folder-first and repointing its resource map.
- Converting backticked sibling mentions into resolvable relative links.
- Correcting the stale repository paths in the skill README, `ARCHITECTURE.md` and `STORYBOOK.md`.
- Recording the presentation gates in `ARCHITECTURE.md`, which listed none of them.

### Out of Scope
- Any change to what a reference document asserts; only its location and its links move.
- The sibling `sk-code-obsidian` surface, which has its own same-named documents.
- Any app source, script or gate behaviour.
- Purging the removed session goal files from git history.

### Files to Change
- `.opencode/skills/sk-code/sk-code-mobile-cli/references/**` - the four new folders and their entry documents.
- `.opencode/skills/sk-code/sk-code-mobile-cli/SKILL.md`, `README.md` - the table, the resource map, the stale paths.
- `.opencode/skills/sk-code/ROUTER.md`, `leaf-manifest.json` - the regenerated routing surfaces.
- `ARCHITECTURE.md`, `STORYBOOK.md` - the stale paths and the missing gate ladder.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers
- REQ-001 Every reference document keeps its content; only its location and its links change.
- REQ-002 Every relative link inside `references/` resolves after the move.
- REQ-003 No sibling surface skill is modified, including ones holding same-named documents.
- REQ-004 Every repository path an app document claims resolves against the real tree.

### P1 - Required (complete OR user-approved deferral)
- REQ-005 Each new folder carries an entry document that routes by what the reader is doing.
- REQ-006 The skill's resource map and router point at the new locations, with no stale path left.
- REQ-007 `ARCHITECTURE.md` records the presentation gates, which it previously omitted entirely.
- REQ-008 `STORYBOOK.md` describes the designer surfaces and the archive, which it previously omitted.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- The repository-wide markdown link guard reports no broken link introduced by this work.
- The app-path resolver reports zero broken claims for the skill README and every entry document.
- Every relative link inside `references/` resolves, counted rather than sampled.
- The skill metadata audit passes and the leaf manifest matches the tree.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- A path sweep is the obvious implementation and the dangerous one: a sibling skill holds documents with identical filenames, so a substring rewrite silently corrupts it. This happened and was reverted; the guard is to scope every sweep to one skill root and diff the result.
- Moving a document breaks the relative links inside it in a way nothing reports, because a backticked mention is not a link and never resolved to begin with.
- The two app documents are read by newcomers rather than by gates, so their staleness had persisted through every green build.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:nfr -->
## L2: NON-FUNCTIONAL REQUIREMENTS

### Performance
Folder routing reduces the read needed to reach a contract from fourteen filenames to four entry documents.

### Security
No behaviour changes. The security reference moves nowhere; only documents citing it are repointed.

### Reliability
Every entry document is checked by the same resolver that guards the rest of the surface, so a path that rots is reported rather than discovered.
<!-- /ANCHOR:nfr -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

- Should the sibling `sk-code-obsidian` surface receive the same folder treatment? It has the same flat-list shape, but it is a different surface with its own owner and was deliberately left untouched here.
- Should the removed session goal files be purged from history rather than only from the tip? That is destructive and needs an explicit decision.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:edge-cases -->
## L2: EDGE CASES

### Data Boundaries
A document that is its own folder's entry keeps its filename, so `verification.md` became `verification/verification.md` without an edit.

### Error Scenarios
A relative link one level deeper resolves to nothing rather than erroring, so the check counts resolutions instead of trusting the absence of a failure.

### State Transitions
The changelog records the previous flat paths, so an older changelog entry deliberately keeps them rather than being rewritten to a location that did not exist when it shipped.
<!-- /ANCHOR:edge-cases -->

---

<!-- ANCHOR:complexity -->
## L2: COMPLEXITY ASSESSMENT

Level 2. Fifty-three documents across two repositories, mechanical in shape but with a real corruption risk from same-named siblings; every claim is checked by a resolver.
<!-- /ANCHOR:complexity -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `plan.md` - the sequenced approach for this phase.
- `tasks.md` - the task ledger.
- `checklist.md` - the verification checklist.
- `acceptance-criteria.md` - the closure gate.
- `../spec.md` - the phase parent.
<!-- /ANCHOR:cross-refs -->
