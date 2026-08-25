// ───────────────────────────────────────────────────────────────────
// MODULE: Visual-Viewport Anchor (keyboard-safe)
// ───────────────────────────────────────────────────────────────────
// Keyboard-safe anchor: rAF-batched visual-viewport measurements; mirrors height into --visual-viewport-height.

// ───────────────────────────────────────────────────────────────────
// 1. PUBLIC CONSTANTS AND RESULT TYPE
// ───────────────────────────────────────────────────────────────────

export const VISUAL_VIEWPORT_HEIGHT_VAR = '--visual-viewport-height';

export interface VisualViewportAnchorResult {
  /** The current visual-viewport height in CSS pixels, or null before the first frame. */
  readonly viewportHeightPx: number | null;
  /** Distance from the visual-viewport top to the anchor's top edge, or null. */
  readonly anchorTopPx: number | null;
}

// ───────────────────────────────────────────────────────────────────
// 2. MEASURED ANCHOR STATE
// ───────────────────────────────────────────────────────────────────

export function useVisualViewportAnchor(
  getAnchor: () => Element | null = () => null,
): VisualViewportAnchorResult {
  let viewportHeightPx = $state<number | null>(null);
  let anchorTopPx = $state<number | null>(null);
  // Mirror measurements for subscribers without forcing re-renders.
  let lastValues = { height: 0, anchorTop: 0 };

  $effect(() => {
    if (typeof window === 'undefined') return undefined;
    let frame: number | null = null;

    const measure = () => {
      frame = null;
      const viewport = window.visualViewport;
      const height =
        viewport !== null && viewport !== undefined ? viewport.height : window.innerHeight;
      const anchor = getAnchor();
      const anchorTop =
        anchor !== null
          ? anchor.getBoundingClientRect().top -
            (viewport !== null && viewport !== undefined ? viewport.offsetTop : 0)
          : 0;
      const previous = lastValues;
      if (height !== previous.height || anchorTop !== previous.anchorTop) {
        lastValues = { height, anchorTop };
        document.documentElement.style.setProperty(VISUAL_VIEWPORT_HEIGHT_VAR, `${height}px`);
        viewportHeightPx = height;
        anchorTopPx = anchorTop;
      }
    };

    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(measure);
    };

    // ───────────────────────────────────────────────────────────────────
    // 3. VIEWPORT EVENT LIFECYCLE
    // ───────────────────────────────────────────────────────────────────

    const viewport = window.visualViewport;
    if (viewport !== null && viewport !== undefined) {
      viewport.addEventListener('resize', schedule);
      viewport.addEventListener('scroll', schedule);
    }
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    window.addEventListener('focus', schedule);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') schedule();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    // PWA pageshow without resize still needs a remeasure.
    window.addEventListener('pageshow', schedule);

    // Immediate first measure so the panel never uses a stale budget.
    schedule();

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      if (viewport !== null && viewport !== undefined) {
        viewport.removeEventListener('resize', schedule);
        viewport.removeEventListener('scroll', schedule);
      }
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      window.removeEventListener('focus', schedule);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', schedule);
    };
  });

  return {
    get viewportHeightPx() {
      return viewportHeightPx;
    },
    get anchorTopPx() {
      return anchorTopPx;
    },
  };
}
