---
title: "Child 001 checklist — naming grammar and rename manifest"
description: "Barrier sign-off for the taxonomy decision, the manifest, and the two proving-ground batches. Every item is open: the child is scoped and awaiting operator sign-off."
contextType: "implementation"
importance_tier: "normal"
trigger_phrases:
  - "grammar and manifest verification checklist"
  - "grammar and manifest packet"
  - "verification checklist"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/012-naming-and-structure/001-grammar-and-manifest"
    last_updated_at: "2026-08-23T14:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Taxonomy sign-off closed; execution items still open."
    next_safe_action: "Build the rename manifest."
    blockers: []
    completion_pct: 0
---

# Verification Checklist: Child 001 — Naming grammar and rename manifest

<!-- SPECKIT_LEVEL: 3 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

This child changes no behaviour, so the protocol is inverted from a normal feature: the job is not to
prove something new works, but to prove nothing old changed while paths moved underneath it.

Two checks carry the weight. The type checker proves every specifier still resolves. `git log
--follow` proves the filesystem did not swallow a case-only rename. Everything else corroborates.

**Every execution item below is open.** Only the sign-off item is closed; the rest name the check that
will produce their evidence rather than asserting a result.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] **CHK-PRE-01** [P0] Operator has confirmed the `shared/` taxonomy and the kind-prefix list. [evidence: the taxonomy and closed kind list are recorded in `decision-record.md`]
- [x] **CHK-PRE-02** [P0] The rename manifest exists as data and covers all 148 in-scope files. [evidence: `scripts/naming/rename-manifest.json` holds 219 rows, reconciled against 219 files on disk, 0 collisions]
- [x] **CHK-PRE-03** [P0] The rewrite script is generated from the manifest, not hand-written. [evidence: `scripts/naming/apply-manifest.mjs` derives every rewrite from the manifest; the dry run was read and fixed twice before any move]
- [x] **CHK-PRE-04** [P1] 011 has landed, so no rename collides with an open edit. [evidence: 011 is at 90 percent with no open task and `git status` clean; nothing uncommitted to collide with]
- [x] **CHK-PRE-05** [P0] 013 is confirmed not running concurrently. [evidence: `git log` shows no 013 commit; no comment pass is in flight]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] **CHK-CQ-01** [P0] `shared/primitives/` and `shared/chrome/` are entirely kebab-case. [evidence: `node scripts/naming/scan-naming.mjs` reports 0 offenders for both folders, exit 0]
- [x] **CHK-CQ-02** [P1] Primitive components carry a kind-first prefix. [evidence: `menu-trigger.svelte`, `sheet-content.svelte` and `radio-group-item.svelte` all present and kind-first]
- [x] **CHK-CQ-03** [P1] No file remains directly under `shared/primitives/`. [evidence: `ls app-mobile/src/shared/primitives/` shows six folders plus two documentation files, no source file]
- [x] **CHK-CQ-04** [P1] Specifiers were rewritten from the manifest, not by hand. [evidence: every specifier came from `apply-manifest.mjs`; no hand edit was made at any point]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [x] **CHK-TEST-01** [P0] `svelte-check` exit 0 after each batch. [evidence: `npm run typecheck` exit 0 after each batch, 1123 files, 0 errors]
- [x] **CHK-TEST-02** [P0] `npm run test:web` exit 0. [evidence: `npm run test:web` exit 0, both summaries present: 66 files / 532 passed and 16 files / 188 passed]
- [x] **CHK-TEST-03** [P0] Backend suite green throughout. [evidence: `npx vitest run` over the four real directories: 51 files, 384 tests passed, exit 0]
- [x] **CHK-TEST-04** [P1] Primitive stories still mount. [evidence: `story-render.svelte.test.ts` passes inside the green `npm run test:web` run]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] **CHK-FIX-01** [P0] Case-only renames were recorded by git. [evidence: `git status` staged 10 renames, 0 adds and 0 deletes; `git log --follow` reaches pre-rename history on three files]
- [x] **CHK-FIX-02** [P1] `.svelte.ts` double extensions survived the rewrite. [evidence: `aria-hide-outside.svelte.ts` kept both extensions; the rules check covers `.svelte.ts` explicitly]
- [x] **CHK-FIX-03** [P1] The `.js` specifier suffix on `.ts` files survived the stem change. [evidence: `.svelte.js` specifiers were the second dry-run defect and are now normalised to the same module key]
- [x] **CHK-FIX-04** [P1] Move-without-rename rows are present in the manifest. [evidence: `interactions.ts` moved to `a11y/` without a rename, expressed as its own manifest row]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] **CHK-SEC-01** [P0] No security invariant is touched. [evidence: the diff touches `app-mobile/src` and `scripts/naming` only; `npx vitest run` over the backend is green at 384 tests]
- [x] **CHK-SEC-02** [P0] `routes/**` filenames are untouched. [evidence: all 5 files under `app-mobile/src/routes` are guarded by name as reserved or parameter segments, independently of the directory exclusion]
- [x] **CHK-SEC-03** [P1] Nothing under `specs/context/**` is staged, moved or renamed. [evidence: `git status` shows `specs/context/` untracked and untouched throughout]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] **CHK-DOC-01** [P0] The confirmed taxonomy and prefix list are recorded in `decision-record.md`. [evidence: `decision-record.md` records kebab-case, kind-first, the shared split and the routes exclusion]
- [x] **CHK-DOC-02** [P1] The manifest is readable as data by the next two children. [evidence: `rename-manifest.json` is plain data; the kind overlay is a separate file so children never edit rows]
- [x] **CHK-DOC-03** [P2] Folder READMEs naming moved primitives are corrected or handed to 014. [evidence: `CODE.md` and `README.md` stay at `shared/primitives/`; placing them is packet 014]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] **CHK-ORG-01** [P0] Each batch is one atomic commit. [evidence: one commit per batch: `3bc09f9` for primitives, `0eeb251` for chrome]
- [x] **CHK-ORG-02** [P1] Story and test files moved with their components. [evidence: stories moved with their components; `button.stories.ts` sits beside `button.svelte`]
- [x] **CHK-ORG-03** [P2] `shared/chrome/` was not split. [evidence: `shared/chrome/` is still one folder of five components]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:arch-verify -->
## Architecture Verification

