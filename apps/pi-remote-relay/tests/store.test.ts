// ───────────────────────────────────────────────────────────────────
// MODULE: Relay Store Ordering and Deduplication Tests
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import type { Envelope, JsonValue } from '@pi-remote/pi-rpc-protocol';

import { RelayStore } from '../src/store/relay-store.js';

const IDENTITY = {
  hostId: 'host_local',
  workspaceRef: 'workspace_default',
  sessionId: 'session_local',
} as const;

function makeEnvelope(
  seq: number,
  epoch = 'epoch_one',
  payload: JsonValue = { value: seq },
): Envelope {
  return {
    v: 1,
    eventId: `event_${epoch}_${seq}`,
    kind: 'pi.message_update',
    ...IDENTITY,
    epoch,
    seq,
    occurredAt: `2026-01-01T00:00:0${Math.min(seq, 9)}.000Z`,
    causedBy: null,
    payload,
    redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
    replay: { eligible: true, snapshotEligible: true },
  };
}

describe('durable relay store', () => {
  it('enforces order, suppresses duplicates and advances the retention floor', () => {
    const store = new RelayStore({ retentionEvents: 2 });
    try {
      expect(store.appendEnvelope(makeEnvelope(1)).inserted).toBe(true);
      expect(store.appendEnvelope(makeEnvelope(2)).inserted).toBe(true);
      expect(store.appendEnvelope(makeEnvelope(3)).inserted).toBe(true);
      expect(store.appendEnvelope(makeEnvelope(3)).inserted).toBe(false);
      expect(() => store.appendEnvelope(makeEnvelope(5))).toThrow(/expected sequence 4/);

      const plan = store.createSyncPlan(IDENTITY, { epoch: 'epoch_one', seq: 0 });
      expect(plan.messages.map((message) => message.kind)).toEqual(['sync.gap', 'sync.snapshot']);
      const snapshot = plan.messages[1];
      expect(snapshot?.kind).toBe('sync.snapshot');
      if (snapshot?.kind === 'sync.snapshot') {
        expect(snapshot.envelopes.map((item) => item.seq)).toEqual([2, 3]);
        expect(snapshot.coversThrough).toBe(3);
      }
    } finally {
      store.close();
    }
  });

  it('starts a new epoch at one and rejects reuse of an ended epoch', () => {
    const store = new RelayStore();
    try {
      store.appendEnvelope(makeEnvelope(1, 'epoch_one'));
      store.appendEnvelope(makeEnvelope(1, 'epoch_two'));
      expect(store.nextSequence(IDENTITY, 'epoch_two')).toBe(2);
      expect(() => store.appendEnvelope(makeEnvelope(2, 'epoch_one'))).toThrow(/reused or stale/);
      expect(() => store.appendEnvelope(makeEnvelope(2, 'epoch_three'))).toThrow(/must begin/);
    } finally {
      store.close();
    }
  });

  it('persists and replays only the canonical redacted envelope', () => {
    const store = new RelayStore();
    try {
      const result = store.appendEnvelope(
        makeEnvelope(1, 'epoch_one', {
          path: '/Users/alice/private.txt',
          token: 'secret-value',
        }),
      );
      const plan = store.createSyncPlan(IDENTITY);
      const serialized = JSON.stringify({ result, plan });

      expect(serialized).not.toContain('/Users/alice');
      expect(serialized).not.toContain('secret-value');
      expect(serialized).toContain('[REDACTED_PATH]');
      expect(serialized).toContain('[REDACTED_SECRET]');
    } finally {
      store.close();
    }
  });
});
