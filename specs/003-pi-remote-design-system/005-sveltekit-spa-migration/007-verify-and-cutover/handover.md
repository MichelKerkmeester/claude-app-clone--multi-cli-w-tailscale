# Handover — SvelteKit SPA Migration: 007 extension + queued research

**Updated:** 2026-08-22 · **Active packet:** `specs/003-pi-remote-design-system/005-sveltekit-spa-migration/007-verify-and-cutover` · **Branch:** `main` · **Epic:** 005 (ONGOING, not done)

## TL;DR
007 **core cutover SHIPPED** (React not rendered; Option B page-centric layout live; board green). We are now **extending 007** with a quality/DX pass, then 008, then 009, then a context-repo research program. **No extension implementation has started.** Blocked on user approval of the AI-council-recommended approach + the open decisions below. Do NOT start editing source until those are answered.

## What happened this session
- **Reframed** `goal-prompt.md` (parent 005): epic-ongoing; 007-ext dimensions; comment-section segmentation = TOP PRIORITY; per-folder READMEs; the research program. Committed `964a89d`, pushed. (Kept < 4000 chars — a locked constraint.)
- Ran a **fresh Opus-tier / xhigh AI council** (5 lenses → adversarial critique → synthesis) for the 007-ext approach. Synthesis persisted at **`ai-council-007-ext-synthesis.md`** (this folder) — read it; it is the decision-ready plan. Per-lens detail: `subagents/workflows/wf_0a30c13e-7c8/journal.jsonl`.
- **Confirmed a frozen-invariant contradiction** (React residue — decision #2 below).
- Hardened continuity (this handover + memory updates) per user request.

## ⚠️ OPEN DECISIONS — need the user before proceeding
1. **Approve the council's phased 007-ext approach.** Per-dimension, risk-ascending: **Phase 0** calibrate + Logic-Sync (Claude-only, no edits) → **Phase A** docs/config-hygiene/dead-file removal (no source/style bytes) → **Phase B** comment grammar + wayfinding (comment-only source edits) → **Phase C** `$shared` alias + codemod (highest risk, severable). Details + per-phase gate signatures in the synthesis doc.
2. **React residue = cutover COMPLETION work, not the DX re-host.** CONFIRMED by direct inspection: `shared/data/runtime.ts` and `shared/data/commands.ts` each still carry a **DEAD React-hook half** (`useRuntime` / `useHostCommandCatalog`, built on `useReducer`/`useRef`/`useCallback`). Their **pure exports** (types `RuntimeUiState`/`RuntimeControls`/`HostCommandCatalogState`/`SelectedCommandBinding`, fns `modeAuthority`/`bindingFor`/`bindingMatchesSnapshot`/`runtimeAnnouncement`, `INITIAL_*`, reducers) are **LIVE and widely imported**. `Chat.svelte` uses the `.svelte.ts` twins (`useRuntime.svelte.js`, `hostCommandCatalog.svelte.js`), NOT these. `react`/`react-dom`/`react-aria-components` remain in `app-mobile/package.json` **only** for that dead code; `react-aria-components` is unused in src (0 files). **This contradicts the "React fully deleted" invariant + the shipped goal claim.** It is likely the real 009 blocker. **Decide:** fold removal into 007-ext (Phase 0/A) as cutover-completion, or run it as a separate small packet. Clean fix = delete the dead hook blocks (KEEP the pure exports), drop the 3 deps, then rebuild + svelte-check + full board.
3. **Confirm the 5-repo research scope:** `OGAM-main`, `mobilecli-main`, `nodeterm-main`, `openclaude-android-main`, `remote-for-opencode-master`. Some may be terminal/remote tools, not mobile *chat* apps — confirm which are in scope.

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
