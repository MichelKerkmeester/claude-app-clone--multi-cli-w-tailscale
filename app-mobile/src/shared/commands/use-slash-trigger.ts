// ───────────────────────────────────────────────────────────────────
// MODULE: Leading-Slash Trigger Predicate (pure)
// ───────────────────────────────────────────────────────────────────
// Derives whether the composer draft is in a slash-command token. The
// Predicate is a pure function of draft, caret, selection, focus, IME
// Composition, and the Escape dismissal latch; it performs no transport,
// Filtering, or state mutation, so the inline surface can re-evaluate it
// After every committed input without side effects.

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface SlashTriggerInput {
  readonly draft: string;
  readonly selectionStart: number;
  readonly selectionEnd: number;
  readonly isFocused: boolean;
  /** True while an IME composition is active; parsing is frozen then. */
  readonly isComposing: boolean;
  /**
   * The exact draft/caret signature dismissed with Escape, or null. Any
   * Change to the draft or caret reopens the panel.
   */
  readonly dismissedSignature: string | null;
}

export interface SlashTriggerState {
  readonly active: boolean;
  /** The name query without the leading slash ('' when the token is just '/'). */
  readonly query: string;
  /** Start of the token range (always 0 while active). */
  readonly tokenStart: number;
  /** End of the token range (exclusive). */
  readonly tokenEnd: number;
}

// ───────────────────────────────────────────────────────────────────
// 2. TRIGGER PREDICATE
// ───────────────────────────────────────────────────────────────────

const INACTIVE: SlashTriggerState = { active: false, query: '', tokenStart: 0, tokenEnd: 0 };

/** Deterministic signature of the exact draft/caret Escape dismissed. */
export function slashDismissalSignature(draft: string, caret: number): string {
  return `${draft}\u0000${caret}`;
}

export function deriveSlashTrigger(input: SlashTriggerInput): SlashTriggerState {
  const { draft, selectionStart, selectionEnd, isFocused, isComposing, dismissedSignature } = input;
  if (!isFocused || isComposing || draft.length === 0 || draft.charAt(0) !== '/') {
    return INACTIVE;
  }
  // The panel only follows a collapsed caret inside the first token.
  if (selectionStart !== selectionEnd) return INACTIVE;
  const caret = selectionStart;
  if (caret < 0) return INACTIVE;
  let tokenEnd = 1;
  while (tokenEnd < draft.length && !isTokenWhitespace(draft.charAt(tokenEnd))) tokenEnd += 1;
  if (tokenEnd > 1 && draft.slice(1, tokenEnd).includes('/')) return INACTIVE;
  if (caret > tokenEnd) return INACTIVE;
  if (dismissedSignature !== null && dismissedSignature === slashDismissalSignature(draft, caret)) {
    return INACTIVE;
  }
  return { active: true, query: draft.slice(1, tokenEnd), tokenStart: 0, tokenEnd };
}

function isTokenWhitespace(character: string): boolean {
  return character === ' ' || character === '\t' || character === '\n' || character === '\r';
}

// ───────────────────────────────────────────────────────────────────
// 3. HOOK WRAPPER
// ───────────────────────────────────────────────────────────────────

/** Stateless wrapper so callers can use the predicate as a hook. */
export function useSlashTrigger(input: SlashTriggerInput): SlashTriggerState {
  return deriveSlashTrigger(input);
}
