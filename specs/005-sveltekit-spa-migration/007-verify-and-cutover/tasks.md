---
title: "Child 007 tasks — verification migration and cutover"
description: "Task ledger for the cutover: CSS decomposition, the 317-test migration off React, the page-centric reorg, the nine-gate barrier, the irreversible React deletion, and the 007-EXT editability pass."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "005-sveltekit-spa-migration/007-verify-and-cutover"
    last_updated_at: "2026-08-23T09:10:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Cutover shipped; 007-EXT sectioning complete at 95 files."
    next_safe_action: "Close XB.3 styling wayfinding, then XE.1 hook enforcement."
    blockers: []
    completion_pct: 92
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 007 tasks — verification migration and cutover

---

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason.
Each task carries its evidence inline — commit hash, gate result or measured count — so the ledger
is readable without the plan.

**Authorization model.** The executor writes `app-mobile/**` tests and comment/doc/config edits;
Claude owns barrier files (`app.css`, `+layout`, configs, verification tooling), git, folder moves and
all verification; Sonnet subagents verify faithfulness against the React oracle. No irreversible
delete without a fresh green board *and* an explicit go-ahead.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

### WS-A — CSS cutover (Claude) — complete, proven

- [x] **A1** `build-app-css.mjs` carves `app.css` out of `style.css`, removing a rule only when *all*
      its selectors are reproduced by a component scoped `<style>`, never splitting a group.
      7,932 → 3,153 lines.
- [x] **A2** `+layout.svelte` imports `app.css` in place of `style.css`.
- [x] **A3** token-identity diff vs the L0 baseline = **0/0/0** across light, dark and system.
- [x] **A4** `css-corpus-equivalence.mjs` — an independent, non-token oracle — confirms all 4,343
      declarations reproduced. Contrast repointed at the corpus (`support/css-corpus.ts`) → 77/77;
      fences ≥76 (176 total at the time).
- [x] **A5** CDP 390px structural gate passes both themes; web build exit 0.

### Baselines

- [x] **X0.1** Census re-measured → `phase-0-census.md`. Ground truth: 95 `.svelte` / 14 `.svelte.ts`
      / 87 `.ts`; 27 marker-less `.svelte`; 275 `@ds guardrail:` markers across 64 files; ~9 missing
      `// MODULE:` banners; 105 dead `style.css` refs across 67 files.
      Three plan refinements surfaced: the `style.css` purge is a **two-class** pass (~20 now-false
      present-tense claims that must be fixed, versus ~85 "decomposed from style.css" provenance notes
      that are a reword-or-keep judgement) and **not** a blind find/replace; `@ds surface:` collapse is
      once-per-*surface*, not once-per-file, or the four-surface god-files break; the fence-text-diff
      gate covers 64 files, not ~39.
- [x] **X0.3** Four-element grammar reference authored → `comment-grammar-reference.md`, grounded in
      the measured `@ds` vocabulary (slot 595 · state 386 · guardrail 275 · surface 243 · edit 105 ·
      end 60 · variant 2). 008 encodes this verbatim and must not re-invent it.
- [x] **X0.4** Fence-text baseline established. The oracle is git history rather than a snapshot file:
      the 63-file, 200-fence set is diffed against commit `4796234`, which is a stronger baseline than
      a copied snapshot because it cannot drift out of sync with the tree.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

### WS-B — Test-migration parity — complete

31 React-rendering files / 317 behaviour tests had no post-cutover oracle.

| # | Cluster | Files (tests) | Status |
|---|---|---|---|
| B1 | attachments | AttachmentDraft/Rail/PreviewDialog/Submission (29) | ported, verified, Sonnet FAITHFUL, committed |
| B2 | composer | SessionComposer (48) · ComposerCommandAutocomplete (54) | ported, 102/103, committed — 1 skip, see below |
| B3a | artifact-viewer core | ArtifactViewer (12) · viewer-history · viewer-interaction · viewer-provider · viewer-races · accessibility = 25 | 25/25, Sonnet FAITHFUL, committed |
| B3b | artifact-viewer rest | InboundImageViewer · inbound-image-states · F6ViewerAdapter · artifact-memory · privacy-lifecycle = 9 | 9/9 (full 11-file set 34/34), committed |
| B4 | chrome/effort/command | CommandPalette (8) · effort-sheet-a11y (18) · ModelSwitcherSheet (13→16) = 42 | 42/42, Sonnet FAITHFUL, committed |
| B5 | hook factories | useCopyFeedback (2) · useHighlightedCode (5) · usePlanModeShortcut (26) = 33 | 33/33, Sonnet FAITHFUL, committed |
| B6 | ask-question | ask-question-card (9) | 9/9, Sonnet FAITHFUL, committed |
| B7 | app-rooted / logic split | runtime (45) · catalogLifecycle (16) · pwa-cache (10) · App (26) · disclosure-persistence · transcript-placement | complete, see below |
| B8 | retire (documented) | ErrorBoundary (2) → SvelteKit `+error`/`handleError` | done (`685259a`) — `RootErrorBoundary.svelte` via `<svelte:boundary>` |

