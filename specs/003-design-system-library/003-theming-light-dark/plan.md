<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Plan — Light/dark theming & contrast

## Approach

Make the implicit mechanism explicit without moving a value. Document each of the three theme
states as a single labelled semantic→primitive remap, consolidate the duplicated component-scoped
dark overrides so each reads as one block, confirm the bootstrap and toggles still drive the three
states, and pin WCAG AA contrast to the token layer with the existing contrast test. Prove
pixel-identity in all three states.

## Steps

1. Map the current theme blocks: record what `:root`, `:root[data-theme='dark']`, and the
   `@media (prefers-color-scheme: dark) :root[data-theme='system']` block resolve every semantic
   token to, plus the `--model-sheet-*` / `--slash-*` component sets.
2. Rewrite each theme block as one labelled semantic→primitive remap (`@ds edit: tokens — theme
   remap`), keeping every resolved value identical.
3. Consolidate the component-scoped dark sets so each component's remap is one `@ds surface:` +
   `@ds edit: tokens` block instead of scattered overrides.
4. Confirm the bootstrap (`data-theme`, `<meta name="theme-color">` `#24221f`/`#f8f8f6`,
   `localStorage['pi-remote.theme']`) and the `ThemeControl` / `SessionHeader` toggles drive the
   three states without change.
5. Verify WCAG AA contrast is a property of the semantic→primitive mapping; extend
   `tests/contrast.test.tsx` if any role pair is unguarded.
6. Capture true-390px light and dark (and system-resolved) baselines and diff against the
   pre-migration baseline to prove pixel-identity.

## Files to change

- `apps/pi-remote-web/src/style.css` (theme blocks and component dark sets — labels/consolidation,
  no value changes)
- `apps/pi-remote-web/tests/contrast.test.tsx` (extend coverage only if a role pair is unguarded)
- `scripts/design-system-cdp.mjs` (three-theme-state capture support, if needed)

## Verification gate

Run from the repository root:

```text
npm run typecheck
npm test
npm run test:web
npm run build
node scripts/design-system-cdp.mjs --surface theming --viewport-width 390 --theme light --output <temporary-directory>/theming-light.png
node scripts/design-system-cdp.mjs --surface theming --viewport-width 390 --theme dark --output <temporary-directory>/theming-dark.png
```

The gate passes only when all suites and the build pass, `tests/contrast.test.tsx` proves WCAG AA in
both themes, the CDP runner reports exactly 390 CSS pixels with zero page horizontal overflow, and
the light, dark, and system-resolved captures are visually identical to the pre-migration baseline.
