---
title: "Child 008 — Implementation Summary (sk-code-mobile-cli React→Svelte refactor)"
description: "Completion record for the sk-code-mobile-cli surface-skill refactor: what shipped, the verification evidence, the deviations from the spec's letter, and the landing branch."
_memory:
  continuity:
    packet_pointer: "app-mobile-cli/003-pi-remote-design-system/005-sveltekit-spa-migration/008-sk-code-svelte-refactor"
    last_updated_at: "2026-08-23T02:30:00Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "COMPLETE + landed. Refactored the sk-code-mobile-cli surface skill React→Svelte and pushed it to the Public monorepo on branch branches/008-sk-code-mobile-cli-svelte (origin tip 2b7622c32d, 3 commits). New references/svelte-conventions.md; verification.md rewritten to the app.css + scoped-<style> corpus + token-identity resolver; SKILL.md detection/routing/standards moved to Svelte; path swaps across ds-grammar, the 3 checklists, token cores, setup; changelog v1.2.0.0. Gates green: package_skill.py --check PASS (12 pre-existing warns, 0 new), validate_document.py 0 issues on all 12 changed docs, skill-root-metadata gate passed=13 (leaf-manifest regenerated), validate.sh --strict on this folder exit 0."
    next_safe_action: "009-storybook-experience: dummy-proof self-maintaining Storybook (app-mobile-local; .storybook/ + storybook/build-storybook scripts already exist, storybook ^9.1.20). Research pipeline (background): nodeterm relaunched (task bsyvmnl97) → openclaude-android → remote-for-opencode sequentially; mobilecli + OGAM already landed."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_LEVEL: 2 -->

# Child 008 — Implementation Summary

## 1. OUTCOME

The `sk-code-mobile-cli` surface skill — the conventions authority every code workflow on the Pi Remote
app loads — now teaches the **SvelteKit 5 / Svelte 5 (runes) SPA-CSR** stack instead of the retired React
stack. The design-system contracts are unchanged: `--pi-*` primitives stay frozen, the `@ds` grammar
still marks the seams, WCAG AA still holds in both themes. Only the framework medium changed.

The skill lives in the **Public monorepo** (symlinked here via `.opencode`). It was authored and landed
through **isolated Public worktrees**, never staged in the shared checkout — honoring the
repo-protection constraint.

## 2. WHAT SHIPPED

- **`SKILL.md`** — app is `app-mobile/` (Svelte runes SPA-CSR); detection adds the Svelte signals
  (`.svelte`, `*.svelte.ts`, `app.css`, `$shared/`); SMART ROUTING swaps `.tsx`/`style.css` for
  `.svelte`/`app.css`/`runes`/`$shared`/`bits-ui`; surface standards add the Svelte authoring contract
  and elevate a11y parity to a first-class, manually-verified deliverable; version 1.1.0.0 → 1.2.0.0.
- **`references/svelte-conventions.md`** (new) — the React→runes mapping, section-divider grammar, the
  `$shared` alias (+ the `fileURLToPath` space-in-path trap), scoped-`<style>` / `:global()` ownership,
  react-aria→Bits UI (+ the a11y blind spot, `ariaHideOutside`), interactive state without native
  `:hover` (`use:hover`/`use:press`/`use:focusVisible`), the `$effect` self-invalidation trap, the
  `@tanstack/svelte-virtual` store API, and atomic-commit-under-daemon discipline.
- **`references/verification.md`** — rewritten to the browser-free gate over the CSS corpus (`app.css` +
  each scoped `<style>`): `svelte-check`, `vite build`, `test:web`, the CDP structural gate, and the
  token-identity resolver (0/0/0 across the three themes).
- **`references/ds-grammar.md` · `editability-guardrails.md`** — the `@ds` grammar and guardrail fences
  re-expressed across `app.css` + component scoped `<style>`/`<script>`; stale hardcoded fence count
  replaced with count-fresh guidance.
- **Path swaps** (`apps/pi-remote-web`→`app-mobile`, `style.css`→`app.css`, `.tsx`→`.svelte`) across the
  3 checklists, `token-library.md`, `retint-recipes.md`, `README.md`, and `setup/install-and-onboarding.md`.
- **`changelog/v1.2.0.0.md`** (new) documenting the refactor.

## 3. VERIFICATION EVIDENCE

- `package_skill.py --check` → **PASS** (12 pre-existing warnings — long description, PNG assets, some
  design-reference docs without frontmatter; **0 new**).
- `validate_document.py` → **0 issues** on all 12 changed/new docs.
- `ci-skill-root-metadata.cjs` (pre-push gate) → **passed=13 failed=0** after regenerating the parent
  hub's `leaf-manifest.json` (byte-fresh).
- Residual-reference sweep → no React-stack instruction remains where it would misguide a dispatch (the
  only `react-aria` mentions describe the swap itself; historical audit records intentionally retained).
- `validate.sh <this folder> --strict` → **exit 0**.

## 4. LANDING

- Branch: `branches/008-sk-code-mobile-cli-svelte` (allocated via sk-git; based on `skilled/v4.0.0.0`).
- Origin tip: `2b7622c32d` — three commits (core refactor `5ad99cdc28`, finalize `f9d840d649`,
  leaf-manifest regen `2b7622c32d`).
- Both isolated worktrees removed; the shared Public checkout was never staged.

## 5. DEVIATIONS FROM THE SPEC'S LETTER (documented)

1. **One pass, not two.** The spec planned a draft-before-L1 + finalize-at-L7 two-pass author. Because the
   migration was already cut over, the refactor was done in **one pass at the end**, folding in the proven
   patterns directly — strictly better (no draft-from-assumptions step). Intent preserved.
2. **Shared `workflow-*.md` left symlinked.** The spec listed `workflow-implement/debug/verify.md` for a
   Svelte rewrite, but they are **symlinks to `../../shared/references/`** shared by the sibling
   `sk-code-webflow` / `sk-code-opencode` surfaces. Specializing them for Svelte would wrongly impose
   Svelte on those surfaces, so the Svelte doctrine lives in the new `svelte-conventions.md` instead and
   the shared docs are untouched.
3. **Framework-agnostic cores unchanged.** `component-tokens.md`, `theme-remap.md`, and the token model in
   `token-library.md` were carried verbatim (only stale paths fixed) per R3 — no token value edits.
