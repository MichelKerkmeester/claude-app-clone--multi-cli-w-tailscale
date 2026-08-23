# Sheet

> A compositional Bits UI dialog boundary with an overlay, focus scope, outside-content isolation, title and close adapters.

---

## 1. OVERVIEW

The sheet family keeps dialog behavior in four parts. [`sheet.svelte`](./sheet.svelte) binds the root's `open` state and registers the open-state context. [`sheet-content.svelte`](./sheet-content.svelte) portals the overlay and dialog content, then hides unrelated body content while the sheet is open. [`sheet-title.svelte`](./sheet-title.svelte) and [`sheet-close.svelte`](./sheet-close.svelte) preserve the dialog title and close semantics while callers supply their markup.

The family is used for bottom-sheet surfaces, but it does not position content at the bottom or provide visual styling. The caller's `class`, `overlayClass`, layout and motion rules create that surface.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Parts | Root, content, title and close |
| Content role | Bits UI `dialog` with `aria-modal="true"` |
| Focus default | Trapped and looped while open |
| Component CSS | None |

---

## 2. FEATURES

### Key Features

| Feature | What It Does |
|---|---|
| Dialog semantics | Preserves Bits UI dialog role, modal state, title relationship and close behavior. |
| Focus boundary | Uses Bits UI's default focus scope to trap and loop focus while the sheet is open. |
| Overlay composition | Portals an overlay and content together and forwards `overlayClass` for caller styling. |
| Outside-tree isolation | Calls [`hideOutside`](../a11y/aria-hide-outside.svelte.ts) for the content and overlay while the root reports open. |
| Semantic parts | Keeps title and close adapters separate so a surface can compose its own header and actions. |

### Accessibility Contract

| Concern | Guaranteed here | Caller must supply |
|---|---|---|
| Roles | Bits UI supplies `dialog` with `aria-modal="true"`, a dialog title heading and a close trigger when those parts are rendered. | A title or valid label for every sheet, meaningful close content or `aria-label` and a description when the content needs one. |
| Focus movement | Dialog content defaults to a looping focus trap with open and close autofocus hooks. | Preserve a usable entry and return path when overriding `trapFocus`, autofocus callbacks or custom safe-focus behavior. |
| Dismissal | Bits UI closes on Escape and outside interaction by default. `SheetClose` provides an explicit close trigger. | Intentional overrides such as ignored Escape or outside interaction, plus any swipe or host-specific close path. |
| Outside content | Open content and overlay remain exposed while unrelated body elements receive temporary `aria-hidden` values. | Mount content under the matching `Sheet` root and avoid competing writes to `aria-hidden`. |
| Hit target | No size or padding is emitted for close or action controls. | Touch-sized close and action controls, including a visible focus indicator. |
| Reduced motion | No transition or animation is defined. | Sheet entry, exit and drag motion that honors `prefers-reduced-motion`. |
| Forced colors | No color or contrast rule is defined. | Overlay contrast, panel boundaries and focus indicators that remain visible in forced-colors mode. |

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Composition | One `Sheet` root around `SheetContent`, `SheetTitle` and any `SheetClose` | Content reads the sheet open-state context. |
| Accessible name | A `SheetTitle` or valid `aria-label` or `aria-labelledby` on content | A dialog without a name is not complete for assistive technology. |
| Close path | `SheetClose` or an intentional root state update | The primitive cannot infer a product-specific action. |
| Surface styling | A content class and optional `overlayClass` | Placement, sizing, contrast, motion and forced-color treatment belong to the caller. |

---

## 4. STRUCTURE

| File | Purpose |
|---|---|
| [`sheet.svelte`](./sheet.svelte) | Bindable `Dialog.Root` and sheet open-state context. |
| [`sheet-content.svelte`](./sheet-content.svelte) | Portaled overlay and content with outside hiding. |
| [`sheet-title.svelte`](./sheet-title.svelte) | `Dialog.Title` adapter. |
| [`sheet-close.svelte`](./sheet-close.svelte) | `Dialog.Close` adapter. |
| [`CODE.md`](./CODE.md) | Package topology and focus flow. |

---

## 5. CONFIGURATION

| Prop or API | Default | Purpose |
|---|---|---|
| `open` | `false` | Controls or binds sheet visibility. |
| `overlayClass` | Unset | Styles the portaled overlay element. |
| Content props | Bits UI defaults | Forward `trapFocus`, autofocus callbacks, outside interaction and Escape behavior. |
| Title props | Bits UI defaults | Forward title id and attributes used by the dialog label relationship. |
| Close props | Bits UI defaults | Forward close trigger attributes, disabled state and handlers. |

---

## 6. USAGE EXAMPLES

A named sheet keeps all parts under one root and gives the caller the placement classes:

```svelte
<Sheet bind:open={open}>
  <SheetContent class="settings-sheet" overlayClass="settings-overlay" aria-label="Settings">
    <SheetTitle>Settings</SheetTitle>
    <p>Choose the settings for this session.</p>
    <SheetClose class="close-button" aria-label="Close settings">Close</SheetClose>
  </SheetContent>
</Sheet>
```

For a custom action, keep the focus and dismissal contract in the content props and style the caller-owned class. Do not rely on the primitive for bottom placement, 44-pixel sizing or motion reduction.

---

## 7. TROUBLESHOOTING

| What You See | Cause | Fix |
|---|---|---|
| Sheet content never appears | `SheetContent` is outside its `Sheet` root or the bound state never becomes true. | Keep the parts under one root and inspect the bound `open` value. |
| Background controls remain announced | The content or overlay element is missing when the open effect runs. | Keep both portaled elements mounted through `SheetContent` and avoid a competing `aria-hidden` writer. |
| Focus escapes or does not return | The caller disabled focus trapping or prevented autofocus without restoring focus. | Keep the default focus scope or implement an explicit open and close focus path. |
| Escape or outside click does not close | A forwarded callback prevented Bits UI's default dismissal. | Remove the prevention or close the bound `open` state intentionally. |
| The panel is not at the bottom | The primitive provides dialog structure, not placement CSS. | Position the content through the caller's class. |
| Close or action controls are hard to tap | The family has no component CSS. | Give caller-owned controls a touch-sized target and a focus-visible style. |

---

## 8. FAQ

**Q: Does `SheetContent` create a bottom sheet by itself?**

A: No. It creates a dialog overlay and content boundary. The caller supplies bottom placement, size and visual treatment.

**Q: Why does the sheet need both a content element and an overlay target for outside hiding?**

A: Both visible dialog surfaces must remain in the accessibility tree while unrelated body content is temporarily hidden.

**Q: Can a sheet omit `SheetTitle`?**

A: Only when the content has another valid accessible name such as `aria-label` or `aria-labelledby`.

---

## 9. RELATED RESOURCES

| Document | Purpose |
|---|---|
| [`CODE.md`](./CODE.md) | Source arrangement, dialog flow and boundaries. |
| [Accessibility helpers README](../a11y/README.md) | Outside isolation used by sheet content. |
| [Menu README](../menu/README.md) | Non-dialog dropdown with different focus and dismissal rules. |
| [Button README](../button/README.md) | Native control used for sheet actions on many surfaces. |
