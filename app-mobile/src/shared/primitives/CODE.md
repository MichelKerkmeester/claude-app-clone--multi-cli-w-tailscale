# `shared/primitives/` — structure & logic

Editor-facing map of this folder. For *what it's for and why*, see `README.md`.

## File map

| File | Wraps | Role |
|------|-------|------|
| `button.svelte` | — (native `<button>`) | The hand-rolled primitive; applies the four interaction actions. |
| `interactions.ts` | — | The `hover` / `press` / `focusVisible` / `focused` Svelte actions. |
| `sheet.svelte` · `sheet-content.svelte` · `sheet-title.svelte` · `sheet-close.svelte` | `bits-ui` `Dialog` | Modal sheet family. `SheetContent` wires `ariaHideOutside`. |
| `menu.svelte` · `menu-trigger.svelte` · `menu-content.svelte` · `menu-item.svelte` | `bits-ui` `DropdownMenu` | Dropdown menu family. `Menu` exports `MENU_DISMISS_KEY`. |
| `radio-group.svelte` · `radio-group-item.svelte` | `bits-ui` `RadioGroup` | Single-select group. |
| `toggle-group.svelte` · `toggle-group-item.svelte` | `bits-ui` `ToggleGroup` | Segmented toggle. |
| `collapsible.svelte` | `bits-ui` `Collapsible` | Disclosure. |
| `aria-hide-outside.svelte.ts` | — | Ref-counted AT-tree hider for open overlays. |

## Two patterns

**A. Native button + actions (`button.svelte`).** A plain `<button>` that spreads `...rest`, forwards `class`/`type`/`disabled`/`onclick`, and applies `use:hover use:press use:focusVisible use:focused`. Each action (in `interactions.ts`) sets a `data-*` attribute on the element; the button itself ships **no CSS**. `data-disabled` is emitted directly from the `disabled` prop.

**B. Bits UI wrapper (all the rest).** A thin `.svelte` that imports one symbol from `bits-ui`, exposes an app-shaped `Props`, threads `open`/`value` via `$bindable(...)`, spreads `...rest` to the underlying part, and renders `{@render children()}`. No behaviour is re-implemented — the wrapper only narrows the surface and names it for this app. Cross-component coordination uses `Symbol` context keys (e.g. `MENU_DISMISS_KEY`) so a consumer can dismiss without prop-drilling.

## The `data-*` state contract

The actions set these attributes; **consuming components style them** from their own scoped `<style>` via `:global([data-…])`. This is the load-bearing convention — the primitive stays unstyled, the surface owns the look.

| Attribute | Set when | react-aria parity |
|-----------|----------|-------------------|
| `data-hovered` | pointer over, **non-touch only** | `useHover` |
| `data-pressed` | primary pointer held (or Enter/Space) | `usePress` |
| `data-focus-visible` | focused **and** `:focus-visible` matches (keyboard) | `useFocusRing` |
| `data-focused` | focused, any modality | react-aria `data-focused` |
| `data-disabled` | `disabled` prop is set | — |

## Do-not

- **Never** replace the actions with CSS `:hover`/`:focus` — a touch tap leaves `:hover` stuck on this mobile surface; the pointer-type guard in `hover` is exactly why the action exists.
- **Never** rename or drop a `data-*` attribute — consuming `<style>` blocks and tests target them by name.
- **No component CSS in this folder** — primitives are unstyled pass-throughs; the styling home is the consumer.
- Bits wrappers must stay thin — don't fork bits-ui behaviour here; if a real gap exists, wrap, don't reimplement.
