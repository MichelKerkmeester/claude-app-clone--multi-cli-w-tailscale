// ───────────────────────────────────────────────────────────────────
// MODULE: Device-Local Favorite Preference Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  readFavoritePreference,
  toggleFavoriteId,
  writeFavoriteIds,
} from '../src/shared/state/favorite-preference.js';

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

describe('favorite preference', () => {
  it('treats a missing key as available with no pins', () => {
    expect(readFavoritePreference()).toEqual({ available: true, ids: new Set() });
  });

  it('round-trips a persisted id set', () => {
    writeFavoriteIds(new Set(['session_one', 'session_two']));
    const read = readFavoritePreference();
    expect(read.available).toBe(true);
    expect([...read.ids]).toEqual(['session_one', 'session_two']);
  });

  it('fails closed to unavailable when storage throws', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const read = readFavoritePreference();
    expect(read.available).toBe(false);
    expect(read.ids.size).toBe(0);
  });

  it('fails closed to unavailable when stored JSON is not a string array', () => {
    window.localStorage.setItem('pi-remote.session-favorite', '{"ids":["x"]}');
    const read = readFavoritePreference();
    expect(read.available).toBe(false);
    expect(read.ids.size).toBe(0);
  });

  it('does not throw when persistence is unavailable', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => writeFavoriteIds(new Set(['session_one']))).not.toThrow();
  });

  it('toggles an id without mutating the input set', () => {
    const start = new Set(['kept']);
    const added = toggleFavoriteId(start, 'session_new');
    expect([...added].sort()).toEqual(['kept', 'session_new']);
    expect([...start]).toEqual(['kept']);
    expect([...toggleFavoriteId(added, 'session_new')]).toEqual(['kept']);
  });
});
