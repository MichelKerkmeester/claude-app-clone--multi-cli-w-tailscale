// ───────────────────────────────────────────────────────────────────
// MODULE: Usage Format Tests
// ───────────────────────────────────────────────────────────────────

// These tests keep quota copy, its device-local display choice and its
// severity meaning separate from the session context meter.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_USAGE_DISPLAY_MODE,
  barColor,
  barFillPercent,
  formatResetCountdown,
  formatResetDuration,
  formatUsageResetCountdown,
  getResetCountdownNextTickDelay,
  parseUsageDisplayMode,
  percentNumber,
  percentText,
  readUsageDisplayMode,
  scheduleResetCountdownTick,
  severityColor,
  toggleUsageDisplayMode,
  writeUsageDisplayMode,
} from '../src/shared/format/usage-format.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const NOW = 1_000_000_000;

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('reset countdown formatting', () => {
  it('formats durations and changes units at the hour boundary', () => {
    expect(formatResetDuration(47 * MINUTE_MS)).toBe('47m');
    expect(formatResetDuration(3 * HOUR_MS + 54 * MINUTE_MS)).toBe('3h 54m');
    expect(formatResetDuration(2 * HOUR_MS)).toBe('2h');
    expect(formatResetCountdown(6 * DAY_MS + 7 * HOUR_MS)).toBe('Resets in 6d 7h');
  });

  it('formats a fixture reset timestamp without reading the wall clock', () => {
    expect(formatUsageResetCountdown(NOW + 60 * MINUTE_MS - 1, NOW)).toBe('Resets in 59m');
    expect(formatUsageResetCountdown(NOW + 60 * MINUTE_MS, NOW)).toBe('Resets in 1h');
    expect(formatUsageResetCountdown(NOW - 1, NOW)).toBe('Resets now');
    expect(formatUsageResetCountdown(null, NOW)).toBe('');
    expect(formatResetCountdown(null)).toBe('');
  });
});

describe('boundary-aware reset countdown scheduling', () => {
  it('computes the next minute and hour rounding boundaries without sleeping', () => {
    expect(
      getResetCountdownNextTickDelay(NOW, [NOW + 90 * MINUTE_MS + 30_000]),
    ).toBe(30_000 + 1);
    expect(
      getResetCountdownNextTickDelay(NOW, [NOW + 2 * DAY_MS + 3 * HOUR_MS + 15 * MINUTE_MS]),
    ).toBe(15 * MINUTE_MS + 1);
    expect(getResetCountdownNextTickDelay(NOW, [NOW - MINUTE_MS, NOW])).toBeNull();
  });

  it('schedules one timeout, wakes it, and schedules the next boundary', () => {
    const pending: Array<{ readonly delay: number; readonly run: () => void }> = [];
    const resetAt = NOW + 2 * DAY_MS + 3 * HOUR_MS + 15 * MINUTE_MS;
    let tickCount = 0;

    const stop = scheduleResetCountdownTick([resetAt], () => {
      tickCount += 1;
    }, {
      now: () => NOW,
      setTimeout: (run, delay) => {
        pending.push({ delay, run });
        return pending.length;
      },
      clearTimeout: () => {},
    });

    expect(pending).toHaveLength(1);
    expect(pending[0]?.delay).toBe(15 * MINUTE_MS + 1);

    pending[0]?.run();
    expect(tickCount).toBe(1);
    expect(pending).toHaveLength(2);
    expect(pending[1]?.delay).toBe(15 * MINUTE_MS + 1);

    stop();
  });
});

describe('device-local used-versus-remaining preference', () => {
  it('changes wording while keeping the same quota quantity', () => {
    const usedMode = 'used' as const;
    const remainingMode = toggleUsageDisplayMode(usedMode);

    expect(percentText(70, usedMode)).toBe('70% used');
    expect(percentText(70, remainingMode)).toBe('30% left');
    expect(percentNumber(70, usedMode)).toBe(70);
    expect(percentNumber(70, remainingMode)).toBe(30);
    expect(barFillPercent(70, usedMode)).toBe(70);
    expect(barFillPercent(70, remainingMode)).toBe(30);

    expect(barColor(30)).toBe('#ffd60a');
    expect(remainingMode).toBe('remaining');
    expect(toggleUsageDisplayMode(remainingMode)).toBe(usedMode);
  });

  it('persists only the display choice on this device and fails closed', () => {
    expect(readUsageDisplayMode()).toBe(DEFAULT_USAGE_DISPLAY_MODE);
    writeUsageDisplayMode('remaining');
    expect(readUsageDisplayMode()).toBe('remaining');
    expect(parseUsageDisplayMode('not-a-mode')).toBe(DEFAULT_USAGE_DISPLAY_MODE);

    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('unavailable');
    });
    expect(readUsageDisplayMode()).toBe(DEFAULT_USAGE_DISPLAY_MODE);

    vi.restoreAllMocks();
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('unavailable');
    });
    expect(() => writeUsageDisplayMode('remaining')).not.toThrow();
  });

  it('does not let the wording preference change the severity result', () => {
    const usedPercent = 90;
    const leftPercent = 100 - usedPercent;

    const remainingMode = toggleUsageDisplayMode('used');
    expect(percentText(usedPercent, 'used')).toBe('90% used');
    expect(percentText(usedPercent, remainingMode)).toBe('10% left');
    expect(barColor(leftPercent)).toBe('#ff453a');
  });
});

describe('usage quota severity colors', () => {
  it('keeps the quota thresholds at their exact boundaries', () => {
    expect(barColor(41)).toBe('#30d158');
    expect(barColor(40)).toBe('#ffd60a');
    expect(barColor(20)).toBe('#ffd60a');
    expect(barColor(19)).toBe('#ff453a');
  });

  it('uses provider severity when present and stays unknown when absent', () => {
    expect(severityColor('normal')).toBe('#30d158');
    expect(severityColor('warning')).toBe('#ffd60a');
    expect(severityColor('critical')).toBe('#ff453a');
    expect(severityColor('exceeded')).toBe('#ff453a');
    expect(severityColor(null)).toBeNull();
    expect(severityColor('unrecognized')).toBeNull();
  });

  it('keeps quota color independent from the context-percent color scale', () => {
    const sameNumericInput = 90;

    // A quota with 90% remaining is healthy, while a context meter with 90% used is critical.
    expect(barColor(sameNumericInput)).toBe('#30d158');
    expect(barColor(sameNumericInput)).not.toBe('#ff453a');
  });
});
