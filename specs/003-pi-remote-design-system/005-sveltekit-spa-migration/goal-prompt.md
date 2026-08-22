# SvelteKit SPA Migration — Goal

Re-home the Pi Remote phone UI onto **Svelte 5 / SvelteKit (SPA/CSR)** — every screen one `.svelte` file (HTML + scoped CSS + typed logic) — preserving **byte-for-byte** the shipped look, a11y, security, PWA. **Re-hosting, not redesign**: build against frozen `--pi-*` tokens; never change a rendered value. Break an invariant → stop + escalate.

## Invariants
- **Tokens** resolve identically light/dark/system (token-identity 0-diff).
- **Security:** loopback relay, tailnet-only Serve (Funnel off), foreground authority, redaction, ticketed fail-closed mutations, host plan mode, content-free push; phone never enables full-access.
- **A11y:** roles, focus order + trap, `aria-*`, ≥44px, reduced-motion + forced-colors survive react-aria → Bits/Melt.
- **Routing:** `/`, `/session/[id]`, `/attention/[lookupId]`; Review/Inbox overlays; Enrollment an auth branch.
- **Backend green throughout** — leak detector.

## Current state — EPIC ONGOING (cutover shipped; 007 being extended; 008 + 009 remain)
- **Svelte app is the only runtime.** React deleted (`be76d77`): no `index.html`/`main.tsx`, no `.tsx`, no `style.css`, no React vitest config.
- **`007` core cutover SHIPPED, now being EXTENDED.** C1–C5 + WS-C done; a11y regression (3 P0 + 7 P1) fixed + adversarially re-verified (0 defects, audit `a11y-parity-findings.md`). **Not the finish line.**
- **Option B page-centric layout live** (`2a811df`): `pages/{home,chat,review,inbox,enrollment}/` + `shared/{primitives,chrome,data}`. Conversation view `pages/chat/Chat.svelte` (was Session); route + protocol names unchanged.
- Board green — all 9 gates pass.

## Remaining (in order)
1. **`007` EXTENSION — quality/DX pass (NEXT; approach set by a fresh Opus-5 xhigh AI council).** Make the Svelte-only, byte-identical app truly *editable*: (a) **inline comments** — segment every file into labelled comment SECTIONS (sk-code / opencode section style), **enforced + applied everywhere**; consistent `@ds` grammar + durable WHY, no ephemeral labels; (b) **architecture** — refine `pages/`+`shared/` layout, boundaries, `*.svelte.ts` factories; (c) **styling structure** — scoped-`<style>` + `app.css` token layering, easy to find/change a surface's CSS; (d) **editing ease** — a designer opens one file, sees the whole component. HARD: zero rendered-value/a11y/security/routing change (cutover gates prove it). Council also sequences 008/009.
2. **`008-sk-code-svelte-refactor`** (isolated Public worktree): finalize the Svelte conventions surface (`sk-code`) — encode + lint the 007-ext conventions (incl. comment segmentation) so edits stay on-pattern.
3. **`009-storybook-experience`** (spec-only, AFTER 007-ext + 008): **dummy-proof + self-maintaining** Storybook — one-command non-tech launch; addons (a11y, vitest, themes, autodocs, designs); story-per-component + coverage gate + AI scaffold.
4. Cleanup: drop the 3 retired `style.css`-oracle scripts.

## Research input (AFTER council + phase update — feeds the phases)
**Context-repo deep research:** 5 sibling mobile-chat repos in `specs/context/`. Per repo a fresh Opus-5 xhigh agent scopes research angles (ease-of-use · architecture · UX · logic), then **10 deep-research iterations** mine adoptable patterns. Read-only (protected); findings refine 007-ext/008/009, never override frozen contracts.

## Execution model
Claude orchestrates + **verifies each layer**; owns git, barrier/shared files, every `npm install`. App code + tests under `app-mobile/**` by the executor (a11y = **gpt-5.6-luna**, else **cli-devin**): WRITE = one dir; BANNED = install/config/token/security/routing/a11y changes; return svelte-check for Claude to re-verify.

## Gates
build · svelte-check · `npm test` · `test:web` · token-identity 0-diff (3 themes) · contrast + ≥76 fences · CDP 390px · catalog smoke · `validate.sh --strict`. `008`: `package_skill.py --check` + comment-section lint. `009`: build-storybook · catalog-smoke · story-coverage · addon-vitest.
