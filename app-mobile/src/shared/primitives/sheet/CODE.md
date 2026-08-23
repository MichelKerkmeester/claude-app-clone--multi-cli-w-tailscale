# `sheet/` — structure & logic

Editor map. For *what/why*, see `README.md`.

## Shape

- **`sheet.svelte`** — wraps `Dialog.Root`, binds `open`, and registers the sheet's `isOpen` context through `setSheetContext`.
- **`sheet-content.svelte`** — renders `Dialog.Overlay` and `Dialog.Content` in a `Dialog.Portal`, accepts `overlayClass`, and calls `hideOutside` for the content and overlay while open.
- **`sheet-title.svelte`** — wraps `Dialog.Title` and forwards the consumer's `children` snippet and title props.
- **`sheet-close.svelte`** — wraps `Dialog.Close` and forwards the consumer's `children` snippet and close props.

## Do-not

- **Don't render sheet parts without `sheet.svelte`.** The parts rely on the `Dialog.Root` context and the sheet open-state context.
- **Don't remove the overlay or `hideOutside` effect.** An open sheet must provide the modal backdrop and hide unrelated content from assistive technology.
- **Don't replace the title or close adapters with local dialog behavior.** Keep Bits UI responsible for dialog semantics and interaction.
- **Don't add component CSS here.** The consuming surface owns sheet placement, sizing, and visual styling.
