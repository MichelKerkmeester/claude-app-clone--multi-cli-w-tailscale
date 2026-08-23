# SvelteKit SPA Migration — Goal

Re-home the Pi Remote phone UI onto **Svelte 5 / SvelteKit (SPA/CSR)** — every screen one `.svelte` file (HTML + scoped CSS + typed logic) — preserving **byte-for-byte** the shipped look, a11y, security, PWA. **Re-hosting, not redesign**: build against frozen `--pi-*` tokens; never change a rendered value.

## Execution — AUTONOMOUS GRAPH-LOOP (do not stall)
Work all phases dependency-ordered: finish a node → pass its gate → advance to the next unblocked node; run independent nodes in parallel. Do NOT hold for per-step go-ahead — proceed, verify, commit, push. Stop + escalate ONLY on: a broken invariant (Logic-Sync), a red gate that resists bounded repair, or a destructive/irreversible act (mass-delete >100 files, history rewrite, force-push).

## Research → recommendations → approval (RULE)
Research runs in background, feeds the phases, never overrides frozen contracts. Findings may create new phases or update existing ones — but **present ALL research recommendations to me FIRST; scaffold nothing without my approval.**

## Invariants (break → stop + escalate)
- Tokens resolve identically light/dark/system (token-identity 0-diff).
- Security: loopback relay, tailnet-only (Funnel off), foreground authority, redaction, fail-closed ticketed mutations, host plan mode, content-free push; phone never full-access.
- A11y: roles, focus order + trap, aria-*, ≥44px, reduced-motion + forced-colors survive react-aria→Bits/Melt.
- Routing: `/`, `/session/[id]`, `/attention/[lookupId]`; Review/Inbox overlays; Enrollment auth branch.
- Backend green throughout.

## Who does what
Claude orchestrates + verifies each layer; owns git, barrier/shared files, config, npm install. Executor writes `app-mobile/**` (one dir/dispatch; BANNED: install/config/token/security/routing/a11y). Working routes here: luna via opencode `openai/gpt-5.6-luna`; GLM-5.2 via cli-devin (free); stealth via openrouter for cli-pi story writes.

## Phases
1. **Core migration 001–007** — cutover ✅ done, on GitHub.
2. **007-EXT:** (a) inline comments TOP PRIORITY — segment every file into labelled SECTIONS, **mimic sk-code/opencode ~1:1 in style + usage** (full-width `// ─────` dividers + `// ─── Label ───`), @ds grammar + durable WHY, no ephemeral labels; (b) architecture ($shared, boundaries, *.svelte.ts factories); (c) styling (scoped `<style>` + app.css layering); (d) docs ✅. HARD: zero rendered/a11y/security/routing change — 9 gates + per-file unchanged-fence diff.
3. **008 sk-code-mobile-cli** (this surface ONLY, not the sk-code hub) — encode + lint the 007-EXT conventions (incl. comment segmentation) so future edits stay on-pattern.
4. **009 Storybook** — one-command launch; a11y/themes/autodocs/designs addons; story-per-component + coverage gate + AI scaffold. R1/4/5/6/7 ✅; R3 = 21/27 stories.
5. **Cleanup** — drop 3 retired style.css-oracle scripts ✅.
6. **Research 010** — 5 `specs/context/` repos × 10 deep-research iterations; feeds phases under the approval rule above.

## Gates
build · svelte-check · npm test · test:web · token-identity 0-diff (3 themes) · contrast + ≥76 fences · CDP 390px · catalog-smoke · validate.sh --strict.

## Status / open
Core + cleanup done. 007-EXT comments 85/109 done (1:1 alignment + ~24 leaves left). 008 to verify on live Public. 009 has 6 stories left. Research 3/5 landed; openclaude-android + remote-for-opencode still to land (needs the known-good GLM-via-cli-devin invocation). All work pushed to origin/main. Full plan of record: `goal.md` (this folder).
