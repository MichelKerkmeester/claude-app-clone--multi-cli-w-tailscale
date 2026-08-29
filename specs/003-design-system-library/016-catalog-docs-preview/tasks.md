<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Tasks — Live catalog & designer docs

- [x] Confirm the catalog delivery fixed by the Phase 1 decision (app route vs. standalone Vite entry
      vs. static page) and scaffold the surface under `apps/pi-remote-web/src/design-system/`. — Phase 1
      left the delivery open; this phase fixes it as a **standalone, isolated Vite entry**
      (`catalog.html` + `src/design-system/catalog/`) that mounts its own React root. The operator app
      (index.html → main.tsx → App) stays byte-untouched, so the catalog structurally cannot
      white-screen the shell. `vite.config.ts` gains a two-entry `build.rollupOptions.input` only.
- [x] Build the enumeration: read the `@ds surface:` entries and their `@ds state:` blocks and produce
      a catalog index of every migrated component. — `registry.ts` is a typed, pure-data array of **35
      surfaces**, each with its `@ds state:` list, component-token prefixes, and an editability note.
- [x] Build the per-component preview: render each component in each declared state over deterministic,
      already-redacted fixtures, with a light/dark toggle reusing the app's `data-theme` mechanism. —
      **6 live previews** (artifact-status, artifact-card, diff-preview, code-preview, text-preview,
      rich-content) render the real components over `demo.ts` fixtures; the toggle sets
      `document.documentElement.dataset.theme` (the same mechanism App.tsx uses). Each preview sits in
      its own error boundary.
- [x] Build the per-state preview and the empty/"not yet migrated" state for unregistered surfaces. —
      each live surface renders its declared states; the **29 registry-only** surfaces show a
      `RegistryOnlyNote` with the reason they cannot preview safely here (needs a live host/socket, or
      is a shared CSS convention with no standalone component).
- [x] Add the registration hook the other grandchildren use, and register the surfaces already
      migrated. — registration is the typed `CATALOG_SURFACES` array; every migrated surface from
      grandchildren 001–014 is registered (app-shell, transcript, composer, model-effort-sheet,
      slash-autocomplete, plan-mode, rich-content, artifacts + previews, overlay, plan-todo,
      ask-question, todos, status vocabulary, motion scale, focus/reduced-motion/contrast/forced-colors).
- [x] Build the designer documentation surface: link the token reference (grandchild 1) and the
      designer guide (Phase 3), and add a short `@ds`-grammar primer. — a docs section renders a
      grammar primer (surface / slot / state / variant / edit / guardrail / catalog / theme) and links
      `tokens.md` and `designer-guide.md` (stub, labelled "coming in the editability audit").
- [x] Confirm the catalog is offline and read-only (no mutation, host action, network call, ticket, or
      authenticated request) and justify any dependency against the Phase 1 decision. — a scan of the
      catalog tree finds no `fetch` / `WebSocket` / `demoSocket` / `demoPostJson` / storage /
      service-worker call; it imports real components and demo fixtures read-only. **No dependency added.**
- [x] Capture true-390px light/dark evidence of the catalog index and a per-component preview, and
      record results in `checklist.md`. — a headless mount check of the built output at 390px reports
      `#catalog-root` mounts, `scrollWidth == innerWidth == 390` (zero horizontal overflow), zero
      uncaught exceptions; the operator shell `/` still mounts (no white-screen). Layout is
      theme-independent (the toggle changes only token-driven colour), so both themes render at 390px.
