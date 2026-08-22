# Handover — Pi Remote SvelteKit 5 SPA Migration

> **Scope of this handover:** the active workstream is the **SvelteKit 5 SPA migration** of the
> Pi Remote mobile web app, living under the child packet
> `005-sveltekit-spa-migration/007-verify-and-cutover`. This file sits at the epic root (003)
> as the top-level continuation anchor. Read it first, then drop into the child's
> `tasks.md` for row-level detail.

**Last updated:** 2026-08-22 · **Branch:** `main` · **State:** WS-A done, WS-B B1–B6 done & pushed, B7 in progress.

---

## 1. TL;DR — where we are

We are rewriting the Pi Remote phone UI from **React 19 PWA → Svelte 5 runes / SvelteKit SPA-CSR**,
**preserving byte-for-byte** the shipped look, a11y, security, and PWA behaviour. The `.svelte`
rewrite of every component/view is **already done and on `main`**; what remains is the final
child packet **`007-verify-and-cutover`**: port the last React test suites so the Svelte tree has
a full behavioural oracle, get a 9-gate green board, then (with fresh user go-ahead) delete the
React source **and** reorganise the surviving Svelte tree into the **Option B page-centric layout**
in one clean move.

- **Done:** WS-A (CSS cutover — app.css carved from style.css, token-identity 0/0/0). WS-B B1–B6
  (attachments, composer, artifact-viewer×2, chrome/effort/command, hook-factories, ask-question).
- **In progress:** WS-B **B7-runtime** (45 tests) — dispatched to the executor, not yet landed/verified.
- **Not started:** B7 rest (catalogLifecycle, pwa-cache), B7-view (App + 2), B8 (ErrorBoundary retire),
  the cutover barrier (C1–C5), and WS-C (Option B reorg).
- **Not authorised yet:** the irreversible React delete. Needs a fresh green board **and** explicit
  user go-ahead at gate **C4**. Commit/push to `main` **is** authorised.

---

## 2. The goal (north star — holds across every remaining step)

Re-home the phone UI onto Svelte 5 / SvelteKit so **every screen and component is ONE `.svelte`
file** — HTML markup, its own scoped CSS, and typed logic together — making the app genuinely
designer-editable, while **changing nothing** about what it renders, its a11y guarantees, its
security posture, or its PWA behaviour. Any step that would change a rendered value, a security
invariant, a routing behaviour, or an a11y contract is **out of scope → stop and escalate**.

**Acceptance authority for "nothing changed":** token-identity resolver **0/0/0** across
light/dark/system + CDP **390px** structural gate (both themes) + the **backend suite green
throughout** (a leak-detector: the backend is framework-independent, so if it breaks the migration
leaked out of the web app).

---

## 3. Iron constraint & execution model (HARD — do not violate)

**The external CLI executor writes ALL app code under `app-mobile/**` — tests AND source.**
Claude orchestrates and verifies; Claude never hand-writes app code.

