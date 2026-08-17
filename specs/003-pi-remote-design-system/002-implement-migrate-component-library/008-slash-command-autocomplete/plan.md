# Plan — Slash command autocomplete

## Approach

Restyle in place, value-preserving. Read the `.slash-panel` rules and the `--slash-*` set, map each
colour onto the semantic role tokens, promote `--slash-*` into a documented component-token block,
and wrap every editable region and each `SlashPanelOpenState` in the `@ds` grammar. Leave the
ranker, catalog lifecycle, and fail-closed submission untouched behind guardrail comments. Prove
pixel-identity across every state with the light/dark capture and the command-surface tests.

## Steps

1. Inventory the `.slash-panel` rules and the `--slash-*` token set (light, dark, system-dark) and
   record each panel state and option-row state's current appearance.
2. Map the surface's colours onto the semantic role tokens; keep `--slash-*` as the documented
   component layer resolving to the same values, fenced `@ds surface: slash-autocomplete` +
   `@ds edit: tokens`.
3. Label the panel slots (`@ds slot:` header / option-list / footer-hint) and the option-row slots
   (label / binding / disabled-reason), and the layout seam (`@ds edit: layout` for anchoring).
4. Wrap each panel state in a `@ds state:` block (the thirteen `SlashPanelOpenState` values plus
   `closed` / `drafted`) and each option-row state (`active` / `enabled` / `disabled-with-reason`).
5. Fence the ranker, catalog lifecycle, trigger predicate, and fail-closed submission with
   `@ds guardrail: do-not-edit`; preserve the unsafe-character escaping verbatim.
6. Document the `--slash-*` set in the token reference as a component-token example.
7. Capture the panel and palette at true-390px in light and dark across their principal states and
   diff against the pre-migration baseline.

## Files to change

- `apps/pi-remote-web/src/ComposerCommandAutocomplete.tsx` (class/slot/state labels)
- `apps/pi-remote-web/src/CommandPalette.tsx` (class/slot labels)
- `apps/pi-remote-web/src/CommandOption.tsx` (row state-seam labels; escaping unchanged)
- `apps/pi-remote-web/src/style.css` (`.slash-panel` rules + `--slash-*` tokens)
- `apps/pi-remote-web/src/design-system/tokens.md` (document the component-token example)
- `scripts/design-system-cdp.mjs` (slash-autocomplete capture support, if needed)

## Verification gate

Run from the repository root:

```text
npm run typecheck
npm test
npm run test:web
npm run build
node scripts/design-system-cdp.mjs --surface slash-autocomplete --viewport-width 390 --theme light --output <temporary-directory>/slash-autocomplete-light.png
node scripts/design-system-cdp.mjs --surface slash-autocomplete --viewport-width 390 --theme dark --output <temporary-directory>/slash-autocomplete-dark.png
```

The gate passes only when all suites and the build pass, the command-surface tests stay green, the
CDP runner reports exactly 390 CSS pixels with zero page horizontal overflow, and every panel and
option-row state — including the escaped unsafe-character rendering — is visually identical to its
pre-migration baseline in both themes with no source value changed and no catalog/ranking/submission
behaviour touched.
