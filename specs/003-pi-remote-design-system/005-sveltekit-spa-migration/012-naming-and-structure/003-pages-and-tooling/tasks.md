---
title: "Child 003 tasks — pages rename and tooling catch-up"
description: "Task ledger for the per-folder kind-first renames, the tooling that follows the tree, the conventions stop-gap and the nine-gate barrier."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/012-naming-and-structure/003-pages-and-tooling"
    last_updated_at: "2026-08-23T20:24:46Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Task ledger authored; all tasks open."
    next_safe_action: "Wait for children 001 and 002, then take the largest folder first."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 003 tasks — pages rename and tooling catch-up

---

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred or superseded with a stated reason.

Every rename task means three things landing in one commit: the `git mv` set, the specifier rewrite
generated from the manifest, and a green build plus typecheck.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Confirm children 001 and 002 have landed and `shared/` is settled.
- [x] **T1.2** Confirm the manifest covers every `pages/**` file, including stories and tests.
- [x] **T1.3** Confirm 013 is not running concurrently.
- [x] **T1.4** Record the current `@ds guardrail:` fence count and the CSS-corpus file count, so the
      post-rename comparison is a delta against measured numbers.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

**Feature folders, one dispatch each, largest first**

- [x] **T2.1** `pages/chat/artifacts/` — 24 files, the largest feature folder.
- [x] **T2.2** `pages/chat/chrome/` — 17 files; carries the sheet, menu and card prefixes.
- [x] **T2.3** `pages/chat/rich-content/` — 12 files.
- [x] **T2.4** `pages/chat/features/ask-question/` — 12 files.
- [x] **T2.5** `pages/chat/transcript/` — 10 files.
- [x] **T2.6** `pages/chat/attachments/` — 9 files, including the dialog rename.
- [x] **T2.7** Screen components — `screen-chat.svelte`, `screen-home.svelte`,
      `screen-review.svelte`, `screen-attention-inbox.svelte`, `screen-enrollment.svelte`. Screens
      carry the kind prefix like every other kind, so a prefix search finds them.

**Tooling**

- [x] **T2.8** Update the three `$shared` alias definitions if any sub-path is hard-coded.
- [x] **T2.9** Update Storybook globs and regenerate the story ids.
- [x] **T2.10** Regenerate the 009 coverage-gate allowlist rather than hand-editing it — after a
      hundred-file rename, hand-editing is transcription, and transcription is where a silent omission
      enters.
- [x] **T2.11** Update the CSS-corpus builder's glob, then confirm the corpus is non-empty. The
      token-identity gate reads through it, so a stale glob would make the gate pass by reading nothing.
- [x] **T2.12** Update both vitest web configs and any cwd-relative `readFileSync` path in a web test.

**Conventions stop-gap**

- [x] **T2.13** Correct the naming section of the conventions authority — kebab-case, the closed prefix
      list, and the `routes/**` exemption with its reason. One section, not a rewrite; the rewrite is
      019's, after every convention has shipped.
- [x] **T2.14** Land it through an isolated Public worktree. Never stage in the shared checkout, whose
      index holds thousands of another session's files.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Nine program gates green from the final state, `validate.sh` invoked through its
      realpath.
- [x] **T3.2** Rename-completeness scan returns zero non-kebab in-scope paths.
- [x] **T3.3** `git log --follow` spot-check on three case-only renames confirms git recorded renames,
      not delete-and-add pairs.
- [x] **T3.4** Token-identity 0/0/0 over a corpus confirmed to contain files.
- [x] **T3.5** Catalog smoke green in both themes after the story ids shift.
- [x] **T3.6** Build-output size and chunk manifest compared before and after, since a deeper folder
      tree can shift chunk boundaries even when nothing else changes.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

One naming grammar across the whole app, tooling that resolves the renamed tree, and nine green gates
proving nothing rendered moved.

The packet does not close while the conventions authority still teaches the old naming grammar. A
conventions file that contradicts the tree is actively harmful — dispatches trust it, and would keep
producing files in the grammar this packet just removed.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` — scope, requirements and risks.
- `plan.md` — the batch order and how each tooling item fails.
- `checklist.md` — barrier sign-off with evidence.
- `../001-grammar-and-manifest/decision-record.md` — why kebab-case, why kind-first, why `routes/` is out.
- `../../013-comment-grammar/tasks.md` — same files; must not run concurrently.
- `../../019-surface-skill-refresh/spec.md` — replaces this child's stop-gap with the full refresh.
- Program goal: `../../goal.md`.
<!-- /ANCHOR:cross-refs -->
