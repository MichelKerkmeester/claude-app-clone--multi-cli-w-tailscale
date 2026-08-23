---
title: "Child 001 tasks — naming grammar and rename manifest"
description: "Task ledger for the taxonomy sign-off, the rename manifest, the generated rewrite, and the two proving-ground batches."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/012-naming-and-structure/001-grammar-and-manifest"
    last_updated_at: "2026-08-23T14:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Task ledger authored; all tasks open."
    next_safe_action: "Answer T1.1, then build the manifest."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Child 001 tasks — naming grammar and rename manifest

---

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred or superseded with a stated reason.

Every rename task means three things landing in one commit: the `git mv` set, the specifier rewrite
generated from the manifest, and a green build plus typecheck. A task is not done until all three hold.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [ ] **T1.1** Operator confirms the `shared/` taxonomy and the closed kind-prefix list. Blocking —
      the tree is a design decision and nothing should move before it is settled.
- [ ] **T1.2** Build the rename manifest as data: one row per file, old path and new path, covering
      all 148 in-scope source files plus their stories and tests.
- [ ] **T1.3** Reconcile the manifest's row count against a fresh file count. A manifest that covers
      most of the tree is how a rename becomes partial.
- [ ] **T1.4** Generate the specifier-rewrite script from the manifest. Generated, not hand-written —
      a hand-edited rewrite is free to disagree with the moves, and that disagreement is the failure
      this packet exists to avoid.
- [ ] **T1.5** Dry-run the rewrite and read the diff. Confirm the `.js`-suffix convention on `.ts`
      imports survives the stem change, and that `.svelte.ts` double extensions are not truncated.
- [ ] **T1.6** Confirm the completeness-scan command excludes SvelteKit reserved names explicitly
      (`+page`, `+layout`, `+error`, `[param]` segments), not by accident of the pattern.
- [ ] **T1.7** Confirm 011 has landed and 013 is not running concurrently.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

**Shared primitives**

- [ ] **T2.1** Create the six primitive sub-folders: `button/`, `menu/`, `sheet/`, `choice/`,
      `disclosure/`, `a11y/`.
- [ ] **T2.2** Move and rename the 18 primitive files into them, kind-first.
- [ ] **T2.3** Perform every case-only rename as a two-step through a temporary name, and verify with
      `git status` that a rename was staged rather than silently swallowed.
- [ ] **T2.4** Confirm no file remains directly under `shared/primitives/`. A leftover is the visible
      symptom of a batch that stopped early.
- [ ] **T2.5** Run the generated rewrite for this batch and commit moves, rewrite and build together.

**Shared chrome**

- [ ] **T2.6** Rename the five `shared/chrome/` components in place, case-only, two-step each.
- [ ] **T2.7** Run the generated rewrite for this batch and commit atomically.

**Hand-off**

- [ ] **T2.8** Confirm the manifest, rewrite script and scan command are in a state children 002 and
      003 consume without extending by hand.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [ ] **T3.1** `npm run build` exit 0.
- [ ] **T3.2** `npm run typecheck` exit 0 — the primary import-integrity proof.
- [ ] **T3.3** `npm run test:web` exit 0, verified by content rather than by a piped exit status.
- [ ] **T3.4** `git log --follow` spot-check on three case-only renames confirms git recorded renames,
      not delete-and-add pairs.
- [ ] **T3.5** The backend suite stays green, run against the four real test directories explicitly.
- [ ] **T3.6** `validate.sh … --strict` exit 0 through the script's realpath.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

The grammar is decided and recorded, the manifest exists as data with a rewrite generated from it, and
twenty-three files have moved through that process with git recording every rename.

The child does not close on the file moves alone. Its real deliverable is the manifest, and a manifest
the next two children have to extend by hand is a manifest that failed.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` — scope, requirements, edge cases and the risk matrix.
- `plan.md` — the target tree, batch order, critical path and rollback.
- `checklist.md` — barrier sign-off with evidence.
- `decision-record.md` — why kebab-case, why kind-first, how `shared/` was split, why `routes/` is out.
- `../002-shared-tree-split/tasks.md` — consumes the manifest.
- `../003-pages-and-tooling/tasks.md` — consumes the manifest and closes the barrier.
- Program goal: `../../goal.md`.
<!-- /ANCHOR:cross-refs -->
