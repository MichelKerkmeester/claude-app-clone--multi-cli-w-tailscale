// ───────────────────────────────────────────────────────────────────
// MODULE: Roster Grouping Preference
// ───────────────────────────────────────────────────────────────────

// Device-local recency vs status grouping. The host never learns this value.
// An unreadable or unparseable store fails closed to the flat recency view
// rather than guessing a grouping the device cannot confirm.

// ───────────────────────────────────────────────────────────────────
// 1. CONSTANTS
// ───────────────────────────────────────────────────────────────────

export type RosterGrouping = 'recency' | 'status';

const ROSTER_GROUPING_KEY = 'pi-remote.roster-grouping';

/** First paint with no stored choice uses the status-grouped roster. */
export const DEFAULT_ROSTER_GROUPING: RosterGrouping = 'status';

/** Corrupt or unreadable storage falls back to the flat recency view. */
export const FAIL_CLOSED_ROSTER_GROUPING: RosterGrouping = 'recency';

// ───────────────────────────────────────────────────────────────────
// 2. HELPERS
// ───────────────────────────────────────────────────────────────────

/** Accept only the two known modes; anything else is treated as unparseable. */
export function parseRosterGrouping(value: unknown): RosterGrouping {
  return value === 'recency' || value === 'status' ? value : FAIL_CLOSED_ROSTER_GROUPING;
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
