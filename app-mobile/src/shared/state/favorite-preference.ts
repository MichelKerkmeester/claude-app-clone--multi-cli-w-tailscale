// ───────────────────────────────────────────────────────────────────
// MODULE: Device-Local Favorite Preference
// ───────────────────────────────────────────────────────────────────

// Pins that only reorder this device's roster. They never write session
// status and are never folded into host truth. An unreadable store is an
// explicit unavailable state with an empty set, not a silent host order.

// ───────────────────────────────────────────────────────────────────
// 1. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const FAVORITE_KEY = 'pi-remote.session-favorite';

export interface FavoritePreference {
  readonly available: boolean;
  readonly ids: ReadonlySet<string>;
}

const UNAVAILABLE: FavoritePreference = Object.freeze({
  available: false,
  ids: new Set<string>(),
});

// ───────────────────────────────────────────────────────────────────
// 2. STORAGE
// ───────────────────────────────────────────────────────────────────

function unavailable(): FavoritePreference {
  return { available: false, ids: new Set() };
}

/** Load persisted favorite ids; unreadable JSON fails closed and is surfaced. */
export function readFavoritePreference(): FavoritePreference {
  try {
    const raw = window.localStorage.getItem(FAVORITE_KEY);
    if (raw === null) return { available: true, ids: new Set() };
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === 'string')) {
      return unavailable();
    }
    return { available: true, ids: new Set(parsed) };
  } catch {
    return unavailable();
  }
}

/** Persist favorite ids; ignore storage failures so the in-memory set still applies. */
export function writeFavoriteIds(ids: ReadonlySet<string>): void {
  try {
    window.localStorage.setItem(FAVORITE_KEY, JSON.stringify([...ids]));
  } catch {
    // The pin still applies for this session when persistent storage is unavailable.
  }
}

/** Toggle one id in a copied set; the caller owns persistence. */
export function toggleFavoriteId(ids: ReadonlySet<string>, sessionId: string): Set<string> {
  const next = new Set(ids);
  if (next.has(sessionId)) next.delete(sessionId);
  else next.add(sessionId);
  return next;
}

export { UNAVAILABLE as UNAVAILABLE_FAVORITE_PREFERENCE };