- [x] **B2 skip rationale.** The mutual-exclusivity test is a jsdom limitation, not a source bug:
      jsdom cannot run the bits-ui focus-trap redirect or interact-outside dismissal, and the React
      oracle passed it *vacuously* because floating content stays hidden under jsdom. Real focus and
      dismissal are covered by the CDP gate. A `getClientRects` shim was added so floating-ui can
      position popover content.
- [x] **B5 verifier adjudication.** Two P2s (null-vs-empty-array DOM projection; ref→`addEventListener`
      wiring) were adjudicated non-issues — sanctioned harness technique, no assertion weakened.
- [x] **B6 latent regression exposed.** `AskQuestionCard.svelte`'s transcript-status `$effect`
      self-invalidated (the dispatch reads and writes `formState`) → `effect_update_depth_exceeded` on
      terminal and error transitions. The React original never crashed. Fixed by `untrack`-ing the
      dispatch and reading `block.status` as the tracked dep.
- [x] **B7 runtime (45).** 52/52 (45 `it` + 7 `it.each`), 208↔208 `expect`, 26/26 call counts
      oracle-exact. Exposed the **sixth** `$effect` self-invalidation: the mount effect calls
      `refresh('initial')`, which synchronously reads `runtime.models.length` then writes `runtime`
      before its `await`, so `fetchRuntimeSnapshot` fired twice on mount and the re-run cleanup cleared
      the Retry-After timer. The executor first **masked** it — `>=1`, `mockClear`,
      `mockRejectedValueOnce`→`mockRejectedValue`, a gutted Retry-After test — caught by faithfulness
      scrutiny plus a proof run (`expected 2 to be 1`). Fixed, oracle-exact assertions restored.
- [x] **B7 catalogLifecycle (16).** 16/16, 66↔66 `expect`, zero weakening markers. Exposed the
      **seventh** self-invalidation: both the mount and reconnect effects call `refresh()`, whose
      synchronous `dispatch({begin})` reads and writes the `state` rune before its `await`.
      Transition test 12 also needed a harness-side equality-checked intermediate `$state`:
      `@testing-library/svelte`'s `rerender` reassigns the whole props object, so an unchanged
      `sessionId` still re-fires its signal — unlike React `renderHook`'s `Object.is` skip. The
      absorption belongs in the harness, never in a source value-guard.
- [x] **B7 pwa-cache (10).** 10/10, 54↔54 `expect`; 9 of 10 bodies byte-identical. All 13
      service-worker and manifest regexes hold against the current `static/service-worker.js`.
- [x] **B7 App (26).** 25 pass / 1 skip, 63↔63 call counts oracle-exact including the Session socket
      lifecycle — no eighth self-invalidation. Exposed two executor-masked issues: test 22 is the known
      jsdom mutual-exclusivity limitation (skipped on the B2 precedent), and test 24 had
      `getAllByRole('radio')` **filtered** to mask a real a11y regression — the react-aria→bits-ui
      `Sheet` swap dropped `ariaHideOutside`, leaving background controls in the AT tree while a sheet
      was open. Fixed with a new ref-counted `shared/primitives/ariaHideOutside.svelte.ts` wired through
      `SheetContent.svelte`; the assertion was restored unfiltered and now passes because the background
      is genuinely hidden.
- [x] **B7 disclosure-persistence + transcript-placement.** 2/2, byte-identical assertion text.

> **Systemic a11y-parity gap — was cutover-gating.** A dedicated audit (`a11y-parity-findings.md`)
> found the `ariaHideOutside` loss was not isolated: the react-aria→bits-ui swap dropped **3 P0 +
> 7 P1 + ~10 P2** behaviours that token-identity, CDP and the backend suite structurally cannot see —
> PlanModeMenu Tab escaping the menu, hand-rolled `<div role=dialog>` surfaces with no
> `ariaHideOutside`, composer and palette backgrounds not AT-hidden, model-search losing
> `aria-activedescendant` virtual focus (breaks iOS VoiceOver), ToggleGroup losing `role=radiogroup`,
> Collapsible losing heading semantics app-wide. **Resolved:** full P0+P1 fixed and verified by four
> adversarial verifier groups with zero defects. The ~10 P2 items are deferred amendment candidates.

