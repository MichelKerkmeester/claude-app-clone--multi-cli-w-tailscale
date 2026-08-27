// ───────────────────────────────────────────────────────────────────
// MODULE: Streaming Derivations — Pure Function Tests
// ───────────────────────────────────────────────────────────────────
// Tests for the four PHASE-1 derivations: hasStreamingTokens,
// inputLockReason, and holdOffLateRunning.
// Each is a pure function proofed for fail-closed defaults.

import { describe, it, expect } from 'vitest';
import type { DisplayTranscriptBlock } from '$shared/state/state.js';

import {
  DONE_HOLDOFF_MS,
  INPUT_LOCK_SETTLE_MS,
  hasStreamingTokens,
  inputLockReason,
  inputLockReasonWithSettle,
  holdOffLateRunning,
  HoldOffResult,
  type HoldOffInput,
  type TurnStatus,
} from '$shared/state/streaming-derivations.js';

// ───────────────────────────────────────────────────────────────────
// Helper: build a minimal assistant text block
// ───────────────────────────────────────────────────────────────────

function assistantTextBlock(overrides: Partial<DisplayTranscriptBlock> = {}): DisplayTranscriptBlock {
  return {
    id: 'block_1',
    kind: 'text',
    role: 'assistant',
    revision: 1,
    seq: 1,
    occurredAt: '2026-01-01T00:00:00.000Z',
    provenance: 'relay',
    richEligible: false,
    ...overrides,
  } as DisplayTranscriptBlock;
}

function userTextBlock(overrides: Partial<DisplayTranscriptBlock> = {}): DisplayTranscriptBlock {
  return {
    id: 'block_2',
    kind: 'text',
    role: 'user',
    revision: 1,
    seq: 2,
    occurredAt: '2026-01-01T00:00:00.000Z',
    provenance: 'relay',
    richEligible: false,
    ...overrides,
  } as DisplayTranscriptBlock;
}

function thinkingBlock(overrides: Partial<DisplayTranscriptBlock> = {}): DisplayTranscriptBlock {
  return {
    id: 'block_3',
    kind: 'thinking',
    revision: 1,
    seq: 3,
    occurredAt: '2026-01-01T00:00:00.000Z',
    provenance: 'relay',
    richEligible: false,
    ...overrides,
  } as DisplayTranscriptBlock;
}

// ───────────────────────────────────────────────────────────────────
// 1. hasStreamingTokens
// ───────────────────────────────────────────────────────────────────

