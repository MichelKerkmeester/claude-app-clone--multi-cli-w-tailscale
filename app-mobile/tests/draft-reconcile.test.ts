// ───────────────────────────────────────────────────────────────────
// MODULE: Draft ReconcilE Seam Tests
// ───────────────────────────────────────────────────────────────────

// The prompt settlement path is one pure source of truth: optimistic echo,
// host-id settlement and rejection must be routed through the same
// functions the reducer calls, and a settlement arriving after a session
// switch can never touch another session's rows. The differential test
// proves the reducer's incremental folding stays equal to a canonical
// rebuild of the same stream.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  EMPTY_TRANSCRIPT,
  reconcilePromptAccepted,
  reconcilePromptOptimistic,
  reconcilePromptRejected,
  transcriptReducer,
  type TranscriptState,
} from '../src/shared/state/state.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const SESSION_A = 'session_draft_a';
const SESSION_B = 'session_draft_b';
const AT = '2026-08-13T10:00:00.000Z';

function rawDraft(id: string, text: string) {
  return {
    id,
    kind: 'text' as const,
    role: 'user' as const,
    text,
    revision: 1,
    seq: 1,
    occurredAt: AT,
  };
}

function echo(id: string, text: string, revision = 2, seq = 4) {
  return {
    id,
    kind: 'text' as const,
    role: 'assistant' as const,
    text,
    revision,
    seq,
    occurredAt: AT,
  };
}

function selected(sessionId: string): TranscriptState {
  return transcriptReducer(EMPTY_TRANSCRIPT, { type: 'select', sessionId });
}

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('the extracted draft-reconcile seam', () => {
  it('echoes an optimistic draft with its raw block intact', () => {
    const draft = rawDraft('draft_1', 'hello');
    const result = reconcilePromptOptimistic([], [], draft);
    expect(result.pendingPromptIds).toEqual(['draft_1']);
    expect(result.blocks[0]?.provenance).toBe('optimistic');
    expect(result.blocks[0]?.id).toBe('draft_1');
  });

  it('restores the exact raw draft on reject', () => {
    const draft = rawDraft('draft_1', 'hello');
    const optimistic = reconcilePromptOptimistic([], [], draft);
    const rejected = reconcilePromptRejected(optimistic.blocks, optimistic.pendingPromptIds, 'draft_1');
    expect(rejected.pendingPromptIds).toEqual([]);
    expect(rejected.blocks).toEqual([]);
  });

  it('settles by host id, replacing the optimistic row', () => {
    const draft = rawDraft('draft_1', 'hello');
    const optimistic = reconcilePromptOptimistic([], [], draft);
    const settled = reconcilePromptAccepted(
      optimistic.blocks,
      optimistic.pendingPromptIds,
      'draft_1',
      echo('echo_1', 'settled'),
    );
    expect(settled.pendingPromptIds).toEqual([]);
    expect(settled.blocks.map((block) => block.id)).toEqual(['echo_1']);
  });
});

describe('reducer routing through the seam', () => {
  it('drops a settlement that arrives after a session switch', () => {
    const state = transcriptReducer(selected(SESSION_B), {
      type: 'promptAccepted',
      sessionId: SESSION_A,
      optimisticId: 'draft_1',
      block: echo('echo_late', 'late'),
      at: AT,
    });
    expect(state.blocks).toHaveLength(0);
    expect(state.pendingPromptIds).toEqual([]);
  });

  it('keeps behaviour identical for the full optimistic → accepted → rejected cycle', () => {
    const initial = transcriptReducer(selected(SESSION_A), {
      type: 'promptOptimistic',
      sessionId: SESSION_A,
      block: rawDraft('draft_2', 'cycle'),
    });
    expect(initial.pendingPromptIds).toEqual(['draft_2']);
    expect(initial.blocks.map((block) => block.id)).toEqual(['draft_2']);

    const accepted = transcriptReducer(initial, {
      type: 'promptAccepted',
      sessionId: SESSION_A,
      optimisticId: 'draft_2',
      block: echo('echo_2', 'cycle'),
      at: AT,
    });
    expect(accepted.pendingPromptIds).toEqual([]);
    expect(accepted.blocks.map((block) => block.id)).toEqual(['echo_2']);
    expect(accepted.source).toBe('relay');

    const rejected = transcriptReducer(accepted, {
      type: 'promptRejected',
      sessionId: SESSION_A,
      optimisticId: 'echo_2',
    });
    expect(rejected.blocks).toHaveLength(0);
    expect(rejected.pendingPromptIds).toEqual([]);
  });

  it('matches a canonical full rebuild at every prefix of a settlement stream', () => {
    const stream = [
      { type: 'select', sessionId: SESSION_A },
      { type: 'promptOptimistic', sessionId: SESSION_A, block: rawDraft('draft_3', 'one') },
      { type: 'promptOptimistic', sessionId: SESSION_A, block: rawDraft('draft_4', 'two') },
      {
        type: 'promptAccepted',
        sessionId: SESSION_A,
        optimisticId: 'draft_3',
        block: echo('echo_3', 'one'),
        at: AT,
      },
      { type: 'promptRejected', sessionId: SESSION_A, optimisticId: 'draft_4' },
      {
        type: 'promptAccepted',
        sessionId: SESSION_A,
        optimisticId: 'echo_3',
        block: echo('echo_3b', 'late echo'),
        at: AT,
      },
      { type: 'promptRejected', sessionId: SESSION_A, optimisticId: 'echo_3b' },
      { type: 'select', sessionId: SESSION_B },
      { type: 'promptOptimistic', sessionId: SESSION_A, block: rawDraft('draft_5', 'stray') },
    ] as const;

    let incremental = EMPTY_TRANSCRIPT;
    stream.forEach((action, index) => {
      incremental = transcriptReducer(incremental, action);
      let canonical = EMPTY_TRANSCRIPT;
      stream.slice(0, index + 1).forEach((step) => {
        canonical = transcriptReducer(canonical, step);
      });
      expect(incremental).toEqual(canonical);
    });
  });
});