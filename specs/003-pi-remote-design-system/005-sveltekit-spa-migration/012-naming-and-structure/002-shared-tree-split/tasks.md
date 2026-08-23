---
title: "Child 002 tasks — shared tree split"
description: "Task ledger for the 28-file redistribution, the camelCase renames taken in the same move, and the specifier rewrite."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/012-naming-and-structure/002-shared-tree-split"
    last_updated_at: "2026-08-23T14:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Task ledger authored; all tasks open."
    next_safe_action: "Wait for child 001's manifest, then create the seven folders."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 002 tasks — shared tree split

---

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred or superseded with a stated reason.

The whole split lands in one commit: the moves, the generated rewrite and a green build. A
half-emptied `shared/data/` is the one intermediate state this child must never be left in.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Confirm child 001's manifest exists and covers all 28 `shared/data/` files.
- [x] **T1.2** Confirm the working tree is clean, so the commit's diff is only this split.
- [x] **T1.3** Confirm 013 is not running concurrently.
- [x] **T1.4** Record the current `$shared/data/` specifier count, so the post-move zero is a delta
      against a measured number rather than an assertion.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** Create `transport/`, `state/`, `commands/`, `catalog/`, `format/`, `viewport/`,
      `fixtures/` under `shared/`.
- [x] **T2.2** Redistribute the 28 files by responsibility, per the tree in `plan.md`.
- [x] **T2.3** Rename the ten camelCase modules to kebab-case in the same move, halving the specifier
      churn on the most-imported folder in the app.
- [x] **T2.4** Run the generated rewrite for the `$shared/data/…` specifiers — the largest single
      specifier impact in the packet.
- [x] **T2.5** Rewrite the two deep-relative (`../../`) specifiers. They are the only two the
      `$shared` alias does not cover, so they are the easiest to miss.
- [x] **T2.6** Confirm the worker files are reachable: they are referenced by URL construction as well
      as by import, so an import-only grep does not prove they resolve.
- [x] **T2.7** Commit moves, rewrite and green build atomically.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** `shared/data/` no longer exists.
- [x] **T3.2** A workspace grep for `$shared/data/` returns zero hits, tests and stories included.
- [x] **T3.3** `npm run build` exit 0.
- [x] **T3.4** `npm run typecheck` exit 0.
- [x] **T3.5** `npm run test:web` exit 0, verified by content rather than by a piped exit status.
- [x] **T3.6** The backend suite stays green, run against the four real test directories explicitly.
- [x] **T3.7** `validate.sh … --strict` exit 0 through the script's realpath.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

`shared/data/` is gone, its 28 files sit across seven folders each with one reason to change, and no
specifier anywhere still points at the old path.

The child does not close on a green build. A build passes over a partial split, which is precisely the
outcome the existence check and the specifier grep exist to catch.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` — scope, requirements and risks.
- `plan.md` — the seven-folder target and why it lands in one commit.
- `checklist.md` — barrier sign-off with evidence.
- `../001-grammar-and-manifest/decision-record.md` — why the tree is split this way.
- `../003-pages-and-tooling/tasks.md` — runs after; assumes these paths are settled.
- Program goal: `../../goal.md`.
<!-- /ANCHOR:cross-refs -->
