# Accessibility Helpers

> Shared DOM helpers that isolate open overlays and expose pointer-aware interaction state to the primitive families.

---

## 1. OVERVIEW

This folder contains the two low-level helpers used by the shared control primitives. [`aria-hide-outside.svelte.ts`](./aria-hide-outside.svelte.ts) keeps unrelated body content out of the assistive-technology tree while an overlay is active. [`interactions.ts`](./interactions.ts) turns pointer and keyboard state into attributes that consuming surfaces can style.

The helpers solve cross-family problems once. They do not create a complete widget contract by themselves. The menu and sheet wrappers still own their Bits UI roles, focus behavior and dismissal rules, while consuming surfaces own sizing and visual accessibility.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Modules | Two flat helper modules |
| Overlay state | Nested hide sessions with restoration |
| Interaction states | Hover, press, focus-visible and focused |
| Styling | No CSS in this folder |

---

## 2. FEATURES

### Accessibility Contract

| Concern | Guaranteed here | Caller must supply |
|---|---|---|
| Roles | No widget role is added by these helpers. | The primitive or surface supplies the correct role and accessible name. |
| Focus movement | `hideOutside` exempts the target subtree but does not move, trap or restore focus. | Overlay primitives and callers provide focus entry, looping and restoration when needed. |
| Dismissal | The returned release function ends one hiding session. It is not an Escape or outside-click handler. | The owning menu or sheet decides how and when to close. |
| Outside content | `hideOutside` applies `aria-hidden="true"` to unrelated body elements, preserves live regions and restores only attributes it changed. | The caller passes every active overlay target and keeps the session release function alive until close. |
| Hit target | No dimensions or padding are emitted. | The surface styles an interactive control to its required touch target. |
| Reduced motion | No transition or animation is defined. | The surface removes or shortens motion under `prefers-reduced-motion`. |
| Forced colors | No color or forced-color rule is defined. | The surface preserves borders, focus indicators and state contrast in forced-colors mode. |

### Overlay Isolation

`hideOutside` supports more than one active overlay. It exempts each target, its descendants and its ancestors, then exempts elements that expose a live region or status role. A body mutation triggers another pass while a session is active, so newly mounted background content does not remain exposed by accident.

### Interaction State

The Svelte actions distinguish touch input from hover, track primary pointer and keyboard press state, and mirror both modality-aware and modality-neutral focus. They remove their attributes and listeners when the action is destroyed. Consumer CSS reads `data-hovered`, `data-pressed`, `data-focus-visible` and `data-focused`.

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Browser DOM | `document.body` for overlay isolation | On the server, `hideOutside` returns a no-op release function. |
| Overlay target | A mounted `Element` for every visible overlay surface | Pass the content and any overlay element that must remain exposed. |
| Consumer styling | Selectors for the emitted `data-*` attributes | This folder ships behavior only, not focus rings or state colors. |

---

## 4. STRUCTURE

The folder is flat. The two source modules have separate responsibilities:

| File | Purpose |
|---|---|
| [`aria-hide-outside.svelte.ts`](./aria-hide-outside.svelte.ts) | Runs nested visibility sessions, observes body mutations, preserves live regions and restores owned `aria-hidden` values. |
| [`interactions.ts`](./interactions.ts) | Exports the four Svelte actions that publish interaction state attributes. |

---

## 5. IMPLEMENTATION BOUNDARIES

The two helpers share a low-level DOM boundary but keep separate responsibilities.

| Boundary | Rule |
|---|---|
| Visibility helper | `aria-hide-outside.svelte.ts` owns active sessions, target and live-region exemptions, the body observer and restoration of values it changed. |
| Interaction actions | `interactions.ts` owns pointer, keyboard and focus listeners and publishes `data-hovered`, `data-pressed`, `data-focus-visible` and `data-focused`. |
| Caller input | Overlay owners pass mounted target elements. Controls attach an action to their own `HTMLElement`. |
| Accessibility scope | These helpers do not add roles, move or trap focus, dismiss overlays, size controls, define motion or style forced colors. |

Put overlay isolation and session changes in `aria-hide-outside.svelte.ts`. Put event-to-attribute changes in `interactions.ts`. Put widget semantics, focus policy, dismissal and visual accessibility in the owning menu, sheet, button or feature surface.

Run the folder scan and the web typecheck from the repository root:

```bash
node scripts/naming/scan-folder-docs.mjs
npm run typecheck -w @pi-remote/web
```

---

## 6. CONFIGURATION

| API or state | Default | Purpose |
|---|---|---|
| `hideOutside(targets)` | No active session | Starts one session for the supplied overlay targets and returns its idempotent release function. |
| `setSheetContext(isOpen)` | No sheet context | Makes the sheet open state available to [`../sheet/sheet-content.svelte`](../sheet/sheet-content.svelte). |
| `getSheetContext()` | `undefined` outside a sheet root | Reads the nearest sheet open-state context. |
| `hover`, `press`, `focusVisible`, `focused` | No attributes before an event | Svelte actions that add and remove the matching interaction state. |

---

## 7. USAGE EXAMPLES

An overlay owner keeps the release function attached to the open session:

```ts
const release = hideOutside([contentElement, overlayElement])

// Run when the overlay closes.
release()
```

A control surface attaches the actions to the element whose state it exposes:

```svelte
<button use:hover use:press use:focusVisible use:focused>
  Continue
</button>
```

Use the primitive wrappers for widget semantics. Use these helpers directly only when a feature owns a matching DOM boundary and can also provide focus and dismissal behavior.

---

## 8. TROUBLESHOOTING

| What You See | Cause | Fix |
|---|---|---|
| Background controls are still announced | The open overlay did not pass its mounted element to `hideOutside`. | Include every visible overlay target in the session. |
| A live status disappears from the accessibility tree | The status element is not using a live-region attribute or supported status role. | Mark the announcement as a live region and keep it outside the hidden target. |
| Existing `aria-hidden` values change after close | A caller is changing the same attribute while the session is active. | Let the helper own its temporary values and avoid competing writes. |
| Focus leaves an open surface | `hideOutside` was used as a focus trap. | Use the menu or sheet primitive, or add an owner-level focus scope. |
| A touch control stays in its hover style | The consumer styled native `:hover` instead of the action state. | Style `data-hovered` and attach `hover`. |
| A control has no visible focus ring in forced colors | The helper exposes state but does not style it. | Add a caller-owned focus indicator that survives forced-colors mode. |

---

## 9. FAQ

**Q: Does `hideOutside` close an overlay?**

A: No. It only manages temporary `aria-hidden` values. The owning primitive changes open state and decides dismissal.

**Q: Why are live regions exempted?**

A: Background status announcements must remain available to assistive technology while the visible overlay is open. The helper exempts non-off live regions and common status roles.

**Q: Are the interaction attributes a replacement for semantics?**

A: No. They are styling state. The control still needs its native or Bits UI semantics, accessible name and caller-owned hit target.

---

## 10. RELATED RESOURCES

| Document | Purpose |
|---|---|
| [Shared primitives README](../README.md) | Family-level rules for the shared control layer. |
| [Button README](../button/README.md) | Native control that consumes the interaction actions. |
| [Menu README](../menu/README.md) | Dropdown content that uses outside hiding and a focus guard. |
| [Sheet README](../sheet/README.md) | Dialog content that uses outside hiding with an overlay target. |
