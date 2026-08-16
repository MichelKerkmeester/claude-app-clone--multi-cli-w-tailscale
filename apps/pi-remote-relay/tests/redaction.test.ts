// ───────────────────────────────────────────────────────────────────
// MODULE: Canonical Redaction Tests
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { isPlanSnapshotDto, type Envelope, type PlanSnapshotDto } from '@pi-remote/pi-rpc-protocol';

import { RelayStore } from '../src/store/relay-store.js';
import {
  isControlPlaneProjection,
  projectPlanSnapshot,
  redactEnvelope,
} from '../src/store/redaction.js';

const ARTIFACT_EVENT = {
  type: 'extension_ui_request',
  method: 'setPlan',
  statusKey: 'pi-remote-plan-artifact',
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

function envelopeWith(payload: Envelope['payload']): Envelope {
  return {
    v: 1,
    eventId: 'event_redaction',
    kind: 'pi.tool_execution_end',
    hostId: 'host_local',
    workspaceRef: 'workspace_default',
    sessionId: 'session_local',
    epoch: 'epoch_redaction',
    seq: 1,
    occurredAt: '2026-01-01T00:00:00.000Z',
    causedBy: null,
    payload,
    redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
    replay: { eligible: true, snapshotEligible: true },
  };
}

describe('canonical redaction', () => {
  it('removes path fields, private prompts and secret fields recursively', () => {
    const redacted = redactEnvelope(
      envelopeWith({
        cwd: '/Users/alice/private-project',
        prompt: 'private request',
        nested: {
          apiKey: 'sk-example-secret-value',
          output: 'read /Users/alice/private-project/file.ts with token=abc123',
        },
      }),
    );
    const serialized = JSON.stringify(redacted);

    expect(serialized).not.toContain('/Users/alice');
    expect(serialized).not.toContain('private request');
    expect(serialized).not.toContain('abc123');
    expect(serialized).not.toContain('sk-example-secret-value');
    expect(serialized).toContain('[REDACTED_PATH]');
    expect(serialized).toContain('[REDACTED_SECRET]');
    expect(redacted.redaction.fieldsRedacted).toBeGreaterThanOrEqual(4);
    expect(redacted.redaction.reasons).toEqual(['path', 'private-text', 'secret']);
  });

  it('does not mutate the incoming envelope', () => {
    const source = envelopeWith({ path: '/tmp/source.txt' });
    const redacted = redactEnvelope(source);

    expect(source.payload).toEqual({ path: '/tmp/source.txt' });
    expect(redacted.payload).toEqual({ path: '[REDACTED_PATH]' });
  });

  it('strips the raw plan binding before any persistence, replay or broadcast', () => {
    const redacted = redactEnvelope(
      envelopeWith({
        ...ARTIFACT_EVENT,
        plan: {
          ...ARTIFACT_EVENT.plan,
          apiKey: 'sk-plan-canary',
          workingDirectory: '/Users/operator/private-repo',
        },
      }),
    );
    const serialized = JSON.stringify(redacted);
    for (const canary of [
      'token_plan_binding_abcdef0123456789',
      'sk-plan-canary',
      '/Users/operator',
    ]) {
      expect(serialized.includes(canary)).toBe(false);
    }
    expect(serialized).toContain('[REDACTED_SECRET]');
    expect(serialized).toContain('[REDACTED_PATH]');
  });

  it('projects the plan snapshot without ever emitting the opaque binding', () => {
    const snapshot = projectPlanSnapshot(
      {
        planId: 'plan_007',
        planRevision: 3,
        planToken: 'token_plan_binding_abcdef0123456789',
        validity: 'valid',
        title: 'Harden the relay boundary',
        summary: 'Redacted outline only',
        stepCount: 4,
        approachCount: 2,
      },
      '2026-01-01T00:00:00.000Z',
    );
    expect(isPlanSnapshotDto(snapshot)).toBe(true);
    const serialized = JSON.stringify(snapshot);
    for (const canary of ['token_plan_binding', 'operator@example.com', 'host-42', '/Users/']) {
      expect(serialized.includes(canary)).toBe(false);
    }
    expect(snapshot).toEqual({
      planId: 'plan_007',
      planRevision: 3,
      validity: 'valid',
      artifact: {
        planId: 'plan_007',
        planRevision: 3,
        title: 'Harden the relay boundary',
        summary: 'Redacted outline only',
        stepCount: 4,
        approachCount: 2,
        validity: 'valid',
        occurredAt: '2026-01-01T00:00:00.000Z',
      },
    });
    expect(projectPlanSnapshot(null, '2026-01-01T00:00:00.000Z')).toEqual({
      planId: null,
      planRevision: 0,
      validity: 'none',
      artifact: null,
    });
  });

  it('suppresses control-plane transcript projections before persistence and sync', () => {
    const store = new RelayStore();
    try {
      const identity = {
        hostId: 'host_local',
        workspaceRef: 'workspace_default',
        sessionId: 'session_local',
      } as const;
      const base = envelopeWith({ value: 1 });
      store.appendEnvelope({
        ...base,
        eventId: 'event_control_raw',
        kind: 'pi.extension_ui_request',
      });
      const controlResidue: Envelope = {
        ...base,
        eventId: 'event_control_block',
        kind: 'transcript.block',
        seq: 2,
        payload: {
          id: 'block_control',
          revision: 1,
          seq: 2,
          occurredAt: '2026-01-01T00:00:00.000Z',
          kind: 'plan',
          items: [{ text: 'Extension requested setStatus', done: false }],
        },
      };
      expect(isControlPlaneProjection(controlResidue.payload)).toBe(true);
      expect(store.appendEnvelope(controlResidue).inserted).toBe(false);
      const userBlock: Envelope = {
        ...base,
        eventId: 'event_user_block',
        kind: 'transcript.block',
        seq: 2,
        payload: {
          id: 'block_user',
          revision: 1,
          seq: 2,
          occurredAt: '2026-01-01T00:00:00.000Z',
          kind: 'plan',
          items: [{ text: 'Turn 1', done: false }],
        },
      };
      expect(isControlPlaneProjection(userBlock.payload)).toBe(false);
      expect(store.appendEnvelope(userBlock).inserted).toBe(true);

      const page = store.getTranscriptPage(identity);
      expect(page.items.map((item) => item.id)).toEqual(['block_user']);
      const replay = store.createSyncPlan(identity);
      const serialized = JSON.stringify({ page, replay });
      expect(serialized).not.toContain('Extension requested setStatus');
      expect(serialized).not.toContain('event_control_block');
    } finally {
      store.close();
    }
  });
});
