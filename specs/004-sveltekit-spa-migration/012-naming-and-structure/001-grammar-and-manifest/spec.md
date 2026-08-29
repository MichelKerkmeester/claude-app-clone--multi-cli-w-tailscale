---
title: "Child 001 — Naming grammar and rename manifest"
description: "Settle the naming grammar, build the rename manifest as data, generate the specifier rewrite from it, and prove the mechanics on shared/primitives and shared/chrome before 148 files are in flight."
trigger_phrases:
  - "rename manifest kebab case"
  - "kind prefix list confirm"
  - "shared primitives sub folders"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/012-naming-and-structure/001-grammar-and-manifest"
    last_updated_at: "2026-08-23T14:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Operator confirmed the taxonomy and the prefix list."
    next_safe_action: "Build the rename manifest."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Child 001 — Naming grammar and rename manifest

---

<!-- ANCHOR:executive-summary -->
## EXECUTIVE SUMMARY

This child owns every decision the naming pass rests on, and then proves the mechanics on twenty-three
files before the other two children put a hundred and twenty-five more in flight.

The decisions are four: kebab-case for every file and folder, the kind first in a component's name,
`shared/` split by reason to change, and `routes/**` left alone. Two of them needed the operator's
confirmation, because a tree is a design decision rather than a derivation, and both are now settled
— `transport/` and `state/` stay separate, and screens take a `screen-` prefix.

The mechanics are one artefact: a rename manifest as data, with the specifier rewrite generated from
it. Generated, not hand-written — a hand-edited rewrite is free to disagree with the moves, and that
disagreement is the failure this whole packet has to avoid.

The proving ground is `shared/primitives/` and `shared/chrome/`. Between them they exercise every trap
at once: case-only renames the filesystem swallows, new folder creation, and the kind-prefix grammar.
Twenty-three files is small enough to read the diff line by line and large enough to be a real test.
<!-- /ANCHOR:executive-summary -->

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent Spec** | ../spec.md |
| **Predecessor** | ../../011-ux-affordances/spec.md |
| **Successor** | ../002-shared-tree-split/spec.md |
| **Level** | 3 |
| **Layer** | naming pass — decisions and proving ground |
| **Writer** | executor (`app-mobile/src/shared/**` renames) + Claude (manifest, verification, git) |
| **Barrier** | build and typecheck green; git recorded the case-only renames as renames |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

Two problems, and they have to be solved in this order.

The first is that nobody has decided. Three grammars coexist because the port carried each one in from
a different place and nothing arbitrated. Renaming files before the grammar is settled just produces a
fourth grammar.

The second is that the renaming itself has a trap the rest of the packet cannot afford to discover
late. On a case-insensitive filesystem `git mv Button.svelte button.svelte` can succeed and record
nothing — the rename appears to work, the file looks right, and git has no idea anything happened. A
hundred and forty-eight files is the wrong place to find that out.

So this child decides, then builds the tooling, then runs it over the two smallest folders where every
mechanical failure mode is present and the diff is still readable.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:**
- The confirmed `shared/` taxonomy and the closed kind-prefix list, recorded rather than left in
  conversation.
- The rename manifest: one row per file, old path and new path, covering all 148 in-scope source files
  plus their stories and tests. The other two children consume it; they do not extend it by hand.
- The specifier-rewrite script, generated from the manifest, dry-run and read before anything moves.
- The completeness-scan command, with SvelteKit reserved names excluded explicitly.
- `shared/primitives/` — 18 files into `button/`, `menu/`, `sheet/`, `choice/`, `disclosure/`, `a11y/`.
- `shared/chrome/` — 5 components, case-only renames in place.

**Out of scope:** `shared/data/`, which is child 002; `pages/**` and all tooling, which is child 003;
any module's contents; `routes/**`.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — The taxonomy and the kind-prefix list are confirmed by the operator before any file
  moves, and written into `decision-record.md`. Moving first and deciding later produces a fourth
  grammar; deciding in conversation and not recording it produces a relitigation.
- **REQ-002** — The rename manifest exists as data and covers every in-scope file. A manifest that
  covers most of the tree is how a rename becomes partial.
- **REQ-003** — The specifier rewrite is generated from the manifest. Hand-editing a specifier is a
  protocol violation, not a shortcut.
- **REQ-004** — The completeness scan excludes `+page`, `+layout`, `+error` and `[param]` segments by
  name. A scan that skips them incidentally is not a gate.
- **REQ-005** — Every case-only rename is recorded by git. Verified with `git status` before the
  commit and `git log --follow` after it.
- **REQ-006** — `shared/primitives/` and `shared/chrome/` end kebab-case and kind-first, and the build
  and typecheck are green before the child closes.
- **REQ-007** — The `.js` specifier suffix convention on `.ts` files survives the stem change.
- **REQ-008** — Each batch commits atomically — moves, rewrite and green build in one commit. A
  live-follow daemon restores the working tree to HEAD, so an uncommitted batch can simply vanish.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. The operator has confirmed the taxonomy and the prefix list, and both are recorded in
   `decision-record.md`.
