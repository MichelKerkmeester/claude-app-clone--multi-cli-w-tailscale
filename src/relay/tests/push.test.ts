// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Push and Attention Tests
// ───────────────────────────────────────────────────────────────────

import { randomBytes } from 'node:crypto';

import {
  isAttentionChangedPayload,
  isAttentionClass,
  type Envelope,
  type PushSubscriptionInput,
} from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it, vi } from 'vitest';

import {
  PushService,
  createAttentionPayload,
  serializePushHint,
  serializeTodoProjectionPushHint,
} from '../src/push/push-service.js';
import { SyncHub } from '../src/replay/sync.js';
import { RelayStore } from '../src/store/relay-store.js';

const SUBSCRIPTION: PushSubscriptionInput = {
  endpoint: 'https://push.example.test/opaque-endpoint',
  expirationTime: null,
  keys: { p256dh: 'p'.repeat(65), auth: 'a'.repeat(22) },
};

describe('privacy-minimized push and Attention Inbox', () => {
  it('serializes only a small opaque id and bounded class at byte level', () => {
    const payload = createAttentionPayload('needs_input', 1);
    const bytes = Buffer.from(serializePushHint(payload));
    const decoded = JSON.parse(bytes.toString('utf8')) as object;
    const forbidden = [
      'project',
      'title',
      'prompt',
      'path',
      'tool',
      'args',
      'diff',
      'decision',
      'digest',
      'result',
      'error text',
      '/Users/private',
      'approve',
      'workspace',
    ];

    expect(Object.keys(decoded).sort()).toEqual(['attentionClass', 'lookupId']);
    expect(bytes.byteLength).toBeLessThanOrEqual(160);
    for (const value of forbidden) expect(bytes.includes(Buffer.from(value))).toBe(false);
  });

  it('keeps ask-question display, answer, ticket, and digest fields out of push bytes', () => {
    const payload = createAttentionPayload('needs_input', 7);
    const serialized = serializePushHint(payload);
    const decoded = JSON.parse(serialized) as Record<string, unknown>;
    expect(Object.keys(decoded).sort()).toEqual(['attentionClass', 'lookupId']);
    for (const forbidden of [
      'prompt',
      'options',
      'option-content-canary',
      'answer-content-canary',
      'ticket-content-canary',
      'digest-content-canary',
      'revision',
      'secret',
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('wakes for a todo projection without sending projection content or persisting it', async () => {
    const { store, service, sendNotification } = harness();
    try {
      service.subscribe('device_one', SUBSCRIPTION);
      const envelope: Envelope = {
        v: 1,
        eventId: 'event_todo_push_001',
        kind: 'todo.delta.v1',
        hostId: 'host_local',
        workspaceRef: 'workspace_default',
        sessionId: 'session_local',
        epoch: 'epoch_one',
        seq: 1,
        occurredAt: '2026-01-01T00:00:01.000Z',
        causedBy: null,
        payload: {
          planId: 'plan_push_001',
          baseRevision: 1,
          revision: 2,
          upsertedTasks: [
            {
              id: 'task_push_001',
              title: 'Private /Users/push/title',
              state: 'done',
              group: 'push-group',
              order: 0,
              revision: 2,
              updatedAt: null,
            },
          ],
          removedTaskIds: [],
          updatedAt: null,
        },
        redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
        replay: { eligible: true, snapshotEligible: true },
      };
      expect(await service.publish(envelope, { committed: true })).toBe(1);
      const pushed = sendNotification.mock.calls.at(-1)?.[1];
      expect(pushed).toBe(serializeTodoProjectionPushHint());
      expect(pushed).not.toContain('Private');
      expect(pushed).not.toContain('push-group');
      expect(pushed).not.toContain('plan_push_001');
      expect(
        (store.databaseHandle().prepare('SELECT COUNT(*) AS count FROM attention_items').get() as {
          count: number;
        }).count,
      ).toBe(0);
    } finally {
      store.close();
    }
  });

  it('enforces exactly the three attention classes and exact event shape', () => {
    expect(['needs_input', 'finished', 'error'].every(isAttentionClass)).toBe(true);
    expect(isAttentionClass('approval')).toBe(false);
    expect(isAttentionChangedPayload(createAttentionPayload('finished', 2))).toBe(true);
    expect(
      isAttentionChangedPayload({
        ...createAttentionPayload('error', 3),
        category: 'free-form',
      }),
    ).toBe(false);
  });

  it('encrypts subscriptions, rotates one device record, and removes it on unsubscribe', async () => {
    const { store, service, sendNotification } = harness();
    try {
      service.subscribe('device_one', SUBSCRIPTION);
      const database = store.databaseHandle();
      const stored = database
        .prepare('SELECT subscription_ciphertext AS ciphertext FROM push_subscriptions')
        .get() as { ciphertext: string };
      expect(stored.ciphertext).not.toContain(SUBSCRIPTION.endpoint);
      service.subscribe('device_one', {
        ...SUBSCRIPTION,
        endpoint: 'https://push.example.test/rotated',
      });
      expect(
        (
          database.prepare('SELECT COUNT(*) AS count FROM push_subscriptions').get() as {
            count: number;
          }
        ).count,
      ).toBe(1);
      await service.publish(attentionEnvelope('needs_input'), { committed: true });
      expect(sendNotification).toHaveBeenCalledTimes(1);
      expect(service.unsubscribe('device_one')).toBe(true);
      expect(
        (
          database.prepare('SELECT COUNT(*) AS count FROM push_subscriptions').get() as {
            count: number;
          }
        ).count,
      ).toBe(0);
    } finally {
      store.close();
    }
  });

  it('deduplicates generation and nonce and suppresses foreground devices', async () => {
    const { store, service, sendNotification } = harness();
    try {
      service.subscribe('device_one', SUBSCRIPTION);
      const envelope = attentionEnvelope('finished');
      expect(
        await service.publish(envelope, {
          committed: true,
          foregroundDeviceIds: new Set(['device_one']),
        }),
      ).toBe(0);
      expect(await service.publish(envelope, { committed: true })).toBe(0);
      expect(sendNotification).not.toHaveBeenCalled();
      const newer = attentionEnvelope('finished', 2);
      expect(await service.publish(newer, { committed: true })).toBe(1);
      expect(await service.publish(attentionEnvelope('error', 1), { committed: true })).toBe(0);
      expect(await service.publish(newer, { committed: true })).toBe(0);
    } finally {
      store.close();
    }
  });

  it('does not deliver uncommitted hints and cleans invalid endpoints', async () => {
    const store = new RelayStore();
    const sender = { sendNotification: vi.fn().mockRejectedValue({ statusCode: 410 }) };
    const service = new PushService({ store, encryptionKey: randomBytes(32), sender });
    try {
      service.subscribe('device_one', SUBSCRIPTION);
      expect(await service.publish(attentionEnvelope('error'), { committed: false })).toBe(0);
      expect(sender.sendNotification).not.toHaveBeenCalled();
      await service.publish(attentionEnvelope('error'), { committed: true });
      expect(
        (
          store
            .databaseHandle()
            .prepare('SELECT COUNT(*) AS count FROM push_subscriptions')
            .get() as { count: number }
        ).count,
      ).toBe(0);
    } finally {
      store.close();
    }
  });

  it('resolves only current-epoch hints after a committed transition', async () => {
    const { store, service } = harness();
    try {
      const sync = new SyncHub(store);
      const envelope = attentionEnvelope('needs_input');
      sync.publish(envelope);
      await service.publish(envelope, { committed: true });
      expect(service.resolve((envelope.payload as { lookupId: string }).lookupId)).toMatchObject({
        sessionId: 'session_local',
        target: 'review',
        epoch: 'epoch_one',
        focusId: null,
      });
      sync.publish({ ...attentionEnvelope('finished', 1, 'epoch_two'), seq: 1 });
      expect(service.resolve((envelope.payload as { lookupId: string }).lookupId)).toBeNull();
    } finally {
      store.close();
    }
  });
});

function harness() {
  const store = new RelayStore();
  const sendNotification = vi.fn().mockResolvedValue(undefined);
  const service = new PushService({
    store,
    encryptionKey: randomBytes(32),
    sender: { sendNotification },
  });
  return { store, service, sendNotification };
}

function attentionEnvelope(
  attentionClass: 'needs_input' | 'finished' | 'error',
  generation = 1,
  epoch = 'epoch_one',
): Envelope {
  return {
    v: 1,
    eventId: `event_${epoch}_${generation}_${attentionClass}`,
    kind: 'attention.changed',
    hostId: 'host_local',
    workspaceRef: 'workspace_default',
    sessionId: 'session_local',
    epoch,
    seq: generation,
    occurredAt: `2026-01-01T00:00:0${generation}.000Z`,
    causedBy: null,
    payload: createAttentionPayload(attentionClass, generation),
    redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
    replay: { eligible: true, snapshotEligible: true },
  };
}
