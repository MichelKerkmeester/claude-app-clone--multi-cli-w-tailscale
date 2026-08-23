# Accessibility helpers

The accessibility support shared by the primitive families: the outside-hiding helper for open overlays and the interaction actions that carry hover, press, and focus-visible state. These exist because the primitive library underneath does not supply the app's full accessibility contract, and losing them silently regresses it.

## What lives here

- **`aria-hide-outside.svelte.ts`** — `hideOutside`, `setSheetContext`, and `getSheetContext`; manages nested hiding sessions, live-region exemptions, and restoration of owned `aria-hidden` attributes.
- **`interactions.ts`** — the `hover`, `press`, `focusVisible`, and `focused` Svelte actions that expose interaction state through `data-*` attributes.

## Why it's shaped this way

- **Open overlays isolate assistive technology.** `hideOutside` keeps content outside a menu or sheet out of the accessibility tree and restores the attributes it changed when the session ends.
- **Interaction state is pointer-aware.** The actions distinguish touch from hover and track pointer and keyboard press state, so consumer styles behave correctly on phones and keyboards.
- **The helpers stay below the primitives.** Menu, sheet, and button wrappers share one implementation instead of each inventing a partial accessibility fix.

Structure and do-nots are in `CODE.md`.
