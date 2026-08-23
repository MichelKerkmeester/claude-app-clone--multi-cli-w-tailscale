---
title: "Child 001 plan — naming grammar and rename manifest"
description: "The target tree for shared/, the manifest-first sequence, the two proving-ground batches, and the rollback."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/012-naming-and-structure/001-grammar-and-manifest"
    last_updated_at: "2026-08-23T14:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Plan authored; manifest first, proving ground second."
    next_safe_action: "Close the taxonomy sign-off, then build the manifest."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Child 001 plan — naming grammar and rename manifest

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Decide, then build the tooling, then run it over twenty-three files where every mechanical trap is
present and the diff is still readable.

The order is the point. A manifest built after the first batch has already moved describes a tree that
is half old and half new, and everything derived from it inherits that.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

`npm run build` and `npm run typecheck` before each commit. A broken specifier is the only realistic
mid-batch failure and the type checker finds it immediately, which makes it worth more here than any
bespoke assertion.

Two checks are specific to this child. `git status` before the commit must show staged renames rather
than a delete-and-add pair, and `git log --follow` after it must confirm three of them. The second
matters because the first can pass on a rename git later fails to follow.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

`shared/primitives/` is 18 files in one flat list. It becomes six folders by control family:

```
shared/
  primitives/
    button/       button.svelte
    menu/         menu.svelte  menu-content.svelte  menu-item.svelte  menu-trigger.svelte
    sheet/        sheet.svelte  sheet-content.svelte  sheet-title.svelte  sheet-close.svelte
    choice/       radio-group.svelte  radio-group-item.svelte
                  toggle-group.svelte  toggle-group-item.svelte
    disclosure/   collapsible.svelte
    a11y/         aria-hide-outside.svelte.ts  interactions.ts
  chrome/         header.svelte  status-pill.svelte  theme-control.svelte
                  session-state-icon.svelte  root-error-boundary.svelte
```

`shared/chrome/` stays one folder. Five components with one shared reason to change do not need a
taxonomy imposed on them, and splitting them would be structure for its own sake.

The full `shared/data/` target tree is settled here too, because the taxonomy is one decision, but the
files move in child 002. Recording it here and executing it there is what lets the operator approve
the whole shape once instead of twice.

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

The grouping rule is *one reason to change per folder*. `transport/` changes when the wire contract
changes, `state/` when a reducer changes, `commands/` when slash handling changes. `fixtures/` is
separate from every runtime folder because `demo.ts` ships to stories rather than to users, and that
distinction should be visible without opening the file.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1: Decide

Operator confirms the taxonomy and the closed kind-prefix list. Blocking: nothing moves before it is
settled, because a rename executed against an unconfirmed tree is a rename that may run twice.

### Phase 2: Manifest and rewrite script

One row per file, old path and new path, for all 148 in-scope source files plus their stories and
tests. Generate the specifier rewrite from it. Dry-run and read the diff.

### Phase 3: `shared/primitives/`

Eighteen files into six new folders. The deepest new structure in the packet, and it exercises folder
creation, case-only renames and the kind-prefix grammar in one batch.

### Phase 4: `shared/chrome/`

Five components, case-only renames in place. Small, and it is the cleanest test of whether git
recorded a pure case change.

### Phase 5: Hand-off

Confirm the manifest, the rewrite script and the scan command are all in a state the next two children
can consume without extending them by hand.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

The type checker is the test. A rename that misses a specifier cannot type-check, so `svelte-check`
per batch carries more weight than anything written for the occasion.

Beyond it, `npm run test:web` proves the moved primitives still mount and behave. No new test is
written, because there is no new behaviour — only the completeness scan, which is a scan rather than a
test, and the git-rename spot-check, which is a read of history.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- 011 should land first, so no rename collides with an open edit in the same file.
- 013 must not run concurrently — it touches the same files.
- Children 002 and 003 both consume this child's manifest, so neither starts before it exists.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Each phase is one commit containing its `git mv` set and the generated specifier rewrite. Rollback is
`git revert` of that commit, or a branch reset to unwind several. Nothing migrates, nothing is
deleted, and no external system holds a source path — the service worker caches by build-output hash.

