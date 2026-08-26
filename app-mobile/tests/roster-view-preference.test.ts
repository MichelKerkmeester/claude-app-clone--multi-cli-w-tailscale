// ───────────────────────────────────────────────────────────────────
// MODULE: Roster Grouping Preference Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  FAIL_CLOSED_ROSTER_GROUPING,
  parseRosterGrouping,
  readRosterGrouping,
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
