// ───────────────────────────────────────────────────────────────────
// MODULE: Live Activity Arbitration Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it } from 'vitest';

import {
  arbitrateLiveActivity,
  selectLiveActivity,
  type LiveActivityCandidate,
} from '../src/shared/format/live-activity-arbitration.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const UPDATED_AT = '2026-08-17T10:00:00.000Z';

function card(id: string, overrides: Partial<SessionCardDto> = {}): SessionCardDto {
  return {
    id,
    status: 'idle',
    updatedAt: UPDATED_AT,
    messageCount: 0,
    ...overrides,
  };
}

function candidate(session: SessionCardDto, firstSeenAt: number): LiveActivityCandidate {
  return { session, firstSeenAt };
}

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('selectLiveActivity', () => {
  it('lets a needs-you badge beat a working session', () => {
    const working = candidate(card('working', { status: 'running' }), 10);
    const needsYou = candidate(card('needs-you', { attention: 'waiting' }), 20);

    const selection = selectLiveActivity([working, needsYou], new Set());

    expect(selection?.session.id).toBe('needs-you');
    expect(selection?.badge).toEqual({ kind: 'permission', label: 'Permission' });
  });

  it('uses the earlier first-seen time for equal demand and stays stable across repeated calls', () => {
    const seenLater = candidate(card('seen-later', { status: 'running' }), 200);
    const seenFirst = candidate(card('seen-first', { status: 'running' }), 100);
    const sessions = [seenLater, seenFirst];

    const firstSelection = selectLiveActivity(sessions, new Set());
    const repeatedSelection = selectLiveActivity(sessions, new Set());

    expect(firstSelection?.session.id).toBe('seen-first');
    expect(repeatedSelection).toEqual(firstSelection);
  });
});

describe('arbitrateLiveActivity', () => {
  it('leaves the current winner unchanged when a different session ticks', () => {
    const winner = candidate(card('winner', { attention: 'waiting' }), 200);
    const runner = candidate(card('runner', { status: 'running' }), 300);
    const current = selectLiveActivity([winner, runner], new Set());
    const runnerAfterTick = candidate(card('runner', { attention: 'waiting' }), 100);

    const next = arbitrateLiveActivity({
      current,
      event: { type: 'tick', sessionId: 'runner' },
      localUnreadIds: new Set(),
      sessions: [winner, runnerAfterTick],
    });

    expect(next).toBe(current);
    expect(next?.session.id).toBe('winner');
  });

  it('refreshes a ticking winner without changing its identity', () => {
    const initial = candidate(card('winner', { status: 'running', activity: 'first' }), 100);
    const current = selectLiveActivity([initial], new Set());
    const refreshed = candidate(
      card('winner', {
        status: 'running',
        activity: 'second',
        updatedAt: '2026-08-17T10:01:00.000Z',
      }),
      100,
    );

    const next = arbitrateLiveActivity({
      current,
      event: { type: 'tick', sessionId: 'winner' },
      localUnreadIds: new Set(),
      sessions: [refreshed],
    });

    expect(next).not.toBe(current);
    expect(next?.session.id).toBe('winner');
    expect(next?.session.activity).toBe('second');
    expect(next?.session.updatedAt).toBe('2026-08-17T10:01:00.000Z');
  });

  it('re-elects the slot on an edge', () => {
    const currentWinner = candidate(card('current', { status: 'running' }), 100);
    const promoted = candidate(card('promoted', { status: 'running' }), 200);
    const current = selectLiveActivity([currentWinner, promoted], new Set());
    const promotedAfterEdge = candidate(card('promoted', { attention: 'waiting' }), 200);

    const next = arbitrateLiveActivity({
      current,
      event: { type: 'edge', sessionId: 'promoted' },
      localUnreadIds: new Set(),
      sessions: [currentWinner, promotedAfterEdge],
    });

    expect(next?.session.id).toBe('promoted');
    expect(next?.badge).toEqual({ kind: 'permission', label: 'Permission' });
  });
});
