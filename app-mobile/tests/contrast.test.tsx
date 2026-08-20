// ───────────────────────────────────────────────────────────────────
// MODULE: Applied-Palette WCAG Contrast Inventory
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const STYLE = readFileSync('app-mobile/src/style.css', 'utf8');

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
  { name: 'warning on warning-soft', fg: '#8a452f', bg: '#f3e4de', min: NORMAL_TEXT },
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
  { name: 'danger on danger-soft', fg: '#ee9b91', bg: '#3a2522', min: NORMAL_TEXT },
  { name: 'warning on warning-soft', fg: '#f0b19a', bg: '#3a2720', min: NORMAL_TEXT },
  { name: 'control-border on canvas', fg: '#807a70', bg: '#181715', min: LARGE_OR_NON_TEXT },
  { name: 'focus ring on surface', fg: '#f8f8f6', bg: '#2d2a26', min: LARGE_OR_NON_TEXT },
  { name: 'focus ring on canvas', fg: '#f8f8f6', bg: '#24221f', min: LARGE_OR_NON_TEXT },
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

// The exact frozen effort-sheet tokens as applied in style.css. Text pairs
// target 4.5:1, non-text indicators (focus ring, checked border, check mark)
// target 3:1. The selection-wash pairs prove the muted-on-selection fix:
// descriptions and IDs promote to ink on selected/focused/hovered rows.
const EFFORT_SHEET_LIGHT: readonly Pair[] = [
  { name: 'carbon on raised sheet', fg: '#24221f', bg: '#ffffff', min: NORMAL_TEXT },
  { name: 'muted on raised sheet', fg: '#6c6a65', bg: '#ffffff', min: NORMAL_TEXT },
  { name: 'AA text accent on raised sheet', fg: '#8a452f', bg: '#ffffff', min: NORMAL_TEXT },
  { name: 'AA text accent on selection', fg: '#8a452f', bg: '#f3e4de', min: NORMAL_TEXT },
  {
    name: 'carbon on selection (promoted row copy)',
    fg: '#24221f',
    bg: '#f3e4de',
    min: NORMAL_TEXT,
  },
  {
    name: 'AA UI accent border on raised sheet',
    fg: '#b85f42',
    bg: '#ffffff',
    min: LARGE_OR_NON_TEXT,
  },
  {
    name: 'AA UI accent border on selection',
    fg: '#b85f42',
    bg: '#f3e4de',
    min: LARGE_OR_NON_TEXT,
  },
  { name: 'AA focus ring on raised sheet', fg: '#b85f42', bg: '#ffffff', min: LARGE_OR_NON_TEXT },
];

const EFFORT_SHEET_DARK: readonly Pair[] = [
  { name: 'text on raised sheet', fg: '#f8f8f6', bg: '#2d2a26', min: NORMAL_TEXT },
  { name: 'muted on raised sheet', fg: '#9f998f', bg: '#2d2a26', min: NORMAL_TEXT },
  { name: 'muted on selection', fg: '#9f998f', bg: '#3a2720', min: NORMAL_TEXT },
  { name: 'accent text on raised sheet', fg: '#f0b19a', bg: '#2d2a26', min: NORMAL_TEXT },
  { name: 'accent on selection', fg: '#f0b19a', bg: '#3a2720', min: NORMAL_TEXT },
  {
    name: 'accent focus ring on raised sheet',
    fg: '#f0b19a',
    bg: '#2d2a26',
    min: LARGE_OR_NON_TEXT,
  },
];

const ASK_QUESTION_LIGHT: readonly Pair[] = [
  { name: 'bone text on selected carbon row', fg: '#f8f8f6', bg: '#24221f', min: NORMAL_TEXT },
  { name: 'carbon text on raised answer row', fg: '#24221f', bg: '#ffffff', min: NORMAL_TEXT },
  {
    name: 'clay focus ring on raised answer row',
    fg: '#8a452f',
    bg: '#ffffff',
    min: LARGE_OR_NON_TEXT,
  },
  { name: 'clay error text on bone', fg: '#8a452f', bg: '#f8f8f6', min: NORMAL_TEXT },
];

const ASK_QUESTION_DARK: readonly Pair[] = [
  { name: 'bone text on selected carbon row', fg: '#f8f8f6', bg: '#24221f', min: NORMAL_TEXT },
  { name: 'bone text on raised answer row', fg: '#f8f8f6', bg: '#2d2a26', min: NORMAL_TEXT },
  {
    name: 'clay focus ring on raised answer row',
    fg: '#f0b19a',
    bg: '#2d2a26',
    min: LARGE_OR_NON_TEXT,
  },
  { name: 'clay error text on dark parchment', fg: '#f0b19a', bg: '#24221f', min: NORMAL_TEXT },
];

const TODO_LIGHT: readonly Pair[] = [
  { name: 'todo carbon on bone', fg: '#24221f', bg: '#f8f8f6', min: NORMAL_TEXT },
  { name: 'todo muted on bone', fg: '#6c6a65', bg: '#f8f8f6', min: NORMAL_TEXT },
];

