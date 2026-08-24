# Implementation Summary — 003 P2 grandchild 015 (live catalog & designer docs)

## Final state — COMPLETE

The design system now has a live, browsable catalog and a designer-docs surface — the one net-new
surface in Phase 2. It ships as a **standalone, isolated Vite entry** (`catalog.html` + its own React
root) that enumerates every migrated `@ds surface:` and renders the real components over deterministic
offline fixtures, with a light/dark toggle and a `@ds`-grammar primer. It is read-only demo scaffolding:
no mutation, no host action, no network path, no security-boundary change. Built by **DeepSeek V4 Flash
(Cline CLI)**; orchestrated and independently verified by Claude on `main` outside the sandbox.

## Delivery decision (Phase 1 left this open)

The catalog is a **separate Vite entry**, not an app route. Rationale: the operator app
(`index.html → src/main.tsx → App`) stays byte-untouched, so the catalog **structurally cannot
white-screen the operator shell**, and its rendering is independently isolated. The only operator-file
change is a two-entry `build.rollupOptions.input` in `vite.config.ts`; the `app` entry still maps to the
existing `index.html`.

## What shipped

- **`apps/pi-remote-web/catalog.html`** — a standalone entry mirroring the app's strict CSP
  (`style-src 'self'`, etc.), mounting `#catalog-root`; no manifest, no service worker.
- **`apps/pi-remote-web/src/design-system/catalog/`**
  - `main.tsx` — own React root; reuses `RootErrorBoundary` read-only; imports no operator shell file.
  - `registry.ts` — a typed, **pure-data** array of **35 surfaces** (id, purpose, `@ds state:` list,
    component-token prefixes, editability note, preview kind + reason). Imports no component.
  - `Catalog.tsx` — theme toggle (`document.documentElement.dataset.theme`), the registry index, the
    live previews, and the designer-docs section (grammar primer + links to `tokens.md` and the
    designer-guide stub).
  - `previews.tsx` — **6 live previews** (artifact-status, artifact-card, diff-preview, code-preview,
    text-preview, rich-content) over `demo.ts` fixtures; **21** per-preview error-boundary wraps.
  - `PreviewBoundary.tsx` — a compact per-preview error boundary (a throw shows a fallback card, never
    crashes the catalog).
  - `catalog.css` — catalog-only chrome reading the frozen semantic tokens via `var(--…)`;
    `@import`s the operator `style.css` read-only (adds no rule to it).
- **`apps/pi-remote-web/src/design-system/designer-guide.md`** — a one-paragraph stub the docs link
  targets ("coming in the editability audit").
- **`apps/pi-remote-web/vite.config.ts`** (+12/−0) — a two-entry `build.rollupOptions.input`
  (`app` → index.html, `catalog` → catalog.html).

The 29 non-live surfaces are registry-only, each with a stated reason (needs a live host/socket/provider,
or is a shared CSS convention with no standalone component) — breadth is guaranteed by the pure-data
registry, live depth is added only where the demo fixtures type-safely satisfy the component props, so a
partial preview set can never break the build.

## Verification (Claude, on `main`, OUTSIDE the sandbox)

- **Scope:** exactly the allowed paths — `vite.config.ts` (M) + `catalog.html`, `catalog/**`,
  `designer-guide.md` (new). **No operator shell file touched:** `main.tsx`, `index.html`, `App.tsx`,
  `demo.ts`, `ErrorBoundary.tsx`, `tsconfig.json`, and **`src/style.css` are byte-unchanged**
  (`git diff` empty on style.css — value preservation proven by byte identity, stronger than the rule
  resolver). No test modified. No stray file.
- **Isolation / security:** a tree scan finds no `fetch` / `WebSocket` / `demoSocket` / `demoPostJson`
  / storage / service-worker call anywhere in the catalog; every live preview is error-boundaried.
- **Gates:** `npm run typecheck` **0**; `npm run build` **0** (both `dist/index.html` and
  `dist/catalog.html` + `catalog-*.js|.css` emit); `git diff --check` clean.
- **`npm run test:web`: 669 passed / 1 failed (62 files).** The one failure is **pre-existing and
  unrelated** — see "Discovered issue" below. Zero regression from this phase (669/62 with and without
  the catalog change).
- **Structural mount (built output, headless, true 390px):** shell `/` mounts (`#root.children=1`, no
  white-screen), catalog `/catalog.html` mounts (`#catalog-root.children=1`), both `scrollWidth ==
  innerWidth == 390` (zero horizontal overflow), zero uncaught exceptions. The catalog body text shows
  real rendered content ("DESIGN SYSTEM · READ-ONLY TOOLING … Every migrated surface …"), not the
  error fallback.
- **Comment hygiene:** clean; catalog comments carry the durable WHY and `@ds` grammar only.
- **User-flagged safety:** `specs/context/` (the two untracked repos `nodeterm-main`,
  `remote-for-opencode-master`) re-confirmed `?? … untouched` before and after; never staged, stashed,
  or cleaned.

## Discovered issue (pre-existing, out of this phase's scope) — flagged

`apps/pi-remote-web/tests/viewer-history.test.tsx` ("uses one history child, restores transcript
scroll, and returns focus to the trigger") fails on the **clean baseline HEAD `2a67e6f`**: with every
catalog file moved out and `vite.config.ts` reverted, the same test fails identically (and in
isolation, 3/3). The assertion at line 115 expects focus to return to the "Open second" button after
the artifact viewer closes, but that button is still `hidden` (inert/aria-hidden not cleared) so
`getByRole('button', { name: 'Open second' })` throws. This is an artifact-viewer focus/inert cleanup
issue, unrelated to the catalog.

Grandchild 014's summary recorded "670 passed / 62 files" at this same commit, so this focus/inert test
has since flipped to failing — a Logic-Sync discrepancy between the recorded baseline and current
reality. It should be pinpointed (bisected across the 003 commits) and fixed as a **separate
workstream** (app code → external model per the iron constraint); it is not a grandchild-015 defect and
is out of this isolated catalog phase's frozen scope.

## Route & cost note

Built on the **Cline CLI** (`cline-pass/deepseek-v4-flash`, `--thinking xhigh`) — the cheap route;
goal-named routes remain hard-exhausted. Exited code 0 after 67 iterations (steady log growth, no
stall). Safeguarded by clean-baseline recovery (`2a67e6f`), full-diff scope review, byte-identity of
`style.css`, and the structural mount check of both entries.

## Continuation

Grandchild 015 (live catalog & designer docs) is complete — **Phase 2 (002-implement-migrate-component-
library) is now fully built (001–015).** **Next:** flag/bisect the pre-existing `viewer-history`
failure, then Phase 3 (`003-refine-audit-designer-editability`) — the editability audit + designer
guide, the natural home for the deferred literal→token (011), overlay-primitive extraction (012), and
physical status-unification (014).