2. The manifest covers all 148 in-scope files and its dry-run diff has been read.
3. `npm run build` exit 0.
4. `npm run typecheck` exit 0 — the primary import-integrity proof.
5. `git log --follow` on three case-only renames shows renames, not delete-and-add pairs.
6. No file remains directly under `shared/primitives/`; all 18 sit in one of the six sub-folders.
7. `validate.sh … --strict` exit 0 through the script's realpath.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **Case-only renames are silently swallowed** by this filesystem. The whole reason this child runs
  first is to hit that on 23 files rather than 148.
- **A confirmed-then-changed taxonomy is expensive.** Once child 002 has moved 28 files against the
  manifest, revisiting the grouping means a second rename pass. Hence the blocking sign-off.
- **The manifest can be right and the rewrite still wrong** if someone edits a specifier by hand to
  fix a build error. That is the one shortcut that must not be taken.
- Depends on 011 having landed, to avoid renaming a file with an open edit in it.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:nfr -->
## 7. NON-FUNCTIONAL REQUIREMENTS

| Attribute | Requirement |
|---|---|
| **Reversibility** | Every step is a `git mv` plus a generated specifier rewrite. Revert is a branch reset; nothing migrates. |
| **Determinism** | The rewrite is derived from the manifest, so the moves and the imports cannot drift apart. |
| **Reviewability** | 23 files is a diff a human reads rather than skims, which is the point of proving here. |
| **Performance** | None. Bundle content is byte-identical apart from module paths. |
| **Reusability** | The manifest and the scan command are the deliverables the next two children consume. |
<!-- /ANCHOR:nfr -->

---

<!-- ANCHOR:edge-cases -->
## 8. EDGE CASES

- **Case-only rename on macOS.** `git mv Button.svelte button.svelte` can succeed as a no-op. Use the
  two-step through a temporary name, or `git mv -f`, and verify with `git status` that a rename was
  actually staged.
- **A folder rename that only changes case** carries the same trap and moves every specifier beneath
  it at once.
- **`.js` specifiers pointing at `.ts` files.** Imports read `'$shared/data/view-helpers.js'` while the
  file on disk is `.ts`. The rewrite changes the stem and preserves the suffix convention.
- **`interactions.ts` and `aria-hide-outside.svelte.ts`** are already kebab-case and move without a
  rename, which means the manifest must express a move-without-rename row rather than skipping them.
- **A `.svelte.ts` file has two dots.** A naive stem-splitting rewrite truncates at the first one.
<!-- /ANCHOR:edge-cases -->

---

<!-- ANCHOR:complexity -->
## 9. COMPLEXITY ASSESSMENT

| Dimension | Score | Note |
|---|---|---|
| File count | Low | 23 files move here; the manifest describes 148 |
| Logical difficulty | Low | Every individual change is mechanical |
| Decision weight | High | Four decisions the other two children execute against without revisiting |
| Coordination difficulty | Medium | Moves, rewrites and the build land in one commit or the tree does not build |
| Blast radius | Medium | `shared/primitives/` is imported broadly, `shared/chrome/` narrowly |
| Reversibility | Easy | Branch reset |

The file count understates this child. Its real output is the manifest and the confirmed grammar, and
both are load-bearing for everything after.
<!-- /ANCHOR:complexity -->

---

<!-- ANCHOR:risk-matrix -->
## 10. RISK MATRIX

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Case-only rename silently not recorded | High | Medium | Two-step rename; verify staged renames before commit |
| Taxonomy revisited after 002 has moved files | Low | High | Blocking operator sign-off before any move |
| A specifier hand-edited to unbreak a build | Medium | High | Named as a protocol violation in the execution rules |
| `.svelte.ts` double extension mishandled | Medium | Low | Dry-run diff is read before anything moves |
| Manifest misses stories or tests | Medium | Medium | Manifest row count is reconciled against a fresh file count |
<!-- /ANCHOR:risk-matrix -->

---

<!-- ANCHOR:user-stories -->
## 11. USER STORIES

- **As the operator**, I want to approve the tree before files move, because the taxonomy is a design
  decision and reversing it after 28 files have moved costs a second pass.
- **As a dispatched executor**, I want a manifest to execute against, so my job is application rather
  than judgement.
- **As a reviewer**, I want the first batch small enough to read, so that when the wide batches arrive
  I am checking a known-good process rather than inspecting it for the first time.
<!-- /ANCHOR:user-stories -->

---

<!-- ANCHOR:questions -->
## 12. OPEN QUESTIONS

None remain. Both were answered by the operator and are recorded in `decision-record.md`.

1. **`state/` plus `transport/`, or one `session/` folder?** Answered: keep them separate.
   `transport/` changes when the wire contract changes and `state/` when a reducer does, and those
   are genuinely different triggers.
2. **Do screens stay bare or take a `screen-` prefix?** Answered: they take `screen-`. The argument
   that won is search — a contributor looking for a screen types the same prefix they would type for
   any other kind, instead of having to already know the five names.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:related -->
## 13. RELATED DOCUMENTS

- `plan.md` — the target tree, the batch order, the critical path and the rollback.
- `tasks.md` — the task ledger.
- `checklist.md` — barrier sign-off with evidence.
- `decision-record.md` — why kebab-case, why kind-first, how `shared/` was split, why `routes/` is out.
- `../002-shared-tree-split/spec.md` — consumes the manifest.
- `../003-pages-and-tooling/spec.md` — consumes the manifest and closes the barrier.
- Program goal: `../../goal.md`.
<!-- /ANCHOR:related -->
