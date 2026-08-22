# Shared UI primitives

The small set of **accessible, visually-neutral interaction primitives** every screen builds on. This folder is the single home for the app's accessibility contract — roles, keyboard behaviour, focus management, and dismissal — so feature code never re-implements it and can't quietly get it wrong.

## What lives here

Two families:

- **`Button`** — the one hand-rolled primitive: a native `<button>` plus four interaction-state actions. It backs the great majority of tappable controls in the app.
- **Bits UI wrappers** — thin adapters over [`bits-ui`](https://bits-ui.com) that give each interactive pattern a small, app-shaped API: `Sheet` (Dialog), `Menu` (DropdownMenu), `RadioGroup`, `ToggleGroup`, `Collapsible`.

Plus two support modules: `interactions.ts` (the Button's actions) and `ariaHideOutside.svelte.ts` (hides background content from assistive tech while an overlay is open).

## Why it exists

The migration off `react-aria-components` needed a Svelte home for the exact accessibility guarantees react-aria used to provide. Concentrating them here means:

- **One place to get a11y right.** Focus order and trap, `aria-*` roles, ≥44px hit targets, keyboard activation, reduced-motion and forced-colors — all decided here, inherited everywhere.
- **Primitives stay unstyled.** They render structure and behaviour only; the *consumer* passes a `class` and owns the look. That keeps the design system's tokens and each surface's CSS co-located with the surface, not buried in a shared component.
- **Touch correctness.** Hover/press/focus states are driven by pointer-aware actions, not CSS `:hover` — a plain `:hover` sticks after a tap on a touchscreen, which is wrong for a phone-first app.

## Editing rules (the short version)

- These are guardrailed: a change here ripples to every screen. Preserve roles, focus behaviour, and the `data-*` state attributes.
- Don't add component CSS here — style states from the *consuming* component via `:global([data-hovered])` etc.
- Never swap the interaction actions for native `:hover`/`:focus`.

Structure, the state-attribute contract, and the per-file map are in **`CODE.md`**.
