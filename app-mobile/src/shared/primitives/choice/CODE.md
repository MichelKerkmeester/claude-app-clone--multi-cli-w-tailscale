# choice/: radio and single-toggle adapters

---

## 1. OVERVIEW

`choice/` is a four-file adapter package with two root and item pairs. [`radio-group.svelte`](./radio-group.svelte) binds the selected value to `RadioGroup.Root`. [`radio-group-item.svelte`](./radio-group-item.svelte) forwards one `RadioGroup.Item`. [`toggle-group.svelte`](./toggle-group.svelte) narrows `ToggleGroup.Root` to `type="single"` and supplies a root snippet with `role="radiogroup"`. [`toggle-group-item.svelte`](./toggle-group-item.svelte) forwards one `ToggleGroup.Item`.

The wrappers do not duplicate selection state or keyboard logic. Bits UI receives the root props and item props, creates the group context and owns roving focus. Consumer snippets own the option DOM inside each item.

Current state:

- Both roots expose a bindable string `value` with an empty-string default.
- Radio items and toggle items require the matching Bits UI root above them.
- The package has no CSS and no host-side persistence or request handling.

---

## 2. ARCHITECTURE

```text
caller value and root props
             |
       +-----+-----+
       |           |
       v           v
radio-group    toggle-group
       |           |
       v           v
radio-group-   toggle-group-
item           item
       |           |
       +-----+-----+
             |
             v
          Bits UI
   roles, checked state and roving focus
```

`toggle-group.svelte` is the only wrapper that changes the underlying shape. Its `root` snippet renders a `div` with `role="radiogroup"` and places the caller's item children inside it. The radio root delegates its root element directly to Bits UI.

---

## 3. PACKAGE TOPOLOGY

The package has two repeated layers:

```text
root adapters -> Bits UI group context -> item adapters -> caller snippets
```

Allowed dependency direction:

```text
caller -> root or item wrapper -> bits-ui
```

The item wrappers must not import or recreate root state. The root wrappers must not render option presentation. Selection side effects belong to the caller that binds `value` or handles the forwarded value-change event.

---

## 4. DIRECTORY TREE

This folder is flat. The complete direct-file inventory is below:

| File | Responsibility |
|---|---|
| [`radio-group.svelte`](./radio-group.svelte) | Radio root and bindable value. |
| [`radio-group-item.svelte`](./radio-group-item.svelte) | Radio item adapter. |
| [`toggle-group.svelte`](./toggle-group.svelte) | Single-select toggle root and radiogroup wrapper. |
| [`toggle-group-item.svelte`](./toggle-group-item.svelte) | Toggle item adapter. |
| [`README.md`](./README.md) | User-facing control contract. |
| [`CODE.md`](./CODE.md) | This implementation map. |

---

## 5. KEY FILES

| File | Responsibility |
|---|---|
| [`radio-group.svelte`](./radio-group.svelte) | Omits the Bits `value`, `child` and `children` props from the app-facing type, then binds `value` and renders the caller snippet. |
| [`radio-group-item.svelte`](./radio-group-item.svelte) | Omits Bits child plumbing and renders the caller snippet inside `RadioGroup.Item`. |
| [`toggle-group.svelte`](./toggle-group.svelte) | Extracts single-select root props, fixes `type="single"` and renders the `radiogroup` root snippet. |
| [`toggle-group-item.svelte`](./toggle-group-item.svelte) | Renders the caller snippet inside `ToggleGroup.Item`. |

---

## 6. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Root inputs | Caller supplies `value`, labels, disabled or read-only state and any Bits root props. |
| Item inputs | Caller supplies a distinct `value`, item attributes and the option snippet. |
| Bits behavior | Bits UI owns group context, role state, checked state and roving focus. |
| Toggle constraint | `toggle-group.svelte` always creates a single-select group and a `radiogroup` root. |
| Presentation | Caller owns item layout, selected state styling, hit targets, motion and forced-color treatment. |
| Side effects | Caller owns persistence or host requests after the bound value changes. |

Main flow:

```text
caller binds value and passes root props
                |
                v
       root wrapper binds value
                |
                v
       Bits UI creates group context
                |
                v
      item wrapper passes value and props
                |
                v
          Bits item state
      checked state and roving focus
                |
                v
       caller snippet and surface CSS
```

Do not mount an item without its root. Do not turn the toggle wrapper into a multiple-selection API. Do not intercept Bits UI keyboard handlers to implement a second selection model.

---

## 7. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| `radio-group.svelte` | Default Svelte component | Single-value radio root. |
| `radio-group-item.svelte` | Default Svelte component | One radio option inside its root. |
| `toggle-group.svelte` | Default Svelte component | Single-value toggle root with a radiogroup role. |
| `toggle-group-item.svelte` | Default Svelte component | One toggle option inside its root. |

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
- [Shared primitives CODE map](../CODE.md)
- [Disclosure documentation](../disclosure/README.md)
- [Menu CODE map](../menu/CODE.md)
