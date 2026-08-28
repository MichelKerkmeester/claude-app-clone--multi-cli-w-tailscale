// ───────────────────────────────────────────────────────────────────
// MODULE: Keyboard Reorder Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { moveDown, moveUp } from '../src/shared/primitives/a11y/keyboard-reorder.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const ITEMS = ['first', 'second', 'third'] as const;

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('keyboard reorder helpers', () => {
  it('moves an item up without mutating the input', () => {
    expect(moveUp(ITEMS, 2)).toEqual(['first', 'third', 'second']);
    expect(ITEMS).toEqual(['first', 'second', 'third']);
  });

  it('clamps moveUp at the first item', () => {
    expect(moveUp(ITEMS, 0)).toEqual(['first', 'second', 'third']);
  });

  it('moves an item down without mutating the input', () => {
    expect(moveDown(ITEMS, 0)).toEqual(['second', 'first', 'third']);
    expect(ITEMS).toEqual(['first', 'second', 'third']);
  });

  it('clamps moveDown at the last item', () => {
    expect(moveDown(ITEMS, 2)).toEqual(['first', 'second', 'third']);
  });
});
