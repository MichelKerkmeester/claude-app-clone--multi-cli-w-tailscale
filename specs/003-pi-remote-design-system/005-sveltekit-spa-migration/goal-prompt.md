# SvelteKit SPA Migration — Goal

Re-home the Pi Remote phone UI onto **Svelte 5 / SvelteKit (SPA/CSR)** — every screen one `.svelte` file (HTML + scoped CSS + typed logic) — preserving **byte-for-byte** the shipped look, a11y, security, PWA. **Re-hosting, not redesign**: build against frozen `--pi-*` tokens; never change a rendered value.

## Execution mode — AUTONOMOUS GRAPH-LOOP (do not stall)
Work **all phases + future phases autonomously**, dependency-ordered like a graph: finish a node → pass its gate → advance to the next unblocked node; run independent nodes in parallel (e.g. context research ‖ the comment pass). **Do NOT hold for per-step go-ahead** — proceed, verify, commit, push. Stop + escalate ONLY on: a broken invariant (Logic-Sync), a red gate that resists bounded repair, or a destructive/irreversible act (mass-delete >100 files, history rewrite, force-push). Research runs in the background and feeds the phases; never block a phase waiting on it.

## Invariants (break one → stop + escalate)
- **Tokens** resolve identically light/dark/system (token-identity 0-diff).
- **Security:** loopback relay, tailnet-only Serve (Funnel off), foreground authority, redaction, ticketed fail-closed mutations, host plan mode, content-free push; phone never full-access.
- **A11y:** roles, focus order + trap, `aria-*`, ≥44px, reduced-motion + forced-colors survive react-aria → Bits/Melt.
- **Routing:** `/`, `/session/[id]`, `/attention/[lookupId]`; Review/Inbox overlays; Enrollment an auth branch.
- **Backend green throughout.**

## State — EPIC ONGOING
Svelte is the only runtime (React fully deleted). 007 core cutover + Option B page-centric layout (`pages/{home,chat,review,inbox,enrollment}/` + `shared/{primitives,chrome,data}`) shipped; board green (9 gates). **007-EXT Phase A DONE + verified** (per-folder READMEs, onboarding docs, tsconfig prune, editor config). Now running: Phase B (comments) ‖ context research.

## Phases (graph — advance autonomously)
1. **007-EXT quality/DX pass:** (a) **inline comments TOP PRIORITY** — segment every file into labelled comment SECTIONS (sk-code/opencode style), `@ds` grammar + durable WHY, no ephemeral labels; (b) architecture (`$shared` alias, boundaries, `*.svelte.ts` factories); (c) styling structure (scoped-`<style>` + `app.css` token layering); (d) docs ✅. HARD: zero rendered-value/a11y/security/routing change — the 9 gates + a per-file unchanged-fence-TEXT diff prove it.
2. **008-sk-code-svelte-refactor:** encode + lint the 007-ext conventions (incl. comment segmentation) in `sk-code` so edits stay on-pattern.
3. **009-storybook-experience:** dummy-proof + self-maintaining Storybook — one-command launch; a11y/vitest/themes/autodocs addons; story-per-component + coverage gate + AI scaffold.
4. Cleanup: drop the 3 retired `style.css`-oracle scripts.

## Research (background ‖ phases; feeds them)
5 sibling chat repos in `specs/context/` (READ-ONLY, protected). Per repo: fresh Opus-5 xhigh scopes angles (ease-of-use · architecture · UX · logic) → **10 deep-research iterations**. Findings refine 007-ext/008/009, never override frozen contracts. Run via `NODE_PRESERVE_SYMLINKS=1 opencode /deep:research` (luna; GLM fallback).

## Execution
Claude orchestrates + **verifies each layer**; owns git, barrier/shared files, config, `npm install`. Executor writes `app-mobile/**` source (a11y=gpt-5.6-luna, else cli-pi/cli-devin): WRITE=one dir; BANNED=install/config/token/security/routing/a11y changes; Claude diff-inspects (comment-only) + gates.

## Gates
build · svelte-check · `npm test` · `test:web` · token-identity 0-diff (3 themes) · contrast + ≥76 fences · CDP 390px · catalog smoke · `validate.sh --strict`.
