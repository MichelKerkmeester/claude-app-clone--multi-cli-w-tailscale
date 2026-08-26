// ───────────────────────────────────────────────────────────────────
// MODULE: Device-Local Unread Overlay
// ───────────────────────────────────────────────────────────────────

// Client-only seen/unread bits. They never write session status and are
// never folded into host truth. A session that just became idle is marked
// unread only when its chat is not the foreground surface.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const UNREAD_KEY = 'pi-remote.session-unread';

// ───────────────────────────────────────────────────────────────────
// 3. STORAGE
// ───────────────────────────────────────────────────────────────────

/** Load persisted unread ids; unreadable JSON fails closed to empty. */
export function readUnreadIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(UNREAD_KEY);
    if (raw === null) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === 'string')) {
      return new Set();
    }
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

/** Persist unread ids; ignore storage failures so the overlay stays in memory. */
export function writeUnreadIds(ids: ReadonlySet<string>): void {
  try {
    window.localStorage.setItem(UNREAD_KEY, JSON.stringify([...ids]));
  } catch {
    // The overlay still applies for this session when persistent storage is unavailable.
  }
}

// ───────────────────────────────────────────────────────────────────
// 4. TRANSITIONS
// ───────────────────────────────────────────────────────────────────

export interface UnreadTransitionInput {
  readonly previousStatus: SessionCardDto['status'] | undefined;
  readonly nextStatus: SessionCardDto['status'];
  readonly chatForeground: boolean;
}

/**
 * Mark unread on a newly observed idle or interrupted card, but never while
 * that session's chat is the active surface.
 */
export function shouldMarkUnread(input: UnreadTransitionInput): boolean {
  if (input.chatForeground) return false;
  if (input.previousStatus === undefined) return false;
  if (input.previousStatus === input.nextStatus) return false;
  return input.nextStatus === 'idle' || input.nextStatus === 'interrupted';
}

export interface UnreadApplyResult {
  readonly unread: Set<string>;
  readonly statuses: Map<string, SessionCardDto['status']>;
}

/** Fold a roster snapshot into the overlay without mutating `status`. */
export function applyUnreadTransitions(
  previous: ReadonlyMap<string, SessionCardDto['status']>,
  items: readonly SessionCardDto[],
  foregroundSessionId: string | null,
  unread: ReadonlySet<string>,
): UnreadApplyResult {
  const nextUnread = new Set(unread);
  const nextStatuses = new Map(previous);
  for (const item of items) {
    if (
      shouldMarkUnread({
        previousStatus: previous.get(item.id),
        nextStatus: item.status,
        chatForeground: foregroundSessionId === item.id,
      })
    ) {
      nextUnread.add(item.id);
    }
    nextStatuses.set(item.id, item.status);
  }
  return { unread: nextUnread, statuses: nextStatuses };
}

/** Opening a session clears its unread bit; status is left untouched. */
export function markSeen(unread: ReadonlySet<string>, sessionId: string): Set<string> {
  const next = new Set(unread);
  next.delete(sessionId);
  return next;
}

export function unreadSetsEqual(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  if (left.size !== right.size) return false;
  for (const id of left) {
    if (!right.has(id)) return false;
  }
  return true;
}
