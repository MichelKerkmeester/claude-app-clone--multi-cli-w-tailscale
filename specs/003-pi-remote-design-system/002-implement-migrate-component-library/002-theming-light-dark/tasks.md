# Tasks — Light/dark theming & contrast

- [ ] Record what each theme block resolves every semantic token to today: `:root` (light),
      `:root[data-theme='dark']`, and `@media (prefers-color-scheme: dark) :root[data-theme='system']`,
      plus the `--model-sheet-*` / `--slash-*` component dark sets.
- [ ] Rewrite each theme state as one labelled semantic→primitive remap (`@ds edit: tokens — theme
      remap`), keeping every resolved value identical.
- [ ] Consolidate the component-scoped dark sets so each component's remap is one `@ds surface:` +
      `@ds edit: tokens` block.
- [ ] Confirm the theme bootstrap (`data-theme`, `<meta name="theme-color">` `#24221f`/`#f8f8f6`,
      `localStorage['pi-remote.theme']`) and the `ThemeControl` / `SessionHeader` toggles drive the
      three states without change.
- [ ] Verify WCAG AA contrast is guaranteed by the semantic→primitive mapping; extend
      `tests/contrast.test.tsx` only if a role pair is unguarded.
- [ ] Capture true-390px light, dark, and system-resolved baselines and prove pixel-identity against
      the pre-migration baseline; record evidence in `checklist.md`.
