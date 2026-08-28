// ───────────────────────────────────────────────────────────────────
// MODULE: Horizontal Session Strip Metric Tests
// ───────────────────────────────────────────────────────────────────

// Geometry fixtures exercise the same pure decisions the dock uses for masks,
// thumb placement and end-following, including the mid-strip reading case.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  measureScrollMetrics,
  shouldRevealNewChip,
} from '../src/shared/state/scroll-metrics.js';

// ───────────────────────────────────────────────────────────────────
// 2. TESTS
// ───────────────────────────────────────────────────────────────────

describe('horizontal session strip metrics', () => {
  it('reports no overflow and therefore no fade or thumb when content fits', () => {
    expect(
      measureScrollMetrics({ clientWidth: 320, scrollLeft: 0, scrollWidth: 320 }),
    ).toEqual({
      hasOverflow: false,
      atStart: true,
      atEnd: true,
      thumbRatio: 1,
      thumbOffset: 0,
    });
  });

  it('reports the trailing edge and a bounded thumb for real overflow', () => {
    const metrics = measureScrollMetrics({ clientWidth: 100, scrollLeft: 100, scrollWidth: 200 });

    expect(metrics.hasOverflow).toBe(true);
    expect(metrics.atStart).toBe(false);
    expect(metrics.atEnd).toBe(true);
    expect(metrics.thumbRatio).toBe(0.5);
    expect(metrics.thumbOffset).toBe(0.5);
  });

  it('keeps a mid-strip reader away from both edge fades and the end', () => {
    const metrics = measureScrollMetrics({ clientWidth: 100, scrollLeft: 40, scrollWidth: 300 });

    expect(metrics.hasOverflow).toBe(true);
    expect(metrics.atStart).toBe(false);
    expect(metrics.atEnd).toBe(false);
    expect(metrics.thumbOffset).toBeGreaterThan(0);
    expect(metrics.thumbOffset).toBeLessThan(1 - metrics.thumbRatio);
  });
});

describe('new-chip auto-reveal decision', () => {
  it('reveals a new chip only when the strip was already at its end', () => {
    expect(shouldRevealNewChip(2, 3, true)).toBe(true);
    expect(shouldRevealNewChip(2, 3, false)).toBe(false);
  });

  it('does not scroll for an unchanged or shrinking strip', () => {
    expect(shouldRevealNewChip(3, 3, true)).toBe(false);
    expect(shouldRevealNewChip(3, 2, true)).toBe(false);
  });
});
