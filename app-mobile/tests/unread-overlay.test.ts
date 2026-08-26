// ───────────────────────────────────────────────────────────────────
// MODULE: Unread Overlay Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  applyUnreadTransitions,
  markSeen,
  readUnreadIds,
  shouldMarkUnread,
  writeUnreadIds,
} from '../src/shared/state/unread-overlay.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

function card(id: string, status: SessionCardDto['status'] = 'idle'): SessionCardDto {
  return {
    id,
    status,
    updatedAt: '2026-08-17T11:00:00.000Z',
    messageCount: 1,
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('unread overlay', () => {
  it('marks a newly idle card unread only when its chat is not foreground', () => {
    expect(
      shouldMarkUnread({ previousStatus: 'running', nextStatus: 'idle', chatForeground: false }),
    ).toBe(true);
    expect(
      shouldMarkUnread({ previousStatus: 'running', nextStatus: 'idle', chatForeground: true }),
    ).toBe(false);
  });

  it('does not mark unread on first sighting or a same-status snapshot', () => {
    expect(
      shouldMarkUnread({ previousStatus: undefined, nextStatus: 'idle', chatForeground: false }),
    ).toBe(false);
    expect(
      shouldMarkUnread({ previousStatus: 'idle', nextStatus: 'idle', chatForeground: false }),
    ).toBe(false);
  });

  it('never writes status when applying the overlay', () => {
    const session = card('session_unread_001', 'running');
    const next = applyUnreadTransitions(
      new Map([[session.id, 'running']]),
      [{ ...session, status: 'idle' }],
      null,
      new Set(),
    );
    expect(session.status).toBe('running');
    expect(next.unread.has(session.id)).toBe(true);
    expect(next.statuses.get(session.id)).toBe('idle');
  });

  it('clears the overlay on seen without touching status', () => {
    const session = card('session_seen_001');
    const unread = markSeen(new Set([session.id]), session.id);
    expect(unread.has(session.id)).toBe(false);
    expect(session.status).toBe('idle');
  });

  it('fails closed to an empty overlay on unreadable storage', () => {
    window.localStorage.setItem('pi-remote.session-unread', '{not-json');
    expect(readUnreadIds().size).toBe(0);
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => writeUnreadIds(new Set(['x']))).not.toThrow();
  });
});
