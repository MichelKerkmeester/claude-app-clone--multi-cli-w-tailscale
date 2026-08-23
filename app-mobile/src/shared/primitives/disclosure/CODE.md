# disclosure/: collapsible root and heading boundary

---

## 1. OVERVIEW

`disclosure/` is a flat two-file package. [`collapsible.svelte`](./collapsible.svelte) is the only runtime component. It binds the Bits UI root's `open` state, places the caller's trigger snippet inside `h3` and renders the caller's body through `Collapsible.Content`. [`collapsible.stories.ts`](./collapsible.stories.ts) supplies raw trigger and paragraph snippets for the two state examples.

The wrapper owns composition and the heading boundary. Bits UI owns open-state, trigger semantics and content visibility. The caller owns all visual styling and motion.

---

## 2. ARCHITECTURE

```text
caller trigger and body snippets
              |
              v
       collapsible.svelte
              |
              +--> h3 -> Collapsible.Trigger
              |
              `--> Collapsible.Content
                         |
                         v
                    Bits UI state
```

The root binds `open` once. The trigger and content receive their shared context from that root, so there is no second state path in the package.

---

## 3. DIRECTORY TREE

This folder is flat. The complete direct-file inventory is below:

| File | Responsibility |
|---|---|
| [`collapsible.svelte`](./collapsible.svelte) | Runtime disclosure adapter. |
| [`collapsible.stories.ts`](./collapsible.stories.ts) | Collapsed and expanded stories. |
| [`README.md`](./README.md) | User-facing disclosure contract. |
| [`CODE.md`](./CODE.md) | This implementation map. |

---

## 4. KEY FILES

| File | Responsibility |
|---|---|
| [`collapsible.svelte`](./collapsible.svelte) | Narrows root props, binds `open`, renders the fixed `h3` trigger boundary and mounts content. |
| [`collapsible.stories.ts`](./collapsible.stories.ts) | Uses `createRawSnippet` to exercise closed and open states. |

---

## 5. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Inputs | Caller supplies `open`, `trigger`, `children` and remaining Bits root props. |
| Root context | `Collapsible.Root` connects trigger and content behavior. |
| Heading structure | The wrapper always creates the `h3` around the trigger. |
| Visibility | Bits UI owns expanded state and content visibility. |
| Presentation | Caller owns spacing, hit target, state styling, transitions and forced-color rules. |

Main flow:

```text
caller snippets and open state
             |
             v
    Collapsible.Root bind:open
             |
             +--> h3 -> Collapsible.Trigger -> trigger snippet
             |
             `--> Collapsible.Content -> body snippet
```

Do not extract the trigger or content from the root context. Do not add a second open-state controller. Do not add component CSS here.

---

## 6. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| `collapsible.svelte` | Default Svelte component | Bindable disclosure with a fixed `h3` trigger boundary. |
| `Collapsed` | Story | Verifies the closed state. |
| `Expanded` | Story | Verifies the open state. |

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
- [Shared primitives CODE map](../CODE.md)
- [Accessibility helper CODE map](../a11y/CODE.md)
- [Button CODE map](../button/CODE.md)
