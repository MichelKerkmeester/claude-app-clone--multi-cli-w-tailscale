// ───────────────────────────────────────────────────────────────────
// MODULE: View Helper Seam Tests
// ───────────────────────────────────────────────────────────────────

// Proves the time-dependent helper is deterministic under an injected
// clock: no internal Date.now() read, so a fixed `now` yields a fixed
// label, and an unparseable timestamp stays visibly unknown.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { relativeTimeAt } from '../src/shared/format/view-helpers.js';

// ───────────────────────────────────────────────────────────────────
// 2. TESTS
// ───────────────────────────────────────────────────────────────────

describe('relativeTimeAt', () => {
  const NOW = Date.parse('2026-08-17T12:00:00.000Z');

  it('labels each relative bucket from the injected clock', () => {
    expect(relativeTimeAt('2026-08-17T11:59:59.000Z', NOW)).toBe('just now');
    expect(relativeTimeAt('2026-08-17T11:55:00.000Z', NOW)).toBe('5m ago');
    expect(relativeTimeAt('2026-08-17T10:00:00.000Z', NOW)).toBe('2h ago');
    expect(relativeTimeAt('2026-08-14T12:00:00.000Z', NOW)).toBe('3d ago');
  });

  it('is deterministic: identical inputs produce identical labels', () => {
    const first = relativeTimeAt('2026-08-17T10:00:00.000Z', NOW);
    const second = relativeTimeAt('2026-08-17T10:00:00.000Z', NOW);
    expect(first).toBe(second);
  });

  it('keeps a genuinely unknown timestamp visibly unresolved', () => {
    expect(relativeTimeAt('not-a-timestamp', NOW)).toBe('unknown time');
  });

  it('clamps negative elapsed to the newest label, preserving legacy rendering', () => {
    // A future-dated card reads as recent, never as a negative age.
    expect(relativeTimeAt('2026-08-18T00:00:00.000Z', NOW)).toBe('just now');
  });
});