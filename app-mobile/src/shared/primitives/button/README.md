# Button

The one button primitive every surface presses. It keeps the element native and visually neutral while providing the shared pointer, press, focus, and disabled state contract that consuming surfaces style.

## What lives here

- **`button.svelte`** — the native `<button>` wrapper; forwards the standard button props, renders a `Snippet`, and applies the shared interaction actions.
- **`button.stories.ts`** — Storybook coverage for the default, disabled, and submit variants.

## Why it's shaped this way

- **One button contract.** Every surface reaches for the same native behavior instead of creating a local button with subtly different interaction states.
- **Touch-aware state.** `hover`, `press`, `focusVisible`, and `focused` write data attributes so a touch tap does not leave CSS `:hover` stuck.
- **Presentation stays with the consumer.** The primitive forwards `class` and ships no component CSS; the surface owns its visual treatment.

Structure and do-nots are in `CODE.md`.
