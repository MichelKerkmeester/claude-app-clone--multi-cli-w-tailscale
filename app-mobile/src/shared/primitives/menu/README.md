# Menu

The Bits-backed dropdown menu family. `Menu`, `MenuTrigger`, `MenuContent`, and `MenuItem` are compositional parts: none renders a usable menu alone, and every part needs the `Menu` root ancestor.

## What lives here

- **`menu.svelte`** — the `DropdownMenu.Root` wrapper with bindable `open` state and the `MENU_DISMISS_KEY` context used by nested parts.
- **`menu-trigger.svelte`** — the Bits UI trigger adapter; consumers provide the trigger presentation.
- **`menu-content.svelte`** — the portaled content adapter; it keeps focus in the open menu and hides unrelated outside content from assistive technology.
- **`menu-item.svelte`** — the Bits UI item adapter; consumers provide the item presentation.

## Why it's shaped this way

- **The root owns composition.** Shared context lets content and items dismiss the menu without prop drilling or a second open-state path.
- **Bits UI owns menu semantics.** The wrappers preserve keyboard navigation and assistive-technology behavior while keeping the app-facing API small.
- **Outside content is hidden while open.** The content part uses `app-mobile/src/shared/primitives/a11y/aria-hide-outside.svelte.ts` so an open menu does not leave background content in the accessibility tree.

Structure and do-nots are in `CODE.md`.
