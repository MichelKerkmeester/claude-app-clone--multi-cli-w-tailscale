// ───────────────────────────────────────────────────────────────────
// MODULE: Format Favorite Preference Tests
// ───────────────────────────────────────────────────────────────────

// The dock reads this format-owned preference so pin confirmation stays
// device-local and cannot cross the host transport boundary.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  readFavoritePreference,
  toggleFavoriteId,
  writeFavoriteIds,
} from '../src/shared/format/favorite-preference.js';

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

describe('format favorite preference', () => {
  it('round-trips pins without changing the host-facing data shape', () => {
    writeFavoriteIds(new Set(['pinned-session']));

    const preference = readFavoritePreference();
    expect(preference.available).toBe(true);
    expect([...preference.ids]).toEqual(['pinned-session']);
  });

  it('fails closed when local storage cannot be read', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('unavailable');
    });

    expect(readFavoritePreference()).toEqual({ available: false, ids: new Set() });
  });

  it('toggles a copied set so the caller can persist the local choice explicitly', () => {
    const initial = new Set(['kept']);

    expect(toggleFavoriteId(initial, 'new-pin')).toEqual(new Set(['kept', 'new-pin']));
    expect(initial).toEqual(new Set(['kept']));
  });
});
