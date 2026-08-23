// ───────────────────────────────────────────────────────────────────
// MODULE: Recorded RPC Fixture Integration Tests
// ───────────────────────────────────────────────────────────────────

import {
  isTranscriptBlock,
  type Envelope,
  type JsonValue,
  type PiRpcEvent,
  type SyncMessage,
} from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it } from 'vitest';

import { publishPiEvent } from '../../src/index.js';
import { SyncHub } from '../../src/replay/sync.js';
import { RpcSupervisor } from '../../src/rpc/supervisor.js';
import { SessionCatalog } from '../../src/sessions/catalog.js';
import { RelayStore } from '../../src/store/relay-store.js';
import { TranscriptProjector } from '../../src/store/transcript-projector.js';
import { EMPTY_TRANSCRIPT, transcriptReducer } from '../../../app-mobile/src/shared/state/state.js';

const IDENTITY = {
  hostId: 'host_local',
  workspaceRef: 'workspace_default',
  sessionId: 'session_local',
} as const;
const EPOCH = 'epoch_recorded';

describe('recorded Pi RPC relay flow', () => {
  it('keeps optimistic prompt text out of authority state and reconciles to the relay block', () => {
    const selected = transcriptReducer(EMPTY_TRANSCRIPT, {
      type: 'select',
      sessionId: IDENTITY.sessionId,
    });
    const optimistic = transcriptReducer(selected, {
      type: 'promptOptimistic',
      sessionId: IDENTITY.sessionId,
      block: {
        id: 'optimistic_prompt_001',
        kind: 'text',
        role: 'user',
        text: 'token=local-canary',
        revision: 1,
        seq: 1,
        occurredAt: '2026-01-01T00:00:00.000Z',
      },
    });
    expect(optimistic.coversThrough).toBe(0);
    expect(optimistic.pendingPromptIds).toEqual(['optimistic_prompt_001']);

    const accepted = transcriptReducer(optimistic, {
      type: 'promptAccepted',
      sessionId: IDENTITY.sessionId,
      optimisticId: 'optimistic_prompt_001',
      block: {
        id: 'block_prompt_001',
        kind: 'text',
        role: 'user',
        text: '[REDACTED_SECRET]',
        revision: 1,
        seq: 1,
        occurredAt: '2026-01-01T00:00:01.000Z',
      },
      at: '2026-01-01T00:00:01.000Z',
    });
    expect(accepted.pendingPromptIds).toEqual([]);
    expect(accepted.blocks).toEqual([
      expect.objectContaining({ id: 'block_prompt_001', text: '[REDACTED_SECRET]' }),
    ]);
  });

  it('populates the read-only transcript from a recorded Pi event sequence', async () => {
    const events: PiRpcEvent[] = [];
    const supervisor = new RpcSupervisor({
      fixtureOnly: true,
      fixturePath: new URL('../../src/fixtures/pi-rpc.jsonl', import.meta.url),
    });
    supervisor.onEvent((event) => events.push(event));
    await supervisor.start();

    const store = new RelayStore();
    try {
      const hub = new SyncHub(store);
      const projector = new TranscriptProjector();
      events.forEach((event) => publishPiEvent(store, hub, projector, event, EPOCH));

      const transcript = store.getTranscriptPage(IDENTITY);
      expect(transcript.items.every(isTranscriptBlock)).toBe(true);
      expect(transcript.items).toEqual([
        expect.objectContaining({ kind: 'text', text: 'Agent started.' }),
        expect.objectContaining({ kind: 'text', text: 'recorded fixture' }),
        expect.objectContaining({ kind: 'text', text: 'Agent settled.' }),
      ]);

      const snapshot = store.createSyncPlan(IDENTITY).messages[0];
      expect(snapshot?.kind).toBe('sync.snapshot');
      if (snapshot?.kind === 'sync.snapshot') {
        const selected = transcriptReducer(EMPTY_TRANSCRIPT, {
          type: 'select',
          sessionId: IDENTITY.sessionId,
        });
        const rendered = transcriptReducer(selected, {
          type: 'snapshot',
          message: snapshot,
          at: '2026-01-01T00:00:04.000Z',
        });
        expect(rendered.blocks.map((block) => block.kind)).toEqual(['text', 'text', 'text']);
      }
    } finally {
      await supervisor.stop();
      store.close();
    }
  });

  it('joins catalog, cursor replay, live delivery, and gap snapshot recovery without blending', async () => {
    const events: PiRpcEvent[] = [];
    const errors: Error[] = [];
    const supervisor = new RpcSupervisor({
      fixtureOnly: true,
      fixturePath: new URL('../../src/fixtures/pi-rpc.jsonl', import.meta.url),
    });
    supervisor.onEvent((event) => events.push(event));
    supervisor.onError((error) => errors.push(error));
    await supervisor.start();

    expect(supervisor.health().state).toBe('fixture');
    expect(errors).toEqual([]);
    expect(events.map((event) => event.type)).toEqual([
      'agent_start',
      'message_update',
      'agent_settled',
    ]);

    const store = new RelayStore();
    try {
      const catalog = new SessionCatalog(store);
      const hub = new SyncHub(store);
      catalog.register(IDENTITY.sessionId, 'running', 2, '2026-01-01T00:00:02.000Z');
      hub.publish(envelope(requiredEvent(events, 0), 1));
      hub.publish(envelope(requiredEvent(events, 1), 2));
      expect(catalog.list()).toEqual([
        {
          id: IDENTITY.sessionId,
          status: 'running',
          updatedAt: '2026-01-01T00:00:02.000Z',
          messageCount: 2,
        },
      ]);

      const firstConnection: SyncMessage[] = [];
      const disconnect = hub.subscribe(IDENTITY, (message) => firstConnection.push(message), {
        epoch: EPOCH,
        seq: 1,
      });
      hub.publish(envelope(requiredEvent(events, 2), 3));
      disconnect();
      catalog.register(IDENTITY.sessionId, 'idle', 3, '2026-01-01T00:00:03.000Z');

      expect(firstConnection.map((message) => [message.kind, message.coversThrough])).toEqual([
        ['sync.delta', 2],
        ['sync.delta', 3],
      ]);
      expect(eventSequences(firstConnection)).toEqual([2, 3]);

      const reconnect: SyncMessage[] = [];
      hub.subscribe(IDENTITY, (message) => reconnect.push(message), {
        epoch: 'epoch_stale',
        seq: 3,
      });
      expect(reconnect.map((message) => [message.kind, message.coversThrough])).toEqual([
        ['sync.gap', 3],
        ['sync.snapshot', 3],
      ]);

      const rendered = applySyncMessages(firstConnection, reconnect);
      expect(rendered.map((item) => item.seq)).toEqual([1, 2, 3]);
      expect(new Set(rendered.map((item) => item.eventId)).size).toBe(rendered.length);
      expect(rendered.map((item) => (item.payload as { type: string }).type)).toEqual([
        'agent_start',
        'message_update',
        'agent_settled',
      ]);
      expect(catalog.list()[0]).toMatchObject({ status: 'idle', messageCount: 3 });
    } finally {
      await supervisor.stop();
      store.close();
    }
  });

  it('replays a redacted rich stream with higher revisions without granting new authority', () => {
    const store = new RelayStore();
    try {
      const hub = new SyncHub(store);
      const projector = new TranscriptProjector();
      const canary = 'recorded-rich-secret';
      const events: readonly PiRpcEvent[] = [
        {
          type: 'tool_execution_start',
          toolCallId: 'call_recorded_rich',
          toolName: 'bash',
          args: { command: `printf token=${canary}` },
          metadata: {
            shellKind: 'bash',
            lifecycle: 'running',
            terminalCheckpoint: 'started',
          },
        },
        {
          type: 'tool_execution_update',
          toolCallId: 'call_recorded_rich',
          toolName: 'bash',
          partialResult: { content: [{ type: 'text', text: `tail token=${canary}` }] },
          metadata: {
            shellKind: 'bash',
            lifecycle: 'running',
            terminalCheckpoint: 'streaming',
            outputCompleteness: 'unknown',
          },
        },
        {
          type: 'tool_execution_end',
          toolCallId: 'call_recorded_rich',
          toolName: 'bash',
          result: { content: [{ type: 'text', text: `done token=${canary}` }] },
          isError: false,
          metadata: {
            shellKind: 'bash',
            lifecycle: 'completed',
            terminalCheckpoint: 'terminal',
            outputCompleteness: 'complete',
          },
        },
      ];
      let sequence = 0;
      for (const event of events) {
        publishPiEvent(store, hub, projector, event, EPOCH);
        sequence += 1;
      }

      const page = store.getTranscriptPage(IDENTITY);
      const richItems = page.items.filter(
        (item) => item.kind === 'tool_call' || item.kind === 'tool_result',
      );
      expect(richItems.length).toBeGreaterThanOrEqual(3);
      expect(richItems.every(isTranscriptBlock)).toBe(true);
      expect(new Set(richItems.map((item) => item.id)).size).toBeGreaterThanOrEqual(2);
      expect(richItems.some((item) => item.revision >= 2)).toBe(true);

      const replay = JSON.stringify(store.createSyncPlan(IDENTITY));
      expect(replay).not.toContain(canary);
      expect(replay).toContain('[REDACTED_SECRET]');
      expect(replay).not.toMatch(/rich-content-fetch|mutation-ticket/u);
      expect(sequence).toBe(events.length);
    } finally {
      store.close();
    }
  });
});

