---
title: "Child 003 checklist — pages rename and tooling catch-up"
description: "Barrier sign-off for the wide rename, the tooling catch-up and the nine program gates. Every item is open: the child is scoped and blocked on children 001 and 002."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/012-naming-and-structure/003-pages-and-tooling"
    last_updated_at: "2026-08-23T14:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Checklist authored; all items open pending execution."
    next_safe_action: "Wait for children 001 and 002 to land."
    blockers: []
    completion_pct: 0
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

- [ ] **CHK-PRE-01** [P0] Children 001 and 002 have landed and `shared/` is settled. [deferred: pending execution — `shared/data/` must not exist before `pages/` starts moving]
- [ ] **CHK-PRE-02** [P0] The manifest covers every `pages/**` file including stories and tests. [deferred: pending execution — reconcile the row count against a fresh file count]
- [ ] **CHK-PRE-03** [P0] 013 is confirmed not running concurrently. [deferred: pending execution — both packets touch the same source files]
- [ ] **CHK-PRE-04** [P1] Baseline counts recorded. [deferred: pending execution — `@ds guardrail:` fence count and CSS-corpus file count, so the post-rename comparison is a delta]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [ ] **CHK-CQ-01** [P0] Every in-scope path is kebab-case. [deferred: pending execution — completeness scan for a capital letter under `app-mobile/src` excluding `routes/**` must return 0 hits]
- [ ] **CHK-CQ-02** [P0] UI-kind components carry a kind-first prefix. [deferred: pending execution — spot-check `sheet-leave-plan.svelte`, `menu-plan-mode.svelte`, `dialog-attachment-preview.svelte`]
- [ ] **CHK-CQ-03** [P1] Screens carry the `screen-` prefix. [deferred: pending execution — `screen-chat.svelte`, `screen-home.svelte`, `screen-review.svelte`, `screen-attention-inbox.svelte`, `screen-enrollment.svelte`]
- [ ] **CHK-CQ-04** [P1] Specifiers were rewritten from the manifest, not by hand. [deferred: pending execution — a hand-edited rewrite can disagree with the moves]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [ ] **CHK-TEST-01** [P0] `svelte-check` exit 0 after every folder. [deferred: pending execution — `npm run typecheck` is the primary import-integrity proof]
- [ ] **CHK-TEST-02** [P0] `npm run test:web` exit 0. [deferred: pending execution — verify by content, since piping to `tail` reports the pipe's exit status, not vitest's]
- [ ] **CHK-TEST-03** [P0] Backend suite green throughout. [deferred: pending execution — run the four real test dirs explicitly; the bare `tests` positional sweeps a protected context repo]
- [ ] **CHK-TEST-04** [P0] Catalog smoke green in both themes after story ids shift. [deferred: pending execution — `node scripts/catalog-smoke-cdp.mjs`, expect 0 throws]
- [ ] **CHK-TEST-05** [P1] The 009 coverage gate passes against the renamed paths. [deferred: pending execution — regenerate the allowlist rather than hand-editing it]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [ ] **CHK-FIX-01** [P0] The CSS-corpus glob was updated and the corpus is non-empty. [deferred: pending execution — a stale glob makes the token-identity gate pass by reading nothing at all]
- [ ] **CHK-FIX-02** [P0] Case-only renames were recorded by git. [deferred: pending execution — `git log --follow` spot-check on 3 files; a direct case-only rename is a no-op on this filesystem]
- [ ] **CHK-FIX-03** [P1] Both vitest web configs and every cwd-relative test path resolve. [deferred: pending execution — several web tests read fixtures relative to the working directory]
- [ ] **CHK-FIX-04** [P1] Story and test files moved with their components. [deferred: pending execution — colocation is the existing convention and should survive]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [ ] **CHK-SEC-01** [P0] No security invariant is touched. [deferred: pending execution — this child moves files; it must not reach `app-relay/` or the ticketed-mutation path]
- [ ] **CHK-SEC-02** [P0] `routes/**` filenames are untouched. [deferred: pending execution — the route tree is the URL contract, and routing is a frozen program invariant]
- [ ] **CHK-SEC-03** [P0] Nothing is staged in the shared Public checkout. [deferred: pending execution — its index holds thousands of another session's files; the conventions edit lands via an isolated worktree]
- [ ] **CHK-SEC-04** [P1] Nothing under `specs/context/**` is staged, moved or renamed. [deferred: pending execution — five read-only research repos live there]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [ ] **CHK-DOC-01** [P0] The conventions authority's naming section teaches the shipped grammar. [deferred: pending execution — a conventions file that contradicts the tree is worse than none, because dispatches trust it]
- [ ] **CHK-DOC-02** [P1] The stop-gap is one section, not a rewrite. [deferred: pending execution — anything more duplicates 019 and creates two places to disagree]
- [ ] **CHK-DOC-03** [P2] Folder READMEs naming moved files are corrected or explicitly handed to 014. [deferred: pending execution — 16 `README.md` and 7 `CODE.md` files name components by filename]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [ ] **CHK-ORG-01** [P0] Each folder is one atomic commit. [deferred: pending execution — the live-follow daemon reverts uncommitted edits, so a half-applied batch can vanish]
- [ ] **CHK-ORG-02** [P1] The conventions edit is a separate commit in a separate repository. [deferred: pending execution — it reverts independently of the app work]
- [ ] **CHK-ORG-03** [P2] Chunk splitting is unchanged. [deferred: pending execution — a deeper folder tree can alter Rollup chunk boundaries; compare the build manifest before and after]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

Not yet verified — the child is scoped, not executed.

The honest read on risk: the wide rename fails loudly and the tooling fails quietly. A missed
specifier cannot type-check; a stale corpus glob produces a green gate over nothing. The second is the
one to design the sign-off around.
<!-- /ANCHOR:summary -->
