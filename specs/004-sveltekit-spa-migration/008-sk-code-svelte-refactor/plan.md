---
title: "Child 008 plan — sk-code-mobile-cli React to Svelte refactor"
description: "How the conventions authority was rewritten for the Svelte stack, why it had to land through isolated worktrees, and what still gates its merge."
trigger_phrases:
  - "sk code svelte refactor plan approach"
  - "sk code svelte refactor packet"
  - "plan approach"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/008-sk-code-svelte-refactor"
    last_updated_at: "2026-08-24T05:55:14Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed; two open items recorded."
    next_safe_action: "Update svelte-conventions.md to Format A, then merge the branch."
    blockers: []
    completion_pct: 90
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 008 plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Every code workflow on this app loads `sk-code-mobile-cli` as its conventions authority. After the
cutover that authority taught a stack that no longer exists, so a dispatch reading it would produce
React output for a Svelte codebase.

This child rewrites the surface. The framework medium changes; the design-system contracts do not.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

| Gate | Result |
|---|---|
| `package_skill.py --check` | PASS — 12 pre-existing warnings, 0 new |
| `validate_document.py` on every changed doc | 0 issues, 12 docs |
| `ci-skill-root-metadata.cjs` pre-push gate | passed=13, failed=0 |
| Residual React-instruction sweep | clean |
| `validate.sh --strict` on this packet | exit 0 |
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

**What changes and what is carried.** The framework medium changes: detection markers, routing map,
the `@ds` seam form, the verification commands, and the authoring doctrine. The framework-agnostic
cores are carried verbatim — the three-layer token model, the grammar's meaning, the guardrail
semantics, the design-reference UI teardown. Rewriting those would risk changing a contract while
claiming to change a medium.

**New doctrine goes in a new file, not into shared ones.** `workflow-implement.md`, `workflow-debug.md`
and `workflow-verify.md` are symlinks into `shared/references/`, used by the `sk-code-webflow` and
`sk-code-opencode` surfaces too. Specialising them would impose Svelte on two surfaces that are not
Svelte, so the Svelte doctrine lives in a new `svelte-conventions.md`.

**Landing is constrained by where the skill lives.** It sits in the Public monorepo, reached through
the `.opencode` symlink, and that checkout's git index already holds thousands of files staged by
another session. `git add` there would sweep them into this commit. Everything therefore lands through
isolated worktrees, with the branch name allocated by sk-git rather than hand-picked.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1: Author the refactor — Done

One pass at the end rather than the planned draft-then-finalize, since the migration had already cut
over and the patterns were proven.

### Phase 2: Verify — Done

Skill packaging, per-document validation, the metadata gate, and a residual-reference sweep.

### Phase 3: Land to a branch — Done

Isolated worktree, sk-git branch allocation, three commits.

### Phase 4: Merge — Open

Blocked on correcting the divider convention the surface teaches.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

A skill has no test suite; its correctness question is whether a dispatch that loads it produces
correct output. Three proxies stand in: the packaging check for structure, per-document validation for
form, and a residual-reference sweep for surviving React instruction.

All three are structural. None of them can confirm that a rewritten passage is actually *right* about
Svelte — only a dry-run dispatch against the merged surface would show that, and the surface is not
merged.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- 007 for the proven patterns folded in: `:global()` ownership routing, the runes split, the socket
  lifecycle, the `$effect` self-invalidation trap.
- 007-EXT for the comment grammar — and this is where the outstanding gap sits.
- The sibling `004-sk-code-mobile-cli-mode` packet for the hub contract.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Nothing to roll back in this repository: the change lives entirely in the Public monorepo, on an
unmerged branch, and no workflow loads it yet. Abandoning the branch restores the previous surface
exactly. That the branch is unmerged is currently a liability, but it is also a complete rollback.
<!-- /ANCHOR:rollback -->
