---
title: "Child 002 plan — shared tree split"
description: "The seven-folder target, the order that keeps the tree building, and why the existence check rather than the build is the gate."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/012-naming-and-structure/002-shared-tree-split"
    last_updated_at: "2026-08-23T14:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Plan authored; one commit for the whole split."
    next_safe_action: "Wait for child 001's manifest."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 002 plan — shared tree split

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Move all 28 files out of `shared/data/` into seven folders in one commit, with the specifiers rewritten
from the manifest in the same commit.

One commit rather than seven, because a half-emptied `shared/data/` is the worst intermediate state
this packet can produce: it builds, it runs, and it teaches two rules at once.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

`npm run build` and `npm run typecheck` before the commit, as everywhere in this packet.

The gate that actually decides this child, though, is neither of those. It is `test -d
app-mobile/src/shared/data` returning false, and a workspace grep for `$shared/data/` returning zero.
A partial split passes the build and fails both of those, which is exactly the asymmetry to design
around.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

The target, decided in child 001 and executed here:

```
shared/
  transport/      relay.ts  use-sync-socket.svelte.ts  auth.ts  cache.ts
  state/          state.ts  runtime.ts  app-state.svelte.ts  turns.ts
                  todo-state.ts  todo-model.ts  runtime-issues.ts  use-runtime.svelte.ts
  commands/       commands.ts  host-command-catalog.svelte.ts  insert-slash-command.ts
                  rank-host-commands.ts  submit-slash-draft.ts  use-slash-trigger.ts
                  plan-mode-shortcut.ts
  catalog/        model-catalog.ts  model-switcher-strings.ts  catalog-registry.ts  effort.ts
  format/         format.ts  view-helpers.ts  attention.ts
  viewport/       use-visual-viewport-anchor.svelte.ts
  fixtures/       demo.ts
```

Seven folders for six responsibilities plus fixtures. `fixtures/` earns its own folder not because
`demo.ts` is large but because it is the one thing in `shared/` that ships to stories rather than to
users, and that distinction should be visible from the tree.

Ten of the twenty-eight files are camelCase today and take their kebab-case rename in the same move.
Doing it in one step rather than two halves the specifier churn on the most-imported folder in the app.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1: Create and move

Create the seven folders, move all 28 files per the manifest, and take the ten camelCase renames in
the same step.

### Phase 2: Rewrite and verify

Run the generated rewrite over the workspace, then confirm three things beyond the build: no
`$shared/data/` specifier survives, the two deep-relative specifiers were rewritten, and the workers
still resolve. Commit moves, rewrite and green build together.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

`svelte-check` proves every specifier resolves, which is most of what a move can break.

`npm run test:web` proves the moved modules still behave — worth running here specifically because
several of these files are the reducers and the transport, so a subtle breakage would show as a
behavioural failure rather than a type error.

No new test. There is no new behaviour; there is a scan and a grep.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- Child 001's manifest and rewrite script. Neither is extended by hand here.
- 013 must not run concurrently — it touches the same files.
- Child 003 runs after, and its `pages/**` renames assume these paths are settled.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

One commit, so rollback is one `git revert`. Nothing migrates, nothing is deleted, and no external
system holds a source path.

The asymmetry worth stating: reverting is cheap, but reverting *halfway* is not — an aborted split
that leaves some files moved is the state this plan puts in a single commit specifically to prevent.
<!-- /ANCHOR:rollback -->