const TODO_DARK: readonly Pair[] = [
  { name: 'todo text on dark page', fg: '#f8f8f6', bg: '#24221f', min: NORMAL_TEXT },
  { name: 'todo muted on dark page', fg: '#9f998f', bg: '#24221f', min: NORMAL_TEXT },
];

describe('frozen effort-sheet palette meets WCAG contrast', () => {
  for (const pair of EFFORT_SHEET_LIGHT) {
    it(`light: ${pair.name} ≥ ${pair.min}:1`, () => {
      expect(contrast(pair.fg, pair.bg)).toBeGreaterThanOrEqual(pair.min);
    });
  }
  for (const pair of EFFORT_SHEET_DARK) {
    it(`dark: ${pair.name} ≥ ${pair.min}:1`, () => {
      expect(contrast(pair.fg, pair.bg)).toBeGreaterThanOrEqual(pair.min);
    });
  }

  it('raw clay fails 3:1 against bone, so it can never be the sole indicator', () => {
    expect(contrast('#d97757', '#f8f8f6')).toBeLessThan(LARGE_OR_NON_TEXT);
  });
});

describe('ask-question accessibility palette and state contract', () => {
  for (const pair of ASK_QUESTION_LIGHT) {
    it(`light: ${pair.name} >= ${pair.min}:1`, () => {
      expect(contrast(pair.fg, pair.bg)).toBeGreaterThanOrEqual(pair.min);
    });
  }
  for (const pair of ASK_QUESTION_DARK) {
    it(`dark: ${pair.name} >= ${pair.min}:1`, () => {
      expect(contrast(pair.fg, pair.bg)).toBeGreaterThanOrEqual(pair.min);
    });
  }

  it('uses carbon selected rows, clay focus rings, and safe responsive primitives', () => {
    expect(STYLE).toMatch(
      /\.ask-question-option-row\[aria-pressed='true'\][\s\S]*?background: var\(--surface-code\);[\s\S]*?color: var\(--ink-inverse\);/u,
    );
    expect(STYLE).toMatch(
      /\.ask-question-option-row:focus-visible,[\s\S]*?outline: 3px solid var\(--accent-ink\);[\s\S]*?box-shadow: 0 0 0 1px var\(--surface-raised\);/u,
    );
    expect(STYLE).toMatch(/\.ask-question-card[\s\S]*?max-inline-size: 100%;/u);
    expect(STYLE).toMatch(/\.ask-question-free-text textarea[\s\S]*?scroll-margin-block:/u);
    expect(STYLE).toMatch(/\.ask-question-option-row[\s\S]*?min-block-size: 44px;/u);
    expect(STYLE).toMatch(/\.ask-question-submit[\s\S]*?min-block-size: 44px;/u);
    expect(STYLE).not.toMatch(
      /\.ask-question-option-row\[aria-pressed='true'\]\s*\{[^}]*background: var\(--accent\);/u,
    );
  });

  it('removes ask-question progress motion without removing status text', () => {
    expect(STYLE).toMatch(/\.ask-question-card-submitting::before[\s\S]*?animation:/u);
    expect(STYLE).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.ask-question-card-submitting::before[\s\S]*?display: none;/u,
    );
    expect(STYLE).toMatch(/\.ask-question-status[\s\S]*?line-height: 1\.4;/u);
  });
});

describe('todo projection accessibility and frozen visual contract', () => {
  for (const pair of [...TODO_LIGHT, ...TODO_DARK]) {
    it(`${pair.name} >= ${pair.min}:1`, () => {
      expect(contrast(pair.fg, pair.bg)).toBeGreaterThanOrEqual(pair.min);
    });
  }

  it('uses the clay hairline with redundant text and no floating-card treatment', () => {
    const panelRule = STYLE.match(/\.todo-panel\s*\{[^}]*\}/u)?.[0] ?? '';
    expect(panelRule).toContain('background: transparent;');
    expect(panelRule).not.toContain('box-shadow');
    expect(STYLE).toMatch(/\.todo-progress-hairline > span[\s\S]*?background: var\(--accent\);/u);
    expect(STYLE).toMatch(/\.todo-progress-count[\s\S]*?color: var\(--ink\);/u);
    expect(STYLE).toMatch(/\.todo-task-state[\s\S]*?color: var\(--ink-muted\);/u);
  });

  it('keeps controls and static rows at least 44px with carbon focus', () => {
    expect(STYLE).toMatch(
      /\.todo-refresh,[\s\S]*?\.todo-section-trigger[\s\S]*?min-inline-size: 44px;[\s\S]*?min-block-size: 44px;/u,
    );
    expect(STYLE).toMatch(/\.todo-task-row[\s\S]*?min-block-size: 44px;/u);
    expect(STYLE).toMatch(
      /\.todo-refresh\[data-focus-visible\],[\s\S]*?outline: 2px solid var\(--focus\);/u,
    );
  });

  it('honors safe-area padding, sticky header, and no layout height transitions', () => {
    const panelRule = STYLE.match(/\.todo-panel\s*\{[^}]*\}/u)?.[0] ?? '';
    expect(panelRule).toContain('env(safe-area-inset-bottom)');
    expect(STYLE).toMatch(
      /\.todo-panel-header[\s\S]*?position: sticky;[\s\S]*?inset-block-start: 0;/u,
    );
    expect(STYLE).toMatch(/\.todo-live-region[\s\S]*?position: absolute;[\s\S]*?clip: rect/u);
  });

  it('removes pulse and layout transitions under reduced motion and stops the live region from scrolling', () => {
    expect(STYLE).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.todo-panel \*[\s\S]*?animation: none !important;[\s\S]*?transition: none !important;[\s\S]*?transform: none !important;/u,
    );
    expect(STYLE).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.todo-progress-hairline > span[\s\S]*?transition: none !important;/u,
    );
  });

  it('mirrors the chevron and progress origin in RTL without inverting row order', () => {
    expect(STYLE).toMatch(
      /\[dir='rtl'\][\s\S]*?\.todo-section-chevron[\s\S]*?transform: rotate\(-90deg\);/u,
    );
    expect(STYLE).toMatch(
      /\[dir='rtl'\][\s\S]*?\.todo-progress-hairline > span[\s\S]*?transform-origin: inline-end;/u,
    );
  });
});

describe('plan-mode hardening style contract', () => {
  it('keeps the required narrow-width layout and target-size rules in CSS', () => {
    expect(STYLE).toMatch(/min-width: 320px/u);
    expect(STYLE).toMatch(/@media \(max-width: 27rem\)/u);
    expect(STYLE).toMatch(
      /\.composer-plus,[\s\S]*?\.composer-primary,[\s\S]*?min-inline-size: 44px;[\s\S]*?min-block-size: 44px;/u,
    );
    expect(STYLE).toMatch(/\.plan-ready-review,[\s\S]*?min-block-size: 44px;/u);
  });

  it('uses carbon-contrast boundaries and never raw clay as a plan focus ring', () => {
    expect(STYLE).toMatch(
      /\.plan-mode-button\.is-plan \{[\s\S]*?border-color: var\(--line-strong\);[\s\S]*?color: var\(--accent-ink\);/u,
    );
    expect(STYLE).toMatch(
      /\.composer-tray\.is-plan-mode \{[\s\S]*?border-color: var\(--line-strong\);/u,
    );
    const focusRule = STYLE.match(/\.plan-mode-button\[data-focus-visible\]\s*\{[^}]*\}/u)?.[0];
    expect(focusRule).toContain('outline: 2px solid var(--focus);');
    expect(focusRule).not.toContain('var(--accent)');
  });

  it('isolates prose direction and LTR revision values', () => {
    expect(STYLE).toMatch(/\[dir='auto'\][\s\S]*?unicode-bidi: plaintext;/u);
    expect(STYLE).toMatch(
      /\.plan-review-revision,[\s\S]*?direction: ltr;[\s\S]*?unicode-bidi: isolate;/u,
    );
  });

  it('removes positional and continuous motion under reduced motion', () => {
    expect(STYLE).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation: none !important;[\s\S]*?transition: none !important;[\s\S]*?transform: none !important;/u,
    );
  });
});

describe('rich-content release style contract', () => {
  const syntaxPairs: readonly Pair[] = [
    { name: 'syntax keyword', fg: '#f0b19a', bg: '#24221f', min: NORMAL_TEXT },
    { name: 'syntax string', fg: '#d97757', bg: '#24221f', min: NORMAL_TEXT },
    { name: 'syntax comment', fg: '#9f998f', bg: '#24221f', min: NORMAL_TEXT },
    { name: 'syntax plain', fg: '#f8f8f6', bg: '#24221f', min: NORMAL_TEXT },
  ];

  for (const pair of syntaxPairs) {
    it(`${pair.name} meets ${pair.min}:1 against the code well`, () => {
      expect(contrast(pair.fg, pair.bg)).toBeGreaterThanOrEqual(pair.min);
    });
  }

  it('keeps rich surfaces bounded and usable at release widths', () => {
    expect(STYLE).toMatch(/min-width: 320px/u);
    expect(STYLE).toMatch(/@media \(max-width: 20rem\)/u);
    expect(STYLE).toMatch(/@media \(orientation: landscape\)/u);
    expect(STYLE).toMatch(/overscroll-behavior: contain/u);
    expect(STYLE).toMatch(/env\(safe-area-inset-bottom/u);
    expect(STYLE).toMatch(/min-block-size: 44px/u);
    expect(STYLE).toMatch(/box-shadow: 0 0 0 5px var\(--accent\)/u);
  });

  it('keeps control presentation read-only and motion bounded', () => {
    expect(STYLE).toMatch(/data-control-presentation='readonly'/u);
    expect(STYLE).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition-duration: 100ms;/u,
    );
  });
});
