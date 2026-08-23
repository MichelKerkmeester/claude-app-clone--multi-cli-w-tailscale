---
title: "Child 002 checklist — shared tree split"
description: "Barrier sign-off for the 28-file redistribution. Every item is open: the child is scoped and blocked on child 001's manifest."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/012-naming-and-structure/002-shared-tree-split"
    last_updated_at: "2026-08-23T14:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Checklist authored; all items open pending execution."
    next_safe_action: "Wait for the manifest, then run the split."
    blockers: []
    completion_pct: 0
---

# Verification Checklist: Child 002 — Shared tree split

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

The build is the weakest gate in this child, and knowing that is the whole protocol. Move twenty of
twenty-eight files and everything still compiles; the tree is simply wrong in a way nothing notices.

So the decisive checks are two greps: `shared/data/` must not exist, and no `$shared/data/` specifier
may survive. The build and the type checker corroborate.

**Every item below is open.** The child is scoped and blocked on child 001's manifest.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [ ] **CHK-PRE-01** [P0] Child 001's manifest exists and covers all 28 files. [deferred: pending execution — extending it by hand here breaks the guarantee it exists to provide]
- [ ] **CHK-PRE-02** [P1] The working tree is clean before the split. [deferred: pending execution — `git status` must show only this child's diff afterwards]
- [ ] **CHK-PRE-03** [P0] 013 is confirmed not running concurrently. [deferred: pending execution — both packets touch the same source files]
- [ ] **CHK-PRE-04** [P1] The current `$shared/data/` specifier count is recorded. [deferred: pending execution — a post-move zero is only meaningful against a measured baseline]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [ ] **CHK-CQ-01** [P0] All 28 files are kebab-case in their new folders. [deferred: pending execution — ten were camelCase and take their rename in the same move]
- [ ] **CHK-CQ-02** [P1] Each of the seven folders holds one reason to change. [deferred: pending execution — the grouping rule the taxonomy was derived from]
- [ ] **CHK-CQ-03** [P1] Specifiers were rewritten from the manifest, not by hand. [deferred: pending execution — a hand-edited rewrite can disagree with the moves]
- [ ] **CHK-CQ-04** [P2] No module's contents were split or merged. [deferred: pending execution — this child moves and renames only]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [ ] **CHK-TEST-01** [P0] `svelte-check` exit 0. [deferred: pending execution — `npm run typecheck` is the primary import-integrity proof]
- [ ] **CHK-TEST-02** [P0] `npm run test:web` exit 0. [deferred: pending execution — verify by content, since piping to `tail` reports the pipe's exit status, not vitest's]
- [ ] **CHK-TEST-03** [P0] Backend suite green. [deferred: pending execution — run the four real test dirs explicitly; the bare `tests` positional sweeps a protected context repo]
- [ ] **CHK-TEST-04** [P1] Reducer and transport behaviour survived. [deferred: pending execution — several moved files are the reducers, so a subtle break shows as a behavioural failure rather than a type error]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [ ] **CHK-FIX-01** [P0] `shared/data/` no longer exists. [deferred: pending execution — a leftover file means a partial split, which is worse than not having started]
- [ ] **CHK-FIX-02** [P0] No `$shared/data/` specifier survives anywhere. [deferred: pending execution — workspace grep including tests and stories, expect 0 hits]
- [ ] **CHK-FIX-03** [P0] The two deep-relative (`../../`) specifiers were rewritten. [deferred: pending execution — they are the only two the `$shared` alias does not cover]
- [ ] **CHK-FIX-04** [P1] Worker files still resolve. [deferred: pending execution — `highlight.worker.ts` and `attachment-hash.worker.ts` are referenced by URL construction as well as by import]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [ ] **CHK-SEC-01** [P0] No security invariant is touched. [deferred: pending execution — `auth.ts` and `cache.ts` move without their contents changing]
- [ ] **CHK-SEC-02** [P0] `routes/**` filenames are untouched. [deferred: pending execution — the route tree is the URL contract, and routing is a frozen program invariant]
- [ ] **CHK-SEC-03** [P1] Nothing under `specs/context/**` is staged, moved or renamed. [deferred: pending execution — five read-only research repos live there]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [ ] **CHK-DOC-01** [P1] Folder READMEs naming moved modules are corrected or handed to 014. [deferred: pending execution — several `README.md` and `CODE.md` files name modules by filename]
- [ ] **CHK-DOC-02** [P2] The `fixtures/` boundary is stated somewhere a reader finds it. [deferred: pending execution — `demo.ts` ships to stories, not to users, and that is the reason it has its own folder]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [ ] **CHK-ORG-01** [P0] The split is one atomic commit. [deferred: pending execution — a half-emptied `shared/data/` builds cleanly and teaches two rules at once]
- [ ] **CHK-ORG-02** [P1] Test files moved with their modules. [deferred: pending execution — colocation is the existing convention and should survive]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

Not yet verified — the child is scoped, not executed.

The risk that matters is the one the build cannot see. A partial split compiles, runs and passes every
suite; only the existence check and the specifier grep distinguish it from a finished one.
<!-- /ANCHOR:summary -->
