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

import { compactId, relativeTimeAt, timeBucket, absoluteTimeLabel } from '../src/shared/format/view-helpers.js';

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

describe('timeBucket', () => {
  const NOW = Date.parse('2026-08-17T12:00:00.000Z');

  it('assigns active / today / yesterday / older from the injected clock', () => {
    expect(timeBucket('2026-08-17T11:30:00.000Z', NOW)).toBe('active');
    expect(timeBucket('2026-08-17T09:00:00.000Z', NOW)).toBe('today');
    expect(timeBucket('2026-08-16T12:00:00.000Z', NOW)).toBe('yesterday');
    expect(timeBucket('2026-08-10T12:00:00.000Z', NOW)).toBe('older');
  });

  it('keeps an unparseable timestamp in the oldest bucket', () => {
    expect(timeBucket('not-a-date', NOW)).toBe('older');
  });

  it('does not invent a searchable title from a compact id', () => {
    expect(compactId('session_clock_001')).toBe('session_clock_001');
  });
});

describe('absoluteTimeLabel', () => {
  it('returns a canonical ISO string for a parseable clock', () => {
    expect(absoluteTimeLabel('2026-08-17T10:00:00.000Z')).toBe('2026-08-17T10:00:00.000Z');
  });

  it('keeps an unparseable clock visibly unresolved', () => {
    expect(absoluteTimeLabel('not-a-timestamp')).toBe('unknown time');
  });
});