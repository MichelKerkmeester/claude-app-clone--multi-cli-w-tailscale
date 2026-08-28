// ───────────────────────────────────────────────────────────────────
// MODULE: Host-Gated Usage Window Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import {
  getUsageReadingState,
  hasUsageCapability,
  projectUsageWindow,
  selectGatingWindow,
  USAGE_RATE_LIMIT_GRACE_MS,
  USAGE_STALE_AFTER_MS,
  type UsageReading,
  type UsageWindow,
} from '$shared/format/usage-format.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const NOW = 10_000_000;

function reading(usedPercent: number, observedAt = NOW - 1_000): UsageReading {
  return { usedPercent, resetsAt: null, observedAt, severity: 'normal' };
}

function usageWindow(overrides: Partial<UsageWindow> = {}): UsageWindow {
  return {
    id: 'hour',
    label: 'Hourly window',
    isActive: false,
    primary: false,
    poll: 'success',
    current: reading(20),
    lastGood: null,
    rateLimitedAt: null,
    ...overrides,
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('host-gated usage windows', () => {
  it('selects the host-marked gating window instead of the fullest usage bar', () => {
    const fullest = usageWindow({
      id: 'week',
      label: 'Weekly window',
      current: reading(95),
    });
    const gating = usageWindow({
      id: 'hour',
      label: 'Hourly window',
      isActive: true,
      current: reading(25),
    });

    expect(selectGatingWindow([fullest, gating])).toBe(gating);
  });

  it('preserves the last good reading after a failed poll and marks it stale', () => {
    const previous = reading(37, NOW - 5 * 60_000);
    const projection = projectUsageWindow(
      usageWindow({ poll: 'failed', current: null, lastGood: previous }),
      NOW,
    );

    expect(projection.state).toBe('shown');
    expect(projection.reading?.usedPercent).toBe(37);
    expect(projection.stale).toBe(true);
  });

  it('keeps an unavailable window from exposing a number', () => {
    const projection = projectUsageWindow(
      usageWindow({ poll: 'unavailable', current: null, lastGood: null }),
      NOW,
    );

    expect(projection.state).toBe('unavailable');
    expect(projection.reading).toBeNull();
  });

  it('decays a reading only after the named stale threshold', () => {
    // Pin the threshold itself. Deriving both fixtures from the constant makes
    // the boundary relative, so it would hold for any value — including one
    // large enough that a reading never decays at all.
    expect(USAGE_STALE_AFTER_MS).toBe(30 * 60 * 1000);

    const justUnder = reading(41, NOW - 29 * 60 * 1000);
    const justOver = reading(41, NOW - 31 * 60 * 1000);

    expect(getUsageReadingState(justUnder, NOW)).toBe('fresh');
    expect(getUsageReadingState(justOver, NOW)).toBe('unknown');
  });

  it('keeps a rate-limited last good reading through the named grace threshold', () => {
    // Pin the grace window for the same reason as the stale threshold above:
    // fixtures derived from the constant follow it wherever it moves.
    expect(USAGE_RATE_LIMIT_GRACE_MS).toBe(24 * 60 * 60 * 1000);

    const rateLimitedAt = NOW - 23 * 60 * 60 * 1000;
    const lastGood = reading(63, NOW - 31 * 60 * 1000);
    const window = usageWindow({
      poll: 'rate-limited',
      current: null,
      lastGood,
      rateLimitedAt,
    });

    const withinGrace = projectUsageWindow(window, NOW);
    const afterGrace = projectUsageWindow(window, NOW + USAGE_RATE_LIMIT_GRACE_MS);

    expect(withinGrace.state).toBe('shown');
    expect(withinGrace.reading?.usedPercent).toBe(63);
    expect(withinGrace.stale).toBe(true);
    expect(afterGrace.state).toBe('unavailable');
    expect(afterGrace.reading).toBeNull();
  });

  it('requires exactly one host gating marker before enabling the usage surface', () => {
    const unmarked = usageWindow();
    const marked = usageWindow({ isActive: true });

    expect(hasUsageCapability({ windows: [unmarked] })).toBe(false);
    expect(hasUsageCapability({ windows: [marked, { ...marked, id: 'day' }] })).toBe(false);
    expect(hasUsageCapability({ windows: [unmarked, marked] })).toBe(true);
  });
});
