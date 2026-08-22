# SvelteKit SPA Migration — Goal

Re-home the Pi Remote phone UI onto **Svelte 5 / SvelteKit (SPA/CSR)** — every screen one `.svelte` file (HTML + scoped CSS + typed logic) — preserving **byte-for-byte** the shipped look, a11y, security, PWA. **Re-hosting, not redesign**: build against frozen `--pi-*` tokens; never change a rendered value. Break an invariant → stop + escalate.

## Invariants
- **Tokens** resolve identically light/dark/system (token-identity 0-diff).
- **Security:** loopback relay, tailnet-only Serve (Funnel off), foreground authority, redaction, ticketed fail-closed mutations, host-enforced plan mode, content-free push; phone never enables full-access.
- **A11y:** roles, focus order + trap, `aria-*`, ≥44px, reduced-motion + forced-colors survive react-aria → Bits/Melt.
- **Routing:** `/`, `/session/[id]`, `/attention/[lookupId]`; Review/Inbox overlays; Enrollment an auth branch.
- **Backend green throughout** — the leak detector.

## Current state
- Web = `app-mobile/`, relay = `app-relay/`. **L0–L6 shipped** (`001`–`006`): scaffold + routes; `.ts` ports; 14 Bits-UI primitives; feature dirs; chrome + composer; all views + Session + `+layout` shell (`goto` routing, SW, both context providers); Storybook catalog (48 story files / 202 stories, catalog-smoke green).
- **`007` cutover — at the C4 pause.** Board green: build · svelte-check 0 · backend 365/366 (`auth.test.ts` flake) · `test:web` svelte+logic 528+182 · token-identity 0/0/0 · corpus 4343 · validate --strict. **C3 done:** the react-aria→Bits/Melt swap dropped 3 P0 + 7 P1 a11y behaviors (audit in `a11y-parity-findings.md`); ALL fixed + adversarially re-verified (4 verifier groups, 0 defects). CDP + catalog re-run pending, then C4.
- **Still React:** `index.html` → `/src/main.tsx`; the 60 `.tsx` + `style.css` are the pre-cutover oracle — **no delete yet.**

## Remaining
- **Finish `007`:** re-run CDP (390px both themes) + catalog-smoke → **C4 = surface the green board, get explicit go-ahead for the irreversible React delete** → **C5** repoint `index.html`, delete `main.tsx` + 60 `.tsx` + `style.css` + React dirs → **WS-C** reorg `lib/` → `pages/{home,session,review,inbox,enrollment}/` + `shared/`, codemod all imports, re-verify, amendment close.
- **`008-sk-code-svelte-refactor`** (isolated Public worktree): finalize the Svelte conventions surface at cutover.
- **NEW `009-storybook-experience`** (AFTER `007` + WS-C; spec authored, spec-only): make Storybook **dummy-proof + self-maintaining** — one-command non-tech launch (auto-open + quickstart); install the addon set (a11y ✓, **vitest** test, **themes**, **autodocs**, **designs**; Chromatic = open Q); **story-per-component convention + coverage gate + AI-runnable scaffold** so every component change initializes/updates its story; per-component autodocs + docs; stories co-located in `pages/`/`shared/`; `preview.ts` → `app.css` (not the deleted `style.css`). Gate: build-storybook 0 · catalog-smoke green · coverage gate 0 · addon-vitest green.

## Execution model
Claude orchestrates + **verifies each layer**; owns git, barrier/shared files, every `npm install`. App code + tests under `app-mobile/**` written by the executor (a11y = **gpt-5.6-luna**, else **GLM-5.2 / cli-devin**): pre-approved spec folder; WRITE = one dir; BANNED = install/config/token/security/routing/a11y-contract changes; load `sk-code`; return svelte-check for Claude to re-verify. Sonnet subagents verify only.

## Gates
build · svelte-check · `npm test` · `test:web` (svelte+logic) · token-identity 0-diff (3 themes) · contrast + ≥76 fences · CDP 390px both themes · catalog smoke · `validate.sh --strict`. `008`: `package_skill.py --check`. `009`: build-storybook · catalog-smoke · story-coverage gate · addon-vitest.
