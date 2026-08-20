# SvelteKit SPA Migration — Goal Prompt

> Condensed continuation prompt for the **open** migration work. Full north-star: [`goal.md`](goal.md);
> product goal: root [`goal.md`](../../../goal.md). Paths are post-restructure.

## Goal
Re-home the Pi Remote phone UI onto **Svelte 5 / SvelteKit (SPA/CSR)** — every screen one `.svelte` file
(HTML + scoped CSS + typed logic) — preserving **byte-for-byte** the shipped look, a11y, security, and
PWA behavior. A **re-hosting, not a redesign**: build against the frozen `--pi-*` tokens; never change a
rendered value.

## Invariants (break one → out of scope, stop + escalate)
- **Tokens** resolve identically in light / dark / system.
- **Security:** loopback relay, tailnet-only Serve (Funnel off), foreground authority, redaction,
  ticketed revision-checked mutations that fail closed, host-enforced plan mode, content-free push; the
  phone can never enable full-access.
- **A11y:** roles, focus order + trap, `aria-*`, ≥44px, reduced-motion + forced-colors survive
  react-aria → Bits/Melt.
- **Routing:** 3 URLs (`/`, `/session/[id]`, `/attention/[lookupId]`); Review/Inbox overlays;
  Enrollment an auth branch.
- **Backend stays green throughout** — the leak detector.

## Current state
- Moved out of `src/`: web = **`app-mobile/`** (`@pi-remote/web`), relay = **`app-relay/`**
  (`@pi-remote/relay`); `apps/*` + `src/*` gone.
- **Done L0–L2:** SvelteKit scaffold + route stubs; verbatim `.ts` ports; 14 Bits-UI primitives; feature
  dirs `rich-content/ artifacts/ attachments/ features/ask-question/` — 56 `.svelte` files, CSS
  decomposed into scoped `<style>`.
- **Still React:** `index.html` loads `/src/main.tsx`; `App.tsx` is the live entry; SvelteKit routes are
  placeholders — **no cutover yet.**
- Suites: backend green (one pre-existing `auth.test.ts` timing-flake); `test:web` 670/670.

## Remaining (barrier per layer; Claude verifies before the next)
- **L3 / `004-chrome-and-composer`** ← NEXT. Chrome (SessionHeader, RuntimeStrip, TodoPanel,
  ModelEffortSheet, plan components) parallel; **composer + LeavePlanSheet serial / K=1** (hand-rolled
  focus/IME/slash). Only `RuntimeModeAnnouncer.svelte` + `planModePresentation.ts` exist.
- **L4+L5 / `005-views-and-shell`.** Extract `App.tsx` views (Enrollment ‖ Home ‖ Review ‖ Inbox; Session
  alone — socket + virtualizer), then `+layout.svelte` + `routes/*` + `goto`/`afterNavigate`.
- **L6 / `006-catalog`.** Storybook 8 + mock-context decorator over `demo.ts`.
- **L7 / `007-verify-and-cutover`.** CSS-corpus builder, committed token-identity gate, test rewrite
  (→ svelte-testing-library), CDP repoint to built preview, deep-review fan-out, repoint `index.html`
  off `main.tsx`, amendment close.
- **`008-sk-code-svelte-refactor`** (spans run; lands via isolated **Public worktree**). Draft the Svelte
  conventions into `sk-code-mobile-cli` before the next dispatch; finalize at L7.

## Execution model
Claude orchestrates + **independently verifies each layer** outside any sandbox, and owns git, the
shared/integration files, and every `npm install`.
App code under `app-mobile/**` is written by external executors — **GLM-5.2 High (`cli-devin`, free)** +
**Composer 2.5-fast (`cli-cursor`)** — parallel (K=3; K=1 for focus-sensitive units). Per dispatch:
pre-approved spec folder (skip Gate 3); WRITE = one dir; BANNED = install / config / token / security /
routing / a11y changes; load `sk-code` (→ `sk-code-mobile-cli`) + `sk-design-md-generator` (frozen-token
manifest); return `svelte-check` + moved surfaces for Claude to re-verify.

## Gates (nine, all green to cut over)
build · typecheck (`svelte-check`) · `npm test` · `test:web` · token-identity 0-diff (3 themes) · contrast
+ ≥76 guardrail fences · CDP 390px both themes · catalog smoke · `validate.sh … --strict`. Plus 008:
`package_skill.py --check` clean.

## Docs
`goal.md` · `amendment.md` (React→SvelteKit reversal) · `implementation-phases.md` (DAG + delegation +
gates) · children `001–008/`.
