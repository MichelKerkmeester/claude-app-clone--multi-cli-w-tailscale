// ───────────────────────────────────────────────────────────────────
// MODULE: Live Activity Staleness Watchdog
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  LIVE_ACTIVITY_STALE_MS,
  isLiveActivityStale,
  resolveLiveActivityStaleness,
  scheduleLiveActivityStaleness,
} from '../src/shared/state/live-activity-staleness.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const UPDATED_AT = Date.parse('2026-08-17T10:00:00.000Z');
const PINNED_STALE_WINDOW_MS = 1_200_000;

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('live activity staleness', () => {
  it('keeps a surface live just inside the window', () => {
    const result = resolveLiveActivityStaleness({
      updatedAt: UPDATED_AT,
      now: UPDATED_AT + PINNED_STALE_WINDOW_MS - 1,
    });

    expect(LIVE_ACTIVITY_STALE_MS).toBe(PINNED_STALE_WINDOW_MS);
    expect(result).toEqual({ isStale: false, delayMs: 1 });
    expect(isLiveActivityStale(UPDATED_AT, UPDATED_AT + PINNED_STALE_WINDOW_MS - 1)).toBe(false);
  });

  it('grays a surface just outside the window', () => {
    const now = UPDATED_AT + PINNED_STALE_WINDOW_MS + 1;

    expect(resolveLiveActivityStaleness({ updatedAt: UPDATED_AT, now })).toEqual({
      isStale: true,
      delayMs: 0,
    });
    expect(isLiveActivityStale(UPDATED_AT, now)).toBe(true);
  });

  it('schedules the exact boundary instead of polling', () => {
    let scheduledDelay: number | undefined;
    let scheduledCallback: (() => void) | undefined;
    let cancelledHandle: unknown;

    const stop = scheduleLiveActivityStaleness(
      { updatedAt: UPDATED_AT, now: UPDATED_AT + PINNED_STALE_WINDOW_MS - 1 },
      () => undefined,
      {
        schedule: (callback, delayMs) => {
          scheduledCallback = callback;
          scheduledDelay = delayMs;
          return 'watchdog';
        },
        cancel: (handle) => {
          cancelledHandle = handle;
        },
      },
    );

    expect(scheduledDelay).toBe(1);
    expect(scheduledCallback).toBeTypeOf('function');
    stop();
    expect(cancelledHandle).toBe('watchdog');
  });

  it('fails closed for an unparseable update time', () => {
    expect(resolveLiveActivityStaleness({ updatedAt: 'not-a-time', now: UPDATED_AT })).toEqual({
      isStale: true,
      delayMs: 0,
    });
  });
});
