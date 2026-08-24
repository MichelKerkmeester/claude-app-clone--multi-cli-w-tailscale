// ───────────────────────────────────────────────────────────────────
// MODULE: Transcript Reducer Tests
// ───────────────────────────────────────────────────────────────────

// The reducer decides what a reader sees after every sync message, and until
// now nothing exercised it directly.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { Envelope, SyncDelta, SyncGap, SyncSnapshot } from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it } from 'vitest';

import {
  EMPTY_TRANSCRIPT,
  transcriptReducer,
  type TranscriptState,
} from '../src/shared/state/state.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const SESSION_ID = 'session_reducer_001';
const EPOCH = 'epoch_reducer_001';
const AT = '2026-08-17T10:00:00.000Z';

function envelope(seq: number, text: string, epoch = EPOCH): Envelope {
  return {
    v: 1,
    eventId: `event_reducer_${seq}`,
    kind: 'transcript.block',
    hostId: 'host_local',
    workspaceRef: 'workspace_default',
    sessionId: SESSION_ID,
    epoch,
    seq,
    occurredAt: AT,
    causedBy: null,
    payload: {
      id: `block_reducer_${String(seq).padStart(3, '0')}`,
      revision: 1,
      seq,
      occurredAt: AT,
      kind: 'text',
      role: 'assistant',
      text,
    },
    redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
    replay: { eligible: true, snapshotEligible: true },
  } as unknown as Envelope;
}

function snapshot(seqs: readonly number[], epoch = EPOCH): SyncSnapshot {
  return {
    kind: 'sync.snapshot',
    sessionId: SESSION_ID,
    epoch,
    coversThrough: Math.max(0, ...seqs),
    envelopes: seqs.map((seq) => envelope(seq, `snapshot ${seq}`, epoch)),
  };
}

function delta(seqs: readonly number[], epoch = EPOCH): SyncDelta {
  return {
    kind: 'sync.delta',
    sessionId: SESSION_ID,
    epoch,
    coversThrough: Math.max(0, ...seqs),
    envelopes: seqs.map((seq) => envelope(seq, `delta ${seq}`, epoch)),
  };
}

function gap(reason: SyncGap['reason'], coversThrough = 2): SyncGap {
  return { kind: 'sync.gap', sessionId: SESSION_ID, epoch: EPOCH, coversThrough, reason };
}

function selected(): TranscriptState {
  return transcriptReducer(EMPTY_TRANSCRIPT, { type: 'select', sessionId: SESSION_ID });
}

function withSnapshot(seqs: readonly number[] = [1, 2]): TranscriptState {
  return transcriptReducer(selected(), { type: 'snapshot', message: snapshot(seqs), at: AT });
}

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('transcript reducer', () => {
  it('takes a snapshot as the authoritative history', () => {
    const state = withSnapshot([1, 2]);

    expect(state.blocks.map((block) => block.seq)).toEqual([1, 2]);
    expect(state.coversThrough).toBe(2);
    expect(state.source).toBe('relay');
    expect(state.awaitingSnapshot).toBe(false);
    expect(state.epoch).toBe(EPOCH);
  });

  it('appends only the part of a delta beyond the cursor', () => {
    // A relay may resend what the client already has; replaying it would
    // duplicate blocks a reader is looking at.
    const state = transcriptReducer(withSnapshot([1, 2]), {
      type: 'delta',
      message: delta([2, 3]),
      at: AT,
    });

    expect(state.blocks.map((block) => block.seq)).toEqual([1, 2, 3]);
    expect(state.coversThrough).toBe(3);
  });

  it('discards its history when a delta arrives under a new epoch', () => {
    const state = transcriptReducer(withSnapshot([1, 2]), {
      type: 'delta',
      message: delta([3], 'epoch_reducer_002'),
      at: AT,
    });

    // Blocks from two generations interleaved would read as one conversation.
    expect(state.blocks).toEqual([]);
    expect(state.awaitingSnapshot).toBe(true);
    expect(state.error).not.toBeNull();
  });

  it('waits for a snapshot after a recoverable gap and reports an unknown session', () => {
    const recoverable = transcriptReducer(withSnapshot([1, 2]), {
      type: 'gap',
      message: gap('retention'),
    });
    expect(recoverable.awaitingSnapshot).toBe(true);
    expect(recoverable.gapReason).toBe('retention');
    expect(recoverable.error).toBeNull();

    const unknown = transcriptReducer(withSnapshot([1, 2]), {
      type: 'gap',
      message: gap('unknown-session'),
    });
    // Nothing is coming, so waiting would leave the reader on a blank screen.
    expect(unknown.awaitingSnapshot).toBe(false);
    expect(unknown.error).not.toBeNull();
  });

  describe('the recovery barrier', () => {
    const waiting = transcriptReducer(withSnapshot([1, 2]), {
      type: 'gap',
      message: gap('retention'),
    });

    it('holds until an authoritative snapshot arrives', () => {
      expect(waiting.awaitingSnapshot).toBe(true);

      // A delta while waiting would build history on a cursor known to be wrong.
      const afterDelta = transcriptReducer(waiting, {
        type: 'delta',
        message: delta([3]),
        at: AT,
      });
      expect(afterDelta).toBe(waiting);

      const afterPage = transcriptReducer(waiting, {
        type: 'page',
        sessionId: SESSION_ID,
        coversThrough: 3,
        blocks: [],
        at: AT,
      });
      expect(afterPage).toBe(waiting);
    });

    it('releases only on a snapshot', () => {
      const released = transcriptReducer(waiting, {
        type: 'snapshot',
        message: snapshot([1, 2, 3]),
        at: AT,
      });

      expect(released.awaitingSnapshot).toBe(false);
      expect(released.blocks.map((block) => block.seq)).toEqual([1, 2, 3]);
    });
  });
});
