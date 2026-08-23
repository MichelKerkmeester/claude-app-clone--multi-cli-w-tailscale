# menu/: root, portaled content and item adapters

---

## 1. OVERVIEW

`menu/` is a flat four-component package around Bits UI's `DropdownMenu`. [`menu.svelte`](./menu.svelte) binds the root state and registers `MENU_DISMISS_KEY`. [`menu-trigger.svelte`](./menu-trigger.svelte) and [`menu-item.svelte`](./menu-item.svelte) are thin prop and snippet adapters. [`menu-content.svelte`](./menu-content.svelte) owns the portaled content boundary, its element reference, outside hiding and the Tab capture.

The package leaves menu navigation and base dismissal to Bits UI. Its app-specific logic exists at the content boundary because the menu must remain focused and unrelated body content must be hidden while it is open.

Current state:

- The root exposes a bindable boolean `open` with `false` as the default.
- Content renders inside `DropdownMenu.Portal` and binds `contentEl` for the hiding session.
- Content captures Tab during the capture phase when the event target is inside the menu.
- No component CSS or surface sizing lives here.

---

## 2. ARCHITECTURE

```text
caller
  |
  v
menu.svelte (DropdownMenu.Root, open, MENU_DISMISS_KEY)
  |
  +--> menu-trigger.svelte -> DropdownMenu.Trigger
  |
  `--> menu-content.svelte -> DropdownMenu.Portal
                              |
                              +--> DropdownMenu.Content
                              |       |
                              |       +--> hideOutside(contentEl)
                              |       `--> capture Tab inside content
                              |
                              `--> menu-item.svelte -> DropdownMenu.Item
```

Bits UI supplies the `menu`, `menuitem`, arrow-navigation and base dismissal behavior. The wrapper supplies the app's outside-tree isolation and an internal dismiss callback exposed through context.

---

## 3. PACKAGE TOPOLOGY

```text
menu.svelte
   |
   +--> trigger adapter
   +--> content adapter --> a11y/aria-hide-outside.svelte.ts
   `--> item adapter
```

Allowed dependency direction:

```text
caller -> menu root -> menu parts -> bits-ui
                         |
                         `--> a11y hide helper
```

The content adapter may depend on the root's dismiss key and the shared a11y helper. Trigger and item adapters must remain thin. None of the menu parts owns layout CSS or a second keyboard-navigation implementation.

---

## 4. DIRECTORY TREE

This folder is flat. The complete direct-file inventory is below:

| File | Responsibility |
|---|---|
| [`menu.svelte`](./menu.svelte) | Root state and dismissal context. |
| [`menu-trigger.svelte`](./menu-trigger.svelte) | Trigger adapter. |
| [`menu-content.svelte`](./menu-content.svelte) | Portal, outside hiding and Tab guard. |
| [`menu-item.svelte`](./menu-item.svelte) | Item adapter. |
| [`README.md`](./README.md) | User-facing menu contract. |
| [`CODE.md`](./CODE.md) | This implementation map. |

---

## 5. KEY FILES

| File | Responsibility |
|---|---|
| [`menu.svelte`](./menu.svelte) | Declares and exports `MENU_DISMISS_KEY`, binds `open` and places a close callback in Svelte context. |
| [`menu-content.svelte`](./menu-content.svelte) | Binds the content element, starts `hideOutside`, captures Tab and renders the two internal dismiss boundaries around caller children. |
| [`menu-trigger.svelte`](./menu-trigger.svelte) | Forwards `DropdownMenu.Trigger` props and caller children. |
| [`menu-item.svelte`](./menu-item.svelte) | Forwards `DropdownMenu.Item` props and caller children. |

---

## 6. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Root state | `menu.svelte` owns the bindable `open` path. |
| Bits context | Trigger, content and items require the same `DropdownMenu.Root`. |
| Portal | `menu-content.svelte` owns the portaled content boundary and its element reference. |
| Focus | Bits UI owns menu navigation and trap behavior. The wrapper prevents Tab while focus is inside content. |
| Outside visibility | `hideOutside` owns temporary `aria-hidden` values for unrelated body elements. |
| Presentation | Consumers own menu placement styling, item size, highlights, motion and forced-color rules. |

Main flow:

```text
caller binds open
        |
        v
DropdownMenu.Root creates context
        |
        +--> trigger opens root
        |
        `--> content mounts in portal
                    |
                    +--> hide outside body content
                    +--> Bits traps and navigates focus
                    +--> wrapper captures Tab in content
                    `--> item selection or dismissal closes root
```

Do not render parts without the root. Do not remove the outside-hiding effect or Tab guard without replacing the same accessibility contract. Do not add component CSS here.

---

## 7. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| `Menu` | Default Svelte component | Root wrapper with bindable `open`. |
| `MenuTrigger` | Default Svelte component | Opens the menu through Bits UI. |
| `MenuContent` | Default Svelte component | Portaled menu boundary with focus and outside isolation. |
| `MenuItem` | Default Svelte component | One selectable menu item. |
| `MENU_DISMISS_KEY` | Symbol | Internal context key for the root close callback. |

---

## 8. VALIDATION

Run from the repository root:

```bash
node scripts/naming/scan-folder-docs.mjs
npm run typecheck -w @pi-remote/web
```

The scan must keep this folder covered with both documents and no unresolved references from them. The web typecheck must finish with exit code 0.

---

## 9. RELATED

- [`README.md`](./README.md)
- [Accessibility helper CODE map](../a11y/CODE.md)
- [Sheet CODE map](../sheet/CODE.md)
- [Choice CODE map](../choice/CODE.md)