- **Executor:** DeepSeek V4 Flash `--thinking xhigh` via **`cli-pi`** (`--provider cline-pass`),
  with the **code persona** (`.pi/agents/code.md`) injected into the **system prompt**
  (`--append-system-prompt "$(cat .pi/agents/code.md)"` — `pi -p` has no native `--agent` surface,
  so the persona must be inlined, per the cli-pi contract's ALWAYS rule #11). Default full tool
  perms (write/edit on) — do **not** pass `--no-tools`/`--tools` when the executor must write source.
  Run in background, `</dev/null`, preflight `command -v pi`.
- **Claude owns:** git; **barrier files** (`app.css`, `+layout.svelte`, `routes/*`, all configs,
  `.storybook`, `tests/setup.ts`, verification tooling/gate scripts); `npm`; folder moves; and
  **all verification**.
- **Verification-caught SOURCE defects → the executor fixes them, not Claude** (dispatch the exact
  diff + a hard scope-lock via the same cli-pi route). Barrier files remain Claude's to edit.
  (Rationale: keeps Claude an independent verifier — never marks its own homework.)
- **Sonnet subagents are VERIFIERS only** (faithfulness passes against the frozen React oracle).

### Per-cluster loop (repeat for every WS-B cluster)

1. Dispatch the port to the executor (self-contained prompt: pre-approved spec folder, exact
   oracle→target files, allowed write paths, hard bans, jsdom/mock guidance).
2. **Verify independently** (never trust the executor's self-report):
   - `it()` count **1:1** vs the frozen React oracle.
   - Only allowed paths touched (`git status`); no `_probe*` scratch files.
   - `svelte-check` delta **0** (baseline is **37 pre-existing `.stories.ts` errors** — see §9).
   - Target test file green under `vitest.web.svelte.config.ts`.
3. **Sonnet faithfulness pass** — assertion-by-assertion, no dropped/weakened/retargeted assertions.
4. Commit (explicit paths only — **never `git add -A`**, `specs/context/` is a protected untracked repo)
   + push. Update the child `tasks.md` row.

---

## 4. Spec topology & where things live

```
specs/003-pi-remote-design-system/            ← epic root (this handover lives here)
  001-architecture-conventions-tokens/         (frozen decisions; amended, not edited, by 005)
  002-implement-migrate-component-library/
  003-refine-audit-designer-editability/
  004-sk-code-mobile-cli-mode/
  005-sveltekit-spa-migration/                 ← phase PARENT (lean trio + amendment + goal)
    007-verify-and-cutover/                     ← ACTIVE child — tasks.md has the row-level ledger
```

- **Code root:** `app-mobile/` (the web app; formerly `apps/pi-remote-web`). Backend is `app-relay/`.
- **Shared framework-agnostic `.ts`** live at `app-mobile/src/` top level (relay, cache, state,
  demo, runtime, runtime-issues, commands, auth, effort, model-catalog, …) — used by BOTH the
  React oracle and the Svelte app, so most ported tests import them **byte-identically**.
- **Svelte components/hooks** live under `app-mobile/src/lib/` (see §8 for the current tree).
- **Tests:** `app-mobile/tests/` — React oracles are `*.test.tsx` (FROZEN), Svelte ports are
  `*.svelte.test.ts`; shared harnesses in `app-mobile/tests/support/*.svelte`.
- **Config:** `vitest.web.svelte.config.ts` (Svelte tests; bits-ui inlined; `fileParallelism:false`;
  `setupFiles: app-mobile/tests/setup.ts`).

---

## 5. Progress ledger

### WS-A — CSS cutover ✅ DONE (proven)
`app.css` carved from `style.css` (7,932 → 3,153 lines); `+layout.svelte` imports `app.css`;
token-identity vs baseline **0/0/0** (light/dark/system); CSS-corpus equivalence gate all
declarations reproduced; CDP 390px both themes pass. Commits `460d0b1`, `c7a4e73`, `2332863`.

### WS-B — test-migration parity (in progress)

| Cluster | Tests | Status | Commit |
|---|---|---|---|
| B1 attachments | 29 | ✅ FAITHFUL | `fdd955a` |
| B2 composer | 102/103 (1 documented skip) | ✅ FAITHFUL | `5b59d42`, `dff950e` |
| B3a artifact-viewer core | 25 | ✅ FAITHFUL (1 P1 fixed) | `004ad77` |
| B3b artifact-viewer rest | 9 (34/34 full set) | ✅ FAITHFUL | `fb57ade` |
| B4 chrome/effort/command | 42 | ✅ FAITHFUL | `a5d0738` |
| B5 hook factories | 33 | ✅ FAITHFUL | `a7cd69d` |
| B6 ask-question | 9 + a source fix | ✅ FAITHFUL | `45756da` |
| **B7-runtime** | 45 | **⏳ dispatched, unverified** | — |
| B7 catalogLifecycle | 16 | ⬜ todo | — |
| B7 pwa-cache | 10 | ⬜ todo | — |
| B7-view App | 26 | ⬜ todo | — |
| B7-view disclosure-persistence | 1 | ⬜ todo | — |
| B7-view transcript-placement | 1 | ⬜ todo | — |
| B8 ErrorBoundary retire | 2 | ⬜ todo | — |

**B2's one skip** (`it.skip`, durable WHY in the test): jsdom can't run bits-ui focus-trap redirect /
interact-outside dismiss; the oracle passed it vacuously. The real guard is CDP-gated.

---

## 6. Remaining work (detailed)

### Finish WS-B
- **B7-runtime (45)** — in flight. Half is pure-reducer (`runtimeReducer`, `modeAuthority`,
  `runtimeAnnouncement` — port unchanged, import from shared `../src/runtime.js`); half is
  `renderHook(useRuntime)` factory tests → drive the Svelte `useRuntime` (at
  `src/lib/useRuntime.svelte.ts`, signature `useRuntime(() => sessionId)`, returns getters) via
  `$effect.root` + `flushSync` or a probe harness. 8 fake-timer sites (10s delivery deadline,
  coalescing) — mirror `vi.useFakeTimers` + `flushSync`. One render: `RuntimeStatusRegion` →
  `src/lib/transcript/RuntimeStatusRegion.svelte`. Verify + salvage if the executor runs out of budget.
- **catalogLifecycle (16)** → `renderHook(useHostCommandCatalog)` → `src/lib/hostCommandCatalog.svelte.ts`. B5-style factory port.
- **pwa-cache (10)** → mostly SW/cache logic.
- **B7-view: App (26) + disclosure-persistence (1) + transcript-placement (1)** — the hard ones:
  real App-shell renders. **Build a shared App/routing/context render harness first** (mounts the
  shell with both context providers + a mock runtime over `demo.ts` fixtures). These exercise
  routing, overlays, and view switching.
- **B8 ErrorBoundary (2)** → retire the React `ErrorBoundary` in favour of SvelteKit
  `+error.svelte` / `handleError` (documented retire, not a 1:1 port).

### Cutover barrier (C1–C5)
- **Clear the 37 pre-existing `.stories.ts` svelte-check errors** (see §9) — blocks the green board.
- **Add a CDP runtime smoke gate** — static gates (svelte-check, token-identity, decl-equivalence)
  **cannot see `$effect` self-loops** (see §7). Boot `VITE_PI_DEMO=1` + headless Chrome, navigate
  each surface (Home, `/session/<demo>`, Review/Inbox overlays, composer, ask-question, enrollment),
  assert **0** `Runtime.exceptionThrown` / `effect_update_depth_exceeded`. Only Home + Session are
  runtime-verified today.
- **C1** flip `test:web` → the Svelte + logic configs (retire the React config as gate 4).
- **C2** full **9-gate** board green (see §10).
- **C3** deep-review fan-out against the frozen contracts.
- **C4 — PAUSE.** Surface the green board; get **fresh explicit user go-ahead** before ANY delete.
- **C5** (authorised only) delete React: `main.tsx`, all `.tsx`, React dirs
  (`artifacts/attachments/rich-content/features`), `style.css`, React-only `.ts`; repoint `index.html`
  off `/src/main.tsx`.

### WS-C — Option B page-centric reorg — see §7 in full detail
Lands **together with the C5 delete** (per the locked "cutover first, then reorg" decision) so the
first appearance of `pages/` is already clean.

---

## 7. Option B — page-centric architecture (DETAILED)

**Why Option B:** the pain that started this migration was two monoliths — all five screens buried
as functions inside a 96 KB `App.tsx`, and all styling in one 7,931-line `style.css`. The Svelte
rewrite already fixed co-location (one `.svelte` file per component). Option B finishes the story on
the **folder layout**: a designer opens **one page folder** and sees every component that screen is
built from, with cross-page shared UI clearly separated. It is a **pure folder reorg + import
rewrite** — zero behaviour change (guarded by the same token-identity + CDP acceptance oracles).

### 7.1 Current layout (type-grouped — what exists on `main` today)

```
app-mobile/src/
  *.ts                      shared framework-agnostic logic (relay, cache, state, demo,
                            runtime, runtime-issues, commands, auth, effort, model-catalog,
                            rankHostCommands, …) — consumed by React oracle AND Svelte app
  features/ask-question/    shared .ts (askQuestionEphemeralStore.ts, …) — React-era, still shared
  lib/                      the Svelte tree, grouped BY TYPE, not by screen:
    artifacts/              artifact viewer + image/pdf/text previews
    attachments/            attachment draft/rail/preview/submission
    chrome/                 SessionHeader, RuntimeStrip, TodoPanel, ModelEffortSheet,
                            LeavePlanSheet, EffortRadioGroup, plan components, model switcher
    features/ask-question/  AskQuestionCard + subcomponents + hooks (Svelte)
    primitives/             Bits-UI-backed Button/Sheet/Menu/ToggleGroup/RadioGroup/Switch/Collapsible
    rich-content/           code/command-output/text cards, highlight + copy hooks
    transcript/             TranscriptList, Block, NormalizedActivityGroup, RuntimeStatusRegion, …
    views/                  Enrollment / Home / Review / Inbox / Session (the 5 screens)
    *.svelte.ts             cross-cutting runes factories (useRuntime, hostCommandCatalog, useSyncSocket, …)
  routes/                   +layout.svelte, +layout.ts, +page.svelte,
                            session/[id]/+page.svelte, attention/[lookupId]/+page.svelte, catalog/
```

### 7.2 Target layout (page-centric)

```
app-mobile/src/
  pages/
    enrollment/   the auth-gate screen + its components
    home/         the session-list / landing screen + its components
    session/      the live session screen — BY FAR the largest: composer + autocomplete,
                  transcript (list + blocks + activity), artifacts, attachments, ask-question,
                  rich-content, and session-only chrome (SessionHeader, RuntimeStrip, TodoPanel,
                  ModelEffortSheet, LeavePlanSheet, plan components), plus the socket + virtualizer
    review/       the review overlay screen + its components
    inbox/        the inbox overlay screen + its components
  shared/         cross-page building blocks:
                  - primitives/ (the Bits-UI wrappers — used everywhere)
                  - cross-page chrome (anything rendered by more than one page/shell)
                  - the framework-agnostic .ts logic (relay, cache, state, runtime, …) and the
                    cross-cutting runes factories (useRuntime, hostCommandCatalog, useSyncSocket)
  routes/         UNCHANGED responsibility, now THIN — each +page.svelte just imports its page:
                  /  → pages/home (+ enrollment auth branch, + review/inbox overlays)
                  /session/[id]      → pages/session
                  /attention/[lookupId] → session deep-link
```

### 7.3 Mapping rules & judgement calls (finalise at R1)

- **A component that only one screen renders → that screen's `pages/<x>/` folder.** Most of today's
  `lib/artifacts`, `lib/attachments`, `lib/rich-content`, `lib/transcript`, `lib/chrome`, and
  `lib/features/ask-question` are **session-only** → they move under `pages/session/` (sub-grouped by
  concern, e.g. `pages/session/transcript/`, `pages/session/composer/`).
- **A component 2+ screens render, or a primitive → `shared/`.** All of `lib/primitives` → `shared/`.
- **Framework-agnostic `.ts` and cross-cutting runes factories → `shared/`** (they are page-agnostic
  logic, not a screen's UI).
- **Routing ≠ pages 1:1 (important):** there are only **3 URLs** (`/`, `/session/[id]`,
  `/attention/[lookupId]`). **Review and Inbox are overlay booleans**, not routes; **Enrollment is an
  auth branch** of `/`. So `pages/review`, `pages/inbox`, `pages/enrollment` are logical screen
  folders rendered *within* the shell — do **not** invent routes for them.
- **The shell** (`+layout.svelte`) stays a barrier file in `routes/`; it wires both context providers,
  theme, SW registration, and the connection/session stores. It imports pages + `shared/`.

### 7.4 R1–R4 (the reorg packet)

- **R1** — move files into `pages/` + `shared/`. Co-locate each moved `.svelte` with its
  `.stories.ts` and any co-located `.svelte.ts` hook.
- **R2** — codemod rewrites **EVERY** import across `.svelte` / `.ts` / `.stories.ts` / **tests** /
  **vitest configs** / **gate scripts**. The gate scripts that hard-code paths and MUST be updated:
  `build-app-css.mjs`, the CSS-corpus builder, the token-identity resolver, and the **CDP walk paths**
  in `design-system-cdp.mjs`. Miss one and a gate silently reads the wrong tree.
- **R3** — re-verify **all** gates green from the new layout (build · svelte-check · test:web ·
  token-identity 0/0/0 · CDP · catalog smoke).
- **R4** — amendment close + `validate.sh specs/003-pi-remote-design-system/005-sveltekit-spa-migration --strict`.

### 7.5 Sequencing & risks

- **Lands together with the C5 React delete**, in one move, so `pages/` never coexists with the
  React tree and its first appearance is clean (locked decision: "cutover first, then reorg").
- **#1 risk:** a stale hard-coded path in a **gate script or vitest config** → a gate reads the old
  tree and reports green against nothing. Mitigation: after R2, grep the whole repo for the old
  `lib/` / `src/` path fragments and confirm zero remain in scripts/configs/tests before R3.
- **#2 risk:** an import the codemod misses → build/svelte-check breaks (loud, easy). The token-identity
  + CDP oracles catch any *behavioural* drift the moves might cause (there should be none — it's a
  rename-only change).

---

## 8. Key learnings & gotchas (carry these forward)

- **`$effect` dispatch self-invalidation (systemic).** A ported React `useEffect` that becomes a
  Svelte `$effect` calling a reducer-dispatch self-loops (the sync dispatch READS the `$state` it
  writes → dependency → re-invalidate). Throws `effect_update_depth_exceeded` (sync) or silently
  oscillates (async). **Fixed in 5 components so far** (`+layout.svelte`, `AttachmentDraftProvider`,
  `hostCommandCatalog`, `useSyncSocket`, and — newest — `AskQuestionCard.svelte` in `45756da`).
  **Fix:** `untrack(() => dispatch(...))`, reading the real prop dep outside untrack. **Audit gap:**
  the dispatch can be **indirect** (via a hook API method like `stateApi.applyTranscriptStatus`), so
  a literal-`dispatch(` grep misses it — trace API methods too. **Static gates cannot see this** →
  the CDP runtime smoke gate (§6) is required.
- **jsdom + bits-ui floating.** Popover/Combobox content stays `visibility:hidden` unless the anchor
  reports a box — shim BOTH `getBoundingClientRect` AND `getClientRects` (length-1 DOMRectList) in a
  `beforeEach`. bits-ui Combobox opens via **input focus**, not trigger click, under jsdom.
  `scrollIntoView` is a global no-op in `setup.ts`.
- **`@tanstack/svelte-virtual`.** `createVirtualizer` returns a **STORE** (not a rune). To mock it in
  a test, return a subscribable store whose value exposes `getTotalSize`/`getVirtualItems`/
  `measureElement`/`setOptions` (see B6's `ask-question-card.svelte.test.ts`).
- **CSS decomposition rules** (WS-A, done but relevant to any `<style>` edits): keep only `@media`
  blocks that appear AFTER the base rule in source order; reproduce the ORIGINAL selector structure
  exactly; the decl-equivalence gate false-positives `DROPPED PROP` on shared grouped selectors.
- **Protected untracked repos:** `specs/context/` holds nested git repos — **never** `git add -A` /
  `git clean` / `git stash -u`. Always stage explicit paths.
- **Known non-regressions:** `auth.test.ts` is timing-flaky (201 vs 403); a tracked docs `.png` fixture
  keeps getting dirtily deleted (`git checkout HEAD --` it); bare `npm test` greedily sweeps a protected
  context repo (run explicit backend dirs for truth). Don't call these regressions.

---

## 9. Active blockers

1. **37 pre-existing `.stories.ts` svelte-check errors** (e.g. `FilePreviewCard.stories.ts`,
   `NormalizedActivityGroup.stories.ts` — type-narrowing on optional block fields). This is the
   svelte-check baseline today; it **fails cutover gate C2** and must be cleared before the green
   board. These predate WS-B and are NOT caused by the ports (every WS-B cluster verified at delta 0).
2. **Most surfaces are not runtime-verified.** Only Home + Session have been booted under CDP. The
   `$effect` self-loop class is invisible to static gates — the CDP runtime smoke gate (§6) must
   exercise every surface before C4.

---

## 10. Verification gates (the 9 — all must pass to cut over)

1. `npm run build` exit 0.
2. `npm run typecheck` exit 0 (web = `svelte-check`).
3. `npm test` exit 0 — backend green **throughout** (leak detector).
4. `npm run test:web` exit 0 (the new Svelte suite).
5. **Token-identity** resolver === baseline, **0/0/0** across all 3 themes.
6. **Contrast** every WCAG pair ≥ threshold + **≥76** guardrail fences preserved.
7. **CDP structural** 390px, zero horizontal overflow, both themes, against the built preview.
   *(Plus the new CDP **runtime** smoke gate — §6.)*
8. **Catalog smoke** — every component-backed surface renders in Storybook (light + dark).
9. `validate.sh specs/003-pi-remote-design-system/005-sveltekit-spa-migration --strict` exit 0.

---

## 11. How to resume

1. If `B7-runtime` (`bhol0xnrf`) has landed: verify it independently (count 1:1 = 45, allowed paths
   only, svelte-check delta 0, `runtime.svelte.test.ts` green), then Sonnet-faithfulness, commit, push.
   If the executor ran out of budget, salvage (keep the pure describes, re-dispatch the factory ones).
2. Continue WS-B in order: catalogLifecycle → pwa-cache → **build the App-shell harness** → App +
   the 2 small view tests → B8.
3. Clear the 37 `.stories.ts` errors and stand up the CDP runtime smoke gate.
4. Run the full 9-gate board (C2). If green: C3 deep-review, then **STOP at C4** and surface the
   board to the user for go-ahead.
5. On go-ahead: C5 delete + WS-C Option B reorg **together**, then R3 re-verify + R4 close.

**Resume metadata:** every dispatch prompt lives in the session scratchpad
(`dispatch-b*.md`, `dispatch-fix-*.md`, `dispatch-b7-runtime.md`). The frozen React oracles are the
correctness source; never edit a `*.test.tsx`.

---

## 12. Do-not list (hard)

- **No irreversible React delete without a fresh green board + explicit user go-ahead** (gate C4).
- **No Claude-authored app code** under `app-mobile/**` (executor writes it; Claude verifies).
- **No `git add -A` / `git clean` / `git stash -u`** (protects `specs/context/` nested repos).
- **No editing a `*.test.tsx` oracle** (frozen reference).
- **No changing a token value, security invariant, routing behaviour, or a11y contract** — that's
  out of scope for the whole epic; stop and escalate.
