// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Event Transcript Projection Tests
// ───────────────────────────────────────────────────────────────────

import {
  isRedactedAttachmentBlock,
  isRichTranscriptBlock,
  type Envelope,
  type PiRpcEvent,
  type TranscriptBlock,
} from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it } from 'vitest';

import { publishPiEvent } from '../src/index.js';
import { SyncHub } from '../src/replay/sync.js';
import { RelayStore } from '../src/store/relay-store.js';
import { TranscriptProjector } from '../src/store/transcript-projector.js';
import { redactEnvelope } from '../src/store/redaction.js';

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

  it('carries one authoritative call identity through revisions and metadata states', () => {
    const projector = new TranscriptProjector();
    let sequence = 1;
    const projectNext = (event: PiRpcEvent) =>
      projector.project(event, {
        occurredAt: OCCURRED_AT,
        nextSequence: () => sequence++,
      });

    const start = projectNext({
      type: 'tool_execution_start',
      toolCallId: 'call_stable_001',
      toolName: 'bash',
      args: { command: 'printf secret-canary' },
      metadata: {
        shellKind: 'bash',
        lifecycle: 'running',
        terminalCheckpoint: 'started',
      },
    });
    const update = projectNext({
      type: 'tool_execution_update',
      toolCallId: 'call_stable_001',
      toolName: 'bash',
      partialResult: { content: [{ type: 'text', text: 'output wording says failed' }] },
      metadata: {
        shellKind: 'bash',
        lifecycle: 'running',
        terminalCheckpoint: 'streaming',
        outputCompleteness: 'unknown',
      },
    });
    const end = projectNext({
      type: 'tool_execution_end',
      toolCallId: 'call_stable_001',
      toolName: 'bash',
      result: { content: [{ type: 'text', text: 'failed-looking output' }] },
      isError: false,
      metadata: {
        shellKind: 'bash',
        lifecycle: 'completed',
        terminalCheckpoint: 'terminal',
        outputCompleteness: 'complete',
      },
    });

    const call = start[0];
    expect(call).toMatchObject({
      kind: 'tool_call',
      callId: 'call_stable_001',
      shellKind: 'bash',
      lifecycle: 'running',
      terminalCheckpoint: 'started',
    });
    expect(update[0]).toMatchObject({
      kind: 'tool_result',
      callId: 'call_stable_001',
      shellKind: 'bash',
      lifecycle: 'running',
      terminalCheckpoint: 'streaming',
      outputCompleteness: 'unknown',
    });
    expect(end[0]).toMatchObject({
      kind: 'tool_result',
      callId: 'call_stable_001',
      shellKind: 'bash',
      lifecycle: 'completed',
      terminalCheckpoint: 'terminal',
      outputCompleteness: 'complete',
    });
    expect(isRichTranscriptBlock(call)).toBe(true);
    expect(isRichTranscriptBlock(update[0])).toBe(true);
    expect(isRichTranscriptBlock(end[0])).toBe(true);
    expect(new Set([callIdOf(call), callIdOf(update[0]), callIdOf(end[0])])).toEqual(
      new Set(['call_stable_001']),
    );
    expect(call?.id).toBe(start[0]?.id);
    expect(end[0]?.revision).toBe(2);
    expect(end[0]?.id).toBe(update[0]?.id);
  });

  it('preserves truncation state while redacting streamed secrets from every revision', () => {
    const projector = new TranscriptProjector();
    let sequence = 1;
    const canary = 'token=projector-rich-secret';
    const projectNext = (event: PiRpcEvent) =>
      projector.project(event, {
        occurredAt: OCCURRED_AT,
        nextSequence: () => sequence++,
      });

    const start = projectNext({
      type: 'tool_execution_start',
      toolCallId: 'call_truncated_rich',
      toolName: 'bash',
      args: { command: `printf ${canary}` },
      metadata: { shellKind: 'bash', lifecycle: 'running', terminalCheckpoint: 'started' },
    })[0];
    const terminal = projectNext({
      type: 'tool_execution_end',
      toolCallId: 'call_truncated_rich',
      toolName: 'bash',
      result: { content: [{ type: 'text', text: `retained ${canary}` }] },
      isError: false,
      metadata: {
        shellKind: 'bash',
        lifecycle: 'completed',
        terminalCheckpoint: 'terminal',
        outputCompleteness: 'upstream-truncated',
      },
    })[0];

    expect(start).toMatchObject({ kind: 'tool_call', lifecycle: 'running' });
    expect(terminal).toMatchObject({
      kind: 'tool_result',
      lifecycle: 'completed',
      outputCompleteness: 'upstream-truncated',
    });
    const redacted = [start, terminal].map(
      (block, index) =>
        redactEnvelope({
          v: 1,
          eventId: `event_truncated_${index}`,
          kind: 'transcript.block',
          ...IDENTITY,
          epoch: EPOCH,
          seq: index + 1,
          occurredAt: OCCURRED_AT,
          causedBy: null,
          payload: block,
          redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
          replay: { eligible: true, snapshotEligible: true },
        } as Envelope).payload,
    );
    expect(JSON.stringify(redacted)).not.toContain(canary);
    expect(isRichTranscriptBlock(start)).toBe(true);
    expect(isRichTranscriptBlock(terminal)).toBe(true);
  });

  it('carries identity through assistant tool-call revisions, tool results and Bash updates', () => {
    const projector = new TranscriptProjector();
    let sequence = 1;
    const projectNext = (event: PiRpcEvent) =>
      projector.project(event, {
        occurredAt: OCCURRED_AT,
        nextSequence: () => sequence++,
      });

    const assistantStart = projectNext({
      type: 'message_update',
      assistantMessageEvent: {
        type: 'toolcall_start',
        contentIndex: 0,
        id: 'call_assistant_001',
        metadata: {
          shellKind: 'other',
          lifecycle: 'queued',
          terminalCheckpoint: 'started',
        },
      },
    });
    const assistantDelta = projectNext({
      type: 'message_update',
      assistantMessageEvent: {
        type: 'toolcall_delta',
        contentIndex: 0,
        delta: 'safe arguments',
        metadata: {
          shellKind: 'other',
          lifecycle: 'running',
          terminalCheckpoint: 'streaming',
        },
      },
    });
    const assistantEnd = projectNext({
      type: 'message_update',
      assistantMessageEvent: {
        type: 'toolcall_end',
        contentIndex: 0,
        toolCall: {
          id: 'call_assistant_001',
          name: 'read',
          arguments: { path: '/Users/fixture/private.txt' },
        },
        metadata: {
          shellKind: 'other',
          lifecycle: 'completed',
          terminalCheckpoint: 'terminal',
        },
      },
    });
    const toolResult = projectNext({
      type: 'message_end',
      message: {
        role: 'toolResult',
        toolCallId: 'call_assistant_001',
        toolName: 'read',
        content: [{ type: 'text', text: 'output wording says failed' }],
        isError: false,
        metadata: {
          shellKind: 'other',
          lifecycle: 'completed',
          terminalCheckpoint: 'terminal',
          outputCompleteness: 'complete',
        },
      },
    });
    const bashUpdate = projectNext({
      type: 'bash_execution_update',
      id: 'call_bash_001',
      delta: 'bash output',
      metadata: {
        shellKind: 'bash',
        lifecycle: 'running',
        terminalCheckpoint: 'streaming',
        outputCompleteness: 'unknown',
      },
    });

    expect(
      new Set([
        callIdOf(assistantStart[0]),
        callIdOf(assistantDelta[0]),
        callIdOf(assistantEnd[0]),
      ]),
    ).toEqual(new Set(['call_assistant_001']));
    expect(toolResult[0]).toMatchObject({
      kind: 'tool_result',
      callId: 'call_assistant_001',
      lifecycle: 'completed',
      outputCompleteness: 'complete',
    });
    expect(bashUpdate[0]).toMatchObject({
      kind: 'tool_result',
      callId: 'call_bash_001',
      shellKind: 'bash',
      terminalCheckpoint: 'streaming',
    });
    expect(isRichTranscriptBlock(assistantStart[0])).toBe(true);
    expect(isRichTranscriptBlock(assistantDelta[0])).toBe(true);
    expect(isRichTranscriptBlock(assistantEnd[0])).toBe(true);
    expect(isRichTranscriptBlock(toolResult[0])).toBe(true);
    expect(isRichTranscriptBlock(bashUpdate[0])).toBe(true);
  });

  it('keeps result-before-call evidence separate and pairs only by the same callId', () => {
    const projector = new TranscriptProjector();
    let sequence = 1;
    const projectNext = (event: PiRpcEvent) =>
      projector.project(event, {
        occurredAt: OCCURRED_AT,
        nextSequence: () => sequence++,
      });

    const orphan = projectNext({
      type: 'tool_execution_end',
      toolCallId: 'call_result_first',
      toolName: 'bash',
      result: { content: [{ type: 'text', text: 'result before call' }] },
      isError: false,
      metadata: {
        shellKind: 'bash',
        lifecycle: 'completed',
        terminalCheckpoint: 'terminal',
      },
    })[0];
    const call = projectNext({
      type: 'tool_execution_start',
      toolCallId: 'call_result_first',
      toolName: 'bash',
      args: { command: 'safe' },
      metadata: {
        shellKind: 'bash',
        lifecycle: 'running',
        terminalCheckpoint: 'started',
      },
    })[0];

    expect(orphan).toMatchObject({ kind: 'tool_result', callId: 'call_result_first' });
    expect(call).toMatchObject({ kind: 'tool_call', callId: 'call_result_first' });
    expect(orphan?.id).not.toBe(call?.id);
  });

  it('keeps concurrent calls and out-of-order terminal results on separate identities', () => {
    const projector = new TranscriptProjector();
    let sequence = 1;
    const projectNext = (event: PiRpcEvent) =>
      projector.project(event, {
        occurredAt: OCCURRED_AT,
        nextSequence: () => sequence++,
      });

    const callA = projectNext({
      type: 'tool_execution_start',
      toolCallId: 'call_concurrent_a',
      toolName: 'read',
      args: { target: 'a' },
      metadata: { shellKind: 'other', lifecycle: 'running', terminalCheckpoint: 'started' },
    })[0];
    const callB = projectNext({
      type: 'tool_execution_start',
      toolCallId: 'call_concurrent_b',
      toolName: 'bash',
      args: { command: 'printf b' },
      metadata: { shellKind: 'bash', lifecycle: 'running', terminalCheckpoint: 'started' },
    })[0];
    const resultB = projectNext({
      type: 'tool_execution_end',
      toolCallId: 'call_concurrent_b',
      toolName: 'bash',
      result: { content: [{ type: 'text', text: 'b done' }] },
      isError: false,
      metadata: {
        shellKind: 'bash',
        lifecycle: 'completed',
        terminalCheckpoint: 'terminal',
        outputCompleteness: 'complete',
      },
    })[0];
    const resultA = projectNext({
      type: 'tool_execution_end',
      toolCallId: 'call_concurrent_a',
      toolName: 'read',
      result: { content: [{ type: 'text', text: 'a done' }] },
      isError: false,
      metadata: {
        shellKind: 'other',
        lifecycle: 'completed',
        terminalCheckpoint: 'terminal',
        outputCompleteness: 'complete',
      },
    })[0];

    expect(callA).toMatchObject({ kind: 'tool_call', callId: 'call_concurrent_a' });
    expect(callB).toMatchObject({ kind: 'tool_call', callId: 'call_concurrent_b' });
    expect(resultB).toMatchObject({ kind: 'tool_result', callId: 'call_concurrent_b' });
    expect(resultA).toMatchObject({ kind: 'tool_result', callId: 'call_concurrent_a' });
    expect(new Set([callA?.id, callB?.id]).size).toBe(2);
    expect(new Set([resultA?.id, resultB?.id]).size).toBe(2);
    expect(resultA?.id).not.toBe(callA?.id);
    expect(resultB?.id).not.toBe(callB?.id);
  });

  it('projects explicit trusted text artifacts but never classifies ordinary prose', () => {
    const projector = new TranscriptProjector();
    let sequence = 1;
    const projectNext = (event: PiRpcEvent) =>
      projector.project(event, {
        occurredAt: OCCURRED_AT,
        nextSequence: () => sequence++,
      });

    const ordinary = projectNext({
      type: 'message_update',
      assistantMessageEvent: {
        type: 'text_delta',
        contentIndex: 0,
        delta: 'This is a long paragraph, not an artifact.',
      },
    });
    const untrusted = projectNext({
      type: 'message_end',
      message: assistantMessage([{ type: 'text', text: 'goal: do not classify me' }]),
      metadata: {
        textArtifact: { label: 'goal', source: 'untrusted canary', trusted: false },
      },
    });
    const trusted = projectNext({
      type: 'message_end',
      message: assistantMessage([]),
      metadata: {
        textArtifact: {
          id: 'artifact_goal_001',
          label: 'goal',
          source: 'Trusted goal with /Users/private and token=artifact-canary',
          trusted: true,
        },
      },
    });

    expect(ordinary.some((block) => block.kind === 'text_artifact')).toBe(false);
    expect(untrusted.some((block) => block.kind === 'text_artifact')).toBe(false);
    expect(trusted).toContainEqual(
      expect.objectContaining({
        kind: 'text_artifact',
        label: 'goal',
        source: expect.stringContaining('artifact-canary'),
      }),
    );
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

  it('projects image turns as fixed redacted cards and drops image content from text projections', () => {
    let sequence = 1;
    const projector = new TranscriptProjector();
    const cards = projector.projectSubmittedAttachments('prompt_image_cards', 2, 'delivered', {
      occurredAt: OCCURRED_AT,
      nextSequence: () => sequence++,
    });

    expect(cards).toHaveLength(2);
    expect(cards.every(isRedactedAttachmentBlock)).toBe(true);
    expect(cards.map((card) => card.ordinal)).toEqual([1, 2]);
    expect(cards.map((card) => card.seq)).toEqual([1, 2]);
    expect(Object.keys(cards[0] ?? {}).sort()).toEqual(
      ['kind', 'id', 'revision', 'seq', 'occurredAt', 'role', 'mediaKind', 'ordinal', 'status', 'previewRetained'].sort(),
    );

    const projected = projector.project(
      {
        type: 'tool_execution_end',
        toolCallId: 'call_image_content',
        toolName: 'read',
        result: {
          content: [
            {
              type: 'image',
              mimeType: 'image/png',
              data: 'PIXEL_CANARY',
              filename: 'private-name.png',
            },
          ],
        },
        isError: false,
      } as unknown as PiRpcEvent,
      { occurredAt: OCCURRED_AT, nextSequence: () => sequence++ },
    );
    expect(JSON.stringify(projected)).not.toContain('PIXEL_CANARY');
    expect(JSON.stringify(projected)).not.toContain('private-name.png');
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

function callIdOf(block: TranscriptBlock | undefined): string | undefined {
  return block !== undefined && 'callId' in block && typeof block.callId === 'string'
    ? block.callId
    : undefined;
}
