---
title: "Child 012 checklist — naming grammar and shared-tree structure"
description: "Barrier sign-off for the kebab-case rename and shared-tree split. Every item is open: this packet is scoped and awaiting operator sign-off, so each marker names the check that will produce its evidence rather than claiming a result."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/012-naming-and-structure"
    last_updated_at: "2026-08-23T12:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Checklist authored; all items open pending execution."
    next_safe_action: "Close T0.1 taxonomy sign-off before any item can be worked."
    blockers: []
    completion_pct: 0
---

# Verification Checklist: Child 012 — Naming grammar and shared-tree structure

<!-- SPECKIT_LEVEL: 3 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

This packet changes no behaviour, so the protocol is inverted from a normal feature: the job is not to
prove something new works, but to prove nothing old changed while every path moved.

Two checks carry that weight. The type checker proves every specifier still resolves. The
token-identity gate proves no CSS value moved. Everything else is corroboration.

**Every item below is open.** The packet is scoped and awaiting operator sign-off, so each marker
names the check that will produce its evidence rather than asserting a result.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [ ] **CHK-PRE-01** [P0] Operator has confirmed the `shared/` taxonomy and the kind-prefix list. [deferred: pending sign-off — the tree is a design decision, recorded as open question 1 in `spec.md`]
- [ ] **CHK-PRE-02** [P0] The rename manifest exists as data and its rewrite script is generated from it. [deferred: pending execution — proof is a `git diff` dry-run read before any file moves]
- [ ] **CHK-PRE-03** [P1] 011 has landed, so no rename collides with an open edit. [deferred: pending execution — check `git status` clean before Phase 1]
- [ ] **CHK-PRE-04** [P0] 013 is confirmed not running concurrently. [deferred: pending execution — both packets touch the same 148 source files]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [ ] **CHK-CQ-01** [P0] Every in-scope path is kebab-case. [deferred: pending execution — completeness scan for a capital letter in any path under `app-mobile/src` excluding `routes/**` must return 0 hits]
- [ ] **CHK-CQ-02** [P1] UI-kind components carry a kind-first prefix. [deferred: pending execution — spot-check `sheet-leave-plan.svelte`, `menu-plan-mode.svelte`, `dialog-attachment-preview.svelte`]
- [ ] **CHK-CQ-03** [P1] No folder under `shared/` holds more than one responsibility. [deferred: pending execution — `shared/data/` must no longer exist; 28 files redistributed across 7 folders]
- [ ] **CHK-CQ-04** [P1] Specifiers were rewritten from the manifest, not by hand. [deferred: pending execution — a hand-edited rewrite can disagree with the moves]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [ ] **CHK-TEST-01** [P0] `svelte-check` exit 0 after every batch. [deferred: pending execution — `npm run typecheck` is the primary import-integrity proof]
- [ ] **CHK-TEST-02** [P0] `npm run test:web` exit 0. [deferred: pending execution — verify by content, since piping to `tail` reports the pipe's exit status, not vitest's]
- [ ] **CHK-TEST-03** [P0] Backend suite green throughout. [deferred: pending execution — run the four real test dirs explicitly; the bare `tests` positional sweeps a protected context repo]
- [ ] **CHK-TEST-04** [P0] Catalog smoke green in both themes after story ids shift. [deferred: pending execution — `node scripts/catalog-smoke-cdp.mjs`, expect 0 throws]
- [ ] **CHK-TEST-05** [P1] The 009 coverage gate passes against the renamed paths. [deferred: pending execution — its allowlist is path-keyed and re-baselines in the same commit]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [ ] **CHK-FIX-01** [P0] The two deep-relative (`../../`) specifiers were rewritten. [deferred: pending execution — they are the only two the `$shared` alias does not cover]
- [ ] **CHK-FIX-02** [P1] Worker files still resolve. [deferred: pending execution — `highlight.worker.ts` and `attachment-hash.worker.ts` are referenced by URL construction as well as by import]
- [ ] **CHK-FIX-03** [P0] Case-only renames were recorded by git. [deferred: pending execution — `git log --follow` spot-check on 3 files; a direct case-only rename is a no-op on this filesystem]
- [ ] **CHK-FIX-04** [P1] The CSS-corpus glob was updated. [deferred: pending execution — a stale glob would make the token-identity gate pass by reading nothing at all]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [ ] **CHK-SEC-01** [P0] No security invariant is touched. [deferred: pending execution — this packet moves files; it must not reach `app-relay/` or the ticketed-mutation path]
- [ ] **CHK-SEC-02** [P0] `routes/**` filenames are untouched. [deferred: pending execution — the route tree is the URL contract, and routing is a frozen program invariant]
- [ ] **CHK-SEC-03** [P1] Nothing under `specs/context/**` is staged, moved or renamed. [deferred: pending execution — five read-only research repos live there; `git status` must show them untracked and untouched]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [ ] **CHK-DOC-01** [P0] `svelte-conventions.md` teaches the shipped grammar. [deferred: pending execution — a conventions file that contradicts the tree is worse than none, because dispatches trust it]
- [ ] **CHK-DOC-02** [P1] The conventions edit landed through an isolated Public worktree. [deferred: pending execution — the shared checkout's index holds another session's files]
- [ ] **CHK-DOC-03** [P2] Folder READMEs naming moved files are corrected or explicitly handed to 014. [deferred: pending execution — 16 `README.md` and 7 `CODE.md` files name components by filename]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [ ] **CHK-ORG-01** [P0] `shared/data/` no longer exists. [deferred: pending execution — a leftover file there means a partial split, which is worse than not having started]
- [ ] **CHK-ORG-02** [P1] Each rename batch is one atomic commit. [deferred: pending execution — the live-follow daemon reverts uncommitted edits, so a half-applied batch can vanish]
- [ ] **CHK-ORG-03** [P2] Story and test files moved with their components. [deferred: pending execution — colocation is the existing convention and should survive]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:arch-verify -->
## Architecture Verification