The one thing a revert does not undo is a taxonomy decision people have started building against.
That is why the sign-off is blocking rather than advisory.
<!-- /ANCHOR:rollback -->

---

<!-- ANCHOR:dependency-graph -->
## 8. DEPENDENCY GRAPH

```
Phase 1  operator confirms taxonomy + prefix list
   │
   ▼
Phase 2  manifest + generated rewrite script
   │
   ├─► Phase 3  shared/primitives/   ─┐  independent of each other
   └─► Phase 4  shared/chrome/       ─┘  run sequentially anyway
                     │
                     ▼
             Phase 5  hand-off to 002 and 003
```

Phases 3 and 4 are independent in principle. They run sequentially because the executor takes one
directory per dispatch and Claude verifies each before the next.
<!-- /ANCHOR:dependency-graph -->

---

<!-- ANCHOR:critical-path -->
## 9. CRITICAL PATH

Phase 1 → Phase 2 → Phase 5.

The manifest is the critical artefact, not the file moves. Both later children block on it, and
neither of the two batches here blocks anything except its own verification. Phase 3 has slack;
Phase 4 has more.

Phase 1 is on the path for a non-technical reason: it is the only step that waits on a person.
<!-- /ANCHOR:critical-path -->

---

<!-- ANCHOR:milestones -->
## 10. MILESTONES

| Milestone | Definition of done |
|---|---|
| **M1 — grammar agreed** | Operator has confirmed the `shared/` taxonomy and the closed kind-prefix list |
| **M2 — manifest exists** | 148 rows as data, rewrite script generated from it, dry-run diff read |
| **M3 — primitives re-treed** | 18 files in six sub-folders; build and typecheck green |
| **M4 — chrome renamed** | 5 components kebab-case; `git log --follow` confirms recorded renames |
| **M5 — handed off** | Manifest, rewrite script and scan command ready for children 002 and 003 |
<!-- /ANCHOR:milestones -->

---

<!-- ANCHOR:ai-protocol -->
## 11. AI EXECUTION PROTOCOL

This child is executed by dispatched workers over mechanical work, which is exactly the shape where a
confident agent quietly does most of it and reports done. The protocol exists to make partial
application visible.

### Pre-Task Checklist

Before any dispatch touches a file:

1. The operator has confirmed the taxonomy and the prefix list.
2. The rename manifest exists and its dry-run diff has been read.
3. The dispatch's ALLOWED WRITE PATHS name exactly one folder.
4. The working tree is clean, so the batch's diff is only this batch.
5. The completeness-scan command excludes SvelteKit reserved names explicitly.
6. 013 is confirmed not running.

### Execution Rules

| Rule | Requirement |
|---|---|
| One folder per dispatch | A dispatch that writes outside its folder is rejected and redone, not patched |
| Manifest-driven rewrites | Specifiers are rewritten by the generated script; hand-editing one is a protocol violation |
| Commit atomically | Moves, rewrites and config edits land in one commit — a live-follow daemon reverts uncommitted edits |
| No content edits | This child moves and renames; changing a module's contents belongs elsewhere |
| Two-step case renames | Verify with `git status` that a rename was staged before committing |
| Never touch `specs/context/**` | Five read-only research repos live there |

### Status Reporting Format

Each dispatch returns four things, in order: the folder it took, the count of files moved against the
count the manifest predicted for that folder, the build and typecheck exit statuses, and any file it
could not move with the reason.

The count comparison is the report that matters. It is the signal of partial application, and it is
the one a summary sentence hides.

### Blocked Task Protocol

Stop and escalate rather than working around, on any of: a case-only rename git will not record after
the two-step; a specifier the rewrite script cannot resolve; a rename that would touch `routes/**`; a
gate that fails and does not recover within one bounded repair attempt.

Escalation carries the conflicting facts, a one-sentence root cause where known, and the decision
needed. It does not carry a workaround that changes the child's scope.
<!-- /ANCHOR:ai-protocol -->
