<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Tasks — Light/dark theming & contrast

- [x] Record what each theme block resolves every semantic token to today: `:root` (light),
      `:root[data-theme='dark']`, and `@media (prefers-color-scheme: dark) :root[data-theme='system']`,
      plus the `--model-sheet-*` / `--slash-*` component dark sets. — captured as the 231-entry
      resolved baseline via the token resolver.
- [x] Rewrite each theme state as one labelled semantic→primitive remap (`@ds edit: tokens — theme
      remap`), keeping every resolved value identical. — light/dark/system semantic blocks relabelled;
      resolver confirms 0 changed values.
- [x] Consolidate the component-scoped dark sets so each component's remap is one `@ds surface:` +
      `@ds edit: tokens` block. — dark + system variants of `--model-sheet-*` / `--slash-*` fenced as
      labelled remap blocks (values kept literal for pixel-identity).
- [x] Confirm the theme bootstrap (`data-theme`, `<meta name="theme-color">` `#24221f`/`#f8f8f6`,
      `localStorage['pi-remote.theme']`) and the `ThemeControl` / `SessionHeader` toggles drive the
      three states without change. — confirmed read-only; no bootstrap file changed.
- [x] Verify WCAG AA contrast is guaranteed by the semantic→primitive mapping; extend
      `tests/contrast.test.tsx` only if a role pair is unguarded. — 5 unguarded pairs added, each hex
      matched to the real resolved token; all pass.
- [x] Capture true-390px light, dark, and system-resolved baselines and prove pixel-identity against
      the pre-migration baseline; record evidence in `checklist.md`. — resolver CHANGED 0 / MISSING 0;
      390px no-overflow all themes.
