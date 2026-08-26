// ───────────────────────────────────────────────────────────────────
// MODULE: Transcript Scope-Guard Seam Tests
// ───────────────────────────────────────────────────────────────────

// The extracted id+epoch scope guard is one pure source of truth for what
// a sync message may touch. The differential test drives every prefix of a
// representative stream through the reducer and compares it against a
// deliberately simpler canonical reference assembled from scratch — the two
// implementations sharing nothing but the public parse surface — so a guard
// regression on any prefix surfaces as a real mismatch.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { Envelope, SyncDelta, SyncGap, SyncSnapshot } from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it } from 'vitest';

import {
  EMPTY_TRANSCRIPT,
  epochChangeState,
  isEpochChange,
  matchesTranscriptSession,
  parseDisplayBlock,
  transcriptReducer,
  type DisplayTranscriptBlock,
  type TranscriptAction,
  type TranscriptProvenance,
  type TranscriptState,
} from '../src/shared/state/state.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const SESSION_ID = 'session_scope_001';
const OTHER_SESSION = 'session_scope_002';
const EPOCH_A = 'epoch_scope_a';
const EPOCH_B = 'epoch_scope_b';
const AT = '2026-08-17T10:00:00.000Z';

function envelope(seq: number, text: string, epoch: string = EPOCH_A): Envelope {
  return {
    v: 1,
    eventId: `event_scope_${seq}`,
    kind: 'transcript.block',
    hostId: 'host_scope',
    workspaceRef: 'workspace_scope',
    sessionId: SESSION_ID,
    epoch,
    seq,
    occurredAt: AT,
    causedBy: null,
    payload: {
      id: `block_scope_${String(seq).padStart(3, '0')}`,
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

function snapshot(seqs: readonly number[], epoch: string = EPOCH_A): SyncSnapshot {
  return {
    kind: 'sync.snapshot',
    sessionId: SESSION_ID,
    epoch,
    coversThrough: Math.max(0, ...seqs),
    envelopes: seqs.map((seq) => envelope(seq, `snapshot ${seq}`, epoch)),
  };
}

function delta(seqs: readonly number[], epoch: string = EPOCH_A): SyncDelta {
  return {
    kind: 'sync.delta',
    sessionId: SESSION_ID,
    epoch,
    coversThrough: Math.max(0, ...seqs),
    envelopes: seqs.map((seq) => envelope(seq, `delta ${seq}`, epoch)),
  };
}

function gap(reason: SyncGap['reason']): SyncGap {
  return { kind: 'sync.gap', sessionId: SESSION_ID, epoch: EPOCH_A, coversThrough: 3, reason };
}

function optimisticBlock(id: string, text: string): TranscriptAction {
  return {
    type: 'promptOptimistic',
    sessionId: SESSION_ID,
    block: {
      id,
      kind: 'text',
      role: 'user',
      text,
      revision: 1,
      seq: 1,
      occurredAt: AT,
    },
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. CANONICAL REFERENCE (independent of the reducer)
// ───────────────────────────────────────────────────────────────────

function isLaterReference(
  left: DisplayTranscriptBlock,
  right: DisplayTranscriptBlock,
): boolean {
  return (
    left.revision > right.revision || (left.revision === right.revision && left.seq >= right.seq)
  );
}

function referenceNormalize(blocks: readonly unknown[], provenance: TranscriptProvenance): DisplayTranscriptBlock[] {
  const byId = new Map<string, DisplayTranscriptBlock>();
  for (const block of blocks) {
    const display =
      typeof block === 'object' && block !== null && 'provenance' in block
        ? (block as DisplayTranscriptBlock)
        : parseDisplayBlock(block, provenance);
    if (display === null) continue;
    const current = byId.get(display.id);
    if (current === undefined || isLaterReference(display, current)) {
      byId.set(display.id, display);
    }
  }
  return [...byId.values()].sort((left, right) => left.seq - right.seq);
}

class ReferenceAssembler {
  sessionId: string | null = null;
  epoch: string | null = null;
  coversThrough = 0;
  blocks: DisplayTranscriptBlock[] = [];
  pendingPromptIds: string[] = [];
  source: 'none' | 'cache' | 'relay' = 'none';
  updatedAt: string | null = null;
  awaitingSnapshot = false;
  gapReason: SyncGap['reason'] | null = null;
  error: string | null = null;

  apply(action: TranscriptAction): void {
    switch (action.type) {
      case 'select':
        if (this.sessionId !== action.sessionId) {
          this.sessionId = action.sessionId;
          this.epoch = null;
          this.coversThrough = 0;
          this.blocks = [];
          this.pendingPromptIds = [];
          this.source = 'none';
          this.updatedAt = null;
          this.awaitingSnapshot = false;
          this.gapReason = null;
          this.error = null;
        }
        break;
      case 'snapshot': {
        if (this.sessionId === null || this.sessionId !== action.message.sessionId) break;
        const raw = action.message.envelopes
          .filter(
            (envelope) =>
              envelope.kind === 'transcript.block' &&
              envelope.sessionId === action.message.sessionId &&
              envelope.epoch === action.message.epoch &&
              envelope.seq <= action.message.coversThrough,
          )
          .map((envelope) => envelope.payload);
        this.sessionId = action.message.sessionId;
        this.epoch = action.message.epoch;
        this.coversThrough = action.message.coversThrough;
        this.blocks = referenceNormalize(raw as unknown as DisplayTranscriptBlock[], 'relay');
        this.pendingPromptIds = [];
        this.source = 'relay';
        this.updatedAt = action.at;
        this.awaitingSnapshot = false;
        this.gapReason = null;
        this.error = null;
        break;
      }
      case 'delta': {
        if (this.sessionId === null || this.sessionId !== action.message.sessionId) break;
        if (this.awaitingSnapshot) break;
        if (this.epoch !== null && this.epoch !== action.message.epoch) {
          this.epoch = null;
          this.coversThrough = 0;
          this.blocks = [];
          this.pendingPromptIds = [];
          this.source = 'none';
          this.updatedAt = null;
          this.awaitingSnapshot = true;
          this.gapReason = null;
          this.error = 'The relay epoch changed. Waiting for an authoritative snapshot.';
          break;
        }
        const incoming = action.message.envelopes
          .filter(
            (envelope) => envelope.kind === 'transcript.block' && envelope.seq > this.coversThrough,
          )
          .map((envelope) => envelope.payload);
        this.epoch = action.message.epoch;
        this.coversThrough = Math.max(this.coversThrough, action.message.coversThrough);
        this.blocks = referenceNormalize(
          [...this.blocks, ...(incoming as unknown as DisplayTranscriptBlock[])],
          'relay',
        );
        this.source = 'relay';
        this.updatedAt = action.at;
        this.awaitingSnapshot = false;
        this.gapReason = null;
        this.error = null;
        break;
      }
      case 'gap': {
        if (this.sessionId === null || this.sessionId !== action.message.sessionId) break;
        this.epoch = action.message.epoch;
        this.coversThrough = action.message.coversThrough;
        this.blocks = [];
        this.pendingPromptIds = [];
        this.source = 'none';
        this.updatedAt = null;
        this.awaitingSnapshot = action.message.reason !== 'unknown-session';
        this.gapReason = action.message.reason;
        this.error =
          action.message.reason === 'unknown-session'
            ? 'This session is not available from the relay.'
            : null;
        break;
      }
      case 'promptOptimistic': {
        if (this.sessionId === null || this.sessionId !== action.sessionId) break;
        this.blocks = referenceNormalize([...this.blocks, action.block], 'optimistic');
        this.pendingPromptIds = [...this.pendingPromptIds, action.block.id];
        break;
      }
      case 'promptAccepted': {
        if (this.sessionId === null || this.sessionId !== action.sessionId) break;
        this.blocks = referenceNormalize(
          [...this.blocks.filter((block) => block.id !== action.optimisticId), action.block],
          'relay',
        );
        this.pendingPromptIds = this.pendingPromptIds.filter((id) => id !== action.optimisticId);
        this.source = 'relay';
        this.updatedAt = action.at;
        break;
      }
      case 'promptRejected': {
        if (this.sessionId === null || this.sessionId !== action.sessionId) break;
        this.blocks = this.blocks.filter((block) => block.id !== action.optimisticId);
        this.pendingPromptIds = this.pendingPromptIds.filter((id) => id !== action.optimisticId);
        break;
      }
      case 'hydrate':
      case 'page':
      case 'error':
        break;
    }
  }

  toState(): TranscriptState {
    return {
      sessionId: this.sessionId,
      epoch: this.epoch,
      coversThrough: this.coversThrough,
      blocks: this.blocks,
      pendingPromptIds: this.pendingPromptIds,
      source: this.source,
      updatedAt: this.updatedAt,
      awaitingSnapshot: this.awaitingSnapshot,
      gapReason: this.gapReason,
      error: this.error,
    };
  }
}

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('the extracted scope guard', () => {
  it('matches only the session a transcript is showing', () => {
    const selected = transcriptReducer(EMPTY_TRANSCRIPT, { type: 'select', sessionId: SESSION_ID });
    expect(matchesTranscriptSession(selected, SESSION_ID)).toBe(true);
    expect(matchesTranscriptSession(selected, OTHER_SESSION)).toBe(false);
    // An unselected transcript matches nothing, like the inline null guard did.
    expect(matchesTranscriptSession(EMPTY_TRANSCRIPT, SESSION_ID)).toBe(false);
  });

  it('flags only a real epoch change and builds the awaiting state', () => {
    const selected = transcriptReducer(EMPTY_TRANSCRIPT, { type: 'select', sessionId: SESSION_ID });
    const withEpoch = transcriptReducer(selected, {
      type: 'snapshot',
      message: snapshot([1, 2]),
      at: AT,
    });
    expect(isEpochChange(withEpoch, EPOCH_B)).toBe(true);
    expect(isEpochChange(withEpoch, EPOCH_A)).toBe(false);
    const waiting = epochChangeState(withEpoch);
    expect(waiting.awaitingSnapshot).toBe(true);
    expect(waiting.blocks).toEqual([]);
    expect(waiting.error).not.toBeNull();
  });
});

describe('differential: incremental fold equals a canonical full rebuild', () => {
  // Every prefix of a stream that crosses select, snapshot, delta, epoch
  // change, gap, optimistic settlement and a session switch.
  const stream: readonly TranscriptAction[] = [
    { type: 'select', sessionId: SESSION_ID },
    { type: 'snapshot', message: snapshot([1, 2]), at: AT },
    optimisticBlock('optimistic_1', 'draft'),
    { type: 'delta', message: delta([3]), at: AT },
    {
      type: 'promptAccepted',
      sessionId: SESSION_ID,
      optimisticId: 'optimistic_1',
      block: {
        id: 'block_settled_1',
        kind: 'text',
        role: 'assistant',
        text: 'settled',
        revision: 2,
        seq: 4,
        occurredAt: AT,
      },
      at: AT,
    },
    { type: 'promptRejected', sessionId: SESSION_ID, optimisticId: 'optimistic_missing' },
    { type: 'delta', message: delta([5], EPOCH_B), at: AT },
    { type: 'snapshot', message: snapshot([5, 6], EPOCH_B), at: AT },
    { type: 'gap', message: gap('retention') },
    { type: 'gap', message: gap('unknown-session') },
    { type: 'select', sessionId: OTHER_SESSION },
    optimisticBlock('optimistic_2', 'late draft'),
  ];

  it('matches the reference assembler at every prefix', () => {
    let incremental = EMPTY_TRANSCRIPT;
    stream.forEach((action, index) => {
      incremental = transcriptReducer(incremental, action);
      const reference = new ReferenceAssembler();
      stream.slice(0, index + 1).forEach((step) => reference.apply(step));
      expect(incremental).toEqual(reference.toState());
    });
  });

  it('drops a settlement that arrives after a session switch', () => {
    const switched = transcriptReducer(EMPTY_TRANSCRIPT, {
      type: 'select',
      sessionId: OTHER_SESSION,
    });
    const state = transcriptReducer(switched, {
      type: 'promptAccepted',
      sessionId: SESSION_ID,
      optimisticId: 'optimistic_1',
      block: {
        id: 'block_late',
        kind: 'text',
        role: 'assistant',
        text: 'late',
        revision: 1,
        seq: 7,
        occurredAt: AT,
      },
      at: AT,
    });
    expect(state.blocks).toHaveLength(0);
    expect(state.sessionId).toBe(OTHER_SESSION);
  });
});

describe('boundary: stale and unknown stay unresolved', () => {
  it('enters awaitingSnapshot on an epoch change mid-stream and recovers only on a fresh snapshot', () => {
    const state = transcriptReducer(
      transcriptReducer(EMPTY_TRANSCRIPT, { type: 'select', sessionId: SESSION_ID }),
      { type: 'snapshot', message: snapshot([1, 2]), at: AT },
    );
    const afterEpoch = transcriptReducer(state, { type: 'delta', message: delta([3], EPOCH_B), at: AT });
    expect(afterEpoch.awaitingSnapshot).toBe(true);
    expect(afterEpoch.blocks).toEqual([]);

    const holding = transcriptReducer(afterEpoch, { type: 'delta', message: delta([4], EPOCH_B), at: AT });
    expect(holding).toBe(afterEpoch);

    const recovered = transcriptReducer(afterEpoch, {
      type: 'snapshot',
      message: snapshot([5, 6], EPOCH_B),
      at: AT,
    });
    expect(recovered.awaitingSnapshot).toBe(false);
    expect(recovered.blocks.map((block) => block.seq)).toEqual([5, 6]);
  });

  it('reports an unknown-session gap as an error, never an empty success', () => {
    const selected = transcriptReducer(EMPTY_TRANSCRIPT, { type: 'select', sessionId: SESSION_ID });
    const state = transcriptReducer(selected, { type: 'gap', message: gap('unknown-session') });
    expect(state.awaitingSnapshot).toBe(false);
    expect(state.error).not.toBeNull();
    expect(state.gapReason).toBe('unknown-session');
  });

  it('keeps an unknown block kind as an unknown presentation, richEligible false', () => {
    const block = parseDisplayBlock(
      { id: 'block_unknown', kind: 'mystery-kind', revision: 1, seq: 1, occurredAt: AT },
      'relay',
    );
    expect(block?.kind).toBe('unknown');
    expect(block?.richEligible).toBe(false);
    expect(block?.originalKind).toBe('mystery-kind');
  });
});