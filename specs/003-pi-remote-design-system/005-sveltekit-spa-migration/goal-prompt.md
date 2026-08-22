# SvelteKit SPA Migration — Goal

Re-home the Pi Remote phone UI onto **Svelte 5 / SvelteKit (SPA/CSR)** — every screen one `.svelte` file (HTML + scoped CSS + typed logic) — preserving **byte-for-byte** the shipped look, a11y, security, PWA. **Re-hosting, not redesign**: build against frozen `--pi-*` tokens; never change a rendered value. Break an invariant → stop + escalate.

## Invariants
- **Tokens** resolve identically light/dark/system (token-identity 0-diff).
- **Security:** loopback relay, tailnet-only Serve (Funnel off), foreground authority, redaction, ticketed fail-closed mutations, host-enforced plan mode, content-free push; phone never enables full-access.
- **A11y:** roles, focus order + trap, `aria-*`, ≥44px, reduced-motion + forced-colors survive react-aria → Bits/Melt.
- **Routing:** `/`, `/session/[id]`, `/attention/[lookupId]`; Review/Inbox overlays; Enrollment an auth branch.
- **Backend green throughout** — the leak detector.

## Current state — CUTOVER SHIPPED
- Web = `app-mobile/`, relay = `app-relay/`. **The Svelte app is the only runtime.** React is deleted (`be76d77`): no `index.html`/`main.tsx`, no `.tsx`, no `style.css`, no React vitest config.
- **`007` COMPLETE.** C1–C5 + WS-C done. The a11y regression (3 P0 + 7 P1 from the react-aria→Bits/Melt swap, audit in `a11y-parity-findings.md`) was fixed + adversarially re-verified (4 verifier groups, 0 defects, C3).
- **Option B page-centric layout is live** (`2a811df`): `pages/{home,chat,review,inbox,enrollment}/` + `shared/{primitives,chrome,data}`. The conversation view is `pages/chat/Chat.svelte` (was Session); `/session/[id]` route + session-protocol names unchanged. 191 files moved, 480 imports codemod-rewritten.
- Board green from the new layout: build 0 · svelte-check 0 · backend 366/366 · `test:web` 528+182 · token-identity 0/0/0 (3 themes) · CDP both themes · catalog-smoke 404/0 · validate --strict.

## Remaining
- **`008-sk-code-svelte-refactor`** (isolated Public worktree): finalize the Svelte conventions surface now that the proven patterns exist.
- **`009-storybook-experience`** (spec authored, deferred here): see below.
- Cleanup (follow-up): drop the 3 retired `style.css`-oracle scripts (`build-app-css`, `css-corpus-equivalence`, `decl-equivalence`).
- **NEW `009-storybook-experience`** (AFTER `007` + WS-C; spec authored, spec-only): make Storybook **dummy-proof + self-maintaining** — one-command non-tech launch (auto-open + quickstart); install the addon set (a11y ✓, **vitest** test, **themes**, **autodocs**, **designs**; Chromatic = open Q); **story-per-component convention + coverage gate + AI-runnable scaffold** so every component change initializes/updates its story; per-component autodocs + docs; stories co-located in `pages/`/`shared/`; `preview.ts` → `app.css` (not the deleted `style.css`). Gate: build-storybook 0 · catalog-smoke green · coverage gate 0 · addon-vitest green.

## Execution model
Claude orchestrates + **verifies each layer**; owns git, barrier/shared files, every `npm install`. App code + tests under `app-mobile/**` written by the executor (a11y = **gpt-5.6-luna**, else **GLM-5.2 / cli-devin**): pre-approved spec folder; WRITE = one dir; BANNED = install/config/token/security/routing/a11y-contract changes; load `sk-code`; return svelte-check for Claude to re-verify. Sonnet subagents verify only.

## Gates
build · svelte-check · `npm test` · `test:web` (svelte+logic) · token-identity 0-diff (3 themes) · contrast + ≥76 fences · CDP 390px both themes · catalog smoke · `validate.sh --strict`. `008`: `package_skill.py --check`. `009`: build-storybook · catalog-smoke · story-coverage gate · addon-vitest.
