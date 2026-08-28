// ───────────────────────────────────────────────────────────────────
// MODULE: Roster Grouping Preference Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_CARD_DENSITY,
  DEFAULT_SIGNAL_VISIBILITY,
  FAIL_CLOSED_CARD_DENSITY,
  FAIL_CLOSED_ROSTER_GROUPING,
  parseCardDensity,
  parseCardSignalVisibility,
  parseRosterGrouping,
  readCardDensity,
  readCardSignalVisibility,
  readRosterGrouping,
  writeCardDensity,
  writeCardSignalVisibility,
  writeRosterGrouping,
} from '../src/shared/format/roster-view-preference.js';

// ───────────────────────────────────────────────────────────────────
// 2. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('roster grouping preference', () => {
  it('parses only the two known modes', () => {
    expect(parseRosterGrouping('recency')).toBe('recency');
    expect(parseRosterGrouping('status')).toBe('status');
  });

  it('fails closed to recency on an unparseable value', () => {
    expect(parseRosterGrouping('nope')).toBe(FAIL_CLOSED_ROSTER_GROUPING);
    expect(parseRosterGrouping(null)).toBe(FAIL_CLOSED_ROSTER_GROUPING);
    expect(parseRosterGrouping({ grouping: 'status' })).toBe(FAIL_CLOSED_ROSTER_GROUPING);
  });

  it('fails closed to recency when storage throws', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(readRosterGrouping()).toBe(FAIL_CLOSED_ROSTER_GROUPING);
  });

  it('does not throw when persistence is unavailable', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => writeRosterGrouping('recency')).not.toThrow();
  });
});

describe('card density preference', () => {
  it('parses known density values and fails closed otherwise', () => {
    expect(parseCardDensity('compact')).toBe('compact');
    expect(parseCardDensity('detailed')).toBe('detailed');
    expect(parseCardDensity('nope')).toBe(FAIL_CLOSED_CARD_DENSITY);
    expect(parseCardDensity(null)).toBe(FAIL_CLOSED_CARD_DENSITY);
  });

  it('reads and writes only the device-local density', () => {
    expect(readCardDensity()).toBe(DEFAULT_CARD_DENSITY);
    writeCardDensity('compact');
    expect(readCardDensity()).toBe('compact');
  });

  it('fails closed when density storage throws', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(readCardDensity()).toBe(FAIL_CLOSED_CARD_DENSITY);
  });
});

describe('card signal visibility preference', () => {
  it('merges known boolean choices over visible defaults', () => {
    expect(parseCardSignalVisibility({ preview: false })).toEqual({
      ...DEFAULT_SIGNAL_VISIBILITY,
      preview: false,
    });
    expect(parseCardSignalVisibility('nope')).toEqual(DEFAULT_SIGNAL_VISIBILITY);
  });

  it('reads and writes signal choices only on the device', () => {
    writeCardSignalVisibility({ ...DEFAULT_SIGNAL_VISIBILITY, context: false });
    expect(readCardSignalVisibility()).toEqual({
      ...DEFAULT_SIGNAL_VISIBILITY,
      context: false,
    });
  });

  it('fails closed to visible signals when storage is unreadable', () => {
    window.localStorage.setItem('pi-remote.card-signal-visibility', '{not-json');
    expect(readCardSignalVisibility()).toEqual(DEFAULT_SIGNAL_VISIBILITY);

    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => writeCardSignalVisibility(DEFAULT_SIGNAL_VISIBILITY)).not.toThrow();
  });
});
