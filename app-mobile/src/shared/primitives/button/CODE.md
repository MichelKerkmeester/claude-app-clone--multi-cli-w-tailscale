# button/: native control and interaction attributes

---

## 1. OVERVIEW

`button/` is a flat adapter package. [`button.svelte`](./button.svelte) renders one native `<button>`, narrows a few props for the app API and forwards the rest. It attaches the four actions from [`../a11y/interactions.ts`](../a11y/interactions.ts) and emits `data-disabled` from the `disabled` prop.

The story module is test-facing documentation. The package does not own CSS, layout or a second button implementation.

Current state:

- `type` defaults to `button` and accepts `button`, `submit` or `reset`.
- The wrapper forwards `class`, `disabled`, `onclick` and remaining HTML button attributes.
- The `children` snippet is rendered directly inside the native element.

---

## 2. ARCHITECTURE

```text
surface props and children
            |
            v
      button.svelte
            |
            +--> native <button> attributes and click behavior
            |
            `--> a11y interaction actions
                    |
                    v
             data-* state attributes
                    |
                    v
             consumer-owned CSS
```

The component is the only runtime layer. [`button.stories.ts`](./button.stories.ts) creates raw snippets and exercises the component without changing its implementation.

---

## 3. DIRECTORY TREE

This folder is flat. The complete direct-file inventory is below:

| File | Responsibility |
|---|---|
| [`button.svelte`](./button.svelte) | Native button component. |
| [`button.stories.ts`](./button.stories.ts) | Default, disabled and submit stories. |
| [`README.md`](./README.md) | User-facing API and accessibility contract. |
| [`CODE.md`](./CODE.md) | This implementation map. |

---

## 4. KEY FILES

| File | Responsibility |
|---|---|
| [`button.svelte`](./button.svelte) | Destructures the app props, spreads remaining button attributes and attaches `hover`, `press`, `focusVisible` and `focused`. |
| [`button.stories.ts`](./button.stories.ts) | Uses `createRawSnippet` to cover `Default`, `Disabled` and `Submit`. |
| [`../a11y/interactions.ts`](../a11y/interactions.ts) | Supplies the action implementations used by the component. |

---

## 5. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Inputs | Consumers supply `children`, optional `class`, native button props and `onclick`. |
| Native behavior | `button.svelte` keeps browser button semantics and forwards the remaining attributes. |
| Interaction state | The shared actions own event listeners and `data-*` state. |
| Styling | Consumers own dimensions, focus indicator, colors, motion and forced-color rules. |
| Ownership | Do not add a menu, dialog, selection model or feature-specific CSS here. |

Main flow:

```text
Props and children
        |
        v
destructure type, disabled, onclick and class
        |
        v
spread remaining HTML button attributes
        |
        +--> render children snippet
        |
        `--> attach interaction actions and data-disabled
```

Do not replace the actions with native CSS hover state. Do not change the default `type` without checking every form caller.

---

## 6. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| `button.svelte` | Default Svelte component | The app-wide native button adapter. |
| `Default` | Story | Renders a labeled button with default props. |
| `Disabled` | Story | Verifies disabled state forwarding. |
| `Submit` | Story | Verifies explicit submit type forwarding. |

---

## 7. VALIDATION

Run from the repository root:

```bash
node scripts/naming/scan-folder-docs.mjs
npm run typecheck -w @pi-remote/web
```

The scan must keep this folder covered with both documents and no unresolved references from them. The web typecheck must finish with exit code 0.

---

## 8. RELATED

- [`README.md`](./README.md)
- [Accessibility helper CODE map](../a11y/CODE.md)
- [Shared primitives CODE map](../CODE.md)
