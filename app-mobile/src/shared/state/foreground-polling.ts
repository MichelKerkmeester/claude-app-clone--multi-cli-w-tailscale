// ───────────────────────────────────────────────────────────────────
// MODULE: Foreground-only catch-up polling
// ───────────────────────────────────────────────────────────────────
// Periodic reads and retry loops belong to a visible tab. A hidden tab
// drops the timer entirely; refocus and the browser online edge each
// schedule one coalesced catch-up so returning never bursts.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

export const ROSTER_POLL_MS = 15_000;

// ───────────────────────────────────────────────────────────────────
// 3. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type ForegroundPoller = {
  start: () => void;
  stop: () => void;
  notifyVisibility: (state: Document['visibilityState']) => void;
  notifyReconnect: () => void;
};

export type RosterRefreshKind = 'poll' | 'reconnect' | 'pull';

// ───────────────────────────────────────────────────────────────────
// 4. EDGE AND CACHE RULES
// ───────────────────────────────────────────────────────────────────

export function shouldPollWhileVisible(visibilityState: Document['visibilityState']): boolean {
  return visibilityState === 'visible';
}

export function isNavigatorReconnectEdge(wasOnline: boolean, isOnline: boolean): boolean {
  return wasOnline === false && isOnline === true;
}

/** Pull and reconnect must hit the relay; a timer tick may keep last-good on screen. */
export function rosterReadBypassesCache(kind: RosterRefreshKind): boolean {
  return kind === 'pull' || kind === 'reconnect';
}

export async function runRosterRefresh(args: {
  bypassCache: boolean;
  fetchLive: () => Promise<void>;
  serveCached: () => void;
}): Promise<void> {
  if (!args.bypassCache) {
    args.serveCached();
    return;
  }
  await args.fetchLive();
}

// ───────────────────────────────────────────────────────────────────
// 5. POLLER
// ───────────────────────────────────────────────────────────────────

export function createForegroundPoller(options: {
  intervalMs: number;
  read: () => void;
  getVisibility: () => Document['visibilityState'];
  catchUpOnStart?: boolean;
  schedule?: (callback: () => void, ms: number) => number;
  cancel?: (id: number) => void;
}): ForegroundPoller {
  const schedule = options.schedule ?? ((callback, ms) => window.setTimeout(callback, ms));
  const cancel = options.cancel ?? ((id) => window.clearTimeout(id));
  const catchUpOnStart = options.catchUpOnStart !== false;
  let stopped = true;
  let timer: number | null = null;
  let catchUpQueued = false;

  const clearTimer = (): void => {
    if (timer === null) return;
    cancel(timer);
    timer = null;
  };

  const scheduleNext = (): void => {
    clearTimer();
    if (stopped || options.intervalMs <= 0) return;
    if (!shouldPollWhileVisible(options.getVisibility())) return;
    timer = schedule(() => {
      timer = null;
      if (stopped || !shouldPollWhileVisible(options.getVisibility())) return;
      options.read();
      scheduleNext();
    }, options.intervalMs);
  };

  const catchUp = (): void => {
    if (stopped || !shouldPollWhileVisible(options.getVisibility())) return;
    if (catchUpQueued) return;
    catchUpQueued = true;
    queueMicrotask(() => {
      catchUpQueued = false;
      if (stopped || !shouldPollWhileVisible(options.getVisibility())) return;
      options.read();
      scheduleNext();
    });
  };

  return {
    start: () => {
      stopped = false;
      if (catchUpOnStart) {
        catchUp();
        return;
      }
      scheduleNext();
    },
    stop: () => {
      stopped = true;
      catchUpQueued = false;
      clearTimer();
    },
    notifyVisibility: (state) => {
      if (stopped) return;
      if (!shouldPollWhileVisible(state)) {
        clearTimer();
        return;
      }
      catchUp();
    },
    notifyReconnect: () => {
      if (stopped) return;
      catchUp();
    },
  };
}
