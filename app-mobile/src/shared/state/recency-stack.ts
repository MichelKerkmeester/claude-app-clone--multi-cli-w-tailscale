// ───────────────────────────────────────────────────────────────────
// MODULE: Device-Local Session Recency Stack
// ───────────────────────────────────────────────────────────────────

// The stack records navigation history on this device only. It is a display
// hint, never a claim that a session still exists or may be opened.

// ───────────────────────────────────────────────────────────────────
// 1. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const RECENCY_STACK_KEY = 'pi-remote.session-recency';

/** Keep the switcher bounded so old visits cannot crowd out current ones. */
export const RECENCY_STACK_LIMIT = 12;

export type RecencyStack = readonly string[];

// ───────────────────────────────────────────────────────────────────
// 2. NORMALIZATION
// ───────────────────────────────────────────────────────────────────

/** Accept only a string list and keep each opaque id once, in source order. */
export function normalizeRecencyStack(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || entry.length === 0 || seen.has(entry)) continue;
    seen.add(entry);
    normalized.push(entry);
    if (normalized.length === RECENCY_STACK_LIMIT) break;
  }
  return normalized;
}

// ───────────────────────────────────────────────────────────────────
// 3. STORAGE
// ───────────────────────────────────────────────────────────────────

function localStorageOrNull(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Load the local stack; unreadable storage fails closed to an empty stack. */
export function readRecencyStack(): string[] {
  const storage = localStorageOrNull();
  if (storage === null) return [];
  try {
    const raw = storage.getItem(RECENCY_STACK_KEY);
    return raw === null ? [] : normalizeRecencyStack(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Persist the local stack without allowing storage failures to affect navigation. */
export function writeRecencyStack(stack: RecencyStack): void {
  const storage = localStorageOrNull();
  if (storage === null) return;
  try {
    storage.setItem(RECENCY_STACK_KEY, JSON.stringify(normalizeRecencyStack(stack)));
  } catch {
    // The in-memory history remains useful when persistent storage is unavailable.
  }
}

// ───────────────────────────────────────────────────────────────────
// 4. TRANSITIONS
// ───────────────────────────────────────────────────────────────────

/** Put a visited session at the front without mutating the prior stack. */
export function visitRecencyStack(stack: RecencyStack, sessionId: string): string[] {
  if (sessionId.length === 0) return normalizeRecencyStack(stack);
  return normalizeRecencyStack([sessionId, ...stack.filter((id) => id !== sessionId)]);
}

/** Remove one local chip without changing any host session. */
export function removeFromRecencyStack(stack: RecencyStack, sessionId: string): string[] {
  return normalizeRecencyStack(stack).filter((id) => id !== sessionId);
}

/** Keep one chip and remove all of its local peers. */
export function removeOtherRecencyStack(stack: RecencyStack, sessionId: string): string[] {
  return normalizeRecencyStack(stack).filter((id) => id === sessionId);
}
