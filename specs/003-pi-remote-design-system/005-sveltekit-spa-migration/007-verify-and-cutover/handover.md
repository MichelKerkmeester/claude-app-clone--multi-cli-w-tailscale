# Handover — SvelteKit SPA Migration: 007 extension + queued research

**Updated:** 2026-08-22 · **Active packet:** `specs/003-pi-remote-design-system/005-sveltekit-spa-migration/007-verify-and-cutover` · **Branch:** `main` · **Epic:** 005 (ONGOING, not done)

## TL;DR
007 **core cutover SHIPPED** (React not rendered; Option B page-centric layout live; board green). We are now **extending 007** with a quality/DX pass, then 008, then 009, then a context-repo research program. **No extension implementation has started.** Blocked on user approval of the AI-council-recommended approach + the open decisions below. Do NOT start editing source until those are answered.

## What happened this session
- **Reframed** `goal-prompt.md` (parent 005): epic-ongoing; 007-ext dimensions; comment-section segmentation = TOP PRIORITY; per-folder READMEs; the research program. Committed `964a89d`, pushed. (Kept < 4000 chars — a locked constraint.)
- Ran a **fresh Opus-tier / xhigh AI council** (5 lenses → adversarial critique → synthesis) for the 007-ext approach. Synthesis persisted at **`ai-council-007-ext-synthesis.md`** (this folder) — read it; it is the decision-ready plan. Per-lens detail: `subagents/workflows/wf_0a30c13e-7c8/journal.jsonl`.
- **Confirmed a frozen-invariant contradiction** (React residue — decision #2 below).
- Hardened continuity (this handover + memory updates) per user request.

## ✅ DECISIONS — resolved 2026-08-22
1. **Council's phased 007-ext approach: ADOPTED.** Per-dimension, risk-ascending: **Phase 0** calibrate + Logic-Sync (Claude-only, no edits) → **Phase A** docs/config-hygiene/dead-file removal (no source/style bytes) → **Phase B** comment grammar + wayfinding (comment-only source edits) → **Phase C** `$shared` alias + codemod (highest risk, severable). Per-phase gate signatures in the synthesis doc.
2. **React residue → ✅ DONE (`0757d83`, Phase 0 X0.2).** Excised the dead hook bodies (kept every live pure export) + dropped 5 dead react deps (`react`, `react-dom`, `react-aria-components`, `@vitejs/plugin-react`, `@tanstack/react-virtual`); no react imports in src; full board green (build 0 · svelte-check 0 · token-identity 0/0/0 · test:web 528+3+182 · backend 366/366 · catalog-smoke 404/0 · CDP both). React-deleted invariant now true; 009 unblocked. Original finding: CONFIRMED — `shared/data/runtime.ts` and `commands.ts` each carry a **DEAD React-hook half** (`useRuntime` / `useHostCommandCatalog` on `useReducer`/`useRef`); their **pure exports** (types, `modeAuthority`, `bindingFor`, `bindingMatchesSnapshot`, `runtimeAnnouncement`, `INITIAL_*`, reducers) are **LIVE and widely imported**; `Chat.svelte` uses the `.svelte.ts` twins, NOT these. `react`/`react-dom`/`react-aria-components` remain in `app-mobile/package.json` only for the dead code (`react-aria-components` unused in src). **Fix = delete the dead hook blocks (KEEP the pure exports) + drop the 3 deps + full board.** This is the real 009 blocker.
3. **Comment-section segmentation → EVERY file, banner weight SCALED TO SIZE.** Honors the user's "apply everywhere" (TOP PRIORITY) while avoiding over-banding tiny files: small files get a minimal section structure, god-files get full banners. Enforced by extending the comment-hygiene hook.
4. **Research scope → ALL 5 repos** (`OGAM-main`, `mobilecli-main`, `nodeterm-main`, `openclaude-android-main`, `remote-for-opencode-master`), each scoped to what's relevant. **Research executor — finalize at kickoff from this candidate pool (all free/cheap, NOT Opus 5 for the 10-iteration loops):** `GLM 5.2` (`glm-5-2`, free via cli-devin — user's primary, corrected from "grok 5.2"); `luna xhigh fast` (gpt-5.6-luna); `0x alpha` (via OpenRouter, free — "for research maybe"). Per-repo angle-scoping stays fresh + high-reasoning. Research is READ-ONLY (repos protected).

