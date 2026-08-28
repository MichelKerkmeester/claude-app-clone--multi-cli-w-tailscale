// ───────────────────────────────────────────────────────────────────
// MODULE: Deferred Send-Error Toast (Svelte runes)
// ───────────────────────────────────────────────────────────────────
// A send failure that resolves after its chat screen is gone — the person
// moved on to another chat, or the screen unmounted — cannot paint in a
// banner that died with the screen. The app shell keeps one transient strip
// for that case (rendered by +layout.svelte); this module owns its single
// toast. Raising a new failure replaces the older one, and only the strip
// itself dismisses it.

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** A send failure stamped with the session it belongs to. */
export interface ScopedSendError {
  readonly scopeKey: string;
  readonly message: string;
}

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** How long the strip shows one toast before dismissing itself. */
export const DEFERRED_SEND_ERROR_TOAST_MS = 8_000;

// ───────────────────────────────────────────────────────────────────
// 3. STRIP STATE
// ───────────────────────────────────────────────────────────────────

let currentToast = $state<ScopedSendError | null>(null);

/** The toast the shell strip currently shows, or null when it renders nothing. */
export function deferredSendErrorToast(): ScopedSendError | null {
  return currentToast;
}

/** Raise the strip's toast, replacing any earlier one. */
export function raiseDeferredSendError(error: ScopedSendError): void {
  currentToast = error;
}

/** Dismiss the current toast. Only the strip renderer and tests call this. */
export function dismissDeferredSendErrorToast(): void {
  currentToast = null;
}
