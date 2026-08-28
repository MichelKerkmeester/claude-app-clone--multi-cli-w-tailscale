// ───────────────────────────────────────────────────────────────────
// MODULE: E2EE Auth Rejection Latch (transport)
// ───────────────────────────────────────────────────────────────────
// The relay rejects a device's socket auth with close code 4003. One or two
// rejections must ride out as ordinary reconnects — only the third consecutive
// rejection lapses the device into re-pairing. The counter lives here so it
// survives view remounts, never decays on its own, and clears only when a
// full device auth (establishSession) succeeds.

// ───────────────────────────────────────────────────────────────────
// 1. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** Consecutive E2EE-auth rejections required before re-pairing. */
export const AUTH_REJECTION_LATCH_THRESHOLD = 3;

// ───────────────────────────────────────────────────────────────────
// 2. LATCH
// ───────────────────────────────────────────────────────────────────

let strikes = 0;

/** Record one E2EE-auth rejection; returns the running strike count. */
export function recordAuthRejectionStrike(): number {
  strikes += 1;
  return strikes;
}

/** True when consecutive rejections have reached the re-pairing threshold. */
export function authRejectionLatchTripped(): boolean {
  return strikes >= AUTH_REJECTION_LATCH_THRESHOLD;
}

/**
 * Clear the latch back to zero. Only a successful full auth may call this:
 * a reconnecting socket proves nothing about the device key, and a timer
 * proves nothing at all.
 */
export function clearAuthRejectionStrikes(): void {
  strikes = 0;
}
