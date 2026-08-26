// ───────────────────────────────────────────────────────────────────
// MODULE: Haptics Wrapper Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { afterEach, describe, expect, it, vi } from 'vitest';

import { fireHaptic } from '../src/shared/chrome/haptics.js';

// ───────────────────────────────────────────────────────────────────
// 2. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('fireHaptic', () => {
  it('no-ops when vibrate is absent', () => {
    vi.stubGlobal('navigator', { vibrate: undefined });
    expect(() => fireHaptic('selection')).not.toThrow();
  });

  it('no-ops when vibrate throws', () => {
    vi.stubGlobal('navigator', {
      vibrate: () => {
        throw new Error('denied');
      },
    });
    expect(() => fireHaptic('error')).not.toThrow();
  });

  it('forwards a known intent when vibrate exists', () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal('navigator', { vibrate });
    fireHaptic('success');
    expect(vibrate).toHaveBeenCalledTimes(1);
  });
});
