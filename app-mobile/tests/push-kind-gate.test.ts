// MODULE: Push notification kind gate tests

import { describe, expect, it } from 'vitest';

import { applyPushKindGateThenThrottle } from '../src/shared/format/push-kind-gate';

// ───────────────────────────────────────────────────────────────────
// 1. FIXTURES
// ───────────────────────────────────────────────────────────────────

const notifications = [
  { id: 'muted-build', kind: 'build' },
  { id: 'wanted-question', kind: 'question' },
  { id: 'wanted-follow-up', kind: 'question' },
] as const;

// ───────────────────────────────────────────────────────────────────
// 2. TESTS
// ───────────────────────────────────────────────────────────────────

describe('applyPushKindGateThenThrottle', () => {
  it('drops a muted kind before it consumes the throttle budget', () => {
    const result = applyPushKindGateThenThrottle({
      items: notifications,
      enabledByKind: { build: false, question: true },
      throttleLimit: 1,
    });

    expect(result).toEqual([{ id: 'wanted-question', kind: 'question' }]);
  });

  it('returns nothing when the kind capability is absent', () => {
    const result = applyPushKindGateThenThrottle({
      items: notifications,
      throttleLimit: 1,
    });

    expect(result).toEqual([]);
  });
});