- [ ] **CHK-ARCH-01** [P0] Every `shared/` folder has one reason to change. [deferred: pending execution — the grouping rule the taxonomy was derived from]
- [ ] **CHK-ARCH-02** [P1] No module's *contents* were split or merged. [deferred: pending execution — this packet moves and renames only; content changes belong to a different packet]
- [ ] **CHK-ARCH-03** [P1] `fixtures/` is separate from runtime folders. [deferred: pending execution — `demo.ts` ships to stories, not to users, and that distinction should be visible in the tree]
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

- [ ] **CHK-DEPLOY-01** [P0] `npm run build` exit 0. [deferred: pending execution — the packet's first and cheapest signal]
- [ ] **CHK-DEPLOY-02** [P1] The service worker still matches its shell paths. [deferred: pending execution — it caches by build-output hash rather than source path, so this is expected to be unaffected, and expectation is not evidence]
- [ ] **CHK-DEPLOY-03** [P1] CDP structural gate green at 390px in both themes. [deferred: pending execution — `node scripts/design-system-cdp.mjs --surface app-default --viewport-width 390`]
<!-- /ANCHOR:deploy-ready -->

---

<!-- ANCHOR:compliance-verify -->
## Compliance Verification

- [ ] **CHK-COMP-01** [P0] Token-identity 0 CHANGED / 0 VANISHED / 0 ADDED across all three theme states. [deferred: pending execution — the load-bearing proof that a wide mechanical change stayed mechanical]
- [ ] **CHK-COMP-02** [P0] `@ds guardrail:` fence count preserved. [deferred: pending execution — count fresh before and after; the fences travel with their files]
- [ ] **CHK-COMP-03** [P1] Contrast pairs at or above threshold. [deferred: pending execution — unchanged arithmetic over the rebuilt CSS corpus]
- [ ] **CHK-COMP-04** [P1] No a11y contract changed. [deferred: pending execution — renames cannot alter roles or focus order, so `npm run test:web` passing is sufficient here]
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

- [ ] **CHK-SIGN-01** [P0] All nine program gates green from the final state. [deferred: pending execution — re-run the whole gate, not the subset that was failing]
- [ ] **CHK-SIGN-02** [P0] Completeness scan returns zero non-kebab in-scope paths. [deferred: pending execution — the packet's own definition of done]
- [ ] **CHK-SIGN-03** [P1] Operator has reviewed the final tree. [deferred: pending execution — the taxonomy was their decision, so the result is theirs to accept]
<!-- /ANCHOR:sign-off -->

---

<!-- ANCHOR:summary -->
## Verification Summary

Not yet verified — the packet is scoped, not executed.

The honest read on risk: nothing here is intellectually hard, and that is precisely why it can fail.
A wide mechanical change fails by being partial, and a partial rename that still compiles is the
outcome to guard against. The completeness scan, not the build, is what catches that.
<!-- /ANCHOR:summary -->
