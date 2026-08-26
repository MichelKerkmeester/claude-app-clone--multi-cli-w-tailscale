// ───────────────────────────────────────────────────────────────────
// MODULE: @-Mention Trigger Predicate (pure)
// ───────────────────────────────────────────────────────────────────
// Pure @-mention token predicate from draft, caret, focus, IME, and
// Escape dismissal latch.  Whitespace-bounded token, collapsed caret,
// empty query allowed.  Predicate only — no transport.

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface MentionTriggerInput {
  readonly draft: string;
  readonly selectionStart: number;
  readonly selectionEnd: number;
  readonly isFocused: boolean;
  /** True while an IME composition is active; parsing is frozen then. */
  readonly isComposing: boolean;
  /**
   * Draft/caret signature dismissed with Escape; any change reopens the panel.
   */
  readonly dismissedSignature: string | null;
}

export interface MentionTriggerState {
  readonly active: boolean;
  /** The query text without the leading '@' ('' when the token is just '@'). */
  readonly query: string;
  /** Start of the token range (position of '@'). */
  readonly tokenStart: number;
  /** End of the token range (exclusive). */
  readonly tokenEnd: number;
  /** The full token text including the '@' prefix. */
  readonly tokenText: string;
}

// ───────────────────────────────────────────────────────────────────
// 2. TRIGGER PREDICATE
// ───────────────────────────────────────────────────────────────────

const INACTIVE: MentionTriggerState = {
  active: false,
  query: '',
  tokenStart: 0,
  tokenEnd: 0,
  tokenText: '',
};

/** Deterministic signature of the exact draft/caret Escape dismissed. */
export function mentionDismissalSignature(draft: string, caret: number): string {
  return `${draft}\u0000${caret}`;
}

/**
 * Find the @-mention token that contains the given caret position.
 * A valid token starts with '@' that is either at position 0 or preceded
 * by whitespace, and extends until the next whitespace or end of draft.
 * The caret must be collapsed and inside the token.
 */
export function deriveMentionTrigger(input: MentionTriggerInput): MentionTriggerState {
  const { draft, selectionStart, selectionEnd, isFocused, isComposing, dismissedSignature } = input;
  if (!isFocused || isComposing || draft.length === 0) {
    return INACTIVE;
  }
  // Collapsed caret only.
  if (selectionStart !== selectionEnd) return INACTIVE;
  const caret = selectionStart;
  if (caret < 0) return INACTIVE;

  // Scan backwards from caret to find the start of the current token.
  // The token starts at '@' that is preceded by whitespace or is at index 0.
  let tokenStart = -1;
  for (let index = caret; index >= 0; index -= 1) {
    const char = draft.charAt(index);
    if (char === '@') {
      // @ must be at start of draft or preceded by whitespace.
      if (index === 0 || isTokenWhitespace(draft.charAt(index - 1))) {
        tokenStart = index;
        break;
      }
      // Not a valid mention boundary — @ preceded by non-whitespace.
      return INACTIVE;
    }
    if (isTokenWhitespace(char)) {
      // Hit whitespace before finding @ — no valid token.
      return INACTIVE;
    }
  }
  if (tokenStart === -1) return INACTIVE;

  // Scan forward from tokenStart to find the token end (next whitespace or end).
  let tokenEnd = tokenStart + 1;
  while (tokenEnd < draft.length && !isTokenWhitespace(draft.charAt(tokenEnd))) {
    tokenEnd += 1;
  }

  // Caret must be inside the token range.
  if (caret < tokenStart || caret > tokenEnd) return INACTIVE;

  const tokenText = draft.slice(tokenStart, tokenEnd);
  const query = tokenText.slice(1); // everything after '@'

  // Escape dismissal check.
  if (dismissedSignature !== null && dismissedSignature === mentionDismissalSignature(draft, caret)) {
    return INACTIVE;
  }

  return { active: true, query, tokenStart, tokenEnd, tokenText };
}

function isTokenWhitespace(character: string): boolean {
  return character === ' ' || character === '\t' || character === '\n' || character === '\r';
}

// ───────────────────────────────────────────────────────────────────
// 3. HOOK WRAPPER
// ───────────────────────────────────────────────────────────────────

/** Stateless wrapper so callers can use the predicate as a hook. */
export function useMentionTrigger(input: MentionTriggerInput): MentionTriggerState {
  return deriveMentionTrigger(input);
}