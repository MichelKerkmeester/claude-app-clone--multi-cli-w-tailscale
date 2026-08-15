// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Event Transcript Projection Tests
// ───────────────────────────────────────────────────────────────────

import type { PiRpcEvent, TranscriptBlock } from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it } from 'vitest';

import { publishPiEvent } from '../src/index.js';
import { SyncHub } from '../src/replay/sync.js';
import { RelayStore } from '../src/store/relay-store.js';
import { TranscriptProjector } from '../src/store/transcript-projector.js';

const IDENTITY = {
  hostId: 'host_local',
  workspaceRef: 'workspace_default',
  sessionId: 'session_local',
} as const;
const EPOCH = 'epoch_projection';
const OCCURRED_AT = '2026-01-01T00:00:00.000Z';

const EVENT_CASES: readonly {
  readonly event: PiRpcEvent;
  readonly expectedKinds: readonly TranscriptBlock['kind'][];
}[] = [
  { event: { type: 'agent_start' }, expectedKinds: ['text'] },
  { event: { type: 'agent_end' }, expectedKinds: ['text'] },
  { event: { type: 'agent_settled' }, expectedKinds: ['text'] },
  { event: { type: 'turn_start' }, expectedKinds: ['plan'] },
  {
    event: { type: 'turn_end', message: assistantMessage([]) },
    expectedKinds: ['plan', 'usage'],
  },
  {
    event: {
      type: 'message_start',
      message: assistantMessage([{ type: 'text', text: 'starting' }]),
    },
    expectedKinds: ['text', 'usage'],
  },
  {
    event: {
      type: 'message_update',
      usage: usage(),
      assistantMessageEvent: { type: 'text_delta', contentIndex: 0, delta: 'streaming' },
    },
    expectedKinds: ['text', 'usage'],
  },
  {
    event: {
      type: 'message_end',
      message: assistantMessage([{ type: 'thinking', thinking: 'considering' }]),
    },
    expectedKinds: ['thinking', 'usage'],
  },
  {
    event: { type: 'bash_execution_update', id: 'command_001', delta: 'output' },
    expectedKinds: ['tool_result'],
  },
  {
    event: {
      type: 'tool_execution_start',
      toolCallId: 'call_001',
      toolName: 'read',
      args: { target: 'document' },
    },
    expectedKinds: ['tool_call'],
  },
  {
    event: {
      type: 'tool_execution_update',
      toolCallId: 'call_001',
      toolName: 'read',
      partialResult: { content: [{ type: 'text', text: 'partial' }] },
    },
    expectedKinds: ['tool_result'],
  },
  {
    event: {
      type: 'tool_execution_end',
      toolCallId: 'call_002',
      toolName: 'edit',
      result: {
        content: [{ type: 'text', text: 'updated' }],
        details: { patch: '@@ -old +new @@' },
      },
      isError: false,
    },
    expectedKinds: ['tool_result', 'file_diff'],
  },
  {
    event: { type: 'queue_update', steering: ['review'], followUp: ['summarize'] },
    expectedKinds: ['plan'],
  },
  { event: { type: 'compaction_start', reason: 'threshold' }, expectedKinds: ['thinking'] },
  {
    event: {
      type: 'compaction_end',
      reason: 'threshold',
      result: { summary: 'Compacted context', usage: usage() },
      aborted: false,
      willRetry: false,
    },
    expectedKinds: ['thinking', 'usage'],
  },
  {
    event: {
      type: 'auto_retry_start',
      attempt: 1,
      maxAttempts: 3,
      delayMs: 10,
      errorMessage: 'retry',
    },
    expectedKinds: ['plan'],
  },
  { event: { type: 'auto_retry_end', success: true, attempt: 1 }, expectedKinds: ['plan'] },
  {
    event: {
      type: 'summarization_retry_scheduled',
      attempt: 1,
      maxAttempts: 3,
      delayMs: 10,
      errorMessage: 'retry',
    },
    expectedKinds: ['plan'],
  },
  {
    event: { type: 'summarization_retry_attempt_start', source: 'compaction', reason: 'threshold' },
    expectedKinds: ['plan'],
  },
  { event: { type: 'summarization_retry_finished' }, expectedKinds: ['plan'] },
  {
    event: {
      type: 'extension_error',
      extensionPath: 'extension.ts',
      event: 'tool_call',
      error: 'Extension failed',
    },
    expectedKinds: ['tool_result'],
  },
  {
    event: {
      type: 'extension_ui_request',
      id: 'request_001',
      method: 'confirm',
      title: 'Continue?',
    },
    expectedKinds: ['plan'],
  },
];

