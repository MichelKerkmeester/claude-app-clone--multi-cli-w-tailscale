// ───────────────────────────────────────────────────────────────────
// MODULE: State-scoped Latched Dismiss
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { createLatchedDismiss } from '../src/shared/state/latched-dismiss.js';

// ───────────────────────────────────────────────────────────────────
// 2. TESTS
// ───────────────────────────────────────────────────────────────────

describe('state-scoped latched dismiss', () => {
  it('keeps the row hidden across repeated reads of the dismissed state', () => {
    const dismiss = createLatchedDismiss<string>();

    expect(dismiss.isVisible('working')).toBe(true);
    dismiss.dismiss('working');

    expect(dismiss.isVisible('working')).toBe(false);
    expect(dismiss.isVisible('working')).toBe(false);
    expect(dismiss.isVisible('working')).toBe(false);
  });

  it('shows the row again after the underlying state genuinely moves', () => {
    const dismiss = createLatchedDismiss<string>();

    dismiss.dismiss('working');

    expect(dismiss.isVisible('done')).toBe(true);
    expect(dismiss.isVisible('done')).toBe(true);
  });
});