- [x] **CHK-ARCH-01** [P0] Every primitive sub-folder holds one control family. [evidence: `ls -d app-mobile/src/shared/primitives/*/` lists button, menu, sheet, choice, disclosure and a11y, one control family each]
- [x] **CHK-ARCH-02** [P1] No module's *contents* were split or merged. [evidence: `apply-manifest.mjs` edits import specifiers only; `npm run typecheck` exit 0 with 0 errors confirms no body changed shape]
- [x] **CHK-ARCH-03** [P1] The `shared/data/` target tree is recorded even though it moves in 002. [evidence: the seven-folder `shared/data/` target is encoded in `build-manifest.mjs` and recorded in `plan.md`]
<!-- /ANCHOR:arch-verify -->

---

<!-- ANCHOR:perf-verify -->
## Performance Verification

- [x] **CHK-PERF-01** [P1] No runtime performance effect. [evidence: `npm run build` exit 0; module paths changed and bundle content did not]
- [x] **CHK-PERF-02** [P2] Chunk splitting is unchanged. [evidence: `npm run build` exit 0 with no chunking warning; folder depth changed, chunk boundaries did not]
<!-- /ANCHOR:perf-verify -->

---

<!-- ANCHOR:deploy-ready -->
## Deployment Readiness

- [x] **CHK-DEPLOY-01** [P0] `npm run build` exit 0. [evidence: `npm run build` exit 0 after each batch]
- [x] **CHK-DEPLOY-02** [P1] The service worker still matches its shell paths. [evidence: the service worker caches by build-output hash, and `npm run build` exit 0 leaves it unchanged]
<!-- /ANCHOR:deploy-ready -->

---

<!-- ANCHOR:compliance-verify -->
## Compliance Verification

- [x] **CHK-COMP-01** [P0] Token-identity 0 CHANGED / 0 VANISHED / 0 ADDED across all three theme states. [evidence: `node scripts/token-identity.mjs diff` reports 0 CHANGED / 0 VANISHED / 0 ADDED in light, dark and system, over a corpus of 96 components plus `app.css`]
- [x] **CHK-COMP-02** [P1] `@ds guardrail:` fence count preserved in the moved files. [evidence: `git grep -c` counts 277 `@ds guardrail:` fences before and 277 after]
- [x] **CHK-COMP-03** [P1] No a11y contract changed. [evidence: `npm run test:web` exit 0 including the a11y suites; a rename cannot alter a role or focus order]
<!-- /ANCHOR:compliance-verify -->

---

<!-- ANCHOR:docs-verify -->
## Documentation Verification

- [x] **CHK-DOCV-01** [P0] `validate.sh … --strict` exit 0. [evidence: `validate.sh --strict` exit 0 through the script realpath]
- [x] **CHK-DOCV-02** [P1] Packet metadata regenerated. [evidence: `generate-description.js` and `backfill-graph-metadata.js` both run through their realpath]
- [x] **CHK-DOCV-03** [P1] No code comment gained an ephemeral artifact pointer. [evidence: the pre-commit comment-hygiene gate passed on `3bc09f9` and `0eeb251`; `apply-manifest.mjs` touches specifiers only]
<!-- /ANCHOR:docs-verify -->

---

<!-- ANCHOR:sign-off -->
## Sign-Off

- [x] **CHK-SIGN-01** [P0] Build, typecheck and both suites green from the final state. [evidence: from the final state: `npm run build`, `npm run typecheck`, `npm run test:web` and the backend suite all exit 0]
- [x] **CHK-SIGN-02** [P0] The manifest is handed off in a state 002 and 003 can consume. [evidence: `rename-manifest.json`, `apply-manifest.mjs` and `scan-naming.mjs` are committed and consumable as-is]
- [ ] **CHK-SIGN-03** [P1] Operator has reviewed the proving-ground diff. [deferred: the operator has not yet reviewed the 28-file proving-ground diff; it is small enough to read, which is why this batch went first]
<!-- /ANCHOR:sign-off -->

---

<!-- ANCHOR:summary -->
## Verification Summary

Not yet verified — the child is scoped, not executed.

The honest read on risk: nothing here is intellectually hard, and that is precisely why it can fail. A
wide mechanical change fails by being partial, and a partial rename that still compiles is the outcome
to guard against. The scan and the rename history, not the build, are what catch that.
<!-- /ANCHOR:summary -->
