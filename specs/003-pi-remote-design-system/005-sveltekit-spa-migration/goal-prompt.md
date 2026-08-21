# SvelteKit SPA Migration — Goal

Re-home the Pi Remote phone UI onto **Svelte 5 / SvelteKit (SPA/CSR)** — every screen one `.svelte` file (HTML + scoped CSS + typed logic) — preserving **byte-for-byte** the shipped look, a11y, security, PWA. **Re-hosting, not redesign**: build against frozen `--pi-*` tokens; never change a rendered value.

## Invariants (break one → stop + escalate)
- **Tokens** resolve identically light/dark/system.
- **Security:** loopback relay, tailnet-only Serve (Funnel off), foreground authority, redaction, ticketed fail-closed mutations, host-enforced plan mode, content-free push; phone never enables full-access.
- **A11y:** roles, focus order + trap, `aria-*`, ≥44px, reduced-motion + forced-colors survive react-aria → Bits/Melt.
- **Routing:** `/`, `/session/[id]`, `/attention/[lookupId]`; Review/Inbox overlays; Enrollment an auth branch.
- **Backend green throughout** — the leak detector.

## Current state
- Web = `app-mobile/`, relay = `app-relay/`.
- **Done L0–L3** (`001`–`004`): scaffold + route stubs; verbatim `.ts` ports; 14 Bits-UI primitives; feature dirs (rich-content/artifacts/attachments/ask-question); chrome + composer.
- **Done L4+L5 components** (`005`, pushed @ `df6acea`): all views, full transcript layer, **Session**, factories `useRuntime`/`useSyncSocket`/`useHostCommandCatalog` — each verified (svelte-check 0 · decl-equivalence PASS · `style.css` untouched).
- **Still React:** `App.tsx` shell (auth/connection/push/theme/SW/routing) is live; `index.html` → `/src/main.tsx`; routes are stubs — **no cutover.**
- Suites: backend green (`auth.test.ts` flake; Public-tooling fails report-only); React `test:web` is the pre-cutover oracle.

## Remaining — existing scope (barrier per layer; Claude verifies each)
- **Shell** (rest of `005`) ← **NEXT**. `+layout.svelte` (state.ts-reducer stores; auth/connection/push/theme/SW effects; ArtifactViewer + AttachmentDraft context; routing all views incl. Session), routes + `pushState`→`goto`/`afterNavigate`, SW registration. Dispatch fns **stable** (Session's `useSyncSocket` captures them once).
- **L6 `006-catalog`.** Storybook 8 + mock-context decorator over `demo.ts`.
- **L7 `007-verify-and-cutover`.** CSS-corpus builder, token-identity gate (0-diff, 3 themes), test rewrite (→ svelte-testing-library), CDP repoint to built preview, deep-review, repoint `index.html` off `main.tsx`, amendment close.
- **`008-sk-code-svelte-refactor`** (isolated Public worktree). Svelte conventions into `sk-code-mobile-cli`; finalize at L7.

## Remaining — NEW `009-page-centric-architecture` (AFTER `007` green)
Reorganize `app-mobile/src` by-type → **page-centric**: one folder per page (session/home/review/attention-inbox/enrollment/push-settings). Single-page components live in their page folder; multi-page ones keep a **canonical `shared/` home** surfaced via **relative navigational symlinks** — a lens, not the import path: imports stay via `$lib` aliases; Vite `preserveSymlinks:false` resolves to the real file so module identity stays single (context survives); no cycles. **README per folder** (what · why · naming). **Aggressive** file+folder rename, imports updated in one pass. Symlinks **script-generated + validated**. New child under `005`; **blocked on `007`**.

## Execution model
Claude orchestrates + **verifies each layer**; owns git, shared files, every `npm install`. App code under `app-mobile/**` written by **GLM-5.2 High (`cli-devin`)**: pre-approved spec folder; WRITE = one dir; BANNED = install/config/token/security/routing/a11y; load `sk-code` + `sk-design-md-generator`; return svelte-check + moved surfaces to re-verify.

## Gates
Migration: build · svelte-check · `npm test` · `test:web` · token-identity 0-diff (3 themes) · contrast + ≥76 fences · CDP 390px both themes · catalog smoke · `validate.sh --strict`. `008`: `package_skill.py --check`. `009`: build/typecheck/`test:web` green post-reorg · no broken/cyclic symlinks · README per folder.
