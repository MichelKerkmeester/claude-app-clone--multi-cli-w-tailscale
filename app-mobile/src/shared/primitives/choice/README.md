# Choice

> Single-selection radio and toggle groups that keep Bits UI semantics while letting each surface render its own options.

---

## 1. OVERVIEW

The choice family offers two compositional controls for selecting one value from a set. [`radio-group.svelte`](./radio-group.svelte) and [`radio-group-item.svelte`](./radio-group-item.svelte) preserve Bits UI radio-group semantics. [`toggle-group.svelte`](./toggle-group.svelte) fixes the Bits UI toggle root to single selection and renders its root with `role="radiogroup"`. [`toggle-group-item.svelte`](./toggle-group-item.svelte) adapts each option.

The roots expose a bindable string value. Bits UI owns selection state, item roles and keyboard movement. The caller owns labels, option content, visual selected state, hit targets and any host-side request that follows a selection.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Families | Radio group and single-select toggle group |
| Value model | One bindable string per group |
| Selection model | Exclusive, never multi-select in this wrapper |
| Component CSS | None |

---

## 2. FEATURES

### Key Features

| Feature | What It Does |
|---|---|
| Radio semantics | Keeps Bits UI's `radiogroup` root, radio items and checked state. |
| Single toggle semantics | Exposes a toggle-group API while fixing the root to `type="single"` and `role="radiogroup"`. |
| Bindable selection | Lets a surface control or observe the selected string through `bind:value`. |
| Composable options | Passes item props and caller snippets through without embedding option markup or CSS. |

### Accessibility Contract

| Concern | Guaranteed here | Caller must supply |
|---|---|---|
| Roles | Radio roots and items preserve Bits UI radio semantics. The toggle root explicitly exposes `radiogroup`. | A group name through an accessible label and an accessible name or visible label for every item. |
| Focus movement | Bits UI provides roving focus and arrow-key movement within each group. | A surrounding focus order when the group sits inside a larger composite widget. |
| Dismissal | None. Selecting an item does not close the group. | Any menu, sheet or host request that should happen after selection. |
| Hit target | No minimum size or option layout is emitted. | At least the surface's touch target for every item and a visible selected and focus state. |
| Reduced motion | No transition or animation is defined. | Motion changes when selection styles animate under `prefers-reduced-motion`. |
| Forced colors | No color or contrast rule is defined. | Selected, disabled and focus states that remain distinguishable in forced-colors mode. |

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Composition | One matching group root around its item components | An item outside its root has no group context or selection behavior. |
| Values | A distinct string `value` for each option | The root binds one selected value. |
| Group labeling | `aria-label`, `aria-labelledby` or an equivalent visible label on the root | Bits UI supplies the group role but cannot invent the product label. |
| Surface response | A caller handler when selection must update remote or host state | The wrapper only changes the bound value and forwards Bits UI events. |

---

## 4. STRUCTURE

| File | Purpose |
|---|---|
| [`radio-group.svelte`](./radio-group.svelte) | Bindable `RadioGroup.Root` adapter. |
| [`radio-group-item.svelte`](./radio-group-item.svelte) | `RadioGroup.Item` adapter for one option. |
| [`toggle-group.svelte`](./toggle-group.svelte) | Single-select `ToggleGroup.Root` adapter with a `radiogroup` root snippet. |
| [`toggle-group-item.svelte`](./toggle-group-item.svelte) | `ToggleGroup.Item` adapter for one option. |
| [`CODE.md`](./CODE.md) | Package topology and selection flow. |

---

## 5. CONFIGURATION

| Prop or behavior | Default | Purpose |
|---|---|---|
| `value` | Empty string | The bindable selected option. |
| Root props | Bits UI defaults | Forward labels, disabled or read-only state, orientation and value-change callbacks. |
| Item props | Bits UI defaults | Forward each option's value, disabled state, label attributes and item handlers. |
| Toggle root `type` | `single` | Fixed by `toggle-group.svelte`, so the wrapper cannot become a multi-select group. |
| Toggle root role | `radiogroup` | Added by the wrapper's root snippet. |

---

## 6. USAGE EXAMPLES

A radio group keeps the root and items together and labels each option:

```svelte
<RadioGroup bind:value={effort} aria-label="Thinking effort">
  <RadioGroupItem value="low" aria-label="Low effort">Low</RadioGroupItem>
  <RadioGroupItem value="high" aria-label="High effort">High</RadioGroupItem>
</RadioGroup>
```

A toggle group uses the same one-value model for a compact mode switch:

```svelte
<ToggleGroup bind:value={mode} aria-label="Agent mode">
  <ToggleGroupItem value="plan">Plan</ToggleGroupItem>
  <ToggleGroupItem value="build">Build</ToggleGroupItem>
</ToggleGroup>
```

Style the item class from the consuming surface. The wrapper does not decide how selected, disabled or focus-visible options look.

---

## 7. TROUBLESHOOTING

| What You See | Cause | Fix |
|---|---|---|
| An item does not respond | The item is outside its matching root or the value is missing. | Place it inside the correct group and pass a distinct string value. |
| The toggle group cannot select several values | The wrapper intentionally fixes `type` to `single`. | Use separate groups for separate choices or a different control family for multi-select. |
| Arrow keys do not move between options | A caller replaced the item element or interrupted Bits UI handlers. | Keep the item adapter intact and pass presentation through its child snippet. |
| The selection changes back after a click | Host state is restoring the bound value while a request is pending. | Keep the host-confirmed value and pending state explicit in the caller. |
| Options are hard to tap | The wrapper adds no size or padding. | Give every item a caller-owned touch target. |
| Selected state is invisible | The wrapper exposes semantics but no CSS. | Style the Bits state attributes and add a forced-colors-safe selected indicator. |

---

## 8. FAQ

**Q: Does `toggle-group.svelte` support multiple selected values?**

A: No. It is intentionally a single-value adapter and renders a `radiogroup` root.

**Q: Does the wrapper submit or persist a selection?**

A: No. It binds the selected string and forwards Bits UI events. The caller decides what a selection means to the host.

**Q: Who owns option styling?**

A: The surface that supplies the item snippet and class. The primitive stays unstyled.

---

## 9. RELATED RESOURCES

| Document | Purpose |
|---|---|
| [`CODE.md`](./CODE.md) | Root and item arrangement, boundaries and entrypoints. |
| [Button README](../button/README.md) | Native action control used beside choice groups. |
| [Menu README](../menu/README.md) | Dismissible command selection with different roles. |
| [Shared primitives README](../README.md) | Family-wide styling and accessibility rules. |
