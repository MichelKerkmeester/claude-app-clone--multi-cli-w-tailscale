// ───────────────────────────────────────────────────────────────────
// MODULE: Live Activity Arbitration
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';

import { resolveAttentionBadge, type AttentionBadge } from './attention.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Pair a host session with the device-local clock that first exposed it. */
export interface LiveActivityCandidate {
  readonly session: SessionCardDto;
  readonly firstSeenAt: number;
}

/** The one session snapshot currently occupying the device-local activity slot. */
export interface LiveActivitySelection {
  readonly session: SessionCardDto;
  readonly badge: AttentionBadge | null;
  readonly firstSeenAt: number;
}

export type LiveActivityEvent =
  | { readonly type: 'tick'; readonly sessionId: string }
  | { readonly type: 'edge'; readonly sessionId: string };

export interface LiveActivityArbitrationInput {
  readonly current: LiveActivitySelection | null;
  readonly event: LiveActivityEvent;
  readonly localUnreadIds: ReadonlySet<string>;
  readonly sessions: readonly LiveActivityCandidate[];
}

// ───────────────────────────────────────────────────────────────────
// 3. BADGE DEMAND
// ───────────────────────────────────────────────────────────────────

/** Map the shared badge result to the slot demand categories. */
function demandRank(badge: AttentionBadge | null): number {
  if (badge?.kind === 'permission') return 3;
  if (badge?.kind === 'unread' || badge?.kind === 'done') return 2;
  if (badge?.kind === 'working') return 1;
  return 0;
}

function toSelection(
  candidate: LiveActivityCandidate,
  localUnreadIds: ReadonlySet<string>,
  firstSeenAt = candidate.firstSeenAt,
): LiveActivitySelection {
  return {
    session: candidate.session,
    badge: resolveAttentionBadge(candidate.session, localUnreadIds),
    firstSeenAt,
  };
}

// ───────────────────────────────────────────────────────────────────
// 4. ELECTION
// ───────────────────────────────────────────────────────────────────

/** Select one slot occupant without mutating host or device-local state. */
export function selectLiveActivity(
  sessions: readonly LiveActivityCandidate[],
  localUnreadIds: ReadonlySet<string>,
): LiveActivitySelection | null {
  let selected: LiveActivitySelection | null = null;
  let selectedRank = -1;

  for (const candidate of sessions) {
    const selection = toSelection(candidate, localUnreadIds);
    const rank = demandRank(selection.badge);
    const outranksSelection = rank > selectedRank;
    const winsEarlierTie =
      selected !== null && rank === selectedRank && candidate.firstSeenAt < selected.firstSeenAt;

    if (selected === null || outranksSelection || winsEarlierTie) {
      selected = selection;
      selectedRank = rank;
    }
  }

  return selected;
}

// ───────────────────────────────────────────────────────────────────
// 5. EVENT TRANSITIONS
// ───────────────────────────────────────────────────────────────────

/** Refresh only the current occupant on ticks; an edge is the election boundary. */
export function arbitrateLiveActivity(
  input: LiveActivityArbitrationInput,
): LiveActivitySelection | null {
  const { current, event, localUnreadIds, sessions } = input;

  if (event.type === 'edge') return selectLiveActivity(sessions, localUnreadIds);
  if (current === null || event.sessionId !== current.session.id) return current;

  const refreshedCandidate = sessions.find(({ session }) => session.id === current.session.id);
  if (refreshedCandidate === undefined) return null;

  return toSelection(refreshedCandidate, localUnreadIds, current.firstSeenAt);
}
