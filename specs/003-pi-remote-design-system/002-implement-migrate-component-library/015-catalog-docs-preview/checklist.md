# Checklist — Live catalog & designer docs

- [ ] The catalog enumerates every `@ds surface:` and its `@ds state:` blocks and renders each
      migrated component in each state, in light and dark, over the real components.
- [ ] The catalog reads the token library so it restyles when tokens change.
- [ ] The designer documentation links the token reference (grandchild 1) and the designer guide
      (Phase 3) and includes a `@ds`-grammar primer.
- [ ] The catalog is offline and read-only — no mutation, host action, network call, ticket, or
      authenticated request — and renders over already-redacted fixture content.
- [ ] Every other migrated grandchild is registered in the catalog, or shown in the "not yet
      migrated" state if pending.
- [ ] Any dependency the catalog needs is justified against the Phase 1 decision, or none is added.
- [ ] No component being catalogued is restyled or refactored; no frozen source value or security
      boundary is changed.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run test:web` passes.
- [ ] `npm run build` passes.
- [ ] The true-390px light capture of the catalog index reports exactly 390 CSS pixels and has zero
      page horizontal overflow.
- [ ] The true-390px dark capture of the catalog index reports exactly 390 CSS pixels and has zero
      page horizontal overflow.
