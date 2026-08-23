# viewport/: visual-viewport measurement hook

---

## 1. OVERVIEW

`viewport/` owns one hook that converts browser viewport events into a keyboard-safe layout budget. It stores the latest visual height and anchor position in Svelte state, mirrors the height into the shared CSS variable and cleans up every listener it installs.

Current state:

- The visual viewport is preferred when available. `window.innerHeight` is the fallback.
- Anchor position subtracts `visualViewport.offsetTop` when the API provides it.
- A `requestAnimationFrame` scheduler coalesces resize, scroll, orientation, focus, visibility and pageshow events.
- The hook never scrolls the page or decides how a caller places its surface.

---

## 2. ARCHITECTURE

The hook has one input and two output paths:

```text
visualViewport or window events -> requestAnimationFrame -> measure()
anchor getter -------------------^                  |
                                                     +-> viewportHeightPx
                                                     +-> anchorTopPx
                                                     +-> --visual-viewport-height
```

The effect installs listeners only in a browser. It updates state and CSS only when a measured value changes, then removes the listeners and cancels the frame during cleanup.

---

## 3. KEY FILES

The folder is a one-file package:

| File | Responsibility |
|---|---|
| [`use-visual-viewport-anchor.svelte.ts`](./use-visual-viewport-anchor.svelte.ts) | Measurement, scheduling, CSS mirroring and listener cleanup. |
| [`README.md`](./README.md) | Feature orientation for keyboard-safe layout. |
| [`CODE.md`](./CODE.md) | This code-folder map. |

---

## 4. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Measurement | Read the visual viewport when present and fall back to `window.innerHeight`. |
| Anchor | Read `getBoundingClientRect().top` and subtract the visual viewport offset. |
| Scheduling | Keep one pending animation frame, even when several raw events arrive. |
| CSS | Write only `VISUAL_VIEWPORT_HEIGHT_VAR`, which names `--visual-viewport-height`. |
| Layout | Return the budget to the caller. Do not scroll or reposition another surface here. |
| Cleanup | Cancel a pending frame and remove visual viewport, window and document listeners. |

Main flow:

```text
useVisualViewportAnchor(getAnchor)
        -> install browser listeners
        -> schedule one animation frame
        -> read viewport and anchor geometry
        -> write state and CSS variable when changed
        -> return viewportHeightPx and anchorTopPx
        -> cleanup listeners and frame on effect end
```

---

## 5. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| `VISUAL_VIEWPORT_HEIGHT_VAR` | Constant | Names the shared CSS height variable. |
| `VisualViewportAnchorResult` | Interface | Describes the nullable height and anchor measurements. |
| `useVisualViewportAnchor` | Svelte hook | Measures the visible viewport and returns reactive layout data. |

---

## 6. VALIDATION

Run from the repository root:

```bash
node "$PWD/scripts/naming/scan-folder-docs.mjs"
```

The folder is healthy when both documents exist and the scan reports no broken references for this folder.

---

## 7. RELATED

- [`README.md`](./README.md)
- [Chrome documentation](../chrome/CODE.md)
- [Chat screen documentation](../../pages/chat/CODE.md)
