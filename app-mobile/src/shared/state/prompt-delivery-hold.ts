// ───────────────────────────────────────────────────────────────────
// MODULE: Prompt Delivery Hold (pure helpers)
// ───────────────────────────────────────────────────────────────────
// When a prompt submit throws without a definitive refusal, the send may
// still have landed on the host — only the acknowledgement was lost. The
// screen therefore holds before restoring the draft: it watches the
// transcript for the echoed user turn and only restores the raw draft
// once the watch deadline expires with no echo. This module owns the
// pure decisions so the screen keeps no reconcile logic of its own and
// the echo detection rides on the transcript blocks the reducer already
// reconciles (relay/cache provenance vs optimistic echo), never on a
// parallel mechanism.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { DisplayTranscriptBlock } from './state.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPES
// ───────────────────────────────────────────────────────────────────

/**
 * One unresolved prompt send held by the screen. `message` is the text
 * that was submitted (trimmed, as the host received it) and is what the
 * echoed turn is matched against; `rawDraft` is the exact pre-send draft
 * including its leading/trailing whitespace, restored on true failure.
 */
export interface DeliveryHold {
  readonly sessionId: string;
  readonly optimisticId: string;
  readonly submissionId: string;
  readonly message: string;
  readonly rawDraft: string;
  /**
   * The transcript's coverage at submit time. Only turns beyond it can be
   * this send's echo — without it, an identical message sent earlier in the
   * session ("ok", "yes") would settle a send that never actually landed,
   * and the person would silently lose the draft they retyped.
   */
  readonly sinceSeq: number;
  /** Epoch ms. The watch never outlives this deadline. */
  readonly deadlineAt: number;
  readonly errorText: string;
}

export type DeliveryHoldAction = 'watch' | 'settle' | 'restore';

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/**
 * How long an unresolved send watches for the echoed turn before the
 * send is treated as a true failure. Long enough for a reconnect-and-
 * snapshot round trip, short enough that the person isn't left guessing.
 */
export const PROMPT_DELIVERY_HOLD_MS = 20_000;

// ───────────────────────────────────────────────────────────────────
// 4. DECISIONS
// ───────────────────────────────────────────────────────────────────

/**
 * What to do with a held send given the current transcript. Settle means
 * the echoed turn landed (ack lost, delivery succeeded): the draft stays
 * cleared and the person is not invited to resend. Restore means the
 * deadline expired with no echo: the send is treated as truly failed and
 * the exact raw draft goes back. Watch means keep holding.
 */
export function deliveryHoldAction(
  hold: DeliveryHold,
  blocks: readonly DisplayTranscriptBlock[],
  now: number,
): DeliveryHoldAction {
  if (echoedTurnLanded(blocks, hold.message, hold.sinceSeq)) return 'settle';
  return now >= hold.deadlineAt ? 'restore' : 'watch';
}

/**
 * True when a non-optimistic user text block carrying the submitted text
 * arrived AFTER the send. The optimistic echo shares that text, so it is
 * excluded by provenance; relay and cache provenance both count, since a
 * turn that landed shows up either live or in a re-hydrated transcript.
 * The sequence floor is what keeps an identical earlier message from
 * standing in for a turn that never arrived.
 */
export function echoedTurnLanded(
  blocks: readonly DisplayTranscriptBlock[],
  message: string,
  sinceSeq: number,
): boolean {
  return blocks.some(
    (block) =>
      block.provenance !== 'optimistic' &&
      block.kind === 'text' &&
      block.role === 'user' &&
      block.text === message &&
      block.seq > sinceSeq,
  );
}
