// ───────────────────────────────────────────────────────────────────
// MODULE: Horizontal Session Strip Metrics
// ───────────────────────────────────────────────────────────────────

// These pure metrics keep overflow presentation tied to measurable geometry.
// A strip that fits has no mask or thumb, and an actively read mid-strip never
// gets pulled to the end by a later chip.

// ───────────────────────────────────────────────────────────────────
// 1. TYPES
// ───────────────────────────────────────────────────────────────────

export interface ScrollGeometry {
  readonly clientWidth: number;
  readonly scrollLeft: number;
  readonly scrollWidth: number;
}

export interface ScrollMetrics {
  readonly hasOverflow: boolean;
  readonly atStart: boolean;
  readonly atEnd: boolean;
  readonly thumbRatio: number;
  readonly thumbOffset: number;
}

const SCROLL_EPSILON = 1;

// ───────────────────────────────────────────────────────────────────
// 2. MEASUREMENT
// ───────────────────────────────────────────────────────────────────

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/** Derive overflow, edge, and thumb geometry without touching the DOM. */
export function measureScrollMetrics(
  geometry: ScrollGeometry,
  epsilon = SCROLL_EPSILON,
): ScrollMetrics {
  const viewport = finiteNonNegative(geometry.clientWidth);
  const content = finiteNonNegative(geometry.scrollWidth);
  const maxScroll = Math.max(0, content - viewport);
  const left = clamp(finiteNonNegative(geometry.scrollLeft), 0, maxScroll);
  const hasOverflow = content > viewport + epsilon;
  const atStart = left <= epsilon;
  const atEnd = !hasOverflow || maxScroll - left <= epsilon;
  const thumbRatio = hasOverflow && content > 0 ? clamp(viewport / content, 0, 1) : 1;
  const thumbOffset = hasOverflow && maxScroll > 0
    ? clamp(left / maxScroll, 0, 1) * (1 - thumbRatio)
    : 0;

  return { hasOverflow, atStart, atEnd, thumbRatio, thumbOffset };
}

// ───────────────────────────────────────────────────────────────────
// 3. AUTO-REVEAL DECISION
// ───────────────────────────────────────────────────────────────────

/** Reveal only a newly added chip when the person was already reading the end. */
export function shouldRevealNewChip(
  previousCount: number,
  nextCount: number,
  wasAtEnd: boolean,
): boolean {
  return nextCount > previousCount && wasAtEnd;
}
