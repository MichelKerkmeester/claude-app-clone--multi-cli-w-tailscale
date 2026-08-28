// ───────────────────────────────────────────────────────────────────
// MODULE: Recent Sessions Dock Token Tests
// ───────────────────────────────────────────────────────────────────

// The dock's ring colours must resolve through the three theme-local token
// blocks so the selected state cannot inherit a light-only halo.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { readCssCorpus } from './support/css-corpus';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const STYLE = readCssCorpus();

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('recent sessions dock theme tokens', () => {
  it('declares the dock surface and status tokens in light, dark, and system-dark themes', () => {
    expect(STYLE.match(/--dock-surface: var\(--surface-raised\);/gu)).toHaveLength(3);
    expect(STYLE.match(/--dock-surface-selected: var\(--accent-soft\);/gu)).toHaveLength(3);
    expect(STYLE.match(/--dock-status-idle: var\(--success\);/gu)).toHaveLength(3);
    expect(STYLE.match(/--dock-status-running: var\(--accent-ink\);/gu)).toHaveLength(3);
  });

  it('composites idle and selected dot rings from dock tokens', () => {
    expect(STYLE).toMatch(
      /\.recent-sessions--dot\.is-idle[\s\S]*?box-shadow: 0 0 0 2px var\(--dock-ring-idle\);/u,
    );
    expect(STYLE).toMatch(
      /\.recent-sessions--chip\.is-selected \.recent-sessions--dot\.is-idle[\s\S]*?box-shadow: 0 0 0 2px var\(--dock-selected-ring-idle\);/u,
    );

    // A rule naming the token says nothing about what the token resolves to. A
    // ring defined as the bare status colour is the dark-mode halo this pair of
    // tokens exists to prevent, and it would satisfy the two matches above. Each
    // ring must stay a blend against the surface it actually sits on, in every
    // theme block, which is the property that keeps the dot readable.
    expect(
      STYLE.match(
        /--dock-ring-idle: color-mix\(in oklch, var\(--dock-surface\) \d+%, var\(--dock-status-idle\)\);/gu,
      ),
    ).toHaveLength(3);
    expect(
      STYLE.match(
        /--dock-selected-ring-idle: color-mix\(in oklch, var\(--dock-surface-selected\) \d+%, var\(--dock-status-idle\)\);/gu,
      ),
    ).toHaveLength(3);
  });
});
