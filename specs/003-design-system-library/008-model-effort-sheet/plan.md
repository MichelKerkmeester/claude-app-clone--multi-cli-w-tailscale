# Plan — Model & effort sheet

## Approach

Restyle in place, value-preserving. Read the sheet's current rules and its `--model-sheet-*` set,
map each colour onto the semantic role tokens, promote the `--model-sheet-*` set into a documented
component-token block, and wrap every editable region and visual state in the `@ds` grammar. Leave
the runtime/mutation wiring untouched behind guardrail comments. Prove pixel-identity across every
state with the light/dark capture and the existing sheet tests.

## Steps

1. Inventory the `.model-sheet-overlay` rules and the `--model-sheet-*` token set (light, dark, and
   system-dark variants) and record each state's current appearance.
2. Map the sheet's colours onto the semantic role tokens; keep `--model-sheet-*` as the documented
   component layer, resolving to the same values, and fence it `@ds surface: model-effort-sheet` +
   `@ds edit: tokens`.
3. Label the sheet's slots (`@ds slot:` header / search / model-list / effort-group / footer) and
   its layout seam (`@ds edit: layout` for stacking, drag offset, and safe-area).
4. Wrap each visual state in its own `@ds state:` block: model-open, effort-open, committing,
   terminal-blocked, pending-effort, dragging, snapping, search-shown, effort confirmed, effort
   requested, read-only/disabled.
5. Fence the runtime/mutation/host-reconcile wiring with `@ds guardrail: do-not-edit`.
6. Document the `--model-sheet-*` set in the token reference as the worked component-token example.
7. Capture the sheet at true-390px in light and dark across its principal states and diff against
   the pre-migration baseline.

## Files to change

- `apps/pi-remote-web/src/ModelEffortSheet.tsx` (class/slot labels; no behaviour change)
- `apps/pi-remote-web/src/EffortRadioGroup.tsx` (state-seam labels; react-aria behaviour unchanged)
- `apps/pi-remote-web/src/style.css` (`.model-sheet-overlay` rules + `--model-sheet-*` tokens)
- `apps/pi-remote-web/src/design-system/tokens.md` (document the component-token example)
- `scripts/design-system-cdp.mjs` (model-effort-sheet capture support, if needed)

## Verification gate

Run from the repository root:

```text
npm run typecheck
npm test
npm run test:web
npm run build
node scripts/design-system-cdp.mjs --surface model-effort-sheet --viewport-width 390 --theme light --output <temporary-directory>/model-effort-sheet-light.png
node scripts/design-system-cdp.mjs --surface model-effort-sheet --viewport-width 390 --theme dark --output <temporary-directory>/model-effort-sheet-dark.png
```

The gate passes only when all suites and the build pass, the sheet-a11y tests stay green, the CDP
runner reports exactly 390 CSS pixels with zero page horizontal overflow, and every sheet state is
visually identical to its pre-migration baseline in both themes with no source value changed and no
mutation path touched.
