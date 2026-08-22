// ───────────────────────────────────────────────────────────────────
// MODULE: Transcript Session-Scope Guards
// ───────────────────────────────────────────────────────────────────
// Proves that in-flight prompt settlements (optimistic, accepted,
// rejected) are bound to the session that started them: a settlement that
// arrives after a session switch can never display another session's rows.

import type { TextBlock } from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it } from 'vitest';

import { EMPTY_TRANSCRIPT, transcriptReducer, type TranscriptState } from '../src/shared/data/state.js';

const SESSION_A = 'session_scope_a';
const SESSION_B = 'session_scope_b';
const OCCURRED_AT = '2026-08-13T10:00:00.000Z';

function block(id: string, text: string): TextBlock {
  return {
    id,
    kind: 'text',
    role: 'user',
    text,
    revision: 1,
    seq: 1,
    occurredAt: OCCURRED_AT,
  };
}

function selected(sessionId: string): TranscriptState {
  return transcriptReducer(EMPTY_TRANSCRIPT, { type: 'select', sessionId });
}

describe('prompt settlements are session-scoped', () => {
  it('accepts an optimistic block for the current session', () => {
    const state = transcriptReducer(selected(SESSION_A), {
      type: 'promptOptimistic',
      sessionId: SESSION_A,
      block: block('optimistic_a', 'hello'),
    });
    expect(state.blocks.map((item) => item.id)).toEqual(['optimistic_a']);
    expect(state.pendingPromptIds).toEqual(['optimistic_a']);
  });

  it('drops an optimistic block that belongs to another session', () => {
    const state = transcriptReducer(selected(SESSION_B), {
      type: 'promptOptimistic',
      sessionId: SESSION_A,
      block: block('optimistic_a', 'hello'),
    });
    expect(state.blocks).toHaveLength(0);
    expect(state.pendingPromptIds).toEqual([]);
  });

  it('never lands a late acceptance for the previous session in the new session', () => {
    const switched = transcriptReducer(selected(SESSION_B), {
      type: 'select',
      sessionId: SESSION_B,
    });
    const state = transcriptReducer(switched, {
      type: 'promptAccepted',
      sessionId: SESSION_A,
      optimisticId: 'optimistic_a',
      block: block('block_a_settled', 'settled'),
      at: OCCURRED_AT,
    });
    expect(state.sessionId).toBe(SESSION_B);
    expect(state.blocks).toHaveLength(0);
    expect(state.source).toBe('none');
  });

  it('accepts settlements that match the current session', () => {
    const optimistic = transcriptReducer(selected(SESSION_A), {
      type: 'promptOptimistic',
      sessionId: SESSION_A,
      block: block('optimistic_a', 'hello'),
    });
    const accepted = transcriptReducer(optimistic, {
      type: 'promptAccepted',
      sessionId: SESSION_A,
      optimisticId: 'optimistic_a',
      block: block('block_a_settled', 'settled'),
      at: OCCURRED_AT,
    });
    expect(accepted.blocks.map((item) => item.id)).toEqual(['block_a_settled']);
    expect(accepted.pendingPromptIds).toEqual([]);
    expect(accepted.source).toBe('relay');
  });

  it('does not remove another session pending ids on rejection', () => {
    const optimistic = transcriptReducer(selected(SESSION_A), {
      type: 'promptOptimistic',
      sessionId: SESSION_A,
      block: block('optimistic_a', 'hello'),
    });
    const state = transcriptReducer(optimistic, {
      type: 'promptRejected',
      sessionId: SESSION_B,
      optimisticId: 'optimistic_a',
    });
    expect(state.blocks.map((item) => item.id)).toEqual(['optimistic_a']);
    expect(state.pendingPromptIds).toEqual(['optimistic_a']);
  });

  it('rejects in-flight settlements for the current session normally', () => {
    const optimistic = transcriptReducer(selected(SESSION_A), {
      type: 'promptOptimistic',
      sessionId: SESSION_A,
      block: block('optimistic_a', 'hello'),
    });
    const state = transcriptReducer(optimistic, {
      type: 'promptRejected',
      sessionId: SESSION_A,
      optimisticId: 'optimistic_a',
    });
    expect(state.blocks).toHaveLength(0);
    expect(state.pendingPromptIds).toEqual([]);
  });

  it('keeps a slash acceptance scoped to its own session', () => {
    const switched = transcriptReducer(selected(SESSION_A), {
      type: 'select',
      sessionId: SESSION_B,
    });
    const state = transcriptReducer(switched, {
      type: 'promptAccepted',
      sessionId: SESSION_A,
      optimisticId: 'block_slash_a',
      block: block('block_slash_a', '/plan'),
      at: OCCURRED_AT,
    });
    expect(state.blocks).toHaveLength(0);
  });
});
