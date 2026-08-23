# a11y/: overlay isolation and interaction state

---

## 1. OVERVIEW

`a11y/` contains two independent, reusable DOM layers. [`aria-hide-outside.svelte.ts`](./aria-hide-outside.svelte.ts) applies temporary `aria-hidden` values around open overlay targets. [`interactions.ts`](./interactions.ts) attaches pointer and focus listeners that publish state attributes for consumer CSS.

The folder has no component tree and no visual layer. Menu and sheet content call the visibility helper. Button and feature surfaces attach the interaction actions to their own elements.

Current state:

- `hideOutside` supports nested sessions, body mutation observation, target exemptions and restoration of owned attributes.
- The action set covers non-touch hover, primary pointer or keyboard press, keyboard-visible focus and any-modality focus.
- The helpers do not provide roles, focus scopes, hit targets, motion rules or forced-color styles.

---

## 2. ARCHITECTURE

The modules share a low-level purpose but do not call one another:

```text
Overlay primitive
       |
       v
aria-hide-outside.svelte.ts ---> body elements ---> temporary aria-hidden
       |                                      |
       `--------------------------------------`--> restore on final release

Button or surface
       |
       v
interactions.ts ------------------------------> data-hovered / data-pressed
                                               data-focus-visible / data-focused
                                                               |
                                                               v
                                                        consumer CSS
```

`hideOutside` treats all active sessions as one visibility computation. The target subtree and its ancestor chain stay exposed, live regions stay exposed and every other body element receives an owned hidden value. `interactions.ts` keeps event listeners local to each attached element and removes them from the returned action destroyers.

---

## 3. PACKAGE TOPOLOGY

The modules form a utility boundary below the widget families:

```text
menu-content.svelte   sheet-content.svelte   feature surfaces
        |                     |                    |
        `-----------> a11y helpers <--------------`
                              |
                  DOM bookkeeping and attributes
```

Allowed dependency direction:

```text
primitive or surface -> a11y helper -> DOM API
```

The helpers do not import menu, sheet or button implementations. They must remain reusable and must not grow feature-specific roles or dismissal policies.

---

## 4. DIRECTORY TREE

This folder is flat. The complete direct-file inventory is below:

| File | Responsibility |
|---|---|
| [`aria-hide-outside.svelte.ts`](./aria-hide-outside.svelte.ts) | Active-session visibility engine and sheet context helpers. |
| [`interactions.ts`](./interactions.ts) | `hover`, `press`, `focusVisible` and `focused` Svelte actions. |
| [`README.md`](./README.md) | User-facing purpose, contract and usage notes. |
| [`CODE.md`](./CODE.md) | This implementation map. |

---

## 5. KEY FILES

| File | Responsibility |
|---|---|
| [`aria-hide-outside.svelte.ts`](./aria-hide-outside.svelte.ts) | Owns `activeSessions`, the body `MutationObserver`, target and live-region exemptions and restoration of changed attributes. |
| [`interactions.ts`](./interactions.ts) | Owns event-to-attribute translation for pointer, keyboard and focus state. |

---

## 6. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Inputs | Overlay owners pass mounted target elements. Surfaces attach an action to an `HTMLElement`. |
| DOM ownership | The visibility helper temporarily changes only `aria-hidden` values it records. The action helper changes only its own `data-*` attributes. |
| Exemptions | Targets, descendants, ancestors up to `body` and live regions stay exposed. |
| Cleanup | A hide release is idempotent. Final session release disconnects the observer and restores recorded values. Action destroyers remove listeners. |
| Ownership | Roles, focus movement, dismissal, sizing, transitions and color contrast stay with the calling primitive or surface. |

Main overlay flow:

```text
targets from an open overlay
          |
          v
hideOutside(targets)
          |
          v
collect body elements and compute exemptions
          |
          +--> target subtree, ancestors and live regions remain exposed
          |
          `--> unrelated elements receive aria-hidden="true"
                              |
                              v
                         release session
                              |
                              v
                     restore owned attributes
```

Main interaction flow:

```text
pointer or keyboard event
          |
          v
attached action
          |
          v
set or remove one data-* state attribute
          |
          v
consumer surface styles the state
```

Do not hide the overlay target itself. Do not replace the pointer-aware actions with CSS-only hover state. Do not add a feature-specific accessibility contract to this utility boundary.

---

## 7. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| `hideOutside` | Function | Starts one overlay visibility session and returns its release function. |
| `setSheetContext` | Function | Registers the current sheet open-state getter for sheet content. |
| `getSheetContext` | Function | Reads the nearest registered sheet context. |
| `hover` | Svelte action | Publishes non-touch pointer hover state. |
| `press` | Svelte action | Publishes pointer-held and Enter or Space press state. |
| `focusVisible` | Svelte action | Publishes focus state when the browser reports keyboard-visible focus. |
| `focused` | Svelte action | Publishes focus state for every input modality. |

---

## 8. VALIDATION

Run from the repository root:

```bash
node scripts/naming/scan-folder-docs.mjs
npm run typecheck -w @pi-remote/web
```

The coverage scan must report this folder with both documents and no unresolved source references from either document. The web typecheck must finish with exit code 0.

---

## 9. RELATED

- [`README.md`](./README.md)
- [Shared primitives CODE map](../CODE.md)
- [Button CODE map](../button/CODE.md)
- [Menu CODE map](../menu/CODE.md)
- [Sheet CODE map](../sheet/CODE.md)
