// ───────────────────────────────────────────────────────────────────
// MODULE: Snapshot and Live Sync Barrier Tests
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  isRichTranscriptBlock,
  isTodoProjectionDeltaV1,
  isTodoProjectionV1,
  type AskQuestionTranscriptMeta,
  type Envelope,
  type SyncMessage,
} from '@pi-remote/pi-rpc-protocol';

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

  it('broadcasts only the redacted rich projection after durable commit', () => {
    const store = new RelayStore();
    try {
      const hub = new SyncHub(store);
      const messages: SyncMessage[] = [];
      hub.subscribe(IDENTITY, (message) => messages.push(message));
      const candidate: Envelope = {
        ...makeEnvelope(1),
        eventId: 'event_sync_rich',
        kind: 'transcript.block',
        payload: {
          id: 'block_sync_rich',
          revision: 1,
          seq: 1,
          occurredAt: '2026-01-01T00:00:01.000Z',
          kind: 'tool_result',
          toolName: 'bash',
          output: 'read /Users/sync/private.txt token=sync-canary',
          isError: false,
          callId: 'call_sync_rich',
          shellKind: 'bash',
          lifecycle: 'completed',
          terminalCheckpoint: 'terminal',
          outputCompleteness: 'complete',
          redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
        },
      };
      hub.publish(candidate);

      const serialized = JSON.stringify(messages);
      expect(serialized).not.toContain('sync-canary');
      expect(serialized).not.toContain('/Users/sync');
      expect(serialized).toContain('[REDACTED_SECRET]');
      expect(serialized).toContain('[REDACTED_PATH]');
      const delta = messages.at(-1);
      expect(delta?.kind).toBe('sync.delta');
      if (delta?.kind === 'sync.delta') {
        expect(isRichTranscriptBlock(delta.envelopes[0]?.payload)).toBe(true);
      }
    } finally {
      store.close();
    }
  });

  it('syncs only ask-question metadata and rejects display, answer, ticket, and digest carriers', () => {
    const store = new RelayStore();
    try {
      const hub = new SyncHub(store);
      const messages: SyncMessage[] = [];
      hub.subscribe(IDENTITY, (message) => messages.push(message));
      const metadata: AskQuestionTranscriptMeta = {
        id: 'block_sync_question_001',
        revision: 1,
        seq: 1,
        occurredAt: '2026-01-01T00:00:01.000Z',
        kind: 'ask-question',
        activityId: 'activity_sync_question_001',
        questionId: 'question_sync_001',
        sessionId: IDENTITY.sessionId,
        presentedRevision: 3,
        status: 'presented',
      };
      hub.publishAskQuestionMetadata({
        ...makeEnvelope(1),
        kind: 'transcript.block',
        payload: metadata,
      });
      const serialized = JSON.stringify(messages);
      expect(serialized).toContain('question_sync_001');
      for (const forbidden of [
        'question-content-canary',
        'answer-content-canary',
        'ticket-content-canary',
        'digest-content-canary',
        'prompt',
        'options',
      ]) {
        expect(serialized).not.toContain(forbidden);
      }

      const displayCarrier = {
        ...makeEnvelope(2),
        kind: 'transcript.block' as const,
        payload: {
          kind: 'ask-question',
          display: {
            prompt: 'question-content-canary',
            options: [],
          },
          answer: 'answer-content-canary',
          ticket: 'ticket-content-canary',
          digest: 'digest-content-canary',
        } as unknown as Envelope['payload'],
      };
      expect(() => hub.publish(displayCarrier)).toThrow(
        'Relay refused ask-question display content before the persistence redaction boundary.',
      );
    } finally {
      store.close();
    }
  });

  it('replays typed todo snapshots and deltas only after the redaction boundary', () => {
    const store = new RelayStore();
    try {
      const hub = new SyncHub(store);
      const snapshot = {
        planId: 'plan_sync_001',
        source: 'pi' as const,
        revision: 1,
        updatedAt: null,
        tasks: [
          {
            id: 'task_sync_001',
            title: 'Read [REDACTED_PATH]',
            state: 'pending' as const,
            group: '[REDACTED_SECRET]',
            order: 0,
            revision: 1,
            updatedAt: null,
          },
        ],
      };
      const delta = {
        planId: snapshot.planId,
        baseRevision: 1,
        revision: 2,
        upsertedTasks: [
          {
            ...snapshot.tasks[0],
            state: 'done' as const,
            revision: 2,
          },
        ],
        removedTaskIds: [],
        updatedAt: '2026-01-01T00:00:02.000Z',
      };
      hub.publish({
        ...makeEnvelope(1),
        kind: 'todo.snapshot.v1',
        payload: snapshot,
      });
      hub.publish({
        ...makeEnvelope(2),
        eventId: 'event_sync_todo_delta',
        kind: 'todo.delta.v1',
        seq: 2,
        payload: delta,
      });

      const messages: SyncMessage[] = [];
      hub.subscribe(IDENTITY, (message) => messages.push(message));
      expect(messages).toHaveLength(1);
      const serialized = JSON.stringify(messages);
      expect(serialized).not.toContain('/Users/sync');
      expect(serialized).not.toContain('sync-group');
      if (messages[0]?.kind !== 'sync.snapshot') return;
      expect(isTodoProjectionV1(messages[0].envelopes[0]?.payload)).toBe(true);
      expect(isTodoProjectionDeltaV1(messages[0].envelopes[1]?.payload)).toBe(true);
    } finally {
      store.close();
    }
  });
});
