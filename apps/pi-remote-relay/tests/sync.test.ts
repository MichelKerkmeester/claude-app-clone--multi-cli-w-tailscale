// ───────────────────────────────────────────────────────────────────
// MODULE: Snapshot and Live Sync Barrier Tests
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import type { Envelope, SyncMessage } from '@pi-remote/pi-rpc-protocol';

import { SyncHub } from '../src/replay/sync.js';
import { RelayStore } from '../src/store/relay-store.js';

const IDENTITY = {
  hostId: 'host_local',
  workspaceRef: 'workspace_default',
  sessionId: 'session_local',
} as const;

function makeEnvelope(seq: number): Envelope {
  return {
    v: 1,
    eventId: `event_sync_${seq}`,
    kind: 'pi.message_update',
    ...IDENTITY,
    epoch: 'epoch_sync',
    seq,
    occurredAt: `2026-01-01T00:00:0${seq}.000Z`,
    causedBy: null,
    payload: { value: seq },
    redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
    replay: { eligible: true, snapshotEligible: true },
  };
}

describe('sync barrier', () => {
  it('sends the committed snapshot before a delta published during handoff', () => {
    const store = new RelayStore();
    try {
      const hub = new SyncHub(store);
      hub.publish(makeEnvelope(1));
      const messages: SyncMessage[] = [];

      hub.subscribe(IDENTITY, (message) => {
        messages.push(message);
        if (message.kind === 'sync.snapshot') {
          hub.publish(makeEnvelope(2));
        }
      });

      expect(messages.map((message) => [message.kind, message.coversThrough])).toEqual([
        ['sync.snapshot', 1],
        ['sync.delta', 2],
      ]);
      const snapshot = messages[0];
      const delta = messages[1];
      expect(
        snapshot?.kind === 'sync.snapshot' && snapshot.envelopes.map((item) => item.seq),
      ).toEqual([1]);
      expect(delta?.kind === 'sync.delta' && delta.envelopes.map((item) => item.seq)).toEqual([2]);
    } finally {
      store.close();
    }
  });

  it('replays strictly after a valid cursor through one coversThrough bound', () => {
    const store = new RelayStore();
    try {
      const hub = new SyncHub(store);
      hub.publish(makeEnvelope(1));
      hub.publish(makeEnvelope(2));
      const messages: SyncMessage[] = [];

      hub.subscribe(IDENTITY, (message) => messages.push(message), {
        epoch: 'epoch_sync',
        seq: 1,
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]?.kind).toBe('sync.delta');
      if (messages[0]?.kind === 'sync.delta') {
        expect(messages[0].coversThrough).toBe(2);
        expect(messages[0].envelopes.map((item) => item.seq)).toEqual([2]);
      }
    } finally {
      store.close();
    }
  });
});
