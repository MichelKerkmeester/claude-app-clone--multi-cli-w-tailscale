<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Grandchild 2 — Light/dark theming & contrast

## Summary

This grandchild formalizes the light/dark theming mechanism on top of the token library: the
three theme states (explicit light, explicit dark, and system-follows-OS) each remap the semantic
role tokens onto the frozen primitive palette, and WCAG AA contrast is guaranteed at the token
layer rather than per-rule. It is value-preserving: every surface resolves to the same colour in
each theme as it does today.

## Problem & Goal

Theming works but is implicit. Light values sit on `:root`, dark values on
`:root[data-theme='dark']` and the duplicated `@media (prefers-color-scheme: dark)
:root[data-theme='system']` block, and component-scoped dark sets (`--model-sheet-*`, `--slash-*`)
repeat the same overrides. Nothing states that a theme is only a semantic→primitive remap, and
contrast is assumed rather than guaranteed by the token layer. The goal is to make the theming
mechanism explicit and documented — one remap per theme state, contrast owned by the
semantic→primitive mapping — so a designer can reason about and safely adjust theming without
hunting duplicated overrides.

## Scope

### In scope

- Documenting the three theme states as one semantic→primitive remap each, fenced with the `@ds`
  grammar (`@ds edit: tokens — theme remap`), covering `:root`, `:root[data-theme='dark']`, and
  `@media (prefers-color-scheme: dark) :root[data-theme='system']`.
- Consolidating the component-scoped dark sets (`--model-sheet-*`, `--slash-*`) so each component's
  theme remap reads as one labelled block.
- Confirming the theme bootstrap (`data-theme`, `<meta name="theme-color">`, `localStorage`) and the
  `ThemeControl` / `SessionHeader` toggle groups drive the three states correctly.
- Baking WCAG AA contrast into the semantic→primitive mapping so contrast is a property of the token
  layer; wiring `tests/contrast.test.tsx` as the guarantee.

### Out of scope

- Any change to the frozen source values in either theme, or to Inter + Source Serif 4.
- The primitive/semantic/component layering itself (grandchild `001` owns that).
- Any per-surface component migration — later grandchildren migrate the surfaces that consume the
  theming.
- Any security, redaction, ticketing, or plan-mode change.

## User-facing behavior + states

Three theme states, unchanged in appearance: explicit **light** (`data-theme='light'`), explicit
**dark** (`data-theme='dark'`), and **system** (`data-theme='system'` following
`prefers-color-scheme`). The `ThemeControl` and `SessionHeader` toggle groups switch between them,
`<meta name="theme-color">` tracks `#24221f` (dark) / `#f8f8f6` (light), and the choice persists in
`localStorage['pi-remote.theme']`. Every surface renders identically to today in each state.

## Acceptance criteria

- Each theme state is one labelled semantic→primitive remap; no component repeats a raw value that
  the semantic layer already owns.
- Every semantic token resolves to the same light and dark value as before; no rendered pixel
  changes in any of the three states.
- WCAG AA contrast is guaranteed by the semantic→primitive mapping and proven by
  `tests/contrast.test.tsx` in both themes.
- The theme bootstrap and both toggle groups drive the three states correctly.
- `npm run typecheck`, `npm test`, `npm run test:web`, and `npm run build` pass; the true-390px
  light/dark captures are visually identical to the pre-migration baseline.

## Security & Redaction

Styling-only. No logic, transport, redaction, ticket, plan-mode, or host-file path is touched; the
theme bootstrap in `App.tsx` is confirmed, not re-architected. No new dependency is added.

## Dependencies & affected areas

- Theming source: `apps/pi-remote-web/src/style.css` (the `:root`, `:root[data-theme='dark']`, and
  `@media (prefers-color-scheme: dark) :root[data-theme='system']` blocks, plus the component-scoped
  `--model-sheet-*` / `--slash-*` dark sets).
- Theme bootstrap (confirmed, not re-architected): `apps/pi-remote-web/src/App.tsx` (~L125–141:
  `document.documentElement.dataset.theme`, `<meta name="theme-color">`, `localStorage`),
  `apps/pi-remote-web/index.html` (`data-theme="system"`).
- Toggle surfaces: `ThemeControl` (`apps/pi-remote-web/src/App.tsx` ~L480) and the theme group in
  `apps/pi-remote-web/src/SessionHeader.tsx`.
- Contrast guarantee: `apps/pi-remote-web/tests/contrast.test.tsx`.
- Inbound: grandchild `001-tokens-foundation` (the token layers this theming remaps).
- Baseline evidence: `scripts/design-system-cdp.mjs` in all three theme states.
