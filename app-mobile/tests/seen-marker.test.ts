// ───────────────────────────────────────────────────────────────────
// MODULE: Device-Local Seen Marker Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  LAST_SEEN_KEY,
  changedSinceLooked,
  markLastSeen,
  readLastSeenMap,
  writeLastSeenMap,
} from '../src/shared/format/seen-marker.js';

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

describe('seen marker', () => {
  it('treats a missing key as available with no last-seen clocks', () => {
    const read = readLastSeenMap();
    expect(read.available).toBe(true);
    expect(read.lastSeenById.size).toBe(0);
  });

  it('round-trips a persisted last-seen clock', () => {
    writeLastSeenMap(new Map([['session_one', '2026-08-17T10:00:00.000Z']]));
    const read = readLastSeenMap();
    expect(read.available).toBe(true);
    expect(read.lastSeenById.get('session_one')).toBe('2026-08-17T10:00:00.000Z');
  });

  it('fails closed to unavailable when storage throws', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const read = readLastSeenMap();
    expect(read.available).toBe(false);
    expect(read.lastSeenById.size).toBe(0);
  });

  it('fails closed to unavailable when stored JSON is not a string record', () => {
    window.localStorage.setItem(LAST_SEEN_KEY, '["session_one"]');
    const read = readLastSeenMap();
    expect(read.available).toBe(false);
    expect(read.lastSeenById.size).toBe(0);
  });

  it('dots a card only when updatedAt is newer than the persisted look', () => {
    const seen = '2026-08-17T10:00:00.000Z';
    expect(changedSinceLooked('2026-08-17T10:05:00.000Z', seen, true)).toBe(true);
    expect(changedSinceLooked(seen, seen, true)).toBe(false);
    expect(changedSinceLooked('2026-08-17T09:00:00.000Z', seen, true)).toBe(false);
  });

  it('never dots when the store is unreadable or the prior look is missing', () => {
    expect(changedSinceLooked('2026-08-17T10:05:00.000Z', '2026-08-17T10:00:00.000Z', false)).toBe(
      false,
    );
    expect(changedSinceLooked('2026-08-17T10:05:00.000Z', undefined, true)).toBe(false);
    expect(changedSinceLooked('not-a-clock', '2026-08-17T10:00:00.000Z', true)).toBe(false);
  });

  it('stamps last-seen without mutating the input map', () => {
    const start = new Map([['kept', '2026-08-17T09:00:00.000Z']]);
    const next = markLastSeen(start, 'session_new', '2026-08-17T10:00:00.000Z');
    expect(next.get('session_new')).toBe('2026-08-17T10:00:00.000Z');
    expect(start.has('session_new')).toBe(false);
  });
});
