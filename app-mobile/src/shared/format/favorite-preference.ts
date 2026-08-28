// ───────────────────────────────────────────────────────────────────
// MODULE: Device-Local Favorite Preference
// ───────────────────────────────────────────────────────────────────

// Pins only reorder this device's views. They never write session status and
// never become host truth. An unreadable store stays explicitly unavailable.

// ───────────────────────────────────────────────────────────────────
// 1. CONSTANTS AND TYPES
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

/** Load persisted favorite ids; malformed or unavailable storage fails closed. */
export function readFavoritePreference(): FavoritePreference {
  if (typeof window === 'undefined') return unavailable();
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

/** Persist favorite ids; a storage failure leaves the current view usable. */
export function writeFavoriteIds(ids: ReadonlySet<string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FAVORITE_KEY, JSON.stringify([...ids]));
  } catch {
    // The pin still applies for this session when persistent storage is unavailable.
  }
}

// ───────────────────────────────────────────────────────────────────
// 3. TRANSITIONS
// ───────────────────────────────────────────────────────────────────

/** Toggle one id in a copied set; the caller owns persistence. */
export function toggleFavoriteId(ids: ReadonlySet<string>, sessionId: string): Set<string> {
  const next = new Set(ids);
  if (next.has(sessionId)) next.delete(sessionId);
  else next.add(sessionId);
  return next;
}

export { UNAVAILABLE as UNAVAILABLE_FAVORITE_PREFERENCE };
