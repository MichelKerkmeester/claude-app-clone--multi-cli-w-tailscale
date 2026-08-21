<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 007 — Cutover Task Breakdown

Two independent workstreams must both reach green **before** any irreversible React
deletion. Authorization model unchanged: cli-devin writes `app-mobile/**` tests;
Claude owns barrier files (`app.css`, `+layout`, configs, verification tooling),
git, and all verification; Sonnet subagents verify faithfulness against the React
oracle. **No irreversible delete without a fresh green board + user go-ahead.**

---

## WS-A — CSS cutover (Claude barrier work)

The pixel-identity proof. Today `+layout.svelte` still imports the full 7,931-line
`style.css`; `app.css` does not exist.

- [ ] A1. Build `app.css` = the global foundation `style.css` keeps after every
      scoped surface moved to a component `<style>` (tokens/`@theme`/`@font-face`/
      3 `data-theme` blocks/resets + guardrail media queries + shared/convention
      surfaces). Subtractive from `style.css`; the per-surface blocks already live
      in scoped `<style>`.
- [ ] A2. Flip `+layout.svelte`: `import '../style.css'` → `import '../app.css'`.
- [ ] A3. token-identity **diff** (baseline vs `app.css` + all scoped `.svelte`) →
      **CHANGED 0 / VANISHED 0 / ADDED 0**, all 3 themes. Iterate A1 until clean.
- [ ] A4. contrast corpus + ≥76 guardrail fences preserved.
- [ ] A5. CDP 390px structural, both themes, against the built preview.

## WS-B — Test-migration parity (cli-devin ports, Claude+Sonnet verify)

31 React-rendering files / 317 behavior tests have no post-cutover oracle. Nearly
all have a Svelte target (hook factories `*.svelte.ts` all exist; ask-question is
ported; F6ViewerAdapter is a `.ts` module; App behaviors live in routes/views).

Clusters (disjoint dirs, parallel-safe):

| # | Cluster | Files (tests) | Target | Status |
|---|---------|---------------|--------|--------|
| B1 | attachments | AttachmentDraft(10) · AttachmentRail(4) · AttachmentPreviewDialog(4) · AttachmentSubmission(8) | `lib/attachments/*` + harness | todo |
| B2 | composer | SessionComposer(46) · ComposerCommandAutocomplete(44) | `lib/chrome/SessionComposer`, `ComposerCommandAutocomplete` | todo |
| B3 | artifact-viewer | ArtifactViewer(11) · viewer-history(1) · viewer-interaction(3) · viewer-provider(1) · viewer-races(4) · InboundImageViewer(3) · inbound-image-states(1) · F6ViewerAdapter(1) · accessibility(3) · artifact-memory(1) · privacy-lifecycle(3) | `lib/artifacts/*`, `useArtifactResource.svelte.ts` | todo |
| B4 | chrome/effort/command | ModelSwitcherSheet(12) · effort-sheet-a11y(18) · CommandPalette(8) | `lib/chrome/*` | todo |
| B5 | hook factories | useCopyFeedback(2) · useHighlightedCode(5) · usePlanModeShortcut(14) | `*.svelte.ts` factories | todo |
| B6 | ask-question | ask-question-card(9) | `lib/features/ask-question/*` | todo |
| B7 | app-rooted / logic split | App(26) · disclosure-persistence(1) · transcript-placement(1) · runtime(45) · catalogLifecycle(16) · pwa-cache(10) | routes/views + logic config (reducer/cache/catalog are framework-agnostic) | todo |
| B8 | retire (documented) | ErrorBoundary(2) | SvelteKit `+error`/`handleError`; no 1:1 component | todo |

## Cutover barrier + close (after WS-A and WS-B green)

- [ ] C1. Flip `test:web` → the Svelte + logic configs (retire the React config as gate 4).
- [ ] C2. Full 9-gate board green (build · svelte-check · npm test · test:web · token-identity 0/0/0 · contrast+fences · CDP · catalog smoke · validate.sh --strict).
- [ ] C3. Deep-review fan-out against the frozen contracts.
- [ ] **C4. PAUSE — surface the green board; get fresh user go-ahead for the irreversible deletes.**
- [ ] C5. (authorized) repoint `index.html` off `/src/main.tsx`; delete React source (`main.tsx`, `.tsx` components, `style.css`); strip dead paths.
- [ ] C6. Amendment close + `validate.sh …/005-sveltekit-spa-migration --strict`.