function envelope(event: PiRpcEvent, seq: number): Envelope {
  return {
    v: 1,
    eventId: `event_recorded_${seq}`,
    kind: `pi.${event.type}`,
    ...IDENTITY,
    epoch: EPOCH,
    seq,
    occurredAt: `2026-01-01T00:00:0${seq}.000Z`,
    causedBy: null,
    payload: event as JsonValue,
    redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
    replay: { eligible: true, snapshotEligible: true },
  };
}

function requiredEvent(events: readonly PiRpcEvent[], index: number): PiRpcEvent {
  const event = events[index];
  if (event === undefined) throw new Error(`Recorded fixture omitted event ${index}.`);
  return event;
}

function eventSequences(messages: readonly SyncMessage[]): number[] {
  return messages.flatMap((message) =>
    message.kind === 'sync.gap' ? [] : message.envelopes.map((item) => item.seq),
  );
}

function applySyncMessages(
  initial: readonly SyncMessage[],
  reconnect: readonly SyncMessage[],
): Envelope[] {
  let rendered: Envelope[] = [];
  let resetAtSnapshot = false;
  for (const message of [...initial, ...reconnect]) {
    if (message.kind === 'sync.gap') {
      resetAtSnapshot = true;
    } else if (message.kind === 'sync.snapshot') {
      rendered = [...message.envelopes];
      resetAtSnapshot = false;
    } else if (!resetAtSnapshot) {
      const known = new Set(rendered.map((item) => item.eventId));
      rendered.push(...message.envelopes.filter((item) => !known.has(item.eventId)));
    }
  }
  return rendered;
}
