---
title: "Child 012 plan — naming grammar and shared-tree structure"
description: "The proposed target tree, the batch order that keeps the app building at every step, the scripted specifier rewrite, and the rollback."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/012-naming-and-structure"
    last_updated_at: "2026-08-23T12:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Plan authored with proposed tree and batch order."
    next_safe_action: "Operator confirms taxonomy, then run Phase 1 primitives batch."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Child 012 plan — naming grammar and shared-tree structure

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Rename every in-scope file and folder to kebab-case, give UI-kind components a kind-first prefix, and
split `shared/` by responsibility. Do it in per-folder batches, each one a `git mv` set plus a scripted
specifier rewrite plus a build, committed atomically.

The whole packet is mechanical. The plan therefore spends its attention on the two things that
actually go wrong: partial application, and case-only renames the filesystem swallows.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

Every batch runs `npm run build` and `npm run typecheck` before it commits — those two catch a broken
specifier immediately, and a broken specifier is the only realistic failure mode mid-batch.

The full nine-gate program barrier runs once at the end, plus the two packet-specific checks: the
rename-completeness scan, and a `git log --follow` spot-check on three case-only renames proving git
recorded them as renames rather than as a delete-and-add pair.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

`shared/data/` holds 28 files spanning six unrelated responsibilities. It becomes:

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
changes. `state/` changes when a reducer changes. `commands/` changes when slash handling changes.
`fixtures/` is separate because demo data is the one thing in `shared/` that ships to stories rather
than to users.

Under `pages/`, folders keep their current names — they are already kebab-case and already say what
they are. Their component files take the kind-first grammar: `LeavePlanSheet.svelte` becomes
`sheet-leave-plan.svelte`, `PlanModeMenu.svelte` becomes `menu-plan-mode.svelte`,
`AttachmentPreviewDialog.svelte` becomes `dialog-attachment-preview.svelte`, and screen components
stay bare — `chat.svelte`, `home.svelte`, `review.svelte`.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 0: Manifest and rewrite script

Produce the full rename manifest as data: old path, new
path, one row per file. Generate the specifier rewrite from that manifest rather than by hand, so the
moves and the imports cannot disagree. Dry-run it and read the diff before anything moves.

### Phase 1: `shared/primitives/`

Smallest coherent batch, highest leverage: 18 files, deepest
new structure, and it exercises every trap at once — case-only renames, folder creation, and the
kind-prefix grammar.

### Phase 2: `shared/data/` split

The 28-file redistribution into seven folders. Largest single
specifier impact because `$shared/data/…` appears throughout the app.

### Phase 3: `shared/chrome/`

Five components, case-only renames.

### Phase 4: `pages/**`

Per feature folder, one batch each: `chat/artifacts`, `chat/transcript`,
`chat/rich-content`, `chat/chrome`, `chat/attachments`, `chat/features/ask-question`, then the screen
folders.

### Phase 5: Configs, stories and tests

Storybook globs, both vitest web configs, the CSS-corpus
glob, and any cwd-relative path in a web test. Re-baseline story ids and the 009 coverage allowlist.

### Phase 6: Conventions authority

Update `svelte-conventions.md` to teach kebab-case and the
kind-first grammar, landing through an isolated Public worktree. This also clears the item that has
been holding the 008 branch out of the live skill line.

### Phase 7: Barrier

Nine gates plus the two packet-specific checks.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

The type checker is the real test here: a rename that misses a specifier cannot type-check, so
`svelte-check` per batch is worth more than any bespoke assertion.

Beyond it, the existing suites carry the weight. `npm run test:web` proves component behaviour
survived, the token-identity gate proves no CSS moved, and the catalog smoke proves every story still
mounts under its new id. No new test is written for this packet, because there is no new behaviour to
test — only the completeness scan, which is a scan and not a test.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- 011 should land first, to avoid a rename colliding with an open edit in the same files.
- 013 must not run concurrently — it touches the same 148 files.
- 014 runs after, because folder documentation should describe the final tree, not a tree in motion.
- The 008 conventions branch is downstream of Phase 6 and merges once it lands.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Every phase is one commit containing its `git mv` set, its specifier rewrite and its config edits.
Rollback is `git revert` of that commit, or a branch reset if several are being unwound. Nothing
migrates, nothing is deleted, and no external system holds a path — the service worker caches by
build-output hash, not by source path.

The one thing that is not trivially reversible is the conventions-authority edit in Phase 6, because
it lands in a different repository. It reverts independently and is intentionally sequenced last.
<!-- /ANCHOR:rollback -->

