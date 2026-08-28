// ───────────────────────────────────────────────────────────────────
// MODULE: Roster View Preferences
// ───────────────────────────────────────────────────────────────────

// Device-local roster choices. The host never learns these values.
// An unreadable or unparseable store fails closed to the flat recency view
// rather than guessing a grouping the device cannot confirm.

// ───────────────────────────────────────────────────────────────────
// 1. CONSTANTS
// ───────────────────────────────────────────────────────────────────

export type RosterGrouping = 'recency' | 'status' | 'smart';
export type CardDensity = 'compact' | 'detailed';
export type SignalKey = 'activity' | 'preview' | 'prompt' | 'agent' | 'context';
export type SignalVisibility = Record<SignalKey, boolean>;

const ROSTER_GROUPING_KEY = 'pi-remote.roster-grouping';
const CARD_DENSITY_KEY = 'pi-remote.card-density';
const CARD_SIGNAL_VISIBILITY_KEY = 'pi-remote.card-signal-visibility';

/** First paint with no stored choice uses the status-grouped roster. */
export const DEFAULT_ROSTER_GROUPING: RosterGrouping = 'status';

/** Corrupt or unreadable storage falls back to the flat recency view. */
export const FAIL_CLOSED_ROSTER_GROUPING: RosterGrouping = 'recency';

/** First paint with no stored choice keeps every host-published signal visible. */
export const DEFAULT_CARD_DENSITY: CardDensity = 'detailed';
export const FAIL_CLOSED_CARD_DENSITY: CardDensity = 'detailed';

export const DEFAULT_SIGNAL_VISIBILITY: SignalVisibility = {
  activity: true,
  preview: true,
  prompt: true,
  agent: true,
  context: true,
};

// ───────────────────────────────────────────────────────────────────
// 2. GROUPING HELPERS
// ───────────────────────────────────────────────────────────────────

/** Accept only known modes; anything else is treated as unparseable. */
export function parseRosterGrouping(value: unknown): RosterGrouping {
  return value === 'recency' || value === 'status' || value === 'smart'
    ? value
    : FAIL_CLOSED_ROSTER_GROUPING;
}

/** Read the device-local grouping; throws never escape to the caller. */
export function readRosterGrouping(): RosterGrouping {
  try {
    const saved = window.localStorage.getItem(ROSTER_GROUPING_KEY);
    if (saved === null) return DEFAULT_ROSTER_GROUPING;
    return parseRosterGrouping(saved);
  } catch {
    return FAIL_CLOSED_ROSTER_GROUPING;
  }
}

/** Persist the grouping for this device only; ignore storage failures. */
export function writeRosterGrouping(value: RosterGrouping): void {
  try {
    window.localStorage.setItem(ROSTER_GROUPING_KEY, value);
  } catch {
    // The in-memory choice still applies when persistent storage is unavailable.
  }
}

// ───────────────────────────────────────────────────────────────────
// 3. CARD DENSITY HELPERS
// ───────────────────────────────────────────────────────────────────

/** Accept only the two density modes; anything else stays detailed. */
export function parseCardDensity(value: unknown): CardDensity {
  return value === 'compact' || value === 'detailed' ? value : FAIL_CLOSED_CARD_DENSITY;
}

/** Read the device-local density; storage failures never escape to the card. */
export function readCardDensity(): CardDensity {
  try {
    const saved = window.localStorage.getItem(CARD_DENSITY_KEY);
    return saved === null ? DEFAULT_CARD_DENSITY : parseCardDensity(saved);
  } catch {
    return FAIL_CLOSED_CARD_DENSITY;
  }
}

/** Persist density for this device only; ignore storage failures. */
export function writeCardDensity(value: CardDensity): void {
  try {
    window.localStorage.setItem(CARD_DENSITY_KEY, value);
  } catch {
    // The in-memory choice still applies when persistent storage is unavailable.
  }
}

// ───────────────────────────────────────────────────────────────────
// 4. SIGNAL VISIBILITY HELPERS
// ───────────────────────────────────────────────────────────────────

/** Merge only known boolean signal choices over the visible default. */
export function parseCardSignalVisibility(value: unknown): SignalVisibility {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { ...DEFAULT_SIGNAL_VISIBILITY };
  }
  const stored = value as Record<string, unknown>;
  const visibility = { ...DEFAULT_SIGNAL_VISIBILITY };
  for (const key of Object.keys(DEFAULT_SIGNAL_VISIBILITY) as SignalKey[]) {
    if (typeof stored[key] === 'boolean') visibility[key] = stored[key];
  }
  return visibility;
}

/** Read signal choices from device storage and fail closed to visible signals. */
export function readCardSignalVisibility(): SignalVisibility {
  try {
    const saved = window.localStorage.getItem(CARD_SIGNAL_VISIBILITY_KEY);
    if (saved === null) return { ...DEFAULT_SIGNAL_VISIBILITY };
    return parseCardSignalVisibility(JSON.parse(saved));
  } catch {
    return { ...DEFAULT_SIGNAL_VISIBILITY };
  }
}

/** Persist signal choices for this device only; ignore storage failures. */
export function writeCardSignalVisibility(value: SignalVisibility): void {
  try {
    window.localStorage.setItem(CARD_SIGNAL_VISIBILITY_KEY, JSON.stringify(value));
  } catch {
    // The in-memory choice still applies when persistent storage is unavailable.
  }
}
