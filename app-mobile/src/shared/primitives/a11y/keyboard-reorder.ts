// ───────────────────────────────────────────────────────────────────
// MODULE: KEYBOARD REORDER
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. HELPERS
// ───────────────────────────────────────────────────────────────────

function clampIndex(index: number, length: number): number {
  if (length === 0 || !Number.isFinite(index)) return 0;
  return Math.min(Math.max(Math.trunc(index), 0), length - 1);
}

function swap<T>(items: readonly T[], first: number, second: number): T[] {
  const next = [...items];
  [next[first], next[second]] = [next[second] as T, next[first] as T];
  return next;
}

// ───────────────────────────────────────────────────────────────────
// 2. PUBLIC ACTIONS
// ───────────────────────────────────────────────────────────────────

// Move one item toward the start without mutating the caller's collection.
export function moveUp<T>(items: readonly T[], index: number): T[] {
  const position = clampIndex(index, items.length);
  return position === 0 ? [...items] : swap(items, position, position - 1);
}

// Move one item toward the end without mutating the caller's collection.
export function moveDown<T>(items: readonly T[], index: number): T[] {
  const position = clampIndex(index, items.length);
  return position >= items.length - 1 ? [...items] : swap(items, position, position + 1);
}