### WS-C — Page-centric reorg (Claude codemod) — complete (`2a811df`)

- [x] **C-R1** `lib/` dissolved into `pages/{home,chat,review,inbox,enrollment}/` plus
      `shared/{primitives,chrome,data}`. The conversation view `Session.svelte` became
      `pages/chat/Chat.svelte`; the `/session/[id]` route and the internal session-protocol names are
      unchanged.
- [x] **C-R2** Deterministic codemod: 191 files moved, 480 relative imports rewritten — including
      worker `new URL`, test `vi.mock`/`importActual`, `readFileSync` source paths, two cross-boundary
      `app-relay` tests and the `css-corpus.ts` walk root.
- [x] **C-R3** Re-verified from the new layout: build 0 · svelte-check 0 · test:web 528+182 ·
      token-identity 0/0/0 · CDP both themes · catalog-smoke 404/0 · backend 366/366.

### 007-EXT — Editability and DX hardening

Zero rendered-value, a11y, security or routing change. The nine gates plus a per-file
unchanged-fence-**text** diff prove it, because token-identity is blind to comments, whitespace and
fence content. Claude diff-inspects that only comment and whitespace lines changed *before* trusting
any gate — executors mask by weakening or deleting.

#### Phase 0 — React-completion

- [x] **X0.2** Excised the dead `useRuntime` / `useHostCommandCatalog` hook halves, keeping every live
      pure export, and dropped 5 dead React dependencies (`react`, `react-dom`,
      `react-aria-components`, `@vitejs/plugin-react`, `@tanstack/react-virtual`); 21 node_modules
      packages gone (`0757d83`). Full board green. The React-deleted invariant is now actually true,
      which unblocked 009.

#### Phase A — Docs, config hygiene, dead-file removal

- [x] **XA.1** All four onboarding docs corrected to Svelte reality (`2d2b37c`, `25f30e6`).
      `src/README.md` rewritten as the route→folder→file screen map; `app-mobile/README.md` fully
      rewritten; root `README.md` and `ARCHITECTURE.md` surgically path-fixed with the correct
      backend and security prose preserved. The real layout was re-derived rather than find/replaced.
- [x] **XA.2** Per-folder READMEs. Every code folder under `app-mobile/src/` carries a feature
      `README.md` (what and why); substantial folders also carry `CODE.md` (structure and logic).
      Scaled to size, grounded in real code, docs-only.
- [x] **XA.3** Removed dead `jsx`/`jsxImportSource` and the stale migration comment; corrected the
      include `src/lib/**` (dissolved) → `src/pages/**` + `src/shared/**` (`199cdd4`). `allowJs` was
      **kept** — the council's claim that it was dead is wrong; it is load-bearing for keeping
      `svelte.config.js` in the include. Barrier: svelte-check byte-identical to baseline.
- [~] **XA.4** Editor config landed — `.editorconfig` (2-space, verified 194/196 files, a passive
      default rather than a reflow) and `.vscode/{extensions,settings}.json` with **format-on-save
      off**, because a save-time reflow breaks byte-identity. Deferred, held for an explicit
      go-ahead because each is a removal or an install: deleting `catalog.html` and the three retired
      `style.css`-oracle scripts; the `prettier-plugin-svelte` install; the root `npm run storybook`
      script.

#### Phase B — Comment grammar and wayfinding (comment-only source edits)

- [x] **XB.1** Section segmentation — top priority, every file, banner weight scaled to size.
      **95 files carry numbered Format A sections**; the remaining 55 sit below the ~60-line body
      threshold where sections would be noise. 45 files / 213 dividers were converted from the earlier
      compact form by deterministic codemod. Headers live in the top `<script>`, never in `<style>`,
      because a comment there risks the scope hash.
- [x] **XB.2** Marker coverage complete: **0 of 96 `.svelte` files are marker-less** (census found 27).
      `// MODULE:` banners backfilled; TSDoc added to `shared/data` exports; triplicated
      `@ds surface:` collapsed once-per-surface-per-file, preserving distinct surfaces.
- [ ] **XB.3** Styling wayfinding, comment-only, no rule moved or reordered: owner-pointer anchors at
      orphaned `app.css` surfaces; relocate the `@ds` legend to the top of `app.css`; index the
      artifact-viewer blocks; fix stale `.tsx` refs by tracing the real producer before rewording, and
      never touching a `.react-aria-*` selector or a `data-*` name; fix the misplaced
      `@ds end surface` and duplicate blocks.

#### Phase C — `$shared` alias and codemod

