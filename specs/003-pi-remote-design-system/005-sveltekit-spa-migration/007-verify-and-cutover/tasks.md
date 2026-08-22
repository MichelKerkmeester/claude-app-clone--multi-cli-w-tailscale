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
| B2 | composer | SessionComposer(48) · ComposerCommandAutocomplete(54) | ✅ ported, verified 102/103, committed. 1 skip (mutual-exclusivity): jsdom can't run bits-ui focus-trap redirect / interact-outside dismiss; oracle passed it vacuously (floating content stays hidden in jsdom). Root-cause fix: `getClientRects` jsdom shim so floating-ui positions popover content. Real focus/dismiss → CDP gate. Sonnet faithfulness pass = FAITHFUL (no unported/weakened assertions). Follow-up (cli-devin): add a lightweight guard test — opening the tools browser suppresses the inline panel with an active trigger (target the inline listbox by name `Available host commands`); the `toolsOpen`-suppresses-`panelOpen` guard is currently unit-unguarded. |
| B3a | artifact-viewer core | ArtifactViewer(12) · viewer-history(1) · viewer-interaction(3) · viewer-provider(1) · viewer-races(4) · accessibility(3) = 25 | ✅ ported, verified 25/25, Sonnet=FAITHFUL, committed. 1 P1 fixed (Claude): viewer-interaction assertion was retargeted to a different group with a false "renamed" comment; restored to the oracle's exact `Image zoom and pan surface` target. 12 new support harnesses, all used. |
| B3b | artifact-viewer rest | InboundImageViewer(3) · inbound-image-states(1) · F6ViewerAdapter(1) · artifact-memory(1) · privacy-lifecycle(3) = 9 | ✅ ported, verified 9/9 (full 11-file viewer set 34/34, no regression), Sonnet=FAITHFUL, committed. 4 new harnesses + 3 extended with optional props (backward-compat, defaults preserve B3a behavior). |
| B4 | chrome/effort/command | CommandPalette(8) · effort-sheet-a11y(18) · ModelSwitcherSheet(13→16) = 42 | ✅ ported, verified 42/42, Sonnet=FAITHFUL, committed. Two jsdom fixes (Claude): CommandPalette opens via input-focus (bits-ui trigger click doesn't propagate under jsdom) + global `scrollIntoView` no-op in setup.ts (bits-ui Select scrolls highlighted candidate on filter). 2 harnesses incl. EffortSheetAdvanceHarness (advance() drives runtime without re-running the sheet open-effect). Cost 3 devin dispatches (budget exhaustion; harness+CommandPalette salvaged each time). |
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
