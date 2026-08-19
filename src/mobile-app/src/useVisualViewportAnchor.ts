// ───────────────────────────────────────────────────────────────────
// MODULE: Visual-Viewport Anchor (keyboard-safe)
// ───────────────────────────────────────────────────────────────────
// Keeps the inline completion surface inside the visible area while the
// software keyboard is up. All measurements run through requestAnimationFrame
// so resize/scroll storms from the visual viewport, rotation, keyboard
// language changes, and PWA foregrounding settle into one repaint; the hook
// never scrolls the page, so the transcript and composer never move. The
// measured height is mirrored into --visual-viewport-height for CSS that
// cannot read the API directly.

import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export const VISUAL_VIEWPORT_HEIGHT_VAR = '--visual-viewport-height';

export interface VisualViewportAnchorResult {
  /** The current visual-viewport height in CSS pixels, or null before the first frame. */
  readonly viewportHeightPx: number | null;
  /** Distance from the visual-viewport top to the anchor's top edge, or null. */
  readonly anchorTopPx: number | null;
}

export function useVisualViewportAnchor(
  anchorRef?: RefObject<Element | null>,
): VisualViewportAnchorResult {
  const [viewportHeightPx, setViewportHeightPx] = useState<number | null>(null);
  const [anchorTopPx, setAnchorTopPx] = useState<number | null>(null);
  // The measured values are mirrored so subscribers outside this hook can
  // read the current budget without re-rendering.
  const lastValuesRef = useRef({ height: 0, anchorTop: 0 });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let frame: number | null = null;

    const measure = () => {
      frame = null;
      const viewport = window.visualViewport;
      const height =
        viewport !== null && viewport !== undefined ? viewport.height : window.innerHeight;
      const anchorTop =
        anchorRef?.current !== undefined && anchorRef.current !== null
          ? anchorRef.current.getBoundingClientRect().top -
            (viewport !== null && viewport !== undefined ? viewport.offsetTop : 0)
          : 0;
      const previous = lastValuesRef.current;
      if (height !== previous.height || anchorTop !== previous.anchorTop) {
        lastValuesRef.current = { height, anchorTop };
        document.documentElement.style.setProperty(VISUAL_VIEWPORT_HEIGHT_VAR, `${height}px`);
        setViewportHeightPx(height);
        setAnchorTopPx(anchorTop);
      }
    };

    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(measure);
    };

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
    // without a visual-viewport resize; the anchor budget must remeasure
    // so the panel never renders against a stale height.
    window.addEventListener('pageshow', schedule);

    // The first measurement runs immediately so the panel never renders
    // against a stale budget.
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
  }, [anchorRef]);

  return { viewportHeightPx, anchorTopPx };
}
