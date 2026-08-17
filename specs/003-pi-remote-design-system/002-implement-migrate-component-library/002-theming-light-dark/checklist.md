# Checklist — Light/dark theming & contrast

- [ ] Each of the three theme states is one labelled semantic→primitive remap; no component repeats
      a raw value the semantic layer already owns.
- [ ] Every semantic token resolves to the same light and dark value as before; no rendered pixel
      changes in any state.
- [ ] The component-scoped dark sets (`--model-sheet-*`, `--slash-*`) each read as one labelled block.
- [ ] The theme bootstrap (`data-theme`, `<meta name="theme-color">`, `localStorage`) and both toggle
      groups drive explicit-light, explicit-dark, and system states correctly.
- [ ] WCAG AA contrast is guaranteed by the semantic→primitive mapping and proven by
      `tests/contrast.test.tsx` in both themes.
- [ ] No source value, security boundary, or dependency is changed.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run test:web` passes.
- [ ] `npm run build` passes.
- [ ] The true-390px light capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline.
- [ ] The true-390px dark capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline.
