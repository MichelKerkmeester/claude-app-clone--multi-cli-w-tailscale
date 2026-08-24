// ───────────────────────────────────────────────────────────────────
// MODULE: Plan Status TESTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  PLAN_ARTIFACT_KEY,
  PLAN_STATUS_KEY,
  isPlanArtifactPublication,
  parsePlanArtifact,
  parsePlanStatus,
} from '../src/runtime/plan-status.js';

// ───────────────────────────────────────────────────────────────────
// 2. TESTS
// ───────────────────────────────────────────────────────────────────

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

describe('plan artifact parsing', () => {
  const artifactEvent = {
    type: 'extension_ui_request',
    method: 'setPlan',
    statusKey: PLAN_ARTIFACT_KEY,
    plan: {
      planId: 'plan_007',
      planRevision: 3,
      planToken: 'token_plan_binding_abcdef0123456789',
      validity: 'valid',
      title: 'Harden the relay boundary',
      summary: 'Redacted outline only',
      stepCount: 4,
      approachCount: 2,
    },
  };

  it('parses only the pinned structured artifact publication', () => {
    expect(isPlanArtifactPublication(artifactEvent)).toBe(true);
    expect(parsePlanArtifact(artifactEvent)).toEqual({
      planId: 'plan_007',
      planRevision: 3,
      planToken: 'token_plan_binding_abcdef0123456789',
      validity: 'valid',
      title: 'Harden the relay boundary',
      summary: 'Redacted outline only',
      stepCount: 4,
      approachCount: 2,
    });
    expect(
      parsePlanArtifact({
        ...artifactEvent,
        plan: { ...artifactEvent.plan, validity: 'superseded' },
      })?.validity,
    ).toBe('superseded');
  });

  it('rejects foreign, malformed, or unbounded publications', () => {
    expect(parsePlanArtifact(null)).toBeNull();
    expect(parsePlanArtifact('not-a-record')).toBeNull();
    expect(
      parsePlanArtifact({ type: 'other_event', method: 'setPlan', statusKey: PLAN_ARTIFACT_KEY }),
    ).toBeNull();
    expect(
      parsePlanArtifact({ ...artifactEvent, method: 'setStatus', statusKey: PLAN_STATUS_KEY }),
    ).toBeNull();
    expect(parsePlanArtifact({ ...artifactEvent, statusKey: 'other-extension-status' })).toBeNull();
    expect(parsePlanArtifact({ ...artifactEvent, plan: undefined })).toBeNull();
    expect(
      parsePlanArtifact({ ...artifactEvent, plan: { ...artifactEvent.plan, planId: 'a/b' } }),
    ).toBeNull();
    expect(
      parsePlanArtifact({ ...artifactEvent, plan: { ...artifactEvent.plan, planId: '' } }),
    ).toBeNull();
    expect(
      parsePlanArtifact({ ...artifactEvent, plan: { ...artifactEvent.plan, planRevision: -1 } }),
    ).toBeNull();
    expect(
      parsePlanArtifact({ ...artifactEvent, plan: { ...artifactEvent.plan, planToken: 'short' } }),
    ).toBeNull();
    expect(
      parsePlanArtifact({ ...artifactEvent, plan: { ...artifactEvent.plan, planToken: 42 } }),
    ).toBeNull();
    expect(
      parsePlanArtifact({
        ...artifactEvent,
        plan: { ...artifactEvent.plan, title: 'x'.repeat(501) },
      }),
    ).toBeNull();
    expect(
      parsePlanArtifact({
        ...artifactEvent,
        plan: { ...artifactEvent.plan, summary: '/Users/secret' },
      }),
    ).toBeNull();
    expect(
      parsePlanArtifact({ ...artifactEvent, plan: { ...artifactEvent.plan, stepCount: 10_001 } }),
    ).toBeNull();
    expect(
      parsePlanArtifact({ ...artifactEvent, plan: { ...artifactEvent.plan, approachCount: 101 } }),
    ).toBeNull();
    expect(
      parsePlanArtifact({ ...artifactEvent, plan: { ...artifactEvent.plan, validity: 'ready' } }),
    ).toBeNull();
    expect(
      parsePlanArtifact({ ...artifactEvent, plan: { ...artifactEvent.plan, validity: 'none' } }),
    ).toBeNull();
    expect(isPlanArtifactPublication({ type: 'extension_ui_request' })).toBe(false);
    expect(isPlanArtifactPublication({ type: 'extension_ui_request', method: 'setPlan' })).toBe(
      false,
    );
  });
});
