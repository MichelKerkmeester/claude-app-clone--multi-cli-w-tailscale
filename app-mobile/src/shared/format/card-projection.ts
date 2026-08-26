// ───────────────────────────────────────────────────────────────────
// MODULE: Session Card Projection Seams
// ───────────────────────────────────────────────────────────────────

// Presentation-only projections over SessionCardDto. Every function here
// is pure over immutable card fields (status, messageCount, updatedAt)
// plus an injected clock; none of them writes status or fabricates a
// timestamp. An absent clock must mean genuinely unknown (sorts last,
// never "just now"), and a stale working card decays to an *unknown*
// presentation — a lost agent is unknown, never a completed one.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';

// ───────────────────────────────────────────────────────────────────
// 2. STALE-WORKING DECAY
// ───────────────────────────────────────────────────────────────────

export const WORKING_STALE_MS = 20 * 60_000;

export type StalePresentation = 'fresh' | 'stale-unknown';

/**
 * Decide how a card should look based on how long its last host update
 * has been silent. Only `running` cards decay: a session the host stopped
 * reporting is unknown, not idle — an idle look would celebrate a lost
 * agent as finished.
 */
export function decideStalePresentation(
  status: SessionCardDto['status'],
  updatedAt: string,
  now: number,
): StalePresentation {
  if (status !== 'running') return 'fresh';
  const elapsed = now - Date.parse(updatedAt);
  if (!Number.isFinite(elapsed)) return 'fresh';
  return elapsed >= WORKING_STALE_MS ? 'stale-unknown' : 'fresh';
}

// ───────────────────────────────────────────────────────────────────
// 3. CARD VIEW-MODEL PROJECTION
// ───────────────────────────────────────────────────────────────────

export interface CardProjection {
  readonly messageCountLabel: string;
  /** Stable absolute reference for the datetime attribute / tap-to-inspect. */
  readonly absoluteOnTap: string;
  readonly isRestingDone: boolean;
  /** A zero-message session stays visible as a recoverable card, never hidden. */
  readonly isRecoverableEmpty: boolean;
}

export function projectSessionCard(card: SessionCardDto): CardProjection {
  const count = card.messageCount;
  return {
    messageCountLabel: count === 0 ? 'No blocks' : `${count} block${count === 1 ? '' : 's'}`,
    absoluteOnTap: card.updatedAt,
    isRestingDone: card.status === 'idle',
    isRecoverableEmpty: count === 0,
  };
}