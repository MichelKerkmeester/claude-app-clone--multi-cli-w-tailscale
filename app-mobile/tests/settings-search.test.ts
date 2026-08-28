// ───────────────────────────────────────────────────────────────────
// MODULE: Settings Search Tests
// ───────────────────────────────────────────────────────────────────

// Search results must come from the static vocabulary that describes the
// settings rows, not from a host response or a test-only label.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { searchSettingsRows } from '../src/shared/format/settings-search.js';

// ───────────────────────────────────────────────────────────────────
// 2. TESTS
// ───────────────────────────────────────────────────────────────────

describe('settings search', () => {
  it('surfaces the attention row for the synonym approval', () => {
    const results = searchSettingsRows('approval');

    expect(results.map((row) => row.id)).toContain('needs_input');
    expect(results.find((row) => row.id === 'needs_input')?.title).toBe('Needs input');
  });

  it('surfaces device removal for the synonym unpair', () => {
    const results = searchSettingsRows('unpair');

    expect(results.map((row) => row.id)).toContain('revoke-device');
    expect(results.find((row) => row.id === 'revoke-device')?.title).toBe('Revoke this device');
  });

  it('returns no row for an unknown word', () => {
    expect(searchSettingsRows('spaceship')).toEqual([]);
  });
});