describe('hasStreamingTokens', () => {
  it('returns false when not running (fail-closed default)', () => {
    const blocks: readonly DisplayTranscriptBlock[] = [assistantTextBlock()];
    expect(hasStreamingTokens(blocks, false)).toBe(false);
  });

  it('returns false when running with empty blocks', () => {
    expect(hasStreamingTokens([], true)).toBe(false);
  });

  it('returns false when running but latest block is not assistant text', () => {
    const blocks: readonly DisplayTranscriptBlock[] = [thinkingBlock()];
    expect(hasStreamingTokens(blocks, true)).toBe(false);
  });

  it('returns false when running but latest block is user text', () => {
    const blocks: readonly DisplayTranscriptBlock[] = [userTextBlock()];
    expect(hasStreamingTokens(blocks, true)).toBe(false);
  });

  it('returns true when running and latest block is assistant text', () => {
    const blocks: readonly DisplayTranscriptBlock[] = [assistantTextBlock()];
    expect(hasStreamingTokens(blocks, true)).toBe(true);
  });

  it('returns false when running and assistant text is not the latest block', () => {
    const blocks: readonly DisplayTranscriptBlock[] = [
      assistantTextBlock({ id: 'a', seq: 1 }),
      thinkingBlock({ id: 'b', seq: 2 }),
    ];
    expect(hasStreamingTokens(blocks, true)).toBe(false);
  });

  it('returns true when running and assistant text is the latest among many blocks', () => {
    const blocks: readonly DisplayTranscriptBlock[] = [
      userTextBlock({ id: 'a', seq: 1 }),
      thinkingBlock({ id: 'b', seq: 2 }),
      assistantTextBlock({ id: 'c', seq: 3 }),
    ];
    expect(hasStreamingTokens(blocks, true)).toBe(true);
  });

  it('returns false when not running even with assistant text blocks', () => {
    const blocks: readonly DisplayTranscriptBlock[] = [assistantTextBlock()];
    expect(hasStreamingTokens(blocks, false)).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────
// 2. inputLockReason
// ───────────────────────────────────────────────────────────────────

describe('inputLockReason', () => {
  it('returns "none" for live connection', () => {
    expect(inputLockReason('live', false)).toBe('none');
  });

  it('returns "none" for connecting (optimistic, no lock)', () => {
    expect(inputLockReason('connecting', false)).toBe('none');
  });

  it('returns "none" for error state', () => {
    expect(inputLockReason('error', false)).toBe('none');
  });

  it('returns "waiting-for-lease" for reconnecting', () => {
    expect(inputLockReason('reconnecting', false)).toBe('waiting-for-lease');
  });

  it('returns "waiting-for-lease" for awaitingSnapshot', () => {
    expect(inputLockReason('live', true)).toBe('waiting-for-lease');
  });

  it('returns "disconnected" for offline', () => {
    expect(inputLockReason('offline', false)).toBe('disconnected');
  });

  it('returns "disconnected" for unenrolled', () => {
    expect(inputLockReason('unenrolled', false)).toBe('disconnected');
  });

  it('returns "waiting-for-lease" for reconnecting + awaitingSnapshot', () => {
    expect(inputLockReason('reconnecting', true)).toBe('waiting-for-lease');
  });
});

describe('inputLockReasonWithSettle', () => {
  it('returns "waiting-for-lease" while inside the settle window after transient clears', () => {
    const now = Date.now();
    const lastTransientAt = now - 100; // 100 ms ago, inside settle
    expect(inputLockReasonWithSettle('live', false, lastTransientAt, now)).toBe('waiting-for-lease');
  });

  it('returns "none" when settle window has expired', () => {
    const now = Date.now();
    const lastTransientAt = now - INPUT_LOCK_SETTLE_MS - 100; // well outside
    expect(inputLockReasonWithSettle('live', false, lastTransientAt, now)).toBe('none');
  });

  it('returns "none" when no transient was ever recorded', () => {
    expect(inputLockReasonWithSettle('live', false, 0, Date.now())).toBe('none');
  });

  it('returns "waiting-for-lease" while still in transient state, regardless of settle', () => {
    const now = Date.now();
    const lastTransientAt = now - 10_000; // old transient, but still reconnecting
    expect(inputLockReasonWithSettle('reconnecting', false, lastTransientAt, now)).toBe('waiting-for-lease');
  });

  it('returns "disconnected" for offline regardless of settle', () => {
    expect(inputLockReasonWithSettle('offline', false, 0, Date.now())).toBe('disconnected');
  });
});

// ───────────────────────────────────────────────────────────────────
// 3. holdOffLateRunning
// ───────────────────────────────────────────────────────────────────

describe('holdOffLateRunning', () => {
  const EPOCH_A = 'epoch_a';
  const EPOCH_B = 'epoch_b';
  const now = 1_000_000_000;
  const recentEnd = now - 500; // 500 ms ago, inside hold-off

  function makeInput(overrides: Partial<HoldOffInput> = {}): HoldOffInput {
    return {
      currentStatus: 'running' as TurnStatus,
      previousStatus: 'idle' as TurnStatus,
      previousEpoch: EPOCH_A,
      currentEpoch: EPOCH_A,
      turnEndedAt: recentEnd,
      now,
      ...overrides,
    };
  }

  it('passes a running signal when previous was also running (continuous run)', () => {
    const result = holdOffLateRunning(makeInput({ previousStatus: 'running' }));
    expect(result).toBe(HoldOffResult.PASS);
  });

  it('passes a running signal when previous was idle but turn ended long ago', () => {
    const result = holdOffLateRunning(makeInput({ turnEndedAt: now - DONE_HOLDOFF_MS - 1000 }));
    expect(result).toBe(HoldOffResult.PASS);
  });

  it('holds a running signal when previous was idle and turn just ended', () => {
    const result = holdOffLateRunning(makeInput());
    expect(result).toBe(HoldOffResult.HOLD);
  });

  it('holds a running signal when previous was interrupted and turn just ended', () => {
    const result = holdOffLateRunning(makeInput({ previousStatus: 'interrupted' }));
    expect(result).toBe(HoldOffResult.HOLD);
  });

  it('passes a running signal when epoch changes (new turn)', () => {
    const result = holdOffLateRunning(
      makeInput({ previousEpoch: EPOCH_A, currentEpoch: EPOCH_B, turnEndedAt: recentEnd }),
    );
    expect(result).toBe(HoldOffResult.PASS);
  });

  it('passes a non-running status through (no hold-off for idle)', () => {
    const result = holdOffLateRunning(
      makeInput({ currentStatus: 'idle', previousStatus: 'running' }),
    );
    expect(result).toBe(HoldOffResult.PASS);
  });

  it('passes a non-running status through (no hold-off for interrupted)', () => {
    const result = holdOffLateRunning(
      makeInput({ currentStatus: 'interrupted', previousStatus: 'running' }),
    );
    expect(result).toBe(HoldOffResult.PASS);
  });

  it('passes unknown status through', () => {
    const result = holdOffLateRunning(
      makeInput({ currentStatus: 'unknown', previousStatus: 'idle' }),
    );
    expect(result).toBe(HoldOffResult.PASS);
  });

  it('holds when previous status is idle and end is barely inside the window', () => {
    const result = holdOffLateRunning(
      makeInput({ turnEndedAt: now - DONE_HOLDOFF_MS + 10 }),
    );
    expect(result).toBe(HoldOffResult.HOLD);
  });

  it('passes when previous status is idle and end is just outside the window', () => {
    const result = holdOffLateRunning(
      makeInput({ turnEndedAt: now - DONE_HOLDOFF_MS - 10 }),
    );
    expect(result).toBe(HoldOffResult.PASS);
  });

  it('holds a running signal when previousStatus is interrupted and barely inside window', () => {
    const result = holdOffLateRunning(
      makeInput({ previousStatus: 'interrupted', turnEndedAt: now - DONE_HOLDOFF_MS + 100 }),
    );
    expect(result).toBe(HoldOffResult.HOLD);
  });

  it('passes when epoch is null and no recent end time (initial state)', () => {
    const result = holdOffLateRunning(
      makeInput({ previousEpoch: null, currentEpoch: EPOCH_A, turnEndedAt: 0 }),
    );
    expect(result).toBe(HoldOffResult.PASS);
  });

  it('holds when epoch is null but turn ended recently (late running)', () => {
    const result = holdOffLateRunning(
      makeInput({ previousEpoch: null, currentEpoch: EPOCH_A, turnEndedAt: recentEnd }),
    );
    expect(result).toBe(HoldOffResult.HOLD);
  });
});