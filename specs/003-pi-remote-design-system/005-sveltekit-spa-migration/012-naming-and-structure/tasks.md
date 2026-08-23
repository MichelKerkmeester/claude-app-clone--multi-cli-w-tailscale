---
title: "Child 012 tasks — naming grammar and shared-tree structure"
description: "Task ledger for the kebab-case rename, the kind-first component grammar, the shared/ responsibility split, and the tooling and conventions follow-through."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/012-naming-and-structure"
    last_updated_at: "2026-08-23T12:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Task ledger authored; all tasks open pending operator taxonomy sign-off."
    next_safe_action: "Answer T1.1, then build the rename manifest."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Child 012 tasks — naming grammar and shared-tree structure

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

- [ ] **T1.1** Operator confirms the `shared/` taxonomy and the kind-prefix list. Blocking — the tree
      is a design decision and nothing should move before it is settled.
- [ ] **T1.2** Build the rename manifest as data: one row per file, old path and new path, covering
      all 148 in-scope source files plus their stories and tests.
- [ ] **T1.3** Generate the specifier-rewrite script from the manifest. Generated, not hand-written —
      a hand-edited rewrite is free to disagree with the moves, and that disagreement is exactly the
      failure this packet has to avoid.
- [ ] **T1.4** Dry-run the rewrite and read the diff. Confirm the `.js`-suffix convention on `.ts`
      imports survives the stem change.
- [ ] **T1.5** Confirm the completeness-scan command excludes SvelteKit reserved names explicitly
      (`+page`, `+layout`, `+error`, `[param]` segments), not by accident of the pattern.
- [ ] **T1.6** Confirm 011 has landed and 013 is not running concurrently.
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

**Shared data split**

- [ ] **T2.4** Create `transport/`, `state/`, `commands/`, `catalog/`, `format/`, `viewport/`,
      `fixtures/`.
- [ ] **T2.5** Redistribute the 28 files by responsibility, per the plan's tree.
- [ ] **T2.6** Rename the ten camelCase modules to kebab-case in the same move.
- [ ] **T2.7** Rewrite the `$shared/data/…` specifiers — the largest single specifier impact in the
      packet, because this folder is imported from nearly every page component.
- [ ] **T2.8** Confirm `shared/data/` no longer exists. A leftover file there means the split was
      partial, which is worse than not having started.

**Chrome and pages**

- [ ] **T2.9** `shared/chrome/` — five components, case-only renames.
- [ ] **T2.10** `pages/chat/artifacts/` — 24 files, the largest feature folder.
- [ ] **T2.11** `pages/chat/transcript/` — 10 files.
- [ ] **T2.12** `pages/chat/rich-content/` — 12 files.
- [ ] **T2.13** `pages/chat/chrome/` — 17 files; carries the sheet, menu and card prefixes.
- [ ] **T2.14** `pages/chat/attachments/` — 9 files, including the dialog rename.
- [ ] **T2.15** `pages/chat/features/ask-question/` — 12 files.
- [ ] **T2.16** Screen components — `chat.svelte`, `home.svelte`, `review.svelte`,
      `attention-inbox.svelte`, `enrollment.svelte` — bare, no kind prefix.
- [ ] **T2.17** Confirm the two remaining deep-relative (`../../`) specifiers were rewritten. They are
      the only two the `$shared` alias does not cover, so they are the easiest to miss.
- [ ] **T2.18** Confirm worker files are reachable: they are referenced by URL construction as well as
      by import, so an import-only grep does not prove they resolve.

**Tooling and authority**

- [ ] **T2.19** Update the three `$shared` alias definitions if any sub-path is hard-coded.
- [ ] **T2.20** Update Storybook globs, re-baseline story ids, and update the 009 coverage-gate
      allowlist to the new paths.
- [ ] **T2.21** Update the CSS-corpus builder's glob — the token-identity gate reads through it, so a
      stale glob would make the gate pass by reading nothing.
- [ ] **T2.22** Update both vitest web configs and any cwd-relative `readFileSync` path in a web test.
- [ ] **T2.23** Rewrite `sk-code-mobile-cli`'s `references/svelte-conventions.md` to teach kebab-case
      and the kind-first grammar, landing through an isolated Public worktree — never staged in the
      shared checkout, whose index holds another session's files.
- [ ] **T2.24** With T2.23 landed, the 008 divider-grammar item is the only remaining blocker on that
      branch; merge it if the operator agrees.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [ ] **T3.1** Nine program gates green, `validate.sh` invoked through its realpath.
- [ ] **T3.2** Rename-completeness scan returns zero non-kebab in-scope paths.
- [ ] **T3.3** `git log --follow` spot-check on three case-only renames confirms git recorded renames,
      not delete-and-add pairs.
- [ ] **T3.4** Token-identity gate still 0/0/0 — the proof that a wide mechanical change stayed purely
      mechanical.
- [ ] **T3.5** Build-output size and chunk manifest compared before and after, since a deeper folder
      tree can shift chunk boundaries even when nothing else changes.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

One naming grammar across the app, a `shared/` tree whose folders each have one reason to change, and
nine green gates proving nothing rendered moved.

The packet does not close while the conventions authority still teaches the old grammar. A conventions
file that contradicts the tree is actively harmful — dispatches trust it, and would keep producing
files in the grammar this packet just removed.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` — scope, requirements, edge cases and the risk matrix.
- `plan.md` — the proposed tree, batch order, critical path and rollback.
- `checklist.md` — barrier sign-off with evidence.
- `decision-record.md` — why kebab-case, why kind-first, why `routes/` is excluded.
- `../013-comment-grammar/tasks.md` — same 148 files; must not run concurrently.
- `../014-folder-documentation/tasks.md` — runs after, describes the final tree.
- Program goal: `../goal.md`.
<!-- /ANCHOR:cross-refs -->
