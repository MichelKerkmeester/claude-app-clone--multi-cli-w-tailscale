# Plan — Live catalog & designer docs

## Approach

Build a read-only index over the migrated system. Enumerate the `@ds surface:` and `@ds state:`
seams the other grandchildren declared, render each component in each state over deterministic
offline fixtures (the `demo.ts` approach) in both themes, and pair it with a designer documentation
surface linking the token reference and the designer guide. Ship last so the catalog is a faithful,
complete index. Add no mutation, no host action, and no dependency the Phase 1 decision has not
justified.

## Steps

1. Confirm the catalog delivery fixed by the Phase 1 decision (app route vs. standalone Vite entry
   vs. static page) and scaffold that surface under `apps/pi-remote-web/src/design-system/`.
2. Build the enumeration: read the `@ds surface:` entries and their `@ds state:` blocks and produce a
   catalog index of every migrated component.
3. Build the per-component preview: render each component in each declared state over deterministic,
   already-redacted fixtures, with a light/dark toggle that reuses the app's `data-theme` mechanism.
4. Build the per-state preview and the empty/"not yet migrated" state for unregistered surfaces.
5. Add the registration hook the other grandchildren use to add themselves, and register the surfaces
   already migrated.
6. Build the designer documentation surface: link the token reference (grandchild 1) and the designer
   guide (Phase 3), and add a short `@ds`-grammar primer.
7. Confirm the catalog is offline and read-only — no mutation, host action, network call, ticket, or
   authenticated request — and justify any dependency against the Phase 1 decision.
8. Capture true-390px light/dark evidence of the catalog index and a per-component preview.

## Files to change

- `apps/pi-remote-web/src/design-system/` (new catalog surface + its registration hook + docs;
  exact delivery per the Phase 1 decision)
- `apps/pi-remote-web/src/style.css` (catalog chrome reading the token library; `@ds`-labelled)
- `apps/pi-remote-web/src/demo.ts` (reuse/extend deterministic fixtures for the previews, if needed)
- `scripts/design-system-cdp.mjs` (catalog index + per-component capture support)

## Verification gate

Run from the repository root:

```text
npm run typecheck
npm test
npm run test:web
npm run build
node scripts/design-system-cdp.mjs --surface catalog-index --viewport-width 390 --theme light --output <temporary-directory>/catalog-index-light.png
node scripts/design-system-cdp.mjs --surface catalog-index --viewport-width 390 --theme dark --output <temporary-directory>/catalog-index-dark.png
```

The gate passes only when all suites and the build pass; the catalog enumerates every `@ds surface:`
and renders each migrated component in each state in both themes; the designer docs link the token
reference and designer guide; the catalog is offline, read-only, and free of any mutation, host
action, or authenticated call; the CDP runner reports exactly 390 CSS pixels with zero page
horizontal overflow; and any dependency is justified against the Phase 1 decision or none is added.
