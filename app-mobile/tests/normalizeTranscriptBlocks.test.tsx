import type { TranscriptBlock } from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it } from 'vitest';

import {
  fenceBlockIdentity,
  normalizeTranscript,
  normalizeTranscriptBlocks,
} from '../src/pages/chat/rich-content/normalizeTranscriptBlocks.js';

const REDACTION = {
  policyVersion: 1,
  fieldsRedacted: 1,
  reasons: ['command'],
} as const;

function base(id: string, seq: number, revision = 1) {
  return {
    id,
    revision,
    seq,
    occurredAt: '2026-08-17T04:00:00.000Z',
  };
}

function richCall(id: string, callId: string, seq: number, revision = 1) {
  return {
    ...base(id, seq, revision),
    kind: 'tool_call' as const,
    toolName: 'bash',
    inputSummary: 'printf "[redacted]\\n"',
    callId,
    shellKind: 'bash' as const,
    lifecycle: 'running' as const,
    terminalCheckpoint: 'streaming' as const,
    redaction: REDACTION,
  };
}

function richResult(id: string, callId: string, seq: number, output: string, revision = 1) {
  return {
    ...base(id, seq, revision),
    kind: 'tool_result' as const,
    toolName: 'bash',
    output,
    isError: false,
    callId,
    shellKind: 'bash' as const,
    lifecycle: 'completed' as const,
    terminalCheckpoint: 'terminal' as const,
    outputCompleteness: 'complete' as const,
    redaction: REDACTION,
  };
}

describe('normalizeTranscriptBlocks', () => {
  it('pairs shell call and result by opaque callId and keeps a result-only pending state', () => {
    const paired = normalizeTranscriptBlocks({
      sessionId: 'session-rich-001',
      blocks: [
        richResult('result-before-call', 'call-001', 2, 'result first\n'),
        richCall('call-after-result', 'call-001', 3),
      ],
    });
    expect(paired).toHaveLength(1);
    expect(paired[0]).toMatchObject({
      kind: 'command',
      callId: 'call-001',
      canonicalCommand: 'printf "[redacted]\\n"',
      canonicalOutput: 'result first\n',
      pendingCall: false,
    });

    const pending = normalizeTranscript({
      sessionId: 'session-rich-001',
      blocks: [richResult('result-only', 'call-pending', 2, 'tail\n')],
    });
    expect(pending.pendingResultCallIds).toEqual(['call-pending']);
    expect(pending.blocks[0]).toMatchObject({
      kind: 'command',
      callId: 'call-pending',
      pendingCall: true,
      canonicalOutput: 'tail\n',
    });
  });

  it('ignores duplicate and lower revisions while preserving the latest source', () => {
    const blocks = normalizeTranscriptBlocks({
      sessionId: 'session-rich-001',
      blocks: [
        {
          ...base('text-001', 1, 2),
          kind: 'text',
          role: 'assistant',
          text: 'latest',
        },
        {
          ...base('text-001', 1, 1),
          kind: 'text',
          role: 'assistant',
          text: 'stale',
        },
        {
          ...base('text-001', 99, 2),
          kind: 'text',
          role: 'assistant',
          text: 'duplicate',
        },
      ] as readonly TranscriptBlock[],
    });
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ kind: 'prose', canonicalSource: 'latest', revision: 2 });
  });

  it('derives stable fence identities, promotes settled long text, and excludes optimistic prompts', () => {
    const sourceId = 'assistant-source-001';
    const blocks = normalizeTranscriptBlocks({
      sessionId: 'session-rich-001',
      blocks: [
        {
          ...base(sourceId, 1),
          kind: 'text',
          role: 'assistant',
          text: 'before\n```bash\nprintf "one\\n"\n```\nafter',
        },
        {
          ...base('long-text-001', 2),
          kind: 'text',
          role: 'assistant',
          text: Array.from({ length: 20 }, (_, index) => `line ${index}`).join('\n'),
          settled: true,
        } as TranscriptBlock,
        {
          ...base('optimistic-001', 3),
          kind: 'text',
          role: 'user',
          text: 'do not promote',
          provenance: 'optimistic',
        } as TranscriptBlock,
      ],
    });
    expect(blocks.map((block) => block.kind)).toEqual(['prose', 'code', 'prose', 'text-artifact', 'fallback']);
    expect(blocks[1]).toMatchObject({
      blockId: fenceBlockIdentity(sourceId, 0),
      sourceBlockId: sourceId,
      canonicalSource: 'printf "one\\n"\n',
      language: 'bash',
    });
    expect(blocks[3]).toMatchObject({ kind: 'text-artifact', label: 'long-text', settled: true });
    expect(blocks[4]).toMatchObject({ kind: 'fallback', originalKind: 'text' });
  });

  it('keeps malformed and unknown payloads non-copyable and non-openable', () => {
    const [block] = normalizeTranscriptBlocks({
      sessionId: 'session-rich-001',
      blocks: [
        {
          ...base('unknown-001', 1),
          kind: 'mystery',
          payload: '<script>not executable</script>',
        } as TranscriptBlock,
      ],
    });
    expect(block).toMatchObject({ kind: 'fallback', originalKind: 'mystery' });
    expect(block).not.toHaveProperty('canonicalSource');
  });
});
