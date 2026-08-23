// ───────────────────────────────────────────────────────────────────
// MODULE: Visual-Viewport Anchor (keyboard-safe)
// ───────────────────────────────────────────────────────────────────
// Keeps the inline completion surface inside the visible area while the
// Software keyboard is up. All measurements run through requestAnimationFrame
// So resize/scroll storms from the visual viewport, rotation, keyboard
// Language changes, and PWA foregrounding settle into one repaint; the hook
// Never scrolls the page, so the transcript and composer never move. The
// Measured height is mirrored into --visual-viewport-height for CSS that
// Cannot read the API directly.

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
  // The measured values are mirrored so subscribers outside this hook can
  // Read the current budget without re-rendering.
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
    // An installed PWA restored from the iOS page cache fires pageshow
    // Without a visual-viewport resize; the anchor budget must remeasure
    // So the panel never renders against a stale height.
    window.addEventListener('pageshow', schedule);

    // The first measurement runs immediately so the panel never renders
    // Against a stale budget.
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
