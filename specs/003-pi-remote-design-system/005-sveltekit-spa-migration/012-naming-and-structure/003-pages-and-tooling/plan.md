---
title: "Child 003 plan — pages rename and tooling catch-up"
description: "One dispatch per feature folder, then the tooling that makes the renamed tree testable, then the barrier."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/012-naming-and-structure/003-pages-and-tooling"
    last_updated_at: "2026-08-23T14:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Plan authored; folder-at-a-time, tooling last."
    next_safe_action: "Wait for children 001 and 002."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 003 plan — pages rename and tooling catch-up

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Rename `pages/**` one feature folder at a time, then catch the tooling up, then run the barrier.

The order matters more than it looks. Renaming the tree before the globs are updated leaves the suites
pointing at paths that no longer exist; updating the globs first leaves them pointing at paths that do
not exist yet. Folder-at-a-time keeps each intermediate state buildable, and the tooling lands once at
the end when the tree has stopped moving.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

`npm run build` and `npm run typecheck` after every folder. A missed specifier cannot type-check, so
the type checker is the per-batch gate.

At the end, the full nine-gate program barrier plus the completeness scan. One of those nine deserves
a caveat: the token-identity gate reads a CSS corpus assembled by a glob, and a stale glob makes it
pass by reading nothing. Confirm the corpus is non-empty before the zero-diff result means anything.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

Under `pages/`, the folders keep their current names. They are already kebab-case and already say what
they are.

The component files inside them take the kind-first grammar. `LeavePlanSheet.svelte` becomes
`sheet-leave-plan.svelte`, `PlanModeMenu.svelte` becomes `menu-plan-mode.svelte`,
`AttachmentPreviewDialog.svelte` becomes `dialog-attachment-preview.svelte`.

Screens take the prefix too: `screen-chat.svelte`, `screen-home.svelte`, `screen-review.svelte`,
`screen-attention-inbox.svelte`, `screen-enrollment.svelte`. Leaving five files bare was the first
proposal and was overruled on search — a contributor hunting for a screen types the same prefix they
would type for any other kind, instead of having to already know the five names.

The prefix list is closed: `sheet-`, `menu-`, `dialog-`, `card-`, `button-`, `toggle-`, `radio-`,
`screen-`. Adding a kind is a decision rather than a convenience, because an open list degrades back
into taste within a few contributions. With screens on the list every component carries a kind, so
there is no "is this a kind or a screen" boundary left to argue about.

The tooling that has to follow the tree is a short, specific list, and each item fails differently:
the Storybook globs (stories vanish from the catalog), the story ids and 009 allowlist (the coverage
gate red-lines), both vitest web configs (suites do not run), cwd-relative `readFileSync` paths in web
tests (individual tests throw), and the CSS-corpus glob (the token-identity gate passes on nothing).
Only the last one fails silently, which is why it is called out separately rather than listed.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1: Feature folders

One dispatch per folder, in descending size: `chat/artifacts` (24), `chat/chrome` (17),
`chat/rich-content` (12), `chat/features/ask-question` (12), `chat/transcript` (10),
`chat/attachments` (9). Build and typecheck green before the next starts.

### Phase 2: Screen components

The five screens, `screen-` prefixed, one commit.

### Phase 3: Tooling catch-up

Alias definitions, Storybook globs, story ids, the 009 allowlist, both vitest web configs, any
cwd-relative test path, and the CSS-corpus glob.

### Phase 4: Conventions stop-gap

A minimal correction to the naming section of the conventions authority, landed through an isolated
Public worktree. One section, not a rewrite.

### Phase 5: Barrier

Nine program gates from the final state, plus the completeness scan and a `git log --follow`
spot-check on three case-only renames.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

No new test is written. There is no new behaviour — only a scan, and a scan is not a test.

The existing suites carry the weight: `npm run test:web` proves component behaviour survived, the
token-identity gate proves no CSS value moved, the catalog smoke proves every story still mounts under
its new id, and the backend suite is the leak detector proving the rename did not reach outside the
web workspace.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- Children 001 and 002, for the manifest and a settled `shared/` tree.
- 013 must not run concurrently — it touches the same files.
- 014 runs after, because folder documentation should describe the final tree.
- 019 consumes the stop-gap and replaces it with the full refresh.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Each folder is one commit containing its moves, its generated rewrite and its green build. Rollback is
`git revert` of that commit, or a branch reset to unwind several.

The conventions stop-gap lands in a different repository and reverts independently, which is why it is
sequenced after the app work rather than alongside it. Nothing migrates, nothing is deleted, and no
external system holds a source path — the service worker caches by build-output hash.
<!-- /ANCHOR:rollback -->
