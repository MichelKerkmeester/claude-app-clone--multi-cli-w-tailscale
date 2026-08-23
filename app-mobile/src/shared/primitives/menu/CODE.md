# `menu/` — structure & logic

Editor map. For *what/why*, see `README.md`.

## Shape

- **`menu.svelte`** — wraps `DropdownMenu.Root`, binds `open`, and provides `MENU_DISMISS_KEY` for descendant dismissal.
- **`menu-trigger.svelte`** — wraps `DropdownMenu.Trigger` and forwards the consumer's `children` snippet and remaining trigger props.
- **`menu-content.svelte`** — renders `DropdownMenu.Content` in a `DropdownMenu.Portal`, binds its element, calls `hideOutside`, and captures Tab while focus is inside the menu.
- **`menu-item.svelte`** — wraps `DropdownMenu.Item` and forwards the consumer's `children` snippet and item props.

## Do-not

- **Don't render a menu part without `menu.svelte`.** The trigger, content, and item depend on the root's Bits UI context and dismissal context.
- **Don't remove the content focus guard or `hideOutside`.** The open menu must keep keyboard focus scoped and keep unrelated content out of the accessibility tree.
- **Don't reimplement menu keyboard or dismissal behavior in consumers.** Pass props and snippets through the wrappers so Bits UI remains the behavior owner.
- **Don't add component CSS here.** Menu surfaces own their layout and visual styling.
