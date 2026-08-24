// ───────────────────────────────────────────────────────────────────
// MODULE: Derived Turns Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import type { TextBlock, ToolCallBlock, TranscriptBlock } from '@pi-remote/pi-rpc-protocol';

import { groupBlocksIntoTurns } from '../src/shared/state/turns.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

let seq = 0;
function user(id: string, text = 'hi'): TextBlock {
  return { kind: 'text', role: 'user', id, text, revision: 1, seq: ++seq, occurredAt: 't' };
}
function assistant(id: string, text = 'ok'): TextBlock {
  return { kind: 'text', role: 'assistant', id, text, revision: 1, seq: ++seq, occurredAt: 't' };
}
function tool(id: string): ToolCallBlock {
  return {
    kind: 'tool_call',
    id,
    toolName: 'read',
    inputSummary: 'x',
    revision: 1,
    seq: ++seq,
    occurredAt: 't',
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('groupBlocksIntoTurns', () => {
  it('returns no turns for an empty transcript', () => {
    expect(groupBlocksIntoTurns([])).toEqual([]);
  });

  it('opens a turn at each user block and gathers following evidence', () => {
    const blocks: TranscriptBlock[] = [user('u1'), assistant('a1'), tool('t1')];
    const turns = groupBlocksIntoTurns(blocks);
    expect(turns).toHaveLength(1);
    expect(turns[0].prompt?.id).toBe('u1');
    expect(turns[0].blocks.map((b) => b.id)).toEqual(['u1', 'a1', 't1']);
    expect(turns[0].key).toBe('turn_u1');
  });

  it('puts leading orphan evidence in a synthetic prompt-less turn', () => {
    const turns = groupBlocksIntoTurns([tool('t0'), assistant('a0'), user('u1'), assistant('a1')]);
    expect(turns).toHaveLength(2);
    expect(turns[0].prompt).toBeNull();
    expect(turns[0].blocks.map((b) => b.id)).toEqual(['t0', 'a0']);
    expect(turns[1].prompt?.id).toBe('u1');
  });

  it('makes each consecutive user block its own turn', () => {
    const turns = groupBlocksIntoTurns([user('u1'), user('u2'), user('u3')]);
    expect(turns.map((t) => t.key)).toEqual(['turn_u1', 'turn_u2', 'turn_u3']);
    expect(turns.every((t) => t.blocks.length === 1)).toBe(true);
  });

  it('preserves source order across interleaved tools', () => {
    const turns = groupBlocksIntoTurns([user('u1'), tool('t1'), tool('t2'), assistant('a1')]);
    expect(turns).toHaveLength(1);
    expect(turns[0].blocks.map((b) => b.id)).toEqual(['u1', 't1', 't2', 'a1']);
  });

  it('keeps a stable turn key when a block is replaced by a higher revision', () => {
    const before = groupBlocksIntoTurns([user('u1'), assistant('a1', 'partial')]);
    const after = groupBlocksIntoTurns([user('u1'), { ...assistant('a1', 'final'), revision: 2 }]);
    expect(after[0].key).toBe(before[0].key);
    expect(after[0].blocks).toHaveLength(2);
  });
});