---

<!-- ANCHOR:dependency-graph -->
## 8. DEPENDENCY GRAPH

```
Phase 0  manifest + rewrite script
   │
   ├─► Phase 1  shared/primitives/      ─┐
   ├─► Phase 2  shared/data/ split       │  independent of each other,
   ├─► Phase 3  shared/chrome/           │  but each blocks Phase 5
   └─► Phase 4  pages/** (per folder)   ─┘
                      │
                      ▼
              Phase 5  configs, stories, tests
                      │
                      ▼
              Phase 6  conventions authority
                      │
                      ▼
              Phase 7  barrier — nine gates + scans
```

Phases 1 through 4 are independent in principle. In practice they are run sequentially anyway,
because the executor writes one directory per dispatch and Claude verifies each before the next.
<!-- /ANCHOR:dependency-graph -->

---

<!-- ANCHOR:critical-path -->
## 9. CRITICAL PATH

Phase 0 → Phase 2 → Phase 5 → Phase 7.

Phase 2 is on the path because `shared/data/` is the most-imported folder in the app: its specifiers
appear in nearly every page component, so its rewrite is the one most likely to surface a missed case.
Phase 5 is on the path because the configs are what make the renamed tree testable at all — until they
land, the suites still point at the old paths.

Phases 1, 3, 4 and 6 have slack. Phase 6 has the most, and is deliberately last so the conventions
file documents what actually shipped rather than what was planned.
<!-- /ANCHOR:critical-path -->

---

<!-- ANCHOR:milestones -->
## 10. MILESTONES

| Milestone | Definition of done |
|---|---|
| **M1 — manifest agreed** | Operator has confirmed the taxonomy and the kind-prefix list; the rename manifest exists as data and its dry-run diff has been read |
| **M2 — shared/ re-treed** | Phases 1 to 3 committed; `shared/data/` no longer exists; build and typecheck green |
| **M3 — pages/ renamed** | Phase 4 committed folder by folder; build and typecheck green after each |
| **M4 — tooling caught up** | Phase 5 committed; both vitest configs, Storybook and the CSS-corpus glob resolve the new tree; story ids re-baselined |
| **M5 — authority updated** | `svelte-conventions.md` teaches the shipped grammar; the 008 branch is unblocked |
| **M6 — barrier** | Nine gates green, completeness scan zero, case-rename spot-check confirms recorded renames |
<!-- /ANCHOR:milestones -->

---

<!-- ANCHOR:ai-protocol -->
## 11. AI EXECUTION PROTOCOL

This packet is executed by dispatched workers over a wide, mechanical surface, which is exactly the
shape of work where a confident agent quietly does 80% and reports done. The protocol exists to make
partial application visible.

### Pre-Task Checklist

Before any dispatch touches a file:

1. The rename manifest exists and the operator has confirmed the taxonomy.
2. The dispatch's ALLOWED WRITE PATHS name exactly one folder.
3. The working tree is clean, so the batch's diff is only this batch.
4. The completeness scan command is known and excludes SvelteKit reserved names explicitly.
5. 013 is confirmed not running.

### Execution Rules

| Rule | Requirement |
|---|---|
| One folder per dispatch | A dispatch that writes outside its folder is rejected and redone, not patched |
| Manifest-driven rewrites | Specifiers are rewritten by the generated script; hand-editing a specifier is a protocol violation |
| Commit atomically | Moves, rewrites and config edits land in one commit — a live-follow daemon reverts uncommitted edits |
| No content edits | This packet moves and renames; changing a module's contents belongs to a different packet |
| Verify before advancing | Build and typecheck green before the next folder starts |
| Never touch `specs/context/**` | Five read-only research repos live there |

### Status Reporting Format

Each dispatch returns four things, in this order: the folder it took, the count of files moved
against the count the manifest predicted for that folder, the build and typecheck exit statuses, and
any file it could not move with the reason. A count that does not match the manifest is the report
that matters — it is the signal of partial application, and it is the one a summary sentence hides.

### Blocked Task Protocol

Stop and escalate rather than working around, on any of: a case-only rename git will not record after
the two-step; a specifier the rewrite script cannot resolve; a rename that would touch `routes/**`; a
gate that fails and does not recover within one bounded repair attempt.

Escalation carries the conflicting facts, a one-sentence root cause where known, and the decision
needed. It does not carry a proposed workaround that changes the packet's scope.
<!-- /ANCHOR:ai-protocol -->
