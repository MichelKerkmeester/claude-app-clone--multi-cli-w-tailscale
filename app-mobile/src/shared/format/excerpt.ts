// ───────────────────────────────────────────────────────────────────
// MODULE: Tail-Preserving Budgeted Excerpt
// ───────────────────────────────────────────────────────────────────
// Newest content is what a re-fed transcript must keep. Older prefix is
// dropped only with a visible count so truncation is never silent.
//
// The budget bounds the WHOLE result, marker included — callers use it to
// fit a context window, so a result that overruns it would defeat the point.

// ───────────────────────────────────────────────────────────────────
// 1. MARKER
// ───────────────────────────────────────────────────────────────────

function omittedMarker(omittedCount: number): string {
  return `[Earlier … omitted: ${omittedCount} characters]`;
}

// ───────────────────────────────────────────────────────────────────
// 2. EXCERPT
// ───────────────────────────────────────────────────────────────────

/** Keep the newest content within `budget` characters; when the input is longer, name the drop. */
export function excerptToBudget(text: string, budget: number): string {
  if (budget <= 0) return omittedMarker(text.length);
  if (text.length <= budget) return text;

  // The marker states how much was dropped, and its own digits change its
  // length, so the tail it leaves room for is a fixpoint. Two passes settle
  // it: size the tail, re-read the marker that tail implies, shrink if the
  // count grew a digit.
  let tailLength = Math.max(0, budget - (omittedMarker(text.length - budget).length + 1));
  for (let pass = 0; pass < 3; pass += 1) {
    const marker = omittedMarker(text.length - tailLength);
    const fits = marker.length + 1 + tailLength;
    if (fits <= budget) break;
    tailLength -= fits - budget;
    if (tailLength < 0) tailLength = 0;
  }

  // A budget too small to hold the marker cannot describe its own omission.
  // Returning the marker alone overruns the budget, but the alternative —
  // silent partial text that reads as complete — is the failure this module
  // exists to prevent.
  if (tailLength <= 0) return omittedMarker(text.length);

  // A raw UTF-16 slice can land between the halves of a surrogate pair and
  // leave a lone surrogate at the boundary — ill-formed text that becomes a
  // replacement character the moment it is serialised, right at the seam this
  // module exists to keep faithful. Step forward one unit when that happens.
  let start = text.length - tailLength;
  const firstUnit = text.charCodeAt(start);
  if (firstUnit >= 0xdc00 && firstUnit <= 0xdfff) start += 1;
  const tail = text.slice(start);
  return `${omittedMarker(text.length - tail.length)}\n${tail}`;
}
