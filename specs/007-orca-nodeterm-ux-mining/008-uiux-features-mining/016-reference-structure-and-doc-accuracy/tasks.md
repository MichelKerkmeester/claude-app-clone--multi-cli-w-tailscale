---
title: "Task ledger - Phase 16 Reference structure and documentation accuracy"
description: "The task ledger for grouping the reference set into subject folders and correcting the app documents whose paths the SvelteKit migration invalidated."
trigger_phrases:
  - "reference structure and doc accuracy task ledger"
  - "reference structure and doc accuracy phase"
  - "task ledger"
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

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Tasks: Phase 16 Reference structure and documentation accuracy

<!-- ANCHOR:notation -->
## TASK NOTATION

`[ ]` open · `[x]` done with evidence naming a real artifact · a deferral states its reason.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] T1.1 Read every loose reference description and cluster by the question it answers [evidence: fourteen descriptions read; four clusters emerged - the look, proving a change, how source reads, runtime correctness]
- [x] T1.2 Confirm the existing folder convention before extending it [evidence: `references/` already held `operations/`, `quality/`, `release/`, `setup/`, `standards/`, `storybook/`, each with a `<folder>/<folder>.md` entry where one exists]
- [x] T1.3 Establish that folders must group by subject, not by intent [evidence: the skill `RESOURCE_MAP` routes by intent and lists `comment-grammar.md` under two buckets, so a folder-per-intent split would duplicate documents]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] T2.1 Move the fourteen documents into four subject folders [evidence: `git mv` into `design-system/`, `verification/`, `conventions/`, `svelte/`; `verification.md` became its own folder entry unchanged]
- [x] T2.2 Author a routing entry document for the three folders lacking one [evidence: `design-system.md`, `conventions.md`, `svelte.md`, each opening with a pick-by-what-you-are-doing table]
- [x] T2.3 Rewrite the relative links inside the moved documents [evidence: 14 markdown links repointed across 6 files by a map-driven rewrite]
- [x] T2.4 Convert backticked sibling mentions into resolvable links [evidence: 38 bullet-list mentions across 14 files became relative links; they resolved to nothing before the move]
- [x] T2.5 Rewrite the SKILL.md reference table folder-first [evidence: 17 file rows carrying a duplicate `comment-grammar.md` became 11 folder rows; the redundant folder bullet list was removed with it]
- [x] T2.6 Repoint the resource map, the router and the leaf manifest [evidence: `DEFAULT_RESOURCE` and three intent buckets now lead with the folder routers; `ROUTER.md` 27 paths rewritten; `leaf-manifest.json` regenerated]
- [x] T2.7 Correct the stale repository paths in the skill README [evidence: `apps/pi-remote-web/`, `apps/pi-remote-relay/`, `src/style.css`, `catalog.html` replaced with `app-mobile/`, `app-relay/`, `app-mobile/src/app.css` and the Storybook catalog]
- [x] T2.8 Correct the stale paths in `ARCHITECTURE.md` [evidence: the three moved `shared/data/` modules repointed to `shared/state/` and `shared/transport/`; six dead `docs/*.md` references repointed into the skill's reference folders]
- [x] T2.9 Record the presentation gates in `ARCHITECTURE.md` [evidence: a Presentation Gates table listing seven checkpoints the machine-gate section omitted entirely, plus the one-theme and non-byte-stable caveats]
- [x] T2.10 Bring `STORYBOOK.md` up to date [evidence: a For designers section covering the playground, the `flips` badge, state controls and editable seams; a screenshot archive section; the gate ladder expanded from two commands to six]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] T3.1 Prove no broken link was introduced [evidence: `check-markdown-links.cjs` reports 15,191 links and 5 broken, all 5 pre-existing in `sk-code-obsidian` and a `.state` README]
- [x] T3.2 Prove every relative link inside `references/` resolves [evidence: 68 relative `.md` links checked, 0 broken]
- [x] T3.3 Prove every app path claim resolves [evidence: `scan-skill-references.mjs` reports `broken : 0` for SKILL.md, README.md and all four entry documents; README went from 9 broken to 0]
- [x] T3.4 Prove the sibling surface is untouched [evidence: an over-broad sweep caught `sk-code-obsidian`, which holds same-named documents; reverted with `git checkout --`, and `git status` for that path is empty]
- [x] T3.5 Run the skill metadata audit from the final state [evidence: `ci-skill-root-metadata.cjs` reports `checked=14 passed=14 failed=0`]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

- [x] Every reference document kept its content and only changed location [evidence: the move used `git mv`; the diff shows renames plus link-only edits]
- [x] Every relative link inside `references/` resolves [evidence: 68 checked, 0 broken]
- [x] No sibling surface skill was modified [evidence: `sk-code-obsidian` reverted and confirmed clean]
- [x] Every path an app document claims resolves against the real tree [evidence: the scanner reports 0 broken for the README; the scripts and npm scripts cited by both app documents were each confirmed present]
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` - the requirements this ledger serves.
- `plan.md` - the sequenced approach.
- `checklist.md` - the verification checklist.
- `../spec.md` - the phase parent.
<!-- /ANCHOR:cross-refs -->
