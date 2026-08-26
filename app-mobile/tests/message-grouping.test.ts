// ───────────────────────────────────────────────────────────────────
// MODULE: Message Grouping Differential Tests
// ───────────────────────────────────────────────────────────────────

// The grouping seam (groupNormalizedTranscript / groupNormalizedSequence)
// is already pure; it is named here as the differential surface every
// incremental transcript view is measured against. An incremental
// assembler that merges each new block into a persistent grouped view must
// equal a canonical full regroup at every prefix, and an unpaired tool
// result stays visibly in flight (pending) rather than collapsing into a
// finished command.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  normalizeTranscript,
  type NormalizedTranscriptBlock,
} from '../src/pages/chat/rich-content/normalize-transcript-blocks.js';
import {
  groupNormalizedSequence,
  groupNormalizedTranscript,
  isInboundImageFallback,
  type RenderItem,
} from '../src/pages/chat/transcript/transcript-helpers.js';
import { parseDisplayBlock, type DisplayTranscriptBlock } from '../src/shared/state/state.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const SESSION_ID = 'session_group_001';
const AT = '2026-08-17T10:00:00.000Z';

function base(id: string, seq: number, revision = 1) {
  return { id, revision, seq, occurredAt: AT };
}

function activity(id: string, seq: number): NormalizedTranscriptBlock {
  return {
    kind: 'activity',
    sessionId: SESSION_ID,
    blockId: id,
    sourceBlockId: id,
    revision: 1,
    sequence: seq,
    source: 'relay',
    redaction: null,
    sourceBlock: displayBlock({ ...base(id, seq), kind: 'thinking' }),
  };
}

function prose(id: string, seq: number, role: 'user' | 'assistant', textValue: string): NormalizedTranscriptBlock {
  return {
    kind: 'prose',
    sessionId: SESSION_ID,
    blockId: id,
    sourceBlockId: id,
    revision: 1,
    sequence: seq,
    source: 'relay',
    redaction: null,
    sourceBlock: displayBlock({ ...base(id, seq), kind: 'text', role, text: textValue }),
    role,
    settled: true,
    canonicalSource: textValue,
  };
}

function inboundImage(id: string, seq: number): NormalizedTranscriptBlock {
  const sourceBlock = displayBlock({
    ...base(id, seq),
    kind: 'attachment',
    redaction: 'withheld',
    renderer: 'image',
    availability: 'ready',
    content: { kind: 'image', source: 'redacted' },
  });
  return {
    kind: 'fallback',
    sessionId: SESSION_ID,
    blockId: id,
    sourceBlockId: id,
    revision: 1,
    sequence: seq,
    source: 'relay',
    redaction: null,
    originalKind: 'inbound_image',
    sourceBlock,
  } as NormalizedTranscriptBlock;
}

function displayBlock(block: Record<string, unknown>): DisplayTranscriptBlock {
  const parsed = parseDisplayBlock(block, 'relay');
  if (parsed === null) throw new Error('fixture must parse as a display block');
  return parsed;
}

// ───────────────────────────────────────────────────────────────────
// 3. INCREMENTAL SEQUENCE ASSEMBLER (independent of the canonical path)
// ───────────────────────────────────────────────────────────────────

/**
 * Merges newly appended normalized blocks into a persistent grouped view
 * the way a live transcript would: an activity block joins the trailing
 * activity run, an inbound image joins the trailing stack, anything else
 * flushes both. The grouping seam performs the same merge from scratch.
 */
class IncrementalSequenceAssembler {
  private readonly items: RenderItem[] = [];

  append(blocks: readonly NormalizedTranscriptBlock[]): void {
    for (const block of blocks) {
      if (block.kind === 'activity') {
        const last = this.items.at(-1);
        if (last !== undefined && last.kind === 'activity') {
          last.blocks.push(block);
          continue;
        }
        this.items.push({ kind: 'activity', id: `activity-${block.blockId}`, blocks: [block] });
        continue;
      }
      if (isInboundImageFallback(block)) {
        const last = this.items.at(-1);
        if (last !== undefined && last.kind === 'inbound-stack') {
          last.blocks.push(block);
          continue;
        }
        this.items.push({
          kind: 'inbound-stack',
          id: `inbound-stack-${block.blockId}`,
          blocks: [block],
        });
        continue;
      }
      this.items.push({ kind: 'block', id: block.blockId, block });
    }
  }

  current(): readonly RenderItem[] {
    return this.items;
  }
}

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('the grouping seam — differential surface', () => {
  it('an incremental assembler equals a canonical full regroup at every prefix', () => {
    const batches: readonly (readonly NormalizedTranscriptBlock[])[] = [
      [activity('act-1', 1)],
      [activity('act-2', 2)],
      [prose('prose-1', 3, 'user', 'hello')],
      [inboundImage('img-1', 4), activity('act-3', 5)],
      [prose('prose-2', 6, 'assistant', 'world')],
    ];

    const assembler = new IncrementalSequenceAssembler();
    let accumulated: readonly NormalizedTranscriptBlock[] = [];
    for (const batch of batches) {
      assembler.append(batch);
      accumulated = [...accumulated, ...batch];
      expect(assembler.current()).toEqual(groupNormalizedSequence(accumulated));
    }
  });

  it('groupNormalizedTranscript agrees with the plain sequence path when no turns exist', () => {
    const blocks = [activity('act-1', 1), prose('prose-1', 2, 'assistant', 'no user prompt')];
    // No source turn exists (turns are built from user-text boundaries), so
    // the turn-aware path must render exactly the grouped sequence.
    expect(groupNormalizedTranscript(blocks, [])).toEqual(groupNormalizedSequence(blocks));
  });

  it('groups by turn when the source carries a user-text boundary', () => {
    const user = displayBlock({ ...base('user-1', 1), kind: 'text', role: 'user', text: 'go' });
    const blocks = [prose('answer-001', 2, 'assistant', 'answer')];
    const items = groupNormalizedTranscript(blocks, [user]);
    // The assistant block is placed in the user's own turn bucket.
    expect(items.some((item) => item.kind === 'block' && item.block.sourceBlockId === 'answer-001')).toBe(
      true,
    );
  });
});

describe('call-result pairing — pending stays visibly in flight', () => {
  function richCall(id: string, callId: string, seq: number) {
    return {
      ...base(id, seq),
      kind: 'tool_call',
      toolName: 'bash',
      inputSummary: 'printf "one"',
      callId,
      shellKind: 'bash',
      lifecycle: 'running',
      terminalCheckpoint: 'streaming',
      redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
    };
  }

  function richResult(id: string, callId: string, seq: number, output: string) {
    return {
      ...base(id, seq),
      kind: 'tool_result',
      toolName: 'bash',
      output,
      isError: false,
      callId,
      shellKind: 'bash',
      lifecycle: 'completed',
      terminalCheckpoint: 'terminal',
      outputCompleteness: 'complete',
      redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
    };
  }

  it('keeps a result without its call pending, never a finished command', () => {
    const pending = normalizeTranscript({
      sessionId: SESSION_ID,
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

  it('reports the call id once both halves are paired', () => {
    const pair = normalizeTranscript({
      sessionId: SESSION_ID,
      blocks: [
        richResult('result-1', 'call-1', 2, 'out\n'),
        richCall('call-1', 'call-1', 3),
      ],
    });
    expect(pair.pendingResultCallIds).toEqual([]);
    expect(pair.blocks).toHaveLength(1);
    expect(pair.blocks[0]).toMatchObject({ kind: 'command', callId: 'call-1', pendingCall: false });
  });
});