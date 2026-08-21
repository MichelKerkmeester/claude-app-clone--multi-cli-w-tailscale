<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 007 — Cutover Task Breakdown

Three workstreams must reach green **before** any irreversible React deletion, then a
page-centric reorg lands the final structure. Authorization model unchanged: cli-devin
writes `app-mobile/**` tests; Claude owns barrier files (app.css, +layout, configs,
verification tooling), git, folder moves, and all verification; Sonnet subagents verify
faithfulness against the React oracle. **No irreversible delete without a fresh green
board + user go-ahead.** Target end structure: **Option B — page-centric** (user-chosen).

---

## WS-A — CSS cutover (Claude) — ✅ DONE, proven

- [x] A1. `build-app-css.mjs` carves app.css from style.css (removes a rule only when ALL its selectors are reproduced by a component scoped <style>; never splits a group). 7,932 → 3,153 lines.
- [x] A2. `+layout.svelte` imports `app.css` (was `style.css`).
- [x] A3. token-identity diff vs L0 baseline = **0/0/0** across light/dark/system.
- [x] A4. `css-corpus-equivalence.mjs` (independent, non-token) = all 4,343 declarations reproduced. contrast repointed to the corpus (`support/css-corpus.ts`) → 77/77; ≥76 fences (176 total).
- [x] A5. CDP 390px structural passes both themes; web build exit 0.

## WS-B — Test-migration parity (cli-devin ports, Claude+Sonnet verify)

31 React-rendering files / 317 behavior tests had no post-cutover oracle. Clusters:

| # | Cluster | Files (tests) | Status |
|---|---------|---------------|--------|
| B1 | attachments | AttachmentDraft/Rail/PreviewDialog/Submission (29) | ✅ ported, verified, Sonnet=FAITHFUL, committed |
| B2 | composer | SessionComposer(46) · ComposerCommandAutocomplete(44) | ⏳ cli-devin running |
| B3 | artifact-viewer | ArtifactViewer(11) · viewer-history/interaction/provider/races · InboundImageViewer · inbound-image-states · F6ViewerAdapter · accessibility · artifact-memory · privacy-lifecycle (~42) | todo |
| B4 | chrome/effort/command | ModelSwitcherSheet(12) · effort-sheet-a11y(18) · CommandPalette(8) | todo |
| B5 | hook factories | useCopyFeedback(2) · useHighlightedCode(5) · usePlanModeShortcut(14) → *.svelte.ts | todo |
| B6 | ask-question | ask-question-card(9) → lib/features/ask-question/* | todo |
| B7 | app-rooted / logic split | App(26) · disclosure-persistence(1) · transcript-placement(1) · runtime(45) · catalogLifecycle(16) · pwa-cache(10) → routes/views + logic config | todo |
| B8 | retire (documented) | ErrorBoundary(2) → SvelteKit +error/handleError | todo |

## Cutover barrier + close

- [ ] C1. Flip `test:web` → the Svelte + logic configs (retire the React config as gate 4).
- [ ] C2. Full 9-gate board green (build · svelte-check · npm test · test:web · token-identity 0/0/0 · contrast+fences · CDP · catalog smoke · validate.sh --strict).
- [ ] C3. Deep-review fan-out against the frozen contracts.
- [ ] **C4. PAUSE — surface the green board; get fresh user go-ahead for the irreversible deletes.**
- [ ] C5. (authorized) repoint `index.html` off `/src/main.tsx`; delete React source (`main.tsx`, all `.tsx`, React dirs `artifacts/attachments/rich-content/features`, `style.css`, React-only `.ts`).

## WS-C — Page-centric reorg (Claude codemod) — Option B, after the delete

- [ ] R1. Reorganize surviving Svelte tree: `lib/` → `pages/{home,session,review,inbox,enrollment}/` (each holds its screen's components) + `shared/` (primitives + cross-page chrome). Thin `routes/*/+page.svelte` import their page.
- [ ] R2. Codemod rewrites every import across `.svelte` / `.ts` / `.stories.ts` / tests / vitest configs / gate scripts (build-app-css, css-corpus, token-identity, CDP walk paths).
- [ ] R3. Re-verify: build · svelte-check · test:web · token-identity 0/0/0 · CDP · catalog smoke all green from the new layout.
- [ ] R4. Amendment close + `validate.sh …/005-sveltekit-spa-migration --strict`.
