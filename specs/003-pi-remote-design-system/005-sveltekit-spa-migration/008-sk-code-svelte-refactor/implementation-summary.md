---
title: "Child 008 implementation summary — sk-code-mobile-cli React to Svelte refactor"
description: "What the surface-skill refactor shipped, how it landed without touching a shared checkout, and the two things still outstanding: a stranded branch and a superseded divider convention."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/008-sk-code-svelte-refactor"
    last_updated_at: "2026-08-23T10:50:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed; two open items recorded."
    next_safe_action: "Update svelte-conventions.md to Format A, then merge the branch."
    blockers: []
    completion_pct: 90
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 008 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `005-sveltekit-spa-migration` |
| Level | 2 |
| Status | Shipped to a branch; two items outstanding |
| Requirements shipped | REQ-001 … REQ-005 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

The `sk-code-mobile-cli` surface skill — the conventions authority every code workflow on this app
loads — now teaches the SvelteKit 5 runes SPA-CSR stack instead of the retired React stack. The design
system contracts are untouched: `--pi-*` primitives stay frozen, the `@ds` grammar still marks the
seams, WCAG AA still holds in both themes. Only the framework medium changed.

- **`SKILL.md`** — the app is `app-mobile/`; detection adds the Svelte signals (`.svelte`,
  `*.svelte.ts`, `app.css`, `$shared/`); smart routing swaps `.tsx` and `style.css` for `.svelte`,
  `app.css`, runes, `$shared` and `bits-ui`; surface standards gain the Svelte authoring contract, and
  a11y parity is elevated to a first-class, manually verified deliverable. Version 1.1.0.0 → 1.2.0.0.
- **`references/svelte-conventions.md`** (new) — the React-to-runes mapping, the section-divider
  grammar, the `$shared` alias and its `fileURLToPath` space-in-path trap, scoped-`<style>` and
  `:global()` ownership routing, react-aria to Bits UI including the a11y blind spot and
  `ariaHideOutside`, interactive state without native `:hover`, the `$effect` self-invalidation trap,
  the `@tanstack/svelte-virtual` store API, and atomic-commit-under-daemon discipline.
- **`references/verification.md`** — rewritten to the browser-free gate over the CSS corpus.
- **`references/ds-grammar.md`** and **`editability-guardrails.md`** — re-expressed across `app.css`
  plus component scoped blocks; the stale hardcoded fence count replaced with count-fresh guidance.
- **Path swaps** across the three checklists, `token-library.md`, `retint-recipes.md`, `README.md` and
  `setup/install-and-onboarding.md`; plus a `changelog/v1.2.0.0.md` entry.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

The skill lives in the Public monorepo, reached here through the `.opencode` symlink. It was authored
and landed through **isolated Public worktrees** and never staged in the shared checkout, whose index
already holds thousands of another session's files — staging there would have swept them into a commit.

Branch `branches/008-sk-code-mobile-cli-svelte`, allocated through sk-git rather than hand-named,
based on `skilled/v4.0.0.0`. Origin tip `2b7622c32d` across three commits: the core refactor
(`5ad99cdc28`), the finalize pass (`f9d840d649`) and the leaf-manifest regeneration (`2b7622c32d`).
Both worktrees were removed afterwards.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**One authoring pass, not two.** The spec planned a draft before L1 and a finalize at L7. Because the
migration had already cut over by the time this ran, it was done in a single pass at the end, folding
the proven patterns in directly. That is strictly better than the plan: it removes a
draft-from-assumptions step whose output would have been rewritten anyway.

**The shared `workflow-*.md` files were left alone.** The spec listed them for a Svelte rewrite, but
they are symlinks into `../../shared/references/`, shared with the `sk-code-webflow` and
`sk-code-opencode` surfaces. Specialising them for Svelte would impose Svelte on two surfaces that are
not Svelte. The doctrine went into the new `svelte-conventions.md` instead.

**Framework-agnostic cores carried verbatim.** `component-tokens.md`, `theme-remap.md` and the token
model in `token-library.md` changed only where a path was stale. No token value was edited.

**Landing through isolated worktrees was a hard requirement, not a preference.** The shared Public
checkout carries another session's staged files, so `git add` there is destructive to work that is not
this packet's to touch.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| `package_skill.py --check` | PASS — 12 pre-existing warnings, 0 new |
| `validate_document.py` | 0 issues across all 12 changed and new docs |
| `ci-skill-root-metadata.cjs` pre-push gate | passed=13, failed=0, after regenerating the hub's `leaf-manifest.json` |
| Residual-reference sweep | no React-stack instruction remains where it could misguide a dispatch |
| `validate.sh --strict` on this packet | exit 0 |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

**The branch is stranded, and that was deliberate.** `branches/008-sk-code-mobile-cli-svelte` has never
been merged into the live `skilled/v4.0.0.0`. It was held back because of the item below — merging a
conventions authority that teaches a superseded convention would propagate the wrong grammar to every
future dispatch. Until it merges, no workflow actually loads this refactor.

**`svelte-conventions.md` documents the superseded divider grammar.** It teaches the compact
`// ─── Label ───` form. The authoritative contract is Format A — a `// ` prefix followed by exactly
67 box-drawing characters, with a numbered section label between two rules — and the app was converted
to it in 007-EXT across 45 files and 213 dividers. The skill therefore currently teaches something the
codebase no longer does. This must be fixed before the merge, not after.

**The residual-reference sweep was a grep, not a semantic review.** It confirms no React instruction
survives verbatim. It cannot confirm that every rewritten passage is *right* about Svelte — that is
what a dispatch loading the surface would reveal, and no such dry-run has run against the merged
surface because it is not merged.
<!-- /ANCHOR:limitations -->
