# Visual viewport anchor

> Keyboard-safe measurement for inline surfaces that must stay inside the phone's visible viewport.

---

## 1. OVERVIEW

`viewport/` contains one Svelte runes hook. It measures the browser's visual viewport and the top edge of a supplied anchor so a completion or inline surface can fit above the software keyboard. It mirrors the height into `--visual-viewport-height` and returns the latest measurements. It never scrolls the page.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Source files | One hook module |
| Browser fallback | `window.innerHeight` when `window.visualViewport` is unavailable |
| CSS contract | `--visual-viewport-height` |
| Measurement schedule | One `requestAnimationFrame` for a burst of viewport events |

---

## 2. FEATURES

### Key Features

| Feature | What It Does |
|---|---|
| Visual height | Reads the visible viewport height rather than assuming the layout viewport is visible. |
| Anchor position | Reports the anchor top relative to the visual viewport offset. |
| CSS mirroring | Writes the shared height variable when a measurement changes. |
| Event coverage | Responds to visual viewport resize and scroll, window resize, orientation, focus, visibility and pageshow. |
| Cleanup | Cancels a pending frame and removes every listener when the effect ends. |

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Svelte runtime | Svelte 5 runes | The hook uses `$state` and `$effect`. |
| Browser surface | `window`, `document` and `requestAnimationFrame` | Server evaluation returns the initial null measurements without installing listeners. |
| Consumer anchor | An `Element` getter or the default null getter | The hook measures the returned element when one is available. |
| Layout ownership | A caller that positions its own surface | The hook reports a budget. It does not move the transcript, composer or page. |

---

## 4. STRUCTURE

| File | Role |
|---|---|
| [`use-visual-viewport-anchor.svelte.ts`](./use-visual-viewport-anchor.svelte.ts) | Exports the CSS variable name, result type and measurement hook. |

---

## 5. IMPLEMENTATION BOUNDARIES

The hook reports a layout budget. It does not own the surface that uses it.

| Boundary | Rule |
|---|---|
| Input | `useVisualViewportAnchor` accepts an optional `getAnchor` getter and reads the current anchor element when a frame runs. |
| Measurement | The visual viewport is preferred, with `window.innerHeight` as the fallback. The hook returns `viewportHeightPx` and `anchorTopPx`. |
| Scheduling | Resize, scroll, orientation, focus, visibility and pageshow events share one pending `requestAnimationFrame`. |
| Outputs | The hook updates state and `--visual-viewport-height` only when a measured value changes. |
| Cleanup | Effect cleanup cancels the pending frame and removes every listener installed by the hook. |
| Layout | The caller positions the inline surface. This folder never scrolls or repositions the page. |

Put event and measurement changes in `use-visual-viewport-anchor.svelte.ts`. Put surface positioning and keyboard layout decisions in the consuming component.

Run `node scripts/naming/scan-folder-docs.mjs` from the repository root to verify folder coverage and local references.

---

## 6. USAGE EXAMPLES

| Situation | What the consumer does |
|---|---|
| A keyboard opens | Read `viewportHeightPx` and position the inline surface within the visible height. |
| The surface has a top anchor | Pass a getter that returns the anchor element so `anchorTopPx` is measured relative to the visual viewport. |
| The browser lacks `visualViewport` | Let the hook fall back to `window.innerHeight`. |
| The app returns from the background | The `pageshow` and visibility listeners schedule a fresh measurement. |
| A component unmounts | Let the effect cleanup remove listeners and cancel the pending animation frame. |

---

## 7. TROUBLESHOOTING

| What You See | Cause | Fix |
|---|---|---|
| The first values are `null` | The first animation frame has not run yet. | Treat null as not measured and wait for the reactive result. |
| The inline surface sits under the keyboard | The consumer used the layout viewport or cached a stale result. | Use `viewportHeightPx` and allow resize, scroll and pageshow events to update it. |
| The page jumps when the keyboard opens | A consumer scrolled or repositioned the page instead of using the reported budget. | Keep scrolling outside this hook and fit only the inline surface. |
| Measurements keep running after navigation | The effect cleanup did not run or a listener was installed outside the hook. | Keep all listeners in the hook and preserve its cleanup function. |

---

## 8. FAQ

**Q: Why not use `window.innerHeight` everywhere?**

A: On a phone, the layout viewport can remain large while the visible viewport shrinks around the keyboard. The visual viewport gives the surface the usable height.

**Q: Does this hook control scrolling?**

A: No. It only reports measurements and writes the shared CSS height variable. The caller decides how to lay out its surface.

---

## 9. RELATED RESOURCES

| Document | Purpose |
|---|---|
| [Chrome documentation](../chrome/README.md) | Shared chrome that consumes viewport-safe layout space. |
| [Chat screen documentation](../../pages/chat/README.md) | The screen that owns transcript and composer layout. |
| [Shared layer documentation](../README.md) | The broader shared data and logic boundary. |
