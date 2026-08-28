// ───────────────────────────────────────────────────────────────────
// MODULE: Foreground polling and reconnect refetch tests
// ───────────────────────────────────────────────────────────────────

// Hidden tabs must not tick. Refocus and the browser online edge each fire
// one coalesced read — the assertion is the call count, not merely that
// something ran. Pull-to-refresh bypasses the saved roster.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createForegroundPoller,
  isNavigatorReconnectEdge,
  rosterReadBypassesCache,
  ROSTER_POLL_MS,
  runRosterRefresh,
  shouldPollWhileVisible,
} from '../src/shared/state/foreground-polling.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

type Scheduled = { id: number; at: number; callback: () => void };

function createClock() {
  let now = 0;
  let nextId = 1;
  const pending: Scheduled[] = [];
  return {
    now: () => now,
    schedule: (callback: () => void, ms: number): number => {
      const id = nextId;
      nextId += 1;
      pending.push({ id, at: now + ms, callback });
      return id;
    },
    cancel: (id: number): void => {
      const index = pending.findIndex((item) => item.id === id);
      if (index >= 0) pending.splice(index, 1);
    },
    advance: (ms: number): void => {
      now += ms;
      const due = pending.filter((item) => item.at <= now).sort((a, b) => a.at - b.at);
      for (const item of due) {
        const index = pending.indexOf(item);
        if (index >= 0) pending.splice(index, 1);
        item.callback();
      }
    },
    pendingCount: () => pending.length,
  };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('foreground poll visibility', () => {
  it('polls only while the tab is visible', () => {
    expect(shouldPollWhileVisible('visible')).toBe(true);
    expect(shouldPollWhileVisible('hidden')).toBe(false);
  });
});

describe('foreground catch-up poller', () => {
  it('stops the timer while hidden and performs exactly one read on refocus', async () => {
    const clock = createClock();
    const read = vi.fn();
    let visibility: Document['visibilityState'] = 'visible';
    const poller = createForegroundPoller({
      intervalMs: ROSTER_POLL_MS,
      read,
      getVisibility: () => visibility,
      schedule: clock.schedule,
      cancel: clock.cancel,
    });

    poller.start();
    await flush();
    expect(read).toHaveBeenCalledTimes(1);

    clock.advance(ROSTER_POLL_MS);
    expect(read).toHaveBeenCalledTimes(2);

    visibility = 'hidden';
    poller.notifyVisibility('hidden');
    clock.advance(ROSTER_POLL_MS * 4);
    expect(read).toHaveBeenCalledTimes(2);
    expect(clock.pendingCount()).toBe(0);

    visibility = 'visible';
    poller.notifyVisibility('visible');
    poller.notifyVisibility('visible');
    poller.notifyReconnect();
    await flush();
    expect(read).toHaveBeenCalledTimes(3);

    poller.stop();
  });

  it('coalesces start, refocus, and reconnect in the same turn into one read', async () => {
    const read = vi.fn();
    const poller = createForegroundPoller({
      intervalMs: 0,
      read,
      getVisibility: () => 'visible',
    });

    poller.start();
    poller.notifyVisibility('visible');
    poller.notifyReconnect();
    await flush();
    expect(read).toHaveBeenCalledTimes(1);
    poller.stop();
  });

  it('does not read while hidden, including a reconnect that arrives in the background', async () => {
    const read = vi.fn();
    const poller = createForegroundPoller({
      intervalMs: ROSTER_POLL_MS,
      read,
      getVisibility: () => 'hidden',
    });

    poller.start();
    poller.notifyReconnect();
    await flush();
    expect(read).toHaveBeenCalledTimes(0);
    poller.stop();
  });
});

describe('reconnect refetch', () => {
  it('detects the browser online edge and not a live tick', () => {
    expect(isNavigatorReconnectEdge(false, true)).toBe(true);
    expect(isNavigatorReconnectEdge(true, true)).toBe(false);
    expect(isNavigatorReconnectEdge(false, false)).toBe(false);
  });

  it('fires one catch-up read on the reconnect edge while visible', async () => {
    const read = vi.fn();
    const poller = createForegroundPoller({
      intervalMs: 0,
      read,
      getVisibility: () => 'visible',
    });
    poller.start();
    await flush();
    expect(read).toHaveBeenCalledTimes(1);

    expect(isNavigatorReconnectEdge(false, true)).toBe(true);
    poller.notifyReconnect();
    await flush();
    expect(read).toHaveBeenCalledTimes(2);
    poller.stop();
  });
});

describe('pull-to-refresh cache bypass', () => {
  it('hits the live fetch for pull and reconnect and never serves the saved roster', async () => {
    expect(rosterReadBypassesCache('pull')).toBe(true);
    expect(rosterReadBypassesCache('reconnect')).toBe(true);
    expect(rosterReadBypassesCache('poll')).toBe(false);

    const fetchLive = vi.fn(async () => undefined);
    const serveCached = vi.fn();

    await runRosterRefresh({
      bypassCache: rosterReadBypassesCache('pull'),
      fetchLive,
      serveCached,
    });
    expect(fetchLive).toHaveBeenCalledTimes(1);
    expect(serveCached).not.toHaveBeenCalled();

    fetchLive.mockClear();
    await runRosterRefresh({
      bypassCache: rosterReadBypassesCache('poll'),
      fetchLive,
      serveCached,
    });
    expect(fetchLive).not.toHaveBeenCalled();
    expect(serveCached).toHaveBeenCalledTimes(1);
  });
});
