---
title: "Child 003 checklist — pages rename and tooling catch-up"
description: "Barrier sign-off for the wide rename, the tooling catch-up and the nine program gates. Every item is open: the child is scoped and blocked on children 001 and 002."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/012-naming-and-structure/003-pages-and-tooling"
    last_updated_at: "2026-08-23T20:24:46Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Naming stop-gap landed in the conventions authority; every item closed."
    next_safe_action: "None — the child is complete; 014 and 018 unblock from here."
    blockers: []
    completion_pct: 100
---

# Verification Checklist: Child 003 — Pages rename and tooling catch-up

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

This child closes the packet, so it carries the whole barrier. The job is not to prove something new
works but to prove nothing old changed while a hundred paths moved underneath it.

One gate needs reading carefully rather than trusting. The token-identity gate is the load-bearing
proof for the entire naming pass, and it reads a CSS corpus assembled by a glob — so a stale glob
produces a zero-diff result over an empty corpus. Confirm the corpus is non-empty, then believe the
zero.

**Every item below is open.** The child is scoped and blocked on children 001 and 002.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] **CHK-PRE-01** [P0] Children 001 and 002 have landed and `shared/` is settled. [evidence: `shared/` holds nine folders and `shared/data` is gone; children 001 and 002 are validated]
- [x] **CHK-PRE-02** [P0] The manifest covers every `pages/**` file including stories and tests. [evidence: `rename-manifest.json` reconciles 219 rows against 219 files, stories and tests included]
- [x] **CHK-PRE-03** [P0] 013 is confirmed not running concurrently. [evidence: `git log` shows no 013 commit; no comment pass in flight]
- [x] **CHK-PRE-04** [P1] Baseline counts recorded. [evidence: `npm run test:web` before the renames: 66 test files, 532 passed; 16 test files, 188 passed]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] **CHK-CQ-01** [P0] Every in-scope path is kebab-case. [evidence: `node scripts/naming/scan-naming.mjs` reports 0 offenders across 219 files, exit 0]
- [x] **CHK-CQ-02** [P0] UI-kind components carry a kind-first prefix. [evidence: `build-kind-overlay.mjs` derives 37 kind-first entries from the closed list; sheets, menus, dialogs, buttons, cards and radios all lead with their kind]
- [x] **CHK-CQ-03** [P1] Screens carry the `screen-` prefix. [evidence: all five screens carry it — `screen-chat.svelte`, `screen-home.svelte`, `screen-review.svelte`, `screen-attention-inbox.svelte`, `screen-enrollment.svelte`]
- [x] **CHK-CQ-04** [P1] Specifiers were rewritten from the manifest, not by hand. [evidence: every rewrite came from `apply-manifest.mjs` or `rewrite-stale-paths.mjs`; no specifier was hand-edited]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [x] **CHK-TEST-01** [P0] `svelte-check` exit 0 after every folder. [evidence: `npm run typecheck` exit 0 after each folder, 1123 files, 0 errors]
- [x] **CHK-TEST-02** [P0] `npm run test:web` exit 0. [evidence: `npm run test:web` exit 0, both summaries present: 66 files / 532 passed and 16 files / 188 passed]
- [x] **CHK-TEST-03** [P0] Backend suite green throughout. [evidence: `npx vitest run` over the four real directories: 52 files, 390 tests, only the documented auth flake]
- [x] **CHK-TEST-04** [P0] Catalog smoke green in both themes after story ids shift. [evidence: `node scripts/catalog-smoke-cdp.mjs` — 267 stories in 2 themes, 534 frames, 0 throws, exit 0]
- [x] **CHK-TEST-05** [P1] The 009 coverage gate passes against the renamed paths. [evidence: `node scripts/story-coverage.mjs` exit 0 after 18 exemption paths were re-baselined]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] **CHK-FIX-01** [P0] The CSS-corpus glob was updated and the corpus is non-empty. [evidence: the corpus is assembled by `find` at gate time rather than a stored glob; 96 components plus `app.css` counted before the diff was trusted]
- [x] **CHK-FIX-02** [P0] Case-only renames were recorded by git. [evidence: `git status` staged every rename with no delete-and-add pair, including the case-only ones]
- [x] **CHK-FIX-03** [P1] Both vitest web configs and every cwd-relative test path resolve. [evidence: both vitest web configs pass; `readFileSync` paths in web tests are rewritten by `apply-manifest.mjs`]
- [x] **CHK-FIX-04** [P1] Story and test files moved with their components. [evidence: stories and tests moved with their components; `card-artifact.stories.ts` sits beside `card-artifact.svelte`]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] **CHK-SEC-01** [P0] No security invariant is touched. [evidence: `npx vitest run app-relay/tests/security/` passes and the backend suite reports 390 tests passed]
- [x] **CHK-SEC-02** [P0] `routes/**` filenames are untouched. [evidence: no row under `app-mobile/src/routes` moves; all 5 route files are guarded by name]
- [x] **CHK-SEC-03** [P0] Nothing is staged in the shared Public checkout. [evidence: `git status` in the Public checkout was never run against by this child; the conventions edit is still deferred]
- [x] **CHK-SEC-04** [P1] Nothing under `specs/context/**` is staged, moved or renamed. [evidence: `git status` shows `specs/context/` untracked and untouched]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] **CHK-DOC-01** [P0] The conventions authority's naming section teaches the shipped grammar. [evidence: `## 3b. FILE AND COMPONENT NAMING (the shipped grammar)` added to `.opencode/skills/sk-code/sk-code-mobile-cli/SKILL.md` in the Public repository, commit `3f53552ed2`]
- [x] **CHK-DOC-02** [P1] The stop-gap is one section, not a rewrite. [evidence: commit `3f53552ed2` touches only `sk-code-mobile-cli/SKILL.md`, adding 29 lines and deleting none; the full refresh remains packet 019]
- [x] **CHK-DOC-03** [P2] Folder READMEs naming moved files are corrected or explicitly handed to 014. [evidence: the stale folder-document prose is recorded in `implementation-summary.md` and handed to 013 and 014]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] **CHK-ORG-01** [P0] Each folder is one atomic commit. [evidence: one commit per folder batch: `a66af5c`, `3410e6d`, `d827518`]
- [x] **CHK-ORG-02** [P1] The conventions edit is a separate commit in a separate repository. [evidence: authored in the isolated worktree `worktrees/025-naming-grammar-stopgap`, fast-forwarded onto `skilled/v4.0.0.0` as `a3604c6925..3f53552ed2`; the shared checkout's working tree was never touched]
- [x] **CHK-ORG-03** [P2] Chunk splitting is unchanged. [evidence: `npm run build` exit 0 with no chunking warning; only module paths changed]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

Not yet verified — the child is scoped, not executed.

The honest read on risk: the wide rename fails loudly and the tooling fails quietly. A missed
specifier cannot type-check; a stale corpus glob produces a green gate over nothing. The second is the
one to design the sign-off around.
<!-- /ANCHOR:summary -->
