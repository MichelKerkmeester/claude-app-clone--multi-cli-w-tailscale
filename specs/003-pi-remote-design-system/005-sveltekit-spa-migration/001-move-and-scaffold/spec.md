---
title: "Child 001 — Folder Move (apps→src) + SvelteKit Scaffold"
description: "Relocate apps/pi-remote-web→src/mobile-app and apps/pi-remote-relay→src/relay (folder-rename only, @pi-remote/* names kept), fix the finite set of filesystem-path refs, npm install; then stand up the SvelteKit 5 SPA skeleton at src/mobile-app with app.css foundation. The React suite stays the correctness oracle through the move; an empty Svelte page renders after scaffold."
trigger_phrases:
  - "move apps to src pi remote"
  - "sveltekit scaffold app.css foundation"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "app-mobile-cli/003-pi-remote-design-system/005-sveltekit-spa-migration/001-move-and-scaffold"
    last_updated_at: "2026-08-19T00:00:00Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Spec authored (L0 infra child)"
    next_safe_action: "Create worktree, then git mv the two app folders and fix path refs"
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 001 — Folder Move (apps→src) + SvelteKit Scaffold

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 2 |
| **Layer** | L0 — Claude infra, sequential (no parallel dispatch) |
| **Writer** | Claude (infra + config, not app logic) |
| **Barrier** | build + typecheck + test + test:web + CDP all green |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

Code lives under `apps/`, not `src/`, and no SvelteKit app exists yet. This child does the two
mechanical, high-blast-radius infra steps that must precede any `.svelte` authoring: the folder
relocation (proven green by the existing React suite) and the SvelteKit skeleton + global `app.css`
foundation. Getting these wrong breaks every downstream dispatch, so Claude owns them directly.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope — the move:**
- `git mv apps/pi-remote-web src/mobile-app` and `git mv apps/pi-remote-relay src/relay` (both stay
  exactly 2 levels deep so `../../tsconfig.base.json` extends keep resolving). Package names
  (`@pi-remote/*`) are kept, so all cross-package imports keep working.
- Update the **finite** filesystem-path refs (package-name refs need no change): `package.json`
  (workspaces `apps/*`→`src/*`; the `test` positional path), `vitest.config.ts`,
  `vitest.web.config.ts`, `eslint.config.js` (globs + add `.svelte`), `scripts/release-verify.mjs`
  (9 refs), `scripts/rollback-drill.mjs`, `scripts/verify-full-access-runtime.mjs`,
  `release/threshold-gate.mjs`, `tests/rollback-drill.test.ts`, and ~8 web test files that
  `readFileSync('apps/pi-remote-web/...')`.
- `npm install` (regenerates lockfile + workspace symlinks).

**In scope — the scaffold** (at `src/mobile-app`):
- `svelte.config.js` — `adapter-static({ pages:'dist', assets:'dist', fallback:'index.html' })`,
  `kit.csp.mode:'hash'` mirroring the frozen CSP directives.
- `src/routes/+layout.ts` — `export const ssr=false; export const prerender=false;`.
- `vite.config.ts` — ported nearly verbatim: **keep** the `/api`+`/health` relay proxy with
  `ws:true`, `preview.allowedHosts` for `.ts.net`, `worker.format:'es'`,
  `optimizeDeps.exclude:['pdfjs-dist']`, `@tailwindcss/vite`; swap `plugin-react()`→`sveltekit()`;
  drop the manual `rollupOptions.input`.
- `src/app.html` — head/meta/manifest/theme-color from `index.html` (CSP moves to `kit.csp`).
- Move `public/*`→`static/*`; update the service worker shell path `/assets/`→`/_app/immutable/`
  and bump `CACHE_NAME`.
- `src/app.css` — verbatim move of `style.css:1-256` (`@theme`, `@font-face`, the three
  `data-theme` blocks, resets) + the global guardrail media queries + ~10 shared/convention surfaces.
- All deps installed here (Svelte, SvelteKit, adapter-static, Bits UI, Melt UI,
  `@tanstack/svelte-virtual`, `@storybook/sveltekit`, `@testing-library/svelte`).

**Out of scope:** any `.svelte` component; any token value change; any relay/protocol/extension code;
any security-boundary change.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- R1: The move is a single atomic "restructure only" commit; the React suite is green **before and
  after** it (no behavior change).
- R2: Every filesystem-path ref is updated; zero broken references; `@pi-remote/*` imports unchanged.
- R3: The SvelteKit skeleton builds and serves an empty page; `dist/` output is preserved so
  `release/threshold-gate.mjs` and `vite preview` keep working.
- R4: `app.css` is a byte-for-byte move of the foundation region; no value edited.
- R5: The relay needs **zero** serving changes (Tailscale Serve is the reverse proxy).
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA (barrier gate)

- `npm run build` · `npm run typecheck` · `npm test` · `npm run test:web` · `node scripts/design-system-cdp.mjs` — all exit 0 after the move (still React).
- After scaffold: `svelte-check` + `vite build` green with an empty page.
- The L0 token-identity **snapshot** is captured (resolve every token in all 3 theme states from
  today's `style.css`) — the correctness oracle for every later layer.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- Missed path ref → build/test break; mitigation: grep every `apps/pi-remote-` literal before commit.
- Service-worker shell path is the one real PWA break; mitigation: update match + bump cache, keep
  `/attention/:lookupId` working via the SPA fallback.
- Depends on nothing; gates everything.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

None blocking. Gate 3 pre-resolved by the phase parent.
<!-- /ANCHOR:questions -->
