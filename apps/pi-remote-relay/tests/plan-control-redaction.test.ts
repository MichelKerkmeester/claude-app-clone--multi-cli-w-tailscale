// ───────────────────────────────────────────────────────────────────
// MODULE: Plan Control Redaction and Transcript Isolation Tests
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import type { Envelope } from '@pi-remote/pi-rpc-protocol';

import {
  PLAN_ARTIFACT_KEY,
  PLAN_STATUS_KEY,
  isPlanArtifactPublication,
  parsePlanArtifact,
  parsePlanStatus,
} from '../src/runtime/plan-status.js';
import { RelayStore } from '../src/store/relay-store.js';
import {
  isControlPlaneProjection,
  projectPlanSnapshot,
  redactEnvelope,
} from '../src/store/redaction.js';

const PLAN_TOKEN = 'token_plan_binding_abcdef0123456789';

const MODE_EVENT = {
  type: 'extension_ui_request',
  method: 'setStatus',
  statusKey: PLAN_STATUS_KEY,
  statusText: 'plan',
};

const ARTIFACT_EVENT = {
  type: 'extension_ui_request',
  method: 'setPlan',
  statusKey: PLAN_ARTIFACT_KEY,
  plan: {
    planId: 'plan_007',
    planRevision: 1,
    planToken: PLAN_TOKEN,
    validity: 'valid' as const,
    title: 'Harden the relay boundary',
    summary: 'Redacted outline only',
    stepCount: 4,
    approachCount: 2,
  },
};

function envelopeWith(payload: Envelope['payload'], kind = 'pi.extension_ui_request'): Envelope {
  return {
    v: 1,
    eventId: 'event_plan_control',
    kind,
    hostId: 'host_local',
    workspaceRef: 'workspace_default',
    sessionId: 'session_local',
    epoch: 'epoch_plan_control',
    seq: 1,
    occurredAt: '2026-01-01T00:00:00.000Z',
    causedBy: null,
    payload,
    redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
    replay: { eligible: true, snapshotEligible: true },
  };
}

describe('plan control transcript isolation', () => {
  it('suppresses both mode and artifact control residue from persistence and sync', () => {
    const store = new RelayStore();
    try {
      const identity = {
        hostId: 'host_local',
        workspaceRef: 'workspace_default',
        sessionId: 'session_local',
      } as const;
      const base = envelopeWith({ value: 1 });
      store.appendEnvelope({ ...base, eventId: 'event_mode_raw' });
      store.appendEnvelope({ ...base, eventId: 'event_artifact_raw' });

      const modeResidue = controlResidue('Extension requested setStatus', 'event_mode_residue', 2);
      const artifactResidue = controlResidue(
        'Extension requested setPlan',
        'event_artifact_residue',
        3,
      );
      expect(isControlPlaneProjection(modeResidue.payload)).toBe(true);
      expect(isControlPlaneProjection(artifactResidue.payload)).toBe(true);
      expect(store.appendEnvelope(modeResidue).inserted).toBe(false);
      expect(store.appendEnvelope(artifactResidue).inserted).toBe(false);

      const userPlanCard = controlResidue('Turn 1', 'event_user_plan_card', 2);
      expect(isControlPlaneProjection(userPlanCard.payload)).toBe(false);
      expect(store.appendEnvelope(userPlanCard).inserted).toBe(true);

      const page = store.getTranscriptPage(identity);
      expect(page.items.map((item) => item.id)).toEqual(['block_user_plan']);
      // Raw control events stay in the event ledger, but their transcript
      // residue never persists or replays as a user-visible card.
      const replay = store.createSyncPlan(identity);
      const envelopeIds = replay.messages.flatMap((message) =>
        'envelopes' in message ? message.envelopes.map((item) => item.eventId) : [],
      );
      expect(envelopeIds).not.toContain('event_mode_residue');
      expect(envelopeIds).not.toContain('event_artifact_residue');
      const serialized = JSON.stringify({ page, replay });
      expect(serialized).not.toContain('Extension requested');
    } finally {
      store.close();
    }
  });

  it('strips the raw plan binding from the artifact envelope before persistence', () => {
    const redacted = redactEnvelope(envelopeWith(ARTIFACT_EVENT));
    const serialized = JSON.stringify(redacted);

    expect(serialized).not.toContain(PLAN_TOKEN);
    expect(serialized).toContain('[REDACTED_SECRET]');
    expect(serialized).toContain('plan_007');
    expect(redacted.redaction.reasons).toContain('secret');
  });
});

describe('plan control wire-to-projection redaction', () => {
  it('parses the host publication and projects a token-free bounded snapshot', () => {
    expect(parsePlanStatus(MODE_EVENT)).toBe('plan');
    expect(isPlanArtifactPublication(ARTIFACT_EVENT)).toBe(true);
    const parsed = parsePlanArtifact(ARTIFACT_EVENT);
    expect(parsed).not.toBeNull();
    if (parsed === null) throw new Error('artifact must parse');
    expect(parsed.planToken).toBe(PLAN_TOKEN);

    const snapshot = projectPlanSnapshot(parsed, '2026-01-01T00:00:00.000Z');
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain(PLAN_TOKEN);
    expect(snapshot.validity).toBe('valid');
    expect(snapshot.artifact).toMatchObject({
      planId: 'plan_007',
      planRevision: 1,
      validity: 'valid',
      stepCount: 4,
    });
  });

  it('projects superseded and invalid bindings as non-executable validity', () => {
    for (const validity of ['superseded', 'invalid'] as const) {
      const parsed = parsePlanArtifact({
        ...ARTIFACT_EVENT,
        plan: { ...ARTIFACT_EVENT.plan, validity },
      });
      expect(parsed?.validity).toBe(validity);
      if (parsed === null) throw new Error('artifact must parse');
      const snapshot = projectPlanSnapshot(parsed, '2026-01-01T00:00:00.000Z');
      expect(snapshot.validity).toBe(validity);
      expect(snapshot.artifact?.validity).toBe(validity);
      expect(JSON.stringify(snapshot)).not.toContain(PLAN_TOKEN);
    }
  });

  it('never projects a binding from malformed or foreign publications', () => {
    for (const record of [
      null,
      { type: 'other_event', method: 'setPlan', statusKey: PLAN_ARTIFACT_KEY },
      { ...ARTIFACT_EVENT, statusKey: 'other-extension-status' },
      { ...ARTIFACT_EVENT, plan: { ...ARTIFACT_EVENT.plan, planToken: 'short' } },
      { ...ARTIFACT_EVENT, plan: { ...ARTIFACT_EVENT.plan, summary: '/Users/secret' } },
    ]) {
      expect(parsePlanArtifact(record)).toBeNull();
    }
    expect(parsePlanStatus({ ...MODE_EVENT, statusText: 'error' })).toBe('unknown');
    expect(parsePlanStatus({ ...MODE_EVENT, statusText: 'weird' })).toBe('unknown');
    expect(parsePlanStatus({ ...MODE_EVENT, statusText: 'build' })).toBe('build');
  });
});

function controlResidue(text: string, eventId: string, seq: number): Envelope {
  return {
    ...envelopeWith(
      {
        id: `block_${text === 'Turn 1' ? 'user_plan' : 'control'}`,
        revision: 1,
        seq,
        occurredAt: '2026-01-01T00:00:00.000Z',
        kind: 'plan',
        items: [{ text, done: false }],
      },
      'transcript.block',
    ),
    eventId,
    seq,
  };
}