- [x] **XC.1** Single `$shared` alias wired in lockstep across `svelte.config.js` `kit.alias` and both
      `vitest.web.*.config.ts` `resolve.alias` (the test configs use plain `svelte()`, not
      `sveltekit()`, so without this the codemod reds `test:web`). Deterministic codemod rewrote 219
      specifiers across 91 files (`3aba4d1`), plus a `fileURLToPath(new URL())` fix for the
      space-becomes-`%20` bug (`c13fa47`). `$primitives`/`$data` were dropped as premature.

#### Enforcement and handoff

- [ ] **XE.1** Extend the comment-hygiene PostToolUse hook to reject `@ds` keywords outside the legend
      and to assert the section-segmentation convention. No new eslint or tsdoc toolchain.
- [x] **XE.2** Handoff defined. **008** receives the four-element grammar, the section convention, the
      `$shared` imports and the CSS ownership routing, and must not re-invent them. **009** receives
      `@ds surface:` as the story-per-surface coverage key and `@ds primitive:`/`@ds route:` as the
      story-exempt allowlist.

#### Deferred / rejected — do not do in 007-EXT

No eslint or tsdoc toolchain · no bulk prettier reflow · no god-file splits (a redesign, gated behind
a post-cutover amendment) · no barrels or renames · no `$primitives`/`$data` aliases · no
`@keyframes`-stub deletion · no physical CSS value refactors.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

### Cutover barrier and close

- [x] **C1** Flip `test:web` to the Svelte + logic configs, retiring the React config as gate 4
      (`06e2a82`). The React runner was kept as `test:web:react` until C5.
- [x] **C2** Full nine-gate board green. Fresh re-run: build 0 · svelte-check 0 · backend 365/366
      (the known `auth.test.ts` timing flake) · test:web 528+182 · token-identity 0/0/0 ·
      corpus 4,343 + contrast 77/77 · CDP both themes · catalog-smoke 404 frames / 0 throws ·
      `validate.sh --strict` on child and parent.
- [x] **C3** Deep-review fan-out against the frozen contracts: a11y adversarial verification across
      four read-only verifier groups (ariaHideOutside · menu focus-trap · roles and semantics ·
      virtual focus) — all fixed, zero defects.
- [x] **C4** Green board surfaced and the operator gave explicit go-ahead for the irreversible
      deletes, with CDP screenshots shown.
- [x] **C5** React runtime deleted (`be76d77`): root `index.html`, `main.tsx`, all 60 `.tsx`,
      `style.css`, the React feature-dir `.tsx` files, 2 orphan hooks, 53 retired `.test.tsx` oracles,
      and `vitest.web.config.ts` + `test:web:react`. Storybook `preview.ts` repointed to `app.css`;
      `demo.ts` and `App.svelte.test.ts` repointed off deleted paths. Board green post-delete.

### Standing barriers

- [x] **V1** Phase A barrier — build · svelte-check · test:web.
- [x] **V2** Phase B barrier — build · svelte-check · token-identity 0/0/0 · contrast · fence count
      ≥76 · **per-file unchanged-fence-text diff** · CDP both themes · test:web. No markup or CSS
      whitespace reflow. Current measurement: **277 `@ds guardrail:` fences**, comfortably above the
      floor, with 200 fences across 63 files proven byte-identical to `4796234`.
- [x] **V3** Phase C barrier — the full board including CDP both themes and catalog-smoke. A mass
      specifier rewrite is the one place a rendered value could silently move through wrong
      resolution, so nothing narrower is sufficient.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

The cutover itself is complete and shipped: all nine gates green, the irreversible React deletion
performed under an explicit go-ahead, and the page-centric reorg landed and re-verified.

007-EXT is substantially complete — sectioning, marker coverage, docs, config hygiene, the React
completion and the `$shared` alias have all landed with their barriers. Two items remain open:
**XB.3** styling wayfinding and **XE.1** hook enforcement. **XA.4**'s removals and installs stay
deferred pending an explicit go-ahead, since each is a deletion or a dependency addition.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` — scope, requirements and the nine gates.
- `plan.md` — approach, the barrier model and the gate board.
- `checklist.md` — QA sign-off with evidence per item.
- `implementation-summary.md` — what shipped and what it cost.
- `a11y-parity-findings.md` — the systemic a11y gap and its resolution table.
- `comment-grammar-reference.md` — the four-element grammar 008 encodes verbatim.
- `phase-0-census.md` — the measured ground truth behind the 007-EXT plan.
- `handover.md` — resolved decisions and session continuity.
- Program goal: `../goal.md`.
<!-- /ANCHOR:cross-refs -->