describe('Pi transcript projector', () => {
  it('projects every Pi event kind to typed transcript blocks', () => {
    for (const { event, expectedKinds } of EVENT_CASES) {
      const blocks = project(event);
      expect(
        blocks.map((block) => block.kind),
        event.type,
      ).toEqual(expectedKinds);
    }
  });

  it('covers every protocol transcript block kind', () => {
    const projectedKinds = new Set(
      EVENT_CASES.flatMap(({ event }) => project(event).map((block) => block.kind)),
    );

    expect([...projectedKinds].sort()).toEqual([
      'file_diff',
      'plan',
      'text',
      'thinking',
      'tool_call',
      'tool_result',
      'usage',
    ]);
  });

  it('revises one streaming block with a stable id and rising revisions', () => {
    const projector = new TranscriptProjector();
    let sequence = 1;
    const updates: PiRpcEvent[] = [
      { type: 'message_update', assistantMessageEvent: { type: 'text_start', contentIndex: 0 } },
      {
        type: 'message_update',
        assistantMessageEvent: { type: 'text_delta', contentIndex: 0, delta: 'Hello' },
      },
      {
        type: 'message_update',
        assistantMessageEvent: { type: 'text_delta', contentIndex: 0, delta: ' world' },
      },
      {
        type: 'message_update',
        assistantMessageEvent: { type: 'text_end', contentIndex: 0, content: 'Hello world' },
      },
    ];
    const blocks = updates.flatMap((event) =>
      projector.project(event, {
        occurredAt: OCCURRED_AT,
        nextSequence: () => sequence++,
      }),
    );

    expect(new Set(blocks.map((block) => block.id)).size).toBe(1);
    expect(blocks.map((block) => block.revision)).toEqual([1, 2, 3, 4]);
    expect(blocks.map((block) => block.seq)).toEqual([1, 2, 3, 4]);
    expect(blocks.at(-1)).toMatchObject({ kind: 'text', text: 'Hello world' });
  });

  it('preserves nested turn usage and one summary retry lifecycle', () => {
    const projector = new TranscriptProjector();
    let sequence = 1;
    const projectNext = (event: PiRpcEvent) =>
      projector.project(event, {
        occurredAt: OCCURRED_AT,
        nextSequence: () => sequence++,
      });

    projectNext({ type: 'turn_start' });
    const turnEnd = projectNext({ type: 'turn_end', message: assistantMessage([]) });
    expect(turnEnd.at(-1)).toMatchObject({
      kind: 'usage',
      inputTokens: 12,
      outputTokens: 4,
      cost: 0.03,
    });

    const retry = [
      ...projectNext({
        type: 'summarization_retry_scheduled',
        attempt: 2,
        maxAttempts: 3,
        delayMs: 10,
        errorMessage: 'retry',
      }),
      ...projectNext({
        type: 'summarization_retry_attempt_start',
        source: 'compaction',
        reason: 'threshold',
      }),
      ...projectNext({ type: 'summarization_retry_finished' }),
    ];
    expect(new Set(retry.map((block) => block.id)).size).toBe(1);
    expect(retry.map((block) => block.revision)).toEqual([1, 2, 3]);
    expect(retry.at(-1)).toMatchObject({
      kind: 'plan',
      items: [{ text: 'Summary retry completed', done: true }],
    });
  });

  it('redacts projected content before persistence and replay', () => {
    const store = new RelayStore();
    try {
      const hub = new SyncHub(store);
      publishPiEvent(
        store,
        hub,
        new TranscriptProjector(),
        {
          type: 'message_update',
          assistantMessageEvent: {
            type: 'text_delta',
            contentIndex: 0,
            delta: 'read /home/tester/private.txt with token=project-canary',
          },
        },
        EPOCH,
      );

      const page = store.getTranscriptPage(IDENTITY);
      const replay = store.createSyncPlan(IDENTITY);
      const serialized = JSON.stringify({ page, replay });
      expect(serialized).not.toContain('/home/tester');
      expect(serialized).not.toContain('project-canary');
      expect(serialized).toContain('[REDACTED_PATH]');
      expect(serialized).toContain('[REDACTED_SECRET]');
    } finally {
      store.close();
    }
  });

  it('projects an unknown event through the explicit fallback', () => {
    const event = { type: 'future_event', detail: 'opaque' } as unknown as PiRpcEvent;

    expect(project(event)).toEqual([
      expect.objectContaining({ kind: 'text', text: 'Pi event: future_event' }),
    ]);
  });
});

function project(event: PiRpcEvent): readonly TranscriptBlock[] {
  let sequence = 1;
  return new TranscriptProjector().project(event, {
    occurredAt: OCCURRED_AT,
    nextSequence: () => sequence++,
  });
}

function usage() {
  return {
    input: 12,
    output: 4,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 16,
    cost: { input: 0.01, output: 0.02, cacheRead: 0, cacheWrite: 0, total: 0.03 },
  } as const;
}

function assistantMessage(content: readonly Record<string, unknown>[]) {
  return {
    role: 'assistant',
    content,
    api: 'test',
    provider: 'test',
    model: 'test',
    usage: usage(),
    stopReason: 'stop',
    timestamp: 1,
  } as PiRpcEvent[string];
}