## Queued work (gated, IN THIS ORDER)
council synthesis (DONE) → **update phases from it** (author 007-ext spec/plan/tasks; reconcile 008/009) → **user approval** → **context-repo research program**.
- Research program (user's spec): per repo a **fresh Opus-5 xhigh agent scopes research angles** (ease-of-use · architecture · UX · logic), then **10 deep-research iterations per repo** (via the deep-research loop). Read-only — the repos are protected.

## Locked user requirements
- **Comment-section segmentation (sk-code / opencode style) = TOP PRIORITY**, enforced + applied **everywhere**. Council's enforcement recommendation: extend the existing comment-hygiene PostToolUse hook to reject `@ds` keywords outside the legend — **no new eslint/tsdoc toolchain** (app-mobile has no eslint). 008 encodes it.
- **Per-folder CODE README** (structure/logic) **+ FEATURE README** (what/why).
- `goal-prompt.md` stays **< 4000 chars**.

## Frozen contracts — any change = HARD STOP + escalate (Logic-Sync)
Tokens resolve identically light/dark/system · a11y (roles/focus+trap/aria/≥44px/reduced-motion/forced-colors) · security (loopback relay, tailnet-only Serve, redaction, ticketed fail-closed mutations, host plan mode, content-free push) · routing (`/`, `/session/[id]`, `/attention/[lookupId]`).
**Authoritative gates:** `build` · `svelte-check` · backend vitest (**explicit dirs** `packages/pi-rpc-protocol/tests app-relay/tests extensions/pi-remote-approval/tests extensions/pi-remote-plan/tests`, NOT bare `npm test`) · `test:web` (svelte 528+3skip + logic 182) · token-identity **diff** vs `baseline/token-identity-baseline.json` (3 themes) · contrast + **≥76 `@ds guardrail` fences** · CDP 390px both themes · catalog-smoke · `validate.sh --strict`. Council adds a **per-file unchanged-fence-TEXT diff** (token-identity is comment/whitespace/fence-content blind — proves count, not verbatimness).

## Execution model
Claude orchestrates + verifies + owns git / barrier files / every `npm install`. Executor writes `app-mobile/**` (source-fix dispatch policy: `cli-pi`/`deepseek-v4-flash` xhigh + code persona; a11y work = `gpt-5.6-luna`). **Executors mask by weakening/deleting code** — Claude must diff-inspect that ONLY comment/whitespace lines changed before trusting any gate.

## Layout
`app-mobile/src/` = `pages/{home,chat,review,inbox,enrollment}/` + `shared/{primitives,chrome,data}/` + `routes/` + `app.css` + `app.html`. One `.svelte` file per component (markup + scoped `<style>` + `<script lang=ts>`). Logic = `*.svelte.ts` factories in `shared/data`. `Chat.svelte` was `Session.svelte` (route + protocol names unchanged).

## Gotchas (don't relearn the hard way)
- `specs/context/` = **5 PROTECTED untracked repos**; NEVER `git add -A` / `git add .` / clean / `stash -u` / commit them.
- **Mass-deletion gate:** commit/push removing >100 tracked files is BLOCKED → `SPECKIT_ALLOW_MASS_DELETION=1`.
- **Commit-msg hook:** scope must be a NAMED subsystem (numeric-only `005` is blocked) — use `sveltekit-migration`. Body lines >100 chars = non-blocking warning.
- **Don't run** `build-app-css` / `css-corpus-equivalence` / `decl-equivalence` (their `style.css` oracle is deleted). token-identity + contrast (via `tests/support/css-corpus.ts`, walks all of `src/`) are the CSS gates.
- backend `auth.test.ts` is timing-flaky; a tracked docs png fixture keeps getting deleted (`git checkout HEAD -- <png>`).
- spec-kit generators (`generate-description`/`backfill-graph-metadata`) silently no-op through the `.opencode` symlink — invoke via realpath.
- "opus 5 xhigh" council/deep-research: the workflow engine ran **opus-tier at xhigh** (`model:'opus'`, `effort:'xhigh'`); exact opus-5 point-release not guaranteed.

## Next steps (after the 3 decisions)
1. Gate 3: author the 007-ext **spec/plan/tasks** (Level 3) from the synthesis — under 007 or a new child; reconcile 008/009.
2. Execute per-dimension phases 0/A/B/C with the synthesis gate signatures; executor-writes → Claude diff-inspects → gate.
3. Then run the context-repo research program.

**Resume ladder:** this `handover.md` → `ai-council-007-ext-synthesis.md` → parent `goal-prompt.md` → `spec.md` / `tasks.md`.
