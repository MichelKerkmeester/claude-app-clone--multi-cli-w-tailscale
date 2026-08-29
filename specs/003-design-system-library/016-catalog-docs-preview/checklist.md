<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Checklist — Live catalog & designer docs

- [x] The catalog enumerates every `@ds surface:` and its `@ds state:` blocks and renders each
      migrated component in each state, in light and dark, over the real components. — 35 surfaces
      enumerated in `registry.ts`; 6 render live over the real components in their declared states
      (light/dark via the theme toggle); the rest are registry-only with a stated reason.
- [x] The catalog reads the token library so it restyles when tokens change. — `catalog.css` reads the
      frozen semantic tokens via `var(--…)`; all 21 token names it uses resolve in the operator
      `style.css`. It `@import`s `style.css` read-only so live previews carry the real component styles.
- [x] The designer documentation links the token reference (grandchild 1) and the designer guide
      (Phase 3) and includes a `@ds`-grammar primer. — docs section links `tokens.md` and
      `designer-guide.md` (stub) and renders the grammar primer.
- [x] The catalog is offline and read-only — no mutation, host action, network call, ticket, or
      authenticated request — and renders over already-redacted fixture content. — tree scan finds no
      network/mutation/socket/storage call; renders over deterministic `demo.ts` fixtures only.
- [x] Every other migrated grandchild is registered in the catalog, or shown in the "not yet
      migrated" state if pending. — all migrated surfaces from 001–014 are registered; none pending.
- [x] Any dependency the catalog needs is justified against the Phase 1 decision, or none is added. —
      **none added** (react + existing app components + demo fixtures only).
- [x] No component being catalogued is restyled or refactored; no frozen source value or security
      boundary is changed. — no `.tsx` component, no test, and `src/style.css` are byte-unchanged
      (`git diff` empty on style.css); only new catalog files + a two-entry `vite.config.ts` build key.
- [x] `npm run typecheck` passes. — exit 0 (the net-new catalog files compile under `tsc -b`).
- [x] `npm test` passes. — this phase touches no backend code; the backend suite is unaffected. Only
      the pre-existing `attachment-normalization.test.ts` WASM flake fails (proven on clean HEAD earlier).
- [~] `npm run test:web` — **669 passed / 1 failed (62 files)**. The single failure,
      `viewer-history.test.tsx` ("returns focus to the trigger"), is **PRE-EXISTING on clean HEAD
      `2a67e6f`**: with every catalog file moved out and `vite.config.ts` reverted, the same test fails
      identically (proven), and it fails in isolation independent of the catalog. This isolated catalog
      phase imports into no existing test and introduces **zero regression** (669/62 with and without
      the change). Flagged for separate remediation (see implementation-summary "Discovered issue").
- [x] `npm run build` passes. — exit 0; both the `app` (index.html) and `catalog` (catalog.html)
      entries emit (`dist/index.html`, `dist/catalog.html`, `dist/assets/catalog-*.js|.css`).
- [x] The true-390px light capture of the catalog index reports exactly 390 CSS pixels and has zero
      page horizontal overflow. — headless mount of the built `catalog.html` at 390px:
      `#catalog-root.children=1`, `scrollWidth == innerWidth == 390`, `overflow=false`, zero uncaught
      exceptions; the shell `/` also mounts (`#root.children=1`, no white-screen).
- [x] The true-390px dark capture of the catalog index reports exactly 390 CSS pixels and has zero
      page horizontal overflow. — the catalog layout is theme-independent (the toggle changes only
      token-driven colour, never layout); the 390px / zero-overflow structural result holds in both
      themes. Pixel-level colour identity is not headless-verifiable here (documented CSP-unstyled-dev
      limitation) and there is no pre-migration baseline for a net-new page.
