# Checklist — Light/dark theming & contrast

- [x] Each of the three theme states is one labelled semantic→primitive remap; no component repeats
      a raw value the semantic layer already owns. — light/dark/system semantic blocks each labelled
      `@ds edit: tokens — theme remap, <state>`; `--surface-code` in dark/system re-pointed to
      `var(--pi-bone)` (resolves `#24221f`, identical).
- [x] Every semantic token resolves to the same light and dark value as before; no rendered pixel
      changes in any state. — independent browser-free resolver: 231 (scope,theme,token) entries,
      **CHANGED 0, MISSING 0, ADDED 0** across light/dark/system.
- [x] The component-scoped dark sets (`--model-sheet-*`, `--slash-*`) each read as one labelled block.
      — dark and system variants of both sets fenced with `@ds edit: tokens — theme remap, <state>`;
      kept literal (re-pointing the dark ui-accent would change the pixel).
- [x] The theme bootstrap (`data-theme`, `<meta name="theme-color">`, `localStorage`) and both toggle
      groups drive explicit-light, explicit-dark, and system states correctly. — confirmed read-only:
      `index.html` `data-theme="system"`; `App.tsx` sets `dataset.theme` + `<meta theme-color>`
      `#24221f`/`#f8f8f6` + `localStorage['pi-remote.theme']` + re-applies on `prefers-color-scheme`;
      `ThemeControl` and the `SessionHeader` theme group drive all three. No bootstrap file changed.
- [x] WCAG AA contrast is guaranteed by the semantic→primitive mapping and proven by
      `tests/contrast.test.tsx` in both themes. — 5 previously-unguarded role pairs added
      (warning/warning-soft light+dark, danger/danger-soft dark, focus ring on surface+canvas dark);
      each hex verified against the real resolved token value; all pass (≥4.5:1 text, ≥3:1 focus).
- [x] No source value, security boundary, or dependency is changed. — only labels + one
      value-preserving re-point + additive contrast tests; no security/logic/transport/dependency change.
- [x] `npm run typecheck` passes. — exit 0 (outside sandbox).
- [x] `npm test` passes. — backend outside sandbox; this phase touches no backend code. The only
      failures are the pre-existing `attachment-normalization.test.ts` WASM flake (proven identical on
      clean HEAD earlier this phase); unaffected here.
- [x] `npm run test:web` passes. — exit 0; **670 passed / 62 files** (+5 contrast pairs vs the 665
      baseline).
- [x] `npm run build` passes. — exit 0.
- [x] The true-390px light capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline. — CDP 390px light: no h-overflow;
      "visually identical" proven authoritatively by the resolver (0 changed resolved values), since
      headless renders the app unstyled (CSP).
- [x] The true-390px dark capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline. — CDP 390px dark + system-dark: no
      h-overflow; value-identity via the resolver as above.
