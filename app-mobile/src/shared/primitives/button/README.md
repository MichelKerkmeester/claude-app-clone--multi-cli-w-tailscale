# Button

> A native button wrapper with shared pointer, press, focus and disabled state attributes for every app surface.

---

## 1. OVERVIEW

[`button.svelte`](./button.svelte) gives feature code one button entrypoint without hiding the browser's native button contract. It defaults `type` to `button`, forwards standard button attributes and events, renders a Svelte child snippet and attaches the shared interaction actions.

The component is visually neutral. A consuming surface passes its class and owns dimensions, colors, focus treatment, motion and forced-color behavior. [`button.stories.ts`](./button.stories.ts) covers the default, disabled and submit cases.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Rendered element | Native `<button>` |
| Default type | `button` |
| Interaction attributes | Five state attributes including `data-disabled` |
| Component CSS | None |

---

## 2. FEATURES

### Key Features

| Feature | What It Does |
|---|---|
| Native semantics | Keeps the browser button role, keyboard activation, disabled behavior and form integration. |
| Bindable interaction state | Publishes `data-hovered`, `data-pressed`, `data-focus-visible`, `data-focused` and `data-disabled` for consumer styles. |
| Attribute pass-through | Forwards `class`, `type`, `disabled`, `onclick` and the remaining button attributes. |
| Composable content | Renders the caller's `children` snippet without imposing markup or visual treatment. |

### Accessibility Contract

| Concern | Guaranteed here | Caller must supply |
|---|---|---|
| Roles | The native element exposes the button role and native name calculation. | An accessible name through text or an appropriate label when the content is non-text. |
| Focus movement | The browser handles normal button focus and keyboard activation. | Any roving focus, focus trap or focus restoration required by the containing widget. |
| Dismissal | None. A button click calls the supplied `onclick` handler. | Overlay or menu close behavior when the button is a dismissal control. |
| Hit target | None. The component has no CSS or minimum size. | At least the surface's required touch target and a visible focus indicator. |
| Reduced motion | None. The component does not animate. | Transition and animation changes under `prefers-reduced-motion`. |
| Forced colors | None. The component does not set colors. | Contrast, border and focus styling that remains visible in forced-colors mode. |

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Child content | A `children` snippet | The wrapper does not create a label or icon for the caller. |
| Form usage | An explicit `type` when the button is inside a form and should submit or reset | The default is `button` to avoid accidental submission. |
| Visual state styles | Selectors for the emitted `data-*` attributes | The primitive itself remains unstyled. |

---

## 4. STRUCTURE

| File | Purpose |
|---|---|
| [`button.svelte`](./button.svelte) | Native button adapter, prop forwarding and interaction action attachment. |
| [`button.stories.ts`](./button.stories.ts) | Storybook examples for default, disabled and submit behavior. |
| [`CODE.md`](./CODE.md) | Implementation flow and ownership boundaries. |

---

## 5. CONFIGURATION

| Prop | Default | Purpose |
|---|---|---|
| `type` | `button` | Selects native button, submit or reset behavior. |
| `disabled` | Unset | Disables the native control and emits `data-disabled="true"`. |
| `class` | Unset | Passes the surface's visual class to the native button. |
| `onclick` | Unset | Handles the browser `MouseEvent` from activation. |
| Remaining button attributes | Browser defaults | Preserve labels, form associations, keyboard hints and other HTML behavior. |

---

## 6. USAGE EXAMPLES

Use an explicit type for a form action and style the primitive from the caller:

```svelte
<script lang="ts">
  import Button from './button.svelte'
</script>

<Button class="save-action" type="submit" disabled={busy} onclick={save}>
  Save changes
</Button>
```

For an icon-only control, supply an accessible name and a caller-owned hit target:

```svelte
<Button class="icon-button" aria-label="Close panel" onclick={closePanel}>
  <span aria-hidden="true">×</span>
</Button>
```

---

## 7. TROUBLESHOOTING

| What You See | Cause | Fix |
|---|---|---|
| The button submits a form unexpectedly | The native form default was used by a caller expecting a plain action. | Set `type="button"` explicitly. |
| The button has no visible styling | This primitive ships no CSS. | Add a surface class and style the state attributes from the caller. |
| Touch hover remains stuck | The surface uses native `:hover` instead of the action state. | Style `data-hovered`, which ignores touch hover. |
| Keyboard focus is hard to see | The primitive only publishes focus state. | Add a caller-owned `data-focus-visible` outline that also works in forced colors. |
| Disabled styling does not appear | The consumer is not selecting `data-disabled`. | Add a selector for `data-disabled` and keep the native `disabled` prop bound. |
| A small icon is difficult to tap | The primitive has no minimum dimensions. | Increase the caller's inline and block size to the surface target. |

---

## 8. FAQ

**Q: Why use this instead of writing a native button directly?**

A: It preserves the native element while giving every surface the same pointer-aware interaction state contract.

**Q: Does the component add a default class or design token?**

A: No. It forwards the caller's class and leaves presentation at the surface boundary.

**Q: Does `data-disabled` replace the native `disabled` attribute?**

A: No. The native attribute controls behavior. `data-disabled` gives consumer CSS a stable state hook.

---

## 9. RELATED RESOURCES

| Document | Purpose |
|---|---|
| [`CODE.md`](./CODE.md) | Button source flow and entrypoints. |
| [Accessibility helpers README](../a11y/README.md) | Interaction action behavior and caller limits. |
| [Shared primitives README](../README.md) | Rules for all shared controls. |
| [Disclosure README](../disclosure/README.md) | A stateful Bits UI control that uses a different semantic contract. |
