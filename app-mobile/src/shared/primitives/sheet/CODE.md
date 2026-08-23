# sheet/: dialog root, overlay and semantic parts

---

## 1. OVERVIEW

`sheet/` is a flat four-component adapter package around Bits UI's `Dialog`. [`sheet.svelte`](./sheet.svelte) binds `open` and registers the sheet context. [`sheet-content.svelte`](./sheet-content.svelte) renders `Dialog.Overlay` and `Dialog.Content` inside `Dialog.Portal`, binds both elements and starts outside hiding while open. [`sheet-title.svelte`](./sheet-title.svelte) and [`sheet-close.svelte`](./sheet-close.svelte) forward the semantic dialog parts.

The runtime package owns dialog structure and accessibility behavior. It does not own bottom placement, panel dimensions, overlay colors, hit targets or motion styling.

Current state:

- `Dialog.Content` receives the caller's props, including focus and dismissal overrides.
- `sheet-content.svelte` calls `hideOutside([contentEl, overlayEl])` only when the sheet context reports open.
- `overlayClass` is applied to `Dialog.Overlay`. The remaining props are forwarded to `Dialog.Content`.

---

## 2. ARCHITECTURE

```text
caller
  |
  v
sheet.svelte (Dialog.Root, open, sheet context)
  |
  `--> sheet-content.svelte (Dialog.Portal)
          |
          +--> Dialog.Overlay -> overlayClass
          |
          `--> Dialog.Content -> caller class and children
                    |
                    +--> hideOutside(contentEl, overlayEl)
                    +--> Bits focus scope and dismissal
                    +--> sheet-title.svelte -> Dialog.Title
                    `--> sheet-close.svelte -> Dialog.Close
```

Bits UI provides the dialog role, modal state, focus scope, Escape handling and outside interaction. The app package adds the sheet open-state context and outside-tree hiding for both visible targets.

---

## 3. PACKAGE TOPOLOGY

```text
sheet root -> content boundary -> Dialog overlay/content
                                  |
                                  +--> title adapter
                                  +--> close adapter
                                  `--> a11y/aria-hide-outside.svelte.ts
```

Allowed dependency direction:

```text
caller -> sheet root -> sheet parts -> bits-ui
                         |
                         `--> a11y hide helper
```

The content adapter may coordinate the root context and shared a11y helper. Title and close adapters remain thin. Placement, interaction copy, gesture policy and visual state belong to the caller.

---

## 4. DIRECTORY TREE

This folder is flat. The complete direct-file inventory is below:

| File | Responsibility |
|---|---|
| [`sheet.svelte`](./sheet.svelte) | Root open state and sheet context. |
| [`sheet-content.svelte`](./sheet-content.svelte) | Portal, overlay, content and outside hiding. |
| [`sheet-title.svelte`](./sheet-title.svelte) | Dialog title adapter. |
| [`sheet-close.svelte`](./sheet-close.svelte) | Dialog close adapter. |
| [`README.md`](./README.md) | User-facing sheet contract. |
| [`CODE.md`](./CODE.md) | This implementation map. |

---

## 5. KEY FILES

| File | Responsibility |
|---|---|
| [`sheet.svelte`](./sheet.svelte) | Destructures `open`, registers `setSheetContext` and binds the Bits dialog root. |
| [`sheet-content.svelte`](./sheet-content.svelte) | Tracks content and overlay element references, starts the open-session hide and forwards content props. |
| [`sheet-title.svelte`](./sheet-title.svelte) | Passes caller children and title props to `Dialog.Title`. |
| [`sheet-close.svelte`](./sheet-close.svelte) | Passes caller children and close props to `Dialog.Close`. |

---

## 6. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Root state | `sheet.svelte` owns the bindable `open` value and the `SHEET_CONTEXT` getter. |
| Dialog context | Content, title and close parts require the same `Dialog.Root`. |
| Portal | `sheet-content.svelte` owns the overlay and content mount points. |
| Focus and dismissal | Bits UI owns the default focus scope, Escape and outside interaction. Caller props may override them. |
| Outside visibility | The shared helper hides unrelated body elements while both target references exist and the root is open. |
| Presentation | Callers own bottom placement, sizing, overlay color, hit targets, motion and forced-color rules. |

Main flow:

```text
caller binds open
        |
        v
Dialog.Root registers sheet context
        |
        v
Dialog.Portal mounts overlay and content
        |
        +--> content and overlay refs become available
        +--> open context enables hideOutside
        +--> Bits UI traps focus and handles dismissal
        `--> title and close adapters render caller snippets
```

Do not mount content without the root context. Do not remove the overlay or outside-hiding effect without replacing the same modal accessibility contract. Do not add placement or component CSS here.

---

## 7. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| `Sheet` | Default Svelte component | Bindable dialog root. |
| `SheetContent` | Default Svelte component | Portaled modal content and overlay boundary. |
| `SheetTitle` | Default Svelte component | Accessible dialog title adapter. |
| `SheetClose` | Default Svelte component | Dialog close trigger adapter. |

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
- [Menu CODE map](../menu/CODE.md)
- [Shared primitives CODE map](../CODE.md)
