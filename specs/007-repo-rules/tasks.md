---
title: "Task ledger - Repo rules"
description: "The task ledger for establishing REPO RULES.md from verified facts and improving it against five independent research passes."
trigger_phrases:
  - "repo rules task ledger"
  - "repo rules packet"
  - "task ledger"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-repo-rules"
    last_updated_at: "2026-08-29T19:00:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Authored the packet and dispatched five research passes over the rules file."
    next_safe_action: "Packet closed; no follow-up owed inside this phase."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Tasks: Repo rules

<!-- ANCHOR:notation -->
## TASK NOTATION

`[ ]` open · `[x]` done with evidence naming a real artifact · a deferral states its reason.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] T1.1 Establish the boundary against the shared rules file [evidence: `AGENTS.md` is a symlink to the Public monorepo's shared file; the document states the precedence - shared wins on rules, this file wins on paths, commands and numbers]
- [x] T1.2 Verify the facts before writing them [evidence: `token-identity.mjs verify` reports 39 goldens; one `app.css` against 95 scoped `<style>` blocks; `MANIFEST.json` reports 337 stories, 311 captured, 26 visually empty]
- [x] T1.3 Confirm every gate script exists [evidence: nine `scripts/*.mjs` gate scripts checked present; seven npm scripts resolved against the root and web `package.json`]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] T2.1 Write the surface-skill routing section [evidence: a folder table naming each reference folder's entry document, with the note that `verification/` and `svelte/` hold merged documents rather than routers]
- [x] T2.2 Write the verification ladder [evidence: behaviour gates and presentation gates as separate blocks, with the reason the second exists - the first cannot see whether a surface renders correctly]
- [x] T2.3 Write the design-system section [evidence: `token-identity.mjs` named as the sole authority over 39 goldens; the one-`app.css`-against-95-scoped-blocks ownership rule; the CSP reason values cannot be read from a browser]
- [x] T2.4 Write the catalog and archive contract [evidence: port 6006, the one-writer rule for `storybook-static`, the measured non-determinism, and the pinned clock in three scripts that move together]
- [x] T2.5 Write the fail-closed and frozen-seam section [evidence: never invent a host field, no production API for a story, and the composer mutation fence at `session-composer.svelte:599`]
- [x] T2.6 Write the known baselines and the git and spec-kit traps [evidence: the five protected repositories, the symlink no-op, and the validator's silent refusal to run]
- [x] T2.7 Fold the confirmed research findings into the document [evidence: the `playwright` gap, the macOS-only `catalog-smoke-cdp.mjs`, the `boot.mjs` floors and the typecheck five-of-six gap]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] T3.1 Resolve every cited path [evidence: nine skill reference documents and every `scripts/*.mjs` path confirmed present]
- [x] T3.2 Check every npm script is defined [evidence: seven scripts resolved against the root and web `package.json`]
- [x] T3.3 Falsify what was recalled rather than measured [evidence: two claims were wrong - the composer fence is at line 599 not the remembered ~687, and the named plan-mode test file does not exist under that name]
- [x] T3.4 Drop a warning that no longer applies [evidence: the root `npm test` names five explicit directories, so the bare-positional sweep it warned about was already fixed; rewritten as a do-not-reintroduce note]
- [x] T3.5 Disposition every research finding [evidence: six falsified claims and four added facts tabled in `implementation-summary.md`]
- [x] T3.6 Validate the packet strict [evidence: `validate.sh specs/007-repo-rules --strict` reports `RESULT: PASSED`]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

- [x] Every path, command and number in the document is verified rather than recalled [evidence: the counts, paths and scripts each checked against the tree; two recalled claims corrected]
- [x] Five research reports exist and every finding is dispositioned [evidence: five files under `research/`, 16,677 words total]
- [x] The packet validates strict [evidence: `RESULT: PASSED` with 0 errors]
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` - the requirements this ledger serves.
- `plan.md` - the sequenced approach.
- `checklist.md` - the verification checklist.
- `research/` - one report per research pass.
<!-- /ANCHOR:cross-refs -->
