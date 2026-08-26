// ───────────────────────────────────────────────────────────────────
// MODULE: Device Haptics
// ───────────────────────────────────────────────────────────────────

// Thin vibrate wrapper. Missing APIs (Safari/PWA) and permission denials
// degrade to a silent no-op so haptics never gate an action.

// ───────────────────────────────────────────────────────────────────
// 1. TYPES
// ───────────────────────────────────────────────────────────────────

export type HapticIntent = 'selection' | 'success' | 'error' | 'edge-bump';

const PATTERNS: Record<HapticIntent, number | readonly number[]> = {
  selection: 10,
  success: [10, 30, 10],
  error: [30, 40, 30],
  'edge-bump': 20,
};

// ───────────────────────────────────────────────────────────────────
// 2. HELPERS
// ───────────────────────────────────────────────────────────────────

/** Fire a haptic intent; never throw when vibration is absent or denied. */
export function fireHaptic(intent: HapticIntent): void {
  try {
    const nav = globalThis.navigator;
    if (typeof nav?.vibrate !== 'function') return;
    const pattern = PATTERNS[intent];
    if (typeof pattern === 'number') {
      nav.vibrate(pattern);
    } else {
      nav.vibrate([...pattern]);
    }
  } catch {
    // Vibration is an enhancement; absence or denial must not throw.
  }
}
