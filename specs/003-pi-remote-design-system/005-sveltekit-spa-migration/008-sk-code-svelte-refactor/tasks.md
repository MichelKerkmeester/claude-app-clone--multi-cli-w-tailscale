---
title: "Child 008 tasks — sk-code-mobile-cli React to Svelte refactor"
description: "Task ledger for the surface-skill refactor, its verification, its isolated-worktree landing, and the merge that remains open."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/008-sk-code-svelte-refactor"
    last_updated_at: "2026-08-24T05:55:14Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Superseded by 019; the one salvageable deliverable (R4) landed at v1.4.0.0."
    next_safe_action: "None — superseded; the branch stays as history, unmerged."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 008 tasks

---

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred or superseded with a stated reason.
This packet edits the Public monorepo through the `.opencode` symlink, so every task carries the
isolated-worktree constraint implicitly.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Read the sibling `004-sk-code-mobile-cli-mode` packet's build strategy for the hub
      contract before editing anything.
- [x] **T1.2** Establish the landing constraint up front: the shared Public checkout's index already
      holds thousands of another session's files, so nothing may be staged there.
- [x] **T1.3** Separate what changes from what is carried. The framework medium changes; the token
      model, grammar meaning, guardrail semantics and design-reference UI are carried verbatim.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** `SKILL.md` — app path, Svelte detection signals, routing map, the Svelte authoring
      contract, and a11y parity elevated to a first-class manually verified deliverable.
      Version 1.1.0.0 to 1.2.0.0.
- [x] **T2.2** New `references/svelte-conventions.md` carrying the doctrine: runes mapping, the
      `$shared` alias and its `fileURLToPath` trap, `:global()` ownership routing, react-aria to Bits
      UI with the a11y blind spot, interactive state without native `:hover`, the `$effect`
      self-invalidation trap, the virtualizer's store API, and atomic-commit discipline.
- [x] **T2.3** `references/verification.md` rewritten to the browser-free CSS-corpus gate.
- [x] **T2.4** `ds-grammar.md` and `editability-guardrails.md` re-expressed for `app.css` plus scoped
      component blocks; the stale hardcoded fence count replaced with count-fresh guidance.
- [x] **T2.5** Path swaps across the three checklists, `token-library.md`, `retint-recipes.md`,
      `README.md` and `setup/install-and-onboarding.md`.
- [x] **T2.6** `changelog/v1.2.0.0.md` documenting the refactor.
- [~] **T2.7** The shared `workflow-implement/debug/verify.md` were **not** rewritten. They are
      symlinks into `shared/references/`, used by `sk-code-webflow` and `sk-code-opencode` too, so
      specialising them would impose Svelte on two surfaces that are not Svelte.
- [~] **T2.8** One authoring pass instead of the planned draft-then-finalize. The migration had
      already cut over, so the proven patterns were folded in directly — removing a
      draft-from-assumptions step whose output would have been rewritten anyway.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** `package_skill.py --check` — PASS, 12 pre-existing warnings, 0 new.
- [x] **T3.2** `validate_document.py` — 0 issues across all 12 changed and new docs.
- [x] **T3.3** `ci-skill-root-metadata.cjs` pre-push gate — passed=13, failed=0, after regenerating
      the parent hub's `leaf-manifest.json`.
- [x] **T3.4** Residual-reference sweep — no React-stack instruction survives where it could misguide
      a dispatch.
- [x] **T3.5** Landed via isolated worktrees on `branches/008-sk-code-mobile-cli-svelte`, allocated by
      sk-git rather than hand-named; origin tip `2b7622c32d` across three commits. Both worktrees
      removed; the shared checkout was never staged.
- [~] **T3.6** Correct `svelte-conventions.md` to the Format A divider grammar. It currently teaches
      the compact `// ─── Label ───` form, while the authoritative contract is a `// ` prefix plus
      exactly 67 box-drawing characters around a numbered label — and 007-EXT converted the app to
      Format A across 45 files and 213 dividers. The surface teaches what the codebase no longer does. [superseded: the branch is abandoned, not merged, so `svelte-conventions.md` is not corrected in place. The correct Format-A grammar reached the live skill by a different route — packet 019 rewrote `SKILL.md` §3b at v1.3.0.0 and it validates broken-0]
- [~] **T3.7** Merge the branch into the live `skilled/v4.0.0.0`. Held until T3.6 lands, because
      merging a conventions authority that teaches a superseded grammar propagates it to every
      subsequent dispatch. [superseded: merging the branch would REGRESS the live skill, which 019 already made correct, and its `v1.2.0.0` changelog collides with the shipped one. The one deliverable unique to the branch and worth keeping — the R4 story-upkeep rule — was salvaged into the live skill at v1.4.0.0 (`3eece78aa8`). The branch is left in place as history, not merged]
- [~] **T3.8** No dry-run dispatch has been executed against the merged surface, since it is not
      merged. The structural gates confirm form, not that each rewritten passage is right about Svelte.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

The refactor is authored, verified and pushed. It is not yet in force: until the branch merges, no
workflow loads it.

Two tasks remain open and they are ordered — the divider convention must be corrected before the merge
rather than after, because the whole point of this surface is that dispatches copy what it teaches.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` — scope, requirements and the surface contract.
- `plan.md` — what changes versus what is carried, and the landing constraint.
- `checklist.md` — sign-off with evidence.
- `implementation-summary.md` — what shipped and the two outstanding items.
- `../007-verify-and-cutover/comment-grammar-reference.md` — the grammar this surface must encode.
- Program goal: `../goal.md`.
<!-- /ANCHOR:cross-refs -->
