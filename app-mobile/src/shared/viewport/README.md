# Viewport

The visual-viewport anchor for keyboard-safe inline surfaces. A phone keyboard can shrink the visual viewport while leaving the layout viewport unchanged, so this folder exists to measure the visible budget without moving the transcript or composer.

## What lives here

- **`use-visual-viewport-anchor.svelte.ts`** — `useVisualViewportAnchor`, which measures the visual viewport and anchor top, mirrors the height into `--visual-viewport-height`, and exposes the current measurements to Svelte consumers.

## Why it's shaped this way

- **Visual and layout viewports are different.** The hook uses `window.visualViewport` when available and falls back to `window.innerHeight` only when the API is unavailable.
- **Measurements are frame-coalesced.** Resize, scroll, orientation, focus, visibility, and PWA page-show events schedule one `requestAnimationFrame` measurement instead of causing a storm of writes.
- **The page does not scroll.** The anchor supplies a budget for the inline surface; transcript and composer position remain under their existing layout.

Structure, event ownership, and viewport do-nots are in `CODE.md`.
