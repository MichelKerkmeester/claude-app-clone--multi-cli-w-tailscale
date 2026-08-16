// ───────────────────────────────────────────────────────────────────
// MODULE: Applied-Palette WCAG Contrast Inventory
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

// The exact Claude semantic values applied in style.css. This computes the real WCAG
// 2.x contrast ratio for each meaningful foreground/background pair so the "meets WCAG
// contrast" requirement is proven by arithmetic, not asserted.

function channel(component: number): number {
  const c = component / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const NORMAL_TEXT = 4.5;
const LARGE_OR_NON_TEXT = 3;

interface Pair {
  readonly name: string;
  readonly fg: string;
  readonly bg: string;
  readonly min: number;
}

const LIGHT: readonly Pair[] = [
  { name: 'ink on canvas', fg: '#121212', bg: '#f8f8f6', min: NORMAL_TEXT },
  { name: 'ink-secondary on surface', fg: '#373734', bg: '#ffffff', min: NORMAL_TEXT },
  { name: 'ink-muted on canvas', fg: '#6c6a65', bg: '#f8f8f6', min: NORMAL_TEXT },
  { name: 'accent-ink (clay text) on canvas', fg: '#8a452f', bg: '#f8f8f6', min: NORMAL_TEXT },
  { name: 'action-fg on action-bg', fg: '#f8f8f6', bg: '#121212', min: NORMAL_TEXT },
  { name: 'success on success-soft', fg: '#37624a', bg: '#e7eee9', min: NORMAL_TEXT },
  { name: 'danger on danger-soft', fg: '#8d382e', bg: '#f4e7e4', min: NORMAL_TEXT },
  { name: 'control-border on canvas', fg: '#7b7974', bg: '#f8f8f6', min: LARGE_OR_NON_TEXT },
  { name: 'focus ring on canvas', fg: '#121212', bg: '#f8f8f6', min: LARGE_OR_NON_TEXT },
];

const DARK: readonly Pair[] = [
  { name: 'ink on canvas', fg: '#f4f1eb', bg: '#181715', min: NORMAL_TEXT },
  { name: 'ink-secondary on surface', fg: '#d8d3ca', bg: '#24221f', min: NORMAL_TEXT },
  { name: 'ink-muted on surface', fg: '#b5afa5', bg: '#24221f', min: NORMAL_TEXT },
  { name: 'accent-ink (clay text) on canvas', fg: '#f0b19a', bg: '#181715', min: NORMAL_TEXT },
  { name: 'action-fg on action-bg', fg: '#181715', bg: '#f4f1eb', min: NORMAL_TEXT },
  { name: 'success on success-soft', fg: '#8fc4a4', bg: '#203129', min: NORMAL_TEXT },
  { name: 'control-border on canvas', fg: '#807a70', bg: '#181715', min: LARGE_OR_NON_TEXT },
];

const MODEL_SHEET_LIGHT: readonly Pair[] = [
  { name: 'carbon on bone', fg: '#24221f', bg: '#f8f8f6', min: NORMAL_TEXT },
  { name: 'carbon on raised sheet', fg: '#24221f', bg: '#ffffff', min: NORMAL_TEXT },
  { name: 'muted on raised sheet', fg: '#6c6a65', bg: '#ffffff', min: NORMAL_TEXT },
  { name: 'AA text accent on bone', fg: '#8a452f', bg: '#f8f8f6', min: NORMAL_TEXT },
  { name: 'AA text accent on raised sheet', fg: '#8a452f', bg: '#ffffff', min: NORMAL_TEXT },
  { name: 'AA UI accent on raised sheet', fg: '#b85f42', bg: '#ffffff', min: LARGE_OR_NON_TEXT },
];

const MODEL_SHEET_DARK: readonly Pair[] = [
  { name: 'text on page', fg: '#f8f8f6', bg: '#24221f', min: NORMAL_TEXT },
  { name: 'text on raised sheet', fg: '#f8f8f6', bg: '#2d2a26', min: NORMAL_TEXT },
  { name: 'muted on raised sheet', fg: '#9f998f', bg: '#2d2a26', min: NORMAL_TEXT },
  { name: 'accent text on raised sheet', fg: '#f0b19a', bg: '#2d2a26', min: NORMAL_TEXT },
  {
    name: 'accent focus ring on raised sheet',
    fg: '#f0b19a',
    bg: '#2d2a26',
    min: LARGE_OR_NON_TEXT,
  },
];

describe('applied Claude palette meets WCAG contrast', () => {
  for (const pair of LIGHT) {
    it(`light: ${pair.name} ≥ ${pair.min}:1`, () => {
      expect(contrast(pair.fg, pair.bg)).toBeGreaterThanOrEqual(pair.min);
    });
  }
  for (const pair of DARK) {
    it(`dark: ${pair.name} ≥ ${pair.min}:1`, () => {
      expect(contrast(pair.fg, pair.bg)).toBeGreaterThanOrEqual(pair.min);
    });
  }
});

describe('frozen model-switcher palette meets WCAG contrast', () => {
  for (const pair of MODEL_SHEET_LIGHT) {
    it(`light: ${pair.name} ≥ ${pair.min}:1`, () => {
      expect(contrast(pair.fg, pair.bg)).toBeGreaterThanOrEqual(pair.min);
    });
  }
  for (const pair of MODEL_SHEET_DARK) {
    it(`dark: ${pair.name} ≥ ${pair.min}:1`, () => {
      expect(contrast(pair.fg, pair.bg)).toBeGreaterThanOrEqual(pair.min);
    });
  }

  it('does not treat raw clay as normal-size text on bone', () => {
    expect(contrast('#d97757', '#f8f8f6')).toBeLessThan(NORMAL_TEXT);
  });
});
