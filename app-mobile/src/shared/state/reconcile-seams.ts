// ───────────────────────────────────────────────────────────────────
// MODULE: Session Status Reconciliation Seams
// ───────────────────────────────────────────────────────────────────

// Pure decision seams for the sessionListReducer's reconciliation path.
// Each takes immutable card/event fields (status, updatedAt, epoch) plus
// an injected clock and returns a verdict — never a mutation. The default
// position is fail-closed: when the client cannot confirm what the host
// means, nothing changes and nothing is promoted to a resolved value.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';

// ───────────────────────────────────────────────────────────────────
// 2. DONE HOLDOFF
// ───────────────────────────────────────────────────────────────────

export const DONE_HOLDOFF_MS = 3000;

export interface SessionStatusEvent {
  readonly status: SessionCardDto['status'];
  readonly updatedAt: string;
  readonly epoch: string | null;
}

/**
 * A late `running` re-report that lands inside the holdoff window after a
 * card settled to `idle` — with no genuine new-turn marker — is the tail of
 * the original completion signal, not a real new turn. Ignoring it keeps a
 * finished session from flickering back to working on a duplicate delivery.
 */
export function shouldHoldOffRunning(
  current: SessionStatusEvent,
  incoming: SessionStatusEvent,
  now: number,
): boolean {
  if (current.status !== 'idle' || incoming.status !== 'running') return false;
  // A changed epoch is the only genuine new-turn marker the client can see.
  if (current.epoch !== null && incoming.epoch !== null && current.epoch !== incoming.epoch) {
    return false;
  }
  const sinceIdle = now - Date.parse(current.updatedAt);
  if (!Number.isFinite(sinceIdle)) return false;
  return sinceIdle < DONE_HOLDOFF_MS;
}

// ───────────────────────────────────────────────────────────────────
// 3. ASYMMETRIC IDLE RESCUE
// ───────────────────────────────────────────────────────────────────

/**
 * A low-confidence "presumed idle" reconciliation may only downgrade a
 * `running` card. It must never clear an attention / needs-you card, whose
 * interruption is host truth, so rescue is strictly one-directional.
 */
export function canDowngradeToIdle(status: SessionCardDto['status']): boolean {
  return status === 'running';
}

// ───────────────────────────────────────────────────────────────────
// 4. RECONNECT DECIDE
// ───────────────────────────────────────────────────────────────────

export type ReconnectVerdict = 'undecided' | 'stale-running';

/**
 * Decide what a reconnect may do to a card. The verdict defaults to
 * undecided (change nothing): only LIVE rows are trusted for a stale
 * presentation, and a `running` row from the relay stays running — it is
 * never flipped to done or idle locally. Idle rows are not re-verified;
 * an idle-that-is-really-working self-corrects on the next live event.
 */
export function reconnectVerdict(
  card: SessionCardDto,
  source: 'none' | 'cache' | 'relay',
): ReconnectVerdict {
  if (source === 'relay' && card.status === 'running') return 'stale-running';
  return 'undecided';
}