# Menu

> A compositional Bits UI dropdown that owns menu roles, keyboard navigation, scoped focus and outside dismissal while surfaces own presentation.

---

## 1. OVERVIEW

The menu family splits one dropdown into [`menu.svelte`](./menu.svelte), [`menu-trigger.svelte`](./menu-trigger.svelte), [`menu-content.svelte`](./menu-content.svelte) and [`menu-item.svelte`](./menu-item.svelte). The root binds `open` and provides the internal dismissal context. Content is portaled and remains connected to the root through Bits UI context.

An open menu is more than positioned content. Bits UI supplies menu roles, item focus and Escape or outside dismissal. The app wrapper adds a Tab guard and uses [`../a11y/aria-hide-outside.svelte.ts`](../a11y/aria-hide-outside.svelte.ts) so unrelated background elements are hidden from assistive technology. The family has no menu CSS, touch sizing or motion policy.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Parts | Root, trigger, portaled content and item |
| Content role | Bits UI `menu` with vertical orientation |
| Item role | Bits UI `menuitem` |
| Component CSS | None |

---

## 2. FEATURES

### Key Features

| Feature | What It Does |
|---|---|
| Compositional root | Shares `open` state and dismissal context across all menu parts. |
| Bits menu semantics | Preserves the trigger, menu and menu-item roles plus arrow-key navigation. |
| Scoped focus | Bits UI traps focus while content is open. The wrapper also intercepts Tab while focus is inside the content. |
| Outside-tree isolation | `menu-content.svelte` hides unrelated body content and exempts the menu target and live regions. |
| Caller-owned presentation | Trigger, content and item snippets or classes determine layout, hit target and visual state. |

### Accessibility Contract

| Concern | Guaranteed here | Caller must supply |
|---|---|---|
| Roles | Bits UI exposes the trigger's menu relationship, a vertical `menu` content role and `menuitem` item roles. | An accessible trigger name, a content label when the menu needs one and meaningful item names. |
| Focus movement | Bits UI provides menu keyboard navigation and focus scoping. The content wrapper prevents Tab from escaping while focus remains inside. | Any deliberate focus behavior around a custom host workflow. Do not add a second menu roving-focus model. |
| Dismissal | Bits UI closes on Escape, outside interaction and item selection by its normal menu rules. The root also supplies an internal dismiss callback. | A caller that intercepts dismissal events must preserve an intentional close path. |
| Outside content | The content session hides unrelated body elements from assistive technology and restores owned values on close. | Correct content mounting and a complete content target. |
| Hit target | No dimensions or padding are emitted for the trigger or items. | Touch-sized trigger and item controls with visible focus and highlighted states. |
| Reduced motion | No transition or animation is defined here. | Menu open and close motion that honors `prefers-reduced-motion`. |
| Forced colors | No color or contrast rule is defined here. | Highlighted, disabled, border and focus styles that remain visible in forced-colors mode. |

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Composition | One `Menu` root around trigger, content and items | Individual parts depend on Bits UI root context. |
| Trigger | An accessible name and a surface class or style | Bits UI supplies relationship state. The caller supplies readable content and hit-target treatment. |
| Content | A label when the menu is not otherwise named | Pass content props such as `aria-label` through `MenuContent`. |
| Items | Meaningful item content and distinct actions | The item adapter does not invent labels or handlers. |

---

## 4. STRUCTURE

| File | Purpose |
|---|---|
| [`menu.svelte`](./menu.svelte) | Bindable `DropdownMenu.Root` and internal dismiss context. |
| [`menu-trigger.svelte`](./menu-trigger.svelte) | Trigger adapter that forwards Bits UI props and caller content. |
| [`menu-content.svelte`](./menu-content.svelte) | Portaled content, outside hiding, focus guard and dismissal boundary. |
| [`menu-item.svelte`](./menu-item.svelte) | Item adapter that forwards item props and caller content. |
| [`CODE.md`](./CODE.md) | Package topology and menu flow. |

---

## 5. CONFIGURATION

| Prop or API | Default | Purpose |
|---|---|---|
| `open` | `false` | Controls or binds whether the menu is open. |
| Root props | Bits UI defaults | Forward direction, callbacks and supported dropdown behavior. |
| Content props | Bits UI defaults | Forward label, placement, loop and dismissal options. |
| Item props | Bits UI defaults | Forward disabled state, selection handler and item attributes. |
| `MENU_DISMISS_KEY` | Internal symbol | Connects the root dismissal callback to descendants that need the shared close path. |

---

## 6. USAGE EXAMPLES

Keep every part under one root and label the trigger and content:

```svelte
<Menu bind:open={menuOpen}>
  <MenuTrigger aria-label="Open actions">Actions</MenuTrigger>
  <MenuContent aria-label="Actions">
    <MenuItem onclick={edit}>Edit</MenuItem>
    <MenuItem onclick={archive}>Archive</MenuItem>
  </MenuContent>
</Menu>
```

The wrapper supplies behavior. The consuming surface supplies classes for the trigger, content and items, including item highlight, disabled state, touch size, motion and forced-color treatment.

---

## 7. TROUBLESHOOTING

| What You See | Cause | Fix |
|---|---|---|
| The trigger opens nothing | A trigger or content part is outside its `Menu` root. | Put all menu parts under one root. |
| Arrow navigation or item focus is missing | The caller replaced a Bits part or stopped its keyboard handlers. | Keep the wrappers intact and pass presentation through props or children. |
| Tab appears to do nothing | The content wrapper intentionally prevents Tab from escaping while it is open. | Use Escape, an item action or outside interaction to close the menu before continuing. |
| Background controls are still announced | Content was not mounted when the outside-hiding effect ran or the target changed unexpectedly. | Keep the content element under `MenuContent` and inspect the open lifecycle. |
| Outside click or Escape no longer closes | A forwarded Bits callback prevented the default dismissal. | Remove the prevention or close the bound `open` state in the handler. |
| Menu items are too small or hard to distinguish | The family has no CSS. | Add touch sizing, highlighted state, focus indication and forced-colors rules in the surface. |

---

## 8. FAQ

**Q: Does `MenuContent` position or style the dropdown?**

A: Bits UI handles the positioning boundary. The caller supplies the visual class, spacing, colors and motion.

**Q: Why does the menu hide background content?**

A: An open menu should not leave unrelated controls in the assistive-technology tree while focus is scoped to the menu.

**Q: Can a menu part be used without `Menu`?**

A: No. The trigger, content and item depend on the root context.

---

## 9. RELATED RESOURCES

| Document | Purpose |
|---|---|
| [`CODE.md`](./CODE.md) | Source arrangement, focus guard and dismissal flow. |
| [Accessibility helpers README](../a11y/README.md) | Outside hiding and interaction-state contract. |
| [Choice README](../choice/README.md) | Non-dismissive single-selection controls. |
| [Sheet README](../sheet/README.md) | Modal dialog family with a different focus boundary. |
