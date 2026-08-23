---
title: "Child 001 checklist — naming grammar and rename manifest"
description: "Barrier sign-off for the taxonomy decision, the manifest, and the two proving-ground batches. Every item is open: the child is scoped and awaiting operator sign-off."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/012-naming-and-structure/001-grammar-and-manifest"
    last_updated_at: "2026-08-23T14:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Checklist authored; all items open pending execution."
    next_safe_action: "Close the taxonomy sign-off before any item can be worked."
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

**Every item below is open.** The child is scoped and awaiting operator sign-off, so each marker names
the check that will produce its evidence rather than asserting a result.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [ ] **CHK-PRE-01** [P0] Operator has confirmed the `shared/` taxonomy and the kind-prefix list. [deferred: pending sign-off — the tree is a design decision, recorded as open question 1 in `spec.md`]
- [ ] **CHK-PRE-02** [P0] The rename manifest exists as data and covers all 148 in-scope files. [deferred: pending execution — reconcile the row count against a fresh file count]
- [ ] **CHK-PRE-03** [P0] The rewrite script is generated from the manifest, not hand-written. [deferred: pending execution — proof is a `git diff` dry-run read before any file moves]
- [ ] **CHK-PRE-04** [P1] 011 has landed, so no rename collides with an open edit. [deferred: pending execution — check `git status` clean before Phase 3]
- [ ] **CHK-PRE-05** [P0] 013 is confirmed not running concurrently. [deferred: pending execution — both packets touch the same source files]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [ ] **CHK-CQ-01** [P0] `shared/primitives/` and `shared/chrome/` are entirely kebab-case. [deferred: pending execution — completeness scan for a capital letter in these paths must return 0 hits]
- [ ] **CHK-CQ-02** [P1] Primitive components carry a kind-first prefix. [deferred: pending execution — spot-check `menu-trigger.svelte`, `sheet-content.svelte`, `radio-group-item.svelte`]
- [ ] **CHK-CQ-03** [P1] No file remains directly under `shared/primitives/`. [deferred: pending execution — all 18 sit in one of the six sub-folders]
- [ ] **CHK-CQ-04** [P1] Specifiers were rewritten from the manifest, not by hand. [deferred: pending execution — a hand-edited rewrite can disagree with the moves]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [ ] **CHK-TEST-01** [P0] `svelte-check` exit 0 after each batch. [deferred: pending execution — `npm run typecheck` is the primary import-integrity proof]
- [ ] **CHK-TEST-02** [P0] `npm run test:web` exit 0. [deferred: pending execution — verify by content, since piping to `tail` reports the pipe's exit status, not vitest's]
- [ ] **CHK-TEST-03** [P0] Backend suite green throughout. [deferred: pending execution — run the four real test dirs explicitly; the bare `tests` positional sweeps a protected context repo]
- [ ] **CHK-TEST-04** [P1] Primitive stories still mount. [deferred: pending execution — the story ids shift with the folder depth]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [ ] **CHK-FIX-01** [P0] Case-only renames were recorded by git. [deferred: pending execution — `git log --follow` spot-check on 3 files; a direct case-only rename is a no-op on this filesystem]
- [ ] **CHK-FIX-02** [P1] `.svelte.ts` double extensions survived the rewrite. [deferred: pending execution — a naive stem split truncates at the first dot]
- [ ] **CHK-FIX-03** [P1] The `.js` specifier suffix on `.ts` files survived the stem change. [deferred: pending execution — imports read `.js` while the file on disk is `.ts`]
- [ ] **CHK-FIX-04** [P1] Move-without-rename rows are present in the manifest. [deferred: pending execution — `interactions.ts` is already kebab-case and must not be skipped]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [ ] **CHK-SEC-01** [P0] No security invariant is touched. [deferred: pending execution — this child moves files; it must not reach `app-relay/` or the ticketed-mutation path]
- [ ] **CHK-SEC-02** [P0] `routes/**` filenames are untouched. [deferred: pending execution — the route tree is the URL contract, and routing is a frozen program invariant]
- [ ] **CHK-SEC-03** [P1] Nothing under `specs/context/**` is staged, moved or renamed. [deferred: pending execution — five read-only research repos live there; `git status` must show them untracked and untouched]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [ ] **CHK-DOC-01** [P0] The confirmed taxonomy and prefix list are recorded in `decision-record.md`. [deferred: pending execution — a decision agreed in conversation and not written down is a decision that gets relitigated]
- [ ] **CHK-DOC-02** [P1] The manifest is readable as data by the next two children. [deferred: pending execution — they consume it; they must not extend it by hand]
- [ ] **CHK-DOC-03** [P2] Folder READMEs naming moved primitives are corrected or handed to 014. [deferred: pending execution — several `README.md` files name components by filename]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [ ] **CHK-ORG-01** [P0] Each batch is one atomic commit. [deferred: pending execution — the live-follow daemon reverts uncommitted edits, so a half-applied batch can vanish]
- [ ] **CHK-ORG-02** [P1] Story and test files moved with their components. [deferred: pending execution — colocation is the existing convention and should survive]
- [ ] **CHK-ORG-03** [P2] `shared/chrome/` was not split. [deferred: pending execution — five components with one reason to change do not need a taxonomy imposed on them]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:arch-verify -->
## Architecture Verification

