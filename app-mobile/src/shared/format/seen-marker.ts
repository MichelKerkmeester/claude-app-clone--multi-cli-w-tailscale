// ───────────────────────────────────────────────────────────────────
// MODULE: Device-Local Seen Marker
// ───────────────────────────────────────────────────────────────────

// Per-session last-seen clocks live on this device only. They never write
// host status. An unreadable store yields no "changed" dot — the client
// must not invent a look it cannot confirm.

// ───────────────────────────────────────────────────────────────────
// 1. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const LAST_SEEN_KEY = 'pi-remote.session-last-seen';

export interface SeenStore {
  readonly available: boolean;
  readonly lastSeenById: ReadonlyMap<string, string>;
}

const UNAVAILABLE: SeenStore = Object.freeze({
  available: false,
  lastSeenById: new Map<string, string>(),
});

// ───────────────────────────────────────────────────────────────────
// 2. STORAGE
// ───────────────────────────────────────────────────────────────────

function isTimestampRecord(value: unknown): value is Record<string, string> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every((entry) => typeof entry === 'string');
}

function unavailable(): SeenStore {
  return { available: false, lastSeenById: new Map() };
}

/** Load persisted last-seen clocks; unreadable JSON fails closed to no dots. */
export function readLastSeenMap(): SeenStore {
  try {
    const raw = window.localStorage.getItem(LAST_SEEN_KEY);
    if (raw === null) return { available: true, lastSeenById: new Map() };
    const parsed: unknown = JSON.parse(raw);
    if (!isTimestampRecord(parsed)) return unavailable();
    return { available: true, lastSeenById: new Map(Object.entries(parsed)) };
  } catch {
    return unavailable();
  }
}

/** Persist last-seen clocks; ignore storage failures so in-memory marks still apply. */
export function writeLastSeenMap(lastSeenById: ReadonlyMap<string, string>): void {
  try {
    window.localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(Object.fromEntries(lastSeenById)));
  } catch {
    // The in-memory mark still applies when persistent storage is unavailable.
  }
}

/** Copy-on-write stamp of the host `updatedAt` the viewer just opened. */
export function markLastSeen(
  lastSeenById: ReadonlyMap<string, string>,
  sessionId: string,
  updatedAt: string,
): Map<string, string> {
  const next = new Map(lastSeenById);
  next.set(sessionId, updatedAt);
  return next;
}

/**
 * Dot a card only when this device has a confirmed prior look and the host
 * clock is strictly newer. Missing, unreadable, or unparseable clocks yield
 * no dot so the client never fabricates a "changed" or "seen" claim.
 */
export function changedSinceLooked(
  updatedAt: string,
  lastSeenUpdatedAt: string | undefined,
  storeAvailable: boolean,
): boolean {
  if (!storeAvailable) return false;
  if (lastSeenUpdatedAt === undefined) return false;
  const updated = Date.parse(updatedAt);
  const seen = Date.parse(lastSeenUpdatedAt);
  if (!Number.isFinite(updated) || !Number.isFinite(seen)) return false;
  return updated > seen;
}

export { UNAVAILABLE as UNAVAILABLE_SEEN_STORE, LAST_SEEN_KEY };
