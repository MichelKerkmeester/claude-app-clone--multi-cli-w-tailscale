// ───────────────────────────────────────────────────────────────────
// MODULE: Prompt Delivery Hold Tests
// ───────────────────────────────────────────────────────────────────

// The hold decides what happens to a send that threw without a definite
// refusal: it watches the transcript for the echoed user turn, keeps
// holding while nothing is known, settles (no restore, no resend) the
// moment the echo lands, and restores the exact raw draft only when the
// deadline expires with no echo. These tests pin every decision branch,
// including the ones the optimistic echo must NOT satisfy.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  deliveryHoldAction,
  echoedTurnLanded,
  PROMPT_DELIVERY_HOLD_MS,
  type DeliveryHold,
} from '../src/shared/state/prompt-delivery-hold.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const SUBMITTED = 'padded turn';
const AT = '2026-08-13T10:00:00.000Z';

function hold(overrides: Partial<DeliveryHold> = {}): DeliveryHold {
  return {
    sessionId: 'session_hold',
    optimisticId: 'optimistic_prompt_1',
    submissionId: 'prompt_1',
    message: SUBMITTED,
    rawDraft: '  padded turn  ',
    sinceSeq: 3,
    deadlineAt: 1_000,
    errorText: 'Prompt delivery is unresolved.',
    ...overrides,
  };
}

function block(overrides: {
  id?: string;
  kind?: 'text' | 'attachment';
  role?: 'assistant' | 'user';
  text?: string;
  provenance?: 'relay' | 'cache' | 'optimistic';
  seq?: number;
}) {
  return {
    id: overrides.id ?? 'block_host_1',
    kind: overrides.kind ?? 'text',
    role: overrides.role ?? 'user',
    text: overrides.text ?? SUBMITTED,
    revision: 1,
    seq: overrides.seq ?? 4,
    occurredAt: AT,
    provenance: overrides.provenance ?? ('relay' as const),
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('echoedTurnLanded', () => {
  it('sees the turn land when a relay user text block echoes the submitted text', () => {
    expect(echoedTurnLanded([block({ provenance: 'relay' })], SUBMITTED, 3)).toBe(true);
  });

  it('accepts a cache-provenance echo — a re-hydrated landed turn counts', () => {
    expect(echoedTurnLanded([block({ provenance: 'cache' })], SUBMITTED, 3)).toBe(true);
  });

  it('never counts the optimistic echo itself as a landing', () => {
    expect(echoedTurnLanded([block({ provenance: 'optimistic', id: 'optimistic_prompt_1' })], SUBMITTED, 3)).toBe(false);
  });

  it('ignores a relay turn whose text differs from the submitted message', () => {
    expect(echoedTurnLanded([block({ text: 'a different turn' })], SUBMITTED, 3)).toBe(false);
  });

  it('ignores assistant turns that merely repeat the text', () => {
    expect(echoedTurnLanded([block({ role: 'assistant' })], SUBMITTED, 3)).toBe(false);
  });

  it('ignores non-text blocks', () => {
    expect(echoedTurnLanded([block({ kind: 'attachment' })], SUBMITTED, 3)).toBe(false);
  });
});

describe('echo detection is bounded to turns after the send', () => {
  it('ignores an identical message that was already in the transcript', () => {
    // A short reply resent after it succeeded earlier: the stale turn must
    // not stand in for one that never arrived, or the retyped draft is lost.
    const stale = block({ id: 'block_old', seq: 2 });
    expect(echoedTurnLanded([stale], SUBMITTED, 3)).toBe(false);
    expect(deliveryHoldAction(hold(), [stale], 2_000)).toBe('restore');
  });

  it('counts an identical message that arrived after the send', () => {
    const fresh = block({ id: 'block_new', seq: 9 });
    expect(echoedTurnLanded([fresh], SUBMITTED, 3)).toBe(true);
    expect(deliveryHoldAction(hold(), [fresh], 2_000)).toBe('settle');
  });
});

describe('deliveryHoldAction', () => {
  it('watches while the deadline is ahead and no echo has landed', () => {
    expect(deliveryHoldAction(hold(), [], 999)).toBe('watch');
    expect(deliveryHoldAction(hold(), [], 0)).toBe('watch');
  });

  it('settles the moment the echoed turn lands — before the deadline', () => {
    const landed = [block({ provenance: 'relay' })];
    expect(deliveryHoldAction(hold(), landed, 500)).toBe('settle');
  });

  it('restores the exact raw draft only when the deadline expires with no echo', () => {
    expect(deliveryHoldAction(hold(), [], PROMPT_DELIVERY_HOLD_MS)).toBe('restore');
    expect(deliveryHoldAction(hold(), [], 2_000)).toBe('restore');
  });

  it('prefers settle over restore when the echo lands exactly at the deadline', () => {
    const landed = [block({ provenance: 'relay' })];
    expect(deliveryHoldAction(hold(), landed, 1_000)).toBe('settle');
  });

  it('does not restore on deadline expiry when the echo landed earlier', () => {
    const landed = [block({ provenance: 'relay' })];
    expect(deliveryHoldAction(hold(), landed, 9_999)).toBe('settle');
  });

  it('gives a landed turn its full hold window via PROMPT_DELIVERY_HOLD_MS', () => {
    expect(PROMPT_DELIVERY_HOLD_MS).toBe(20_000);
  });
});
