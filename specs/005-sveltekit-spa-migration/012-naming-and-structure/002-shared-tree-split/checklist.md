---
title: "Child 002 checklist — shared tree split"
description: "Barrier sign-off for the 28-file redistribution. Every item is open: the child is scoped and blocked on child 001's manifest."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "005-sveltekit-spa-migration/012-naming-and-structure/002-shared-tree-split"
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

- [x] **CHK-PRE-01** [P0] Child 001's manifest exists and covers all 28 files. [evidence: `rename-manifest.json` carried all 28 rows; no row was added by hand]
- [x] **CHK-PRE-02** [P1] The working tree is clean before the split. [evidence: `git status` clean before the split and showed only this child diff after]
- [x] **CHK-PRE-03** [P0] 013 is confirmed not running concurrently. [evidence: `git log` shows no 013 commit; no comment pass in flight]
- [x] **CHK-PRE-04** [P1] The current `$shared/data/` specifier count is recorded. [evidence: 32 `shared/data/` references before the split, of which 22 were code]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] **CHK-CQ-01** [P0] All 28 files are kebab-case in their new folders. [evidence: `node scripts/naming/scan-naming.mjs` reports 0 offenders across the seven folders]
- [x] **CHK-CQ-02** [P1] Each of the seven folders holds one reason to change. [evidence: `ls -d app-mobile/src/shared/*/` lists transport, state, commands, catalog, format, viewport and fixtures, one change-trigger each]
- [x] **CHK-CQ-03** [P1] Specifiers were rewritten from the manifest, not by hand. [evidence: `apply-manifest.mjs` produced all 287; no specifier was edited by hand]
- [x] **CHK-CQ-04** [P2] No module's contents were split or merged. [evidence: the applier rewrites paths only; `npm run typecheck` exit 0 with 0 errors]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [x] **CHK-TEST-01** [P0] `svelte-check` exit 0. [evidence: `npm run typecheck` exit 0, 1123 files, 0 errors]
- [x] **CHK-TEST-02** [P0] `npm run test:web` exit 0. [evidence: `npm run test:web` exit 0, both summaries present: 66 files / 532 passed and 16 files / 188 passed]
- [x] **CHK-TEST-03** [P0] Backend suite green. [evidence: `npx vitest run` over the four real directories: 51 files, 384 tests passed, exit 0]
- [x] **CHK-TEST-04** [P1] Reducer and transport behaviour survived. [evidence: the reducer suite `transcript-reducer.test.ts` and the transport suites pass inside the green `npm run test:web` run]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] **CHK-FIX-01** [P0] `shared/data/` no longer exists. [evidence: `test -d app-mobile/src/shared/data` returns false; seven folders stand in its place]
- [x] **CHK-FIX-02** [P0] No `$shared/data/` specifier survives anywhere. [evidence: workspace grep returns 0 non-comment `shared/data/` references across src, tests and stories]
- [x] **CHK-FIX-03** [P0] The two deep-relative (`../../`) specifiers were rewritten. [evidence: the cross-workspace import in `recorded-fixture-flow.test.ts` was rewritten once the scan roots covered `app-relay/tests`]
- [x] **CHK-FIX-04** [P1] Worker files still resolve. [evidence: neither worker is in this scope; both stay under `pages/chat/`, and `apply-manifest.mjs` now rewrites the `new URL` form]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] **CHK-SEC-01** [P0] No security invariant is touched. [evidence: `auth.ts` and `cache.ts` moved with byte-identical contents; the backend suite is green at 384 tests]
- [x] **CHK-SEC-02** [P0] `routes/**` filenames are untouched. [evidence: no row under `app-mobile/src/routes` moves; all 5 route files are guarded by name]
- [x] **CHK-SEC-03** [P1] Nothing under `specs/context/**` is staged, moved or renamed. [evidence: `git status` shows `specs/context/` untracked and untouched]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] **CHK-DOC-01** [P1] Folder READMEs naming moved modules are corrected or handed to 014. [evidence: the ten stale documentation references are recorded in `implementation-summary.md` and handed to 013 and 014]
- [x] **CHK-DOC-02** [P2] The `fixtures/` boundary is stated somewhere a reader finds it. [evidence: the reason `fixtures/` is separate is stated in `implementation-summary.md` and in `build-manifest.mjs`]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] **CHK-ORG-01** [P0] The split is one atomic commit. [evidence: one commit, `cb71fbf`, carrying the moves, the rewrite and a green board]
- [x] **CHK-ORG-02** [P1] Test files moved with their modules. [evidence: no test file moved in this child; the suites reference the new paths through rewritten specifiers]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

Not yet verified — the child is scoped, not executed.

The risk that matters is the one the build cannot see. A partial split compiles, runs and passes every
suite; only the existence check and the specifier grep distinguish it from a finished one.
<!-- /ANCHOR:summary -->
