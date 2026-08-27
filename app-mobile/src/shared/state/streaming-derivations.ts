// ───────────────────────────────────────────────────────────────────
// MODULE: Streaming State Derivations
// ───────────────────────────────────────────────────────────────────
// Pure functions that derive streaming affordance state from the
// host-supplied transcript and connection fields. Each defaults to a
// safe fail-closed value — no client-owned session truth.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { ConnectionPhase, DisplayTranscriptBlock } from './state.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** The hold-off window for a late re-reported running signal after a turn end. */
export const DONE_HOLDOFF_MS = 3_000;

/**
 * The settle delay on the transient→enabled edge so a dying socket never
 * flashes send-enabled.
 */
export const INPUT_LOCK_SETTLE_MS = 600;

// ───────────────────────────────────────────────────────────────────
// 3. TYPES
// ───────────────────────────────────────────────────────────────────

export type InputLockReason = 'none' | 'waiting-for-lease' | 'disconnected';

// ───────────────────────────────────────────────────────────────────
// 4. HAS STREAMING TOKENS
// ───────────────────────────────────────────────────────────────────
// True when the turn is running AND the latest block is an in-progress
// assistant text block. A running turn with no assistant text block yet
// (e.g. the model is thinking) returns false, so the caller can show
// animated dots instead. Fail-closed default is false.

export function hasStreamingTokens(
  blocks: readonly DisplayTranscriptBlock[],
  running: boolean,
): boolean {
  if (!running) return false;
  if (blocks.length === 0) return false;
  const latest = blocks[blocks.length - 1];
  if (latest === undefined) return false;
  // Only text blocks carry a role; only assistant text is streaming.
  return latest.kind === 'text' && latest.role === 'assistant';
}

// ───────────────────────────────────────────────────────────────────
// 5. INPUT LOCK REASON
// ───────────────────────────────────────────────────────────────────
// Determines why the session input is locked, if at all.
//   awaitingSnapshot / reconnecting → waiting-for-lease (transient)
//   offline / unenrolled            → disconnected (hard)
//   live / connecting / error       → none (no lock)
// The 600 ms settle on the transient→enabled edge is applied by the
// caller (it requires a timestamp comparison), so this function returns
// the raw reason map.

export function inputLockReason(
  connection: ConnectionPhase,
  awaitingSnapshot: boolean,
): InputLockReason {
  if (connection === 'offline' || connection === 'unenrolled') {
    return 'disconnected';
  }
  if (connection === 'reconnecting' || awaitingSnapshot) {
    return 'waiting-for-lease';
  }
  return 'none';
}

/**
 * Derived lock reason with a settle timer: a transient→enabled transition
 * is held at 'waiting-for-lease' for INPUT_LOCK_SETTLE_MS after the
 * underlying condition clears, so a dying socket never flashes enabled.
 *
 * Pass `lastTransientAt` = the timestamp (ms) when the last transient
 * condition was observed, or 0 if never transient. Pass `now` = Date.now().
 */
export function inputLockReasonWithSettle(
  connection: ConnectionPhase,
  awaitingSnapshot: boolean,
  lastTransientAt: number,
  now: number,
): InputLockReason {
  const raw = inputLockReason(connection, awaitingSnapshot);
  // If the raw reason is still transient, update the transient clock.
  if (raw === 'waiting-for-lease') {
    return 'waiting-for-lease';
  }
  // If the raw reason is none but we recently cleared a transient
  // condition, hold the lock for the settle window.
  if (raw === 'none' && lastTransientAt > 0 && now - lastTransientAt < INPUT_LOCK_SETTLE_MS) {
    return 'waiting-for-lease';
  }
  return raw;
}

// ───────────────────────────────────────────────────────────────────
// 6. DONE-HOLDOFF
// ───────────────────────────────────────────────────────────────────
// A running signal re-reported within the done-holdoff window after an
// idle/interrupted end does NOT move the card back to running. Only a
// genuine new-turn marker (epoch/turn-boundary advance) reopens the
// idle→running transition. Fail-closed default HOLDS the finished state.

export type TurnStatus = 'idle' | 'running' | 'interrupted' | 'unknown';

export interface HoldOffInput {
  readonly currentStatus: TurnStatus;
  readonly previousStatus: TurnStatus;
  readonly previousEpoch: string | null;
  readonly currentEpoch: string | null;
  readonly turnEndedAt: number; // ms timestamp when the turn ended
  readonly now: number; // ms now
}

export enum HoldOffResult {
  /** The running signal is genuine and should be applied. */
  PASS = 0,
  /** The running signal is a late re-report and should be held off. */
  HOLD = 1,
}

/**
 * Determine whether a status transition should be held off.
 *
 * A running→idle or running→interrupted transition sets the hold-off
 * clock. Any running signal that arrives within DONE_HOLDOFF_MS after
 * that end is held, unless the epoch changed (indicating a new turn).
 *
 * A non-running status or a status that matches the previous is always
 * passed through (the hold-off only guards running after an end).
 */
export function holdOffLateRunning(input: HoldOffInput): HoldOffResult {
  const { currentStatus, previousStatus, previousEpoch, currentEpoch, turnEndedAt, now } = input;

  // Only guard against a late running signal.
  if (currentStatus !== 'running') return HoldOffResult.PASS;

  // If the previous status was already running, this is a continuous
  // running signal — pass through.
  if (previousStatus === 'running') return HoldOffResult.PASS;

  // If the epoch changed to a new value, the host has advanced to a
  // new turn — always reopen. If either epoch is null (no previous
  // known), we cannot determine a change, so fall through to the
  // hold-off check.
  if (
    previousEpoch !== null &&
    currentEpoch !== null &&
    previousEpoch !== currentEpoch
  ) {
    return HoldOffResult.PASS;
  }

  // If the previous status was idle or interrupted and the end is
  // within the hold-off window, hold.
  if (
    (previousStatus === 'idle' || previousStatus === 'interrupted') &&
    turnEndedAt > 0 &&
    now - turnEndedAt < DONE_HOLDOFF_MS
  ) {
    return HoldOffResult.HOLD;
  }

  // Default: pass through.
  return HoldOffResult.PASS;
}