# Tasks — Live catalog & designer docs

- [ ] Confirm the catalog delivery fixed by the Phase 1 decision (app route vs. standalone Vite entry
      vs. static page) and scaffold the surface under `apps/pi-remote-web/src/design-system/`.
- [ ] Build the enumeration: read the `@ds surface:` entries and their `@ds state:` blocks and produce
      a catalog index of every migrated component.
- [ ] Build the per-component preview: render each component in each declared state over deterministic,
      already-redacted fixtures, with a light/dark toggle reusing the app's `data-theme` mechanism.
- [ ] Build the per-state preview and the empty/"not yet migrated" state for unregistered surfaces.
- [ ] Add the registration hook the other grandchildren use, and register the surfaces already migrated.
- [ ] Build the designer documentation surface: link the token reference (grandchild 1) and the
      designer guide (Phase 3), and add a short `@ds`-grammar primer.
- [ ] Confirm the catalog is offline and read-only (no mutation, host action, network call, ticket, or
      authenticated request) and justify any dependency against the Phase 1 decision.
- [ ] Capture true-390px light/dark evidence of the catalog index and a per-component preview, and
      record results in `checklist.md`.
