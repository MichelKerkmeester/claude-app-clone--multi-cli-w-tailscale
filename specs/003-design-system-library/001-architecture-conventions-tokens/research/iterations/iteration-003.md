# Iteration 003 — Lens: Radix Themes appearance/scale — what we borrow, what we reject

**Pass goal:** decide whether a pre-styled, `Theme`-configured library fits a single frozen stylesheet.

## Findings

- Radix Themes is a **pre-styled component library** designed to work out of the box with one
  global CSS import; theming is centralized in a runtime `<Theme>` component with props
  `accentColor`, `grayColor`, `radius`, `scaling` and `appearance` ([C2a]).
- **Dark mode is a first-class appearance**: `<Theme appearance="dark">` forces it, and class-based
  switching (`light`/`light-theme`/`dark`/`dark-theme`) integrates with `next-themes`. Live preview
  via `ThemePanel` ([C2b]).
- Composition is via layout primitives (`Flex`, `Text`, size/`gap`), not slots-as-classnames; the
  point is rendering-consistency, not a bespoke designer seam into a frozen stylesheet.

## Judge / reject

- The app already *is* the "designer-editable coded system" target and has a **frozen single
  stylesheet + bespoke ink-on-parchment tokens**. Adopting Radix Themes would import its token
  canon (accent/gray scales), replace the stylesheet, and put theming behind a React prop API —
  all three contradict the packet's constraints. **Rejected as a library.**
- **Borrowed** (cheap, constraint-compatible): (a) theme as a first-class concept — the app's
  `data-theme` attribute already is one; (b) dark mode = a single class/attribute switch; (c) a
  **live preview seam** → this is the catalog (`015-catalog-docs-preview`), the analogue of
  `ThemePanel` but derived from `@ds` labels, not a runtime panel.

## Implication for Pi Remote

- Keep react-aria as behaviour (Radix *primitives* would add a second behaviour layer; not needed).
- The `@ds theme`/catalog mechanism supplies the "retint and preview" Radix delivers via props,
  without a runtime Theme. Decision 2 guardrails standardize the a11y invariants instead of the
  library's defaults.

## Confirmed by
- <https://www.radix-ui.com/themes/docs> (fetched): pre-styled, `<Theme>`, `appearance`,
  `accentColor/grayColor/radius/scaling`, `ThemePanel`.
- <https://www.radix-ui.com/themes/docs/theme/dark-mode> (fetched): `appearance="dark"`, class
  switching, next-themes integration.
- Repo: `src/index.html` `<html data-theme="system">`; react-aria used directly throughout.