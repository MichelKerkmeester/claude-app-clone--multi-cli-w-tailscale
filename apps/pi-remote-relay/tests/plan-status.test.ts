import { describe, expect, it } from 'vitest';

import { PLAN_STATUS_KEY, parsePlanStatus } from '../src/runtime/plan-status.js';

describe('plan status parsing', () => {
  it('accepts the pinned plan modes', () => {
    expect(
      parsePlanStatus({
        type: 'extension_ui_request',
        method: 'setStatus',
        statusKey: PLAN_STATUS_KEY,
        statusText: 'build',
      }),
    ).toBe('build');
    expect(
      parsePlanStatus({
        type: 'extension_ui_request',
        method: 'setStatus',
        statusKey: PLAN_STATUS_KEY,
        statusText: 'plan',
      }),
    ).toBe('plan');
    expect(
      parsePlanStatus({
        type: 'extension_ui_request',
        method: 'setStatus',
        statusKey: PLAN_STATUS_KEY,
        statusText: 'executing-plan',
      }),
    ).toBe('executing-plan');
  });

  it('maps error and unknown status text to unknown', () => {
    for (const statusText of ['error', 'other', undefined, 42, null]) {
      expect(
        parsePlanStatus({
          type: 'extension_ui_request',
          method: 'setStatus',
          statusKey: PLAN_STATUS_KEY,
          statusText,
        }),
      ).toBe('unknown');
    }
  });

  it('ignores foreign or malformed records', () => {
    expect(
      parsePlanStatus({
        type: 'extension_ui_request',
        method: 'setStatus',
        statusKey: 'other-extension-status',
        statusText: 'plan',
      }),
    ).toBeNull();
    expect(
      parsePlanStatus({
        type: 'extension_ui_request',
        method: 'otherMethod',
        statusKey: PLAN_STATUS_KEY,
        statusText: 'plan',
      }),
    ).toBeNull();
    expect(
      parsePlanStatus({
        type: 'other_event',
        method: 'setStatus',
        statusKey: PLAN_STATUS_KEY,
        statusText: 'plan',
      }),
    ).toBeNull();
    expect(parsePlanStatus(null)).toBeNull();
    expect(parsePlanStatus('not-a-record')).toBeNull();
    expect(parsePlanStatus(42)).toBeNull();
  });
});
