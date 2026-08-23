# `viewport/` — structure & logic

Editor map. For *what/why*, see `README.md`.

## Shape

- **`use-visual-viewport-anchor.svelte.ts`** — `VISUAL_VIEWPORT_HEIGHT_VAR`, `VisualViewportAnchorResult`, and `useVisualViewportAnchor`; the hook owns measurement, CSS mirroring, event listeners, and cleanup.

## Do-not

- **Don't position the completion surface from `window.innerHeight` alone.** That is the layout viewport on the phone; use the visual viewport height and offset when available.
- **Don't scroll the page from this hook.** It reports `viewportHeightPx` and `anchorTopPx`; consumers decide how to fit the surface.
- **Don't measure on every raw viewport event.** Keep the `requestAnimationFrame` scheduler so keyboard, rotation, and foreground changes settle into one repaint.
- **Don't leave listeners or a pending frame behind.** The effect cleanup must cancel the frame and remove every visual-viewport, window, and document listener it installed.
- **Don't write a second CSS variable for the same budget.** `VISUAL_VIEWPORT_HEIGHT_VAR` is the shared `--visual-viewport-height` contract.