- [ ] **CHK-ARCH-01** [P0] Every primitive sub-folder holds one control family. [deferred: pending execution — the grouping rule the taxonomy was derived from]
- [ ] **CHK-ARCH-02** [P1] No module's *contents* were split or merged. [deferred: pending execution — this child moves and renames only]
- [ ] **CHK-ARCH-03** [P1] The `shared/data/` target tree is recorded even though it moves in 002. [deferred: pending execution — the taxonomy is one decision and should be approved once]
<!-- /ANCHOR:arch-verify -->

---

<!-- ANCHOR:perf-verify -->
## Performance Verification

- [ ] **CHK-PERF-01** [P1] No runtime performance effect. [deferred: pending execution — bundle content is byte-identical apart from module paths; confirm via `npm run build` output size]
- [ ] **CHK-PERF-02** [P2] Chunk splitting is unchanged. [deferred: pending execution — a deeper folder tree can alter Rollup chunk boundaries; compare the build manifest before and after]
<!-- /ANCHOR:perf-verify -->

---

<!-- ANCHOR:deploy-ready -->
## Deployment Readiness

- [ ] **CHK-DEPLOY-01** [P0] `npm run build` exit 0. [deferred: pending execution — the child's first and cheapest signal]
- [ ] **CHK-DEPLOY-02** [P1] The service worker still matches its shell paths. [deferred: pending execution — it caches by build-output hash rather than source path, so this is expected to be unaffected, and expectation is not evidence]
<!-- /ANCHOR:deploy-ready -->

---

<!-- ANCHOR:compliance-verify -->
## Compliance Verification

- [ ] **CHK-COMP-01** [P0] Token-identity 0 CHANGED / 0 VANISHED / 0 ADDED across all three theme states. [deferred: pending execution — the load-bearing proof that a mechanical change stayed mechanical]
- [ ] **CHK-COMP-02** [P1] `@ds guardrail:` fence count preserved in the moved files. [deferred: pending execution — count fresh before and after; the fences travel with their files]
- [ ] **CHK-COMP-03** [P1] No a11y contract changed. [deferred: pending execution — renames cannot alter roles or focus order, so `npm run test:web` passing is sufficient here]
<!-- /ANCHOR:compliance-verify -->

---

<!-- ANCHOR:docs-verify -->
## Documentation Verification

- [ ] **CHK-DOCV-01** [P0] `validate.sh … --strict` exit 0. [deferred: pending execution — must be invoked through the script's realpath, or it prints nothing and exits 0 even when the packet fails]
- [ ] **CHK-DOCV-02** [P1] Packet metadata regenerated. [deferred: pending execution — `generate-description.js` and `backfill-graph-metadata.js`, both through their realpath]
- [ ] **CHK-DOCV-03** [P1] No code comment gained an ephemeral artifact pointer. [deferred: pending execution — comment hygiene is a hard block; renames must not introduce spec ids into comments]
<!-- /ANCHOR:docs-verify -->

---

<!-- ANCHOR:sign-off -->
## Sign-Off

- [ ] **CHK-SIGN-01** [P0] Build, typecheck and both suites green from the final state. [deferred: pending execution — re-run the whole gate, not the subset that was failing]
- [ ] **CHK-SIGN-02** [P0] The manifest is handed off in a state 002 and 003 can consume. [deferred: pending execution — the child's real deliverable]
- [ ] **CHK-SIGN-03** [P1] Operator has reviewed the proving-ground diff. [deferred: pending execution — 23 files is small enough to read, which is why it goes first]
<!-- /ANCHOR:sign-off -->

---

<!-- ANCHOR:summary -->
## Verification Summary

Not yet verified — the child is scoped, not executed.

The honest read on risk: nothing here is intellectually hard, and that is precisely why it can fail. A
wide mechanical change fails by being partial, and a partial rename that still compiles is the outcome
to guard against. The scan and the rename history, not the build, are what catch that.
<!-- /ANCHOR:summary -->
