// ───────────────────────────────────────────────────────────────────
// MODULE: Tail-Preserving Budgeted Excerpt Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { excerptToBudget } from '../src/shared/format/excerpt.js';

// ───────────────────────────────────────────────────────────────────
// 2. TESTS
// ───────────────────────────────────────────────────────────────────

describe('excerptToBudget', () => {
  it('returns under-budget text unchanged', () => {
    const text = 'newest turn only';
    expect(excerptToBudget(text, 64)).toBe(text);
    expect(excerptToBudget(text, 64)).not.toContain('omitted');
  });

  it('returns exact-boundary text unchanged', () => {
    const text = 'abcdefghij';
    expect(excerptToBudget(text, text.length)).toBe(text);
    expect(excerptToBudget(text, text.length)).not.toContain('omitted');
  });

  it('keeps the newest tail over budget and names the dropped count', () => {
    // The budget must leave room for the marker as well as the tail, so it is
    // sized above the marker's own length rather than below it.
    const text = 'ABCDEFGHIJ'.repeat(10);
    const budget = 64;
    const result = excerptToBudget(text, budget);
    const kept = result.slice(result.indexOf('\n') + 1);

    expect(result.length).toBeLessThanOrEqual(budget);
    expect(result).toContain(`[Earlier … omitted: ${text.length - kept.length} characters]`);
    expect(text.endsWith(kept)).toBe(true);
    expect(kept.length).toBeGreaterThan(0);
    expect(result.startsWith(text.slice(0, 4))).toBe(false);
  });

  it('bounds the whole result, marker included, at the budget', () => {
    // A caller uses this to fit a context window: a result longer than the
    // budget would overflow exactly what it was asked to protect.
    for (const budget of [40, 50, 64, 120, 999]) {
      const result = excerptToBudget('x'.repeat(5_000), budget);
      expect(result.length).toBeLessThanOrEqual(budget);
      expect(result).toContain('omitted');
      expect(result.endsWith('x')).toBe(true);
    }
  });

  it('states the true dropped count for the tail it actually kept', () => {
    const text = 'abcdefghij'.repeat(40);
    const result = excerptToBudget(text, 80);
    const kept = result.slice(result.indexOf('\n') + 1);
    expect(result).toContain(`[Earlier … omitted: ${text.length - kept.length} characters]`);
    expect(text.endsWith(kept)).toBe(true);
  });

  it('still names the omission when the budget cannot hold the marker', () => {
    const result = excerptToBudget('y'.repeat(300), 5);
    expect(result).toContain('omitted: 300 characters');
  });

  it('never cuts a surrogate pair in half at the tail boundary', () => {
    // A lone surrogate is ill-formed UTF-16: it degrades to a replacement
    // character on serialisation, corrupting the newest content this module
    // is specifically meant to preserve intact.
    for (let budget = 40; budget <= 80; budget += 1) {
      const text = `${'x'.repeat(200)}😀${'END'}`;
      const result = excerptToBudget(text, budget);
      expect(result.length).toBeLessThanOrEqual(budget);
      // encodeURIComponent throws on an unpaired surrogate, so it is a direct
      // well-formedness check on the kept tail.
      expect(() => encodeURIComponent(result)).not.toThrow();
    }
  });
});
