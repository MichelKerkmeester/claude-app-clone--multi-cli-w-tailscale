# Sheet

The bottom-sheet dialog family. These Bits-backed parts keep dialog semantics, overlay behavior, and outside-content hiding in one compositional boundary while consumers provide the sheet's layout and visual treatment.

## What lives here

- **`sheet.svelte`** — the `Dialog.Root` wrapper with bindable `open` state and sheet context.
- **`sheet-content.svelte`** — the portaled overlay and dialog content; it hides unrelated outside content while the sheet is open.
- **`sheet-title.svelte`** — the accessible `Dialog.Title` adapter with consumer-owned content.
- **`sheet-close.svelte`** — the `Dialog.Close` adapter with consumer-owned control markup.

## Why it's shaped this way

- **The root is the state boundary.** Consumers can bind the sheet's open state without duplicating dialog behavior.
- **Content carries the overlay contract.** The content part renders the overlay and uses `app-mobile/src/shared/primitives/a11y/aria-hide-outside.svelte.ts` to keep background content out of the accessibility tree.
- **Title and close stay semantic.** Thin adapters preserve Bits UI's dialog title and close behavior while the consuming surface owns presentation.

Structure and do-nots are in `CODE.md`.
