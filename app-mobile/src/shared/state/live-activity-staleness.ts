// ───────────────────────────────────────────────────────────────────
// MODULE: Live Activity Staleness Watchdog
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** Treat a live surface as unknown after twenty minutes without a host update. */
export const LIVE_ACTIVITY_STALE_MS = 1_200_000;

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type LiveActivityTimestamp = string | number;

export interface LiveActivityStalenessInput {
  readonly updatedAt: LiveActivityTimestamp;
  readonly now: number;
}

export interface LiveActivityStalenessResult {
  readonly isStale: boolean;
  readonly delayMs: number;
}

export interface LiveActivityStalenessScheduler {
  readonly schedule: (callback: () => void, delayMs: number) => unknown;
  readonly cancel?: (handle: unknown) => void;
}

// ───────────────────────────────────────────────────────────────────
// 3. STALENESS RESOLUTION
// ───────────────────────────────────────────────────────────────────

/** Resolve freshness without inventing a live state for an invalid timestamp. */
export function resolveLiveActivityStaleness(
  input: LiveActivityStalenessInput,
): LiveActivityStalenessResult {
  const updatedAt = parseTimestamp(input.updatedAt);
  if (updatedAt === undefined || !Number.isFinite(input.now)) {
    return { isStale: true, delayMs: 0 };
  }

  const staleAt = updatedAt + LIVE_ACTIVITY_STALE_MS;
  const isStale = input.now >= staleAt;
  return { isStale, delayMs: isStale ? 0 : staleAt - input.now };
}

/** Expose the boolean freshness decision for surfaces that only need a gray state. */
export function isLiveActivityStale(
  updatedAt: LiveActivityTimestamp,
  now: number = Date.now(),
): boolean {
  return resolveLiveActivityStaleness({ updatedAt, now }).isStale;
}

// ───────────────────────────────────────────────────────────────────
// 4. BOUNDARY WATCHDOG
// ───────────────────────────────────────────────────────────────────

/** Wake once at the freshness boundary so an old surface does not poll forever. */
export function scheduleLiveActivityStaleness(
  input: LiveActivityStalenessInput,
  onStale: () => void,
  scheduler: LiveActivityStalenessScheduler = {
    schedule: (callback, delayMs) => setTimeout(callback, delayMs),
  },
): () => void {
  const { delayMs } = resolveLiveActivityStaleness(input);
  const handle = scheduler.schedule(onStale, delayMs);
  return (): void => scheduler.cancel?.(handle);
}

// ───────────────────────────────────────────────────────────────────
// 5. TIMESTAMP PARSING
// ───────────────────────────────────────────────────────────────────

function parseTimestamp(value: LiveActivityTimestamp): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
