// ───────────────────────────────────────────────────────────────────
// MODULE: Per-session view-mode preference (device-local)
// ───────────────────────────────────────────────────────────────────
// A device-local preference keyed by `sessionId` that fails closed
// when the backing store is unreadable — returns the canonical default
// AND flags the result as unresolved, never "no overrides".

// ───────────────────────────────────────────────────────────────────
// 1. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = 'pi-remote.view-mode:';

// ───────────────────────────────────────────────────────────────────
// 2. TYPES
// ───────────────────────────────────────────────────────────────────

export type ViewMode = 'chat';

export const DEFAULT_VIEW_MODE: ViewMode = 'chat';

export interface ViewModePreference {
  readonly value: ViewMode;
  /** False when the store could not be read (storage failure, corrupt data). */
  readonly resolved: boolean;
}

// ───────────────────────────────────────────────────────────────────
// 3. READ
// ───────────────────────────────────────────────────────────────────

export function readViewModePreference(sessionId: string): ViewModePreference {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + sessionId);
    if (raw === null) return { value: DEFAULT_VIEW_MODE, resolved: true };
    // Only 'chat' is valid today; anything else falls back to the default
    // but is still considered resolved (a future mode value the current
    // client doesn't understand degrades to the default).
    if (raw === 'chat') return { value: 'chat', resolved: true };
    return { value: DEFAULT_VIEW_MODE, resolved: true };
  } catch {
    // Storage failure — return the default AND mark it unresolved so
    // callers can distinguish "no preference set" from "can't read".
    return { value: DEFAULT_VIEW_MODE, resolved: false };
  }
}

// ───────────────────────────────────────────────────────────────────
// 4. WRITE
// ───────────────────────────────────────────────────────────────────

export function writeViewModePreference(sessionId: string, value: ViewMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY_PREFIX + sessionId, value);
  } catch {
    // Storage failure degrades silently; the in-memory preference
    // still applies for this session.
  }
}