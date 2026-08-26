// ───────────────────────────────────────────────────────────────────
// MODULE: @-Mention Trigger Predicate Tests
// ───────────────────────────────────────────────────────────────────

// Proves the @-mention predicate is a pure function of draft, caret,
// selection, focus, IME composition, and the Escape dismissal latch —
// with zero transport or filtering involvement.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  deriveMentionTrigger,
  mentionDismissalSignature,
  useMentionTrigger,
  type MentionTriggerInput,
} from '../src/shared/commands/use-mention-trigger.js';

// ───────────────────────────────────────────────────────────────────
// 2. HELPERS
// ───────────────────────────────────────────────────────────────────

function trigger(
  overrides: Partial<MentionTriggerInput>,
): ReturnType<typeof deriveMentionTrigger> {
  return deriveMentionTrigger({
    draft: '@file',
    selectionStart: 5,
    selectionEnd: 5,
    isFocused: true,
    isComposing: false,
    dismissedSignature: null,
    ...overrides,
  });
}

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('deriveMentionTrigger', () => {
  it('opens on a bare @ with caret right after', () => {
    const state = trigger({ draft: '@', selectionStart: 1, selectionEnd: 1 });
    expect(state.active).toBe(true);
    expect(state.query).toBe('');
    expect(state.tokenStart).toBe(0);
    expect(state.tokenEnd).toBe(1);
    expect(state.tokenText).toBe('@');
  });

  it('opens on an @-token at the start of the draft', () => {
    const state = trigger({ draft: '@file', selectionStart: 3, selectionEnd: 3 });
    expect(state.active).toBe(true);
    expect(state.query).toBe('file');
    expect(state.tokenStart).toBe(0);
    expect(state.tokenEnd).toBe(5);
  });

  it('opens on an @-token in the middle of text', () => {
    const state = trigger({
      draft: 'Check @file here',
      selectionStart: 9,
      selectionEnd: 9,
    });
    expect(state.active).toBe(true);
    expect(state.query).toBe('file');
    expect(state.tokenStart).toBe(6);
    expect(state.tokenEnd).toBe(11);
  });

  it('opens with caret inside the token', () => {
    const state = trigger({
      draft: 'Check @myfile',
      selectionStart: 10,
      selectionEnd: 10,
    });
    expect(state.active).toBe(true);
    expect(state.query).toBe('myfile');
  });

  it('opens with caret at the start of the token', () => {
    const state = trigger({
      draft: 'Check @file',
      selectionStart: 6,
      selectionEnd: 6,
    });
    expect(state.active).toBe(true);
    expect(state.query).toBe('file');
  });

  it('opens with empty query for just @', () => {
    const state = trigger({
      draft: 'Hey @',
      selectionStart: 5,
      selectionEnd: 5,
    });
    expect(state.active).toBe(true);
    expect(state.query).toBe('');
  });

  it('stays closed without focus', () => {
    expect(trigger({ isFocused: false }).active).toBe(false);
  });

  it('stays closed during IME composition', () => {
    expect(trigger({ isComposing: true }).active).toBe(false);
  });

  it('stays closed for an empty draft', () => {
    expect(trigger({ draft: '', selectionStart: 0, selectionEnd: 0 }).active).toBe(false);
  });

  it('stays closed for a non-collapsed selection', () => {
    expect(trigger({ draft: '@file', selectionStart: 1, selectionEnd: 4 }).active).toBe(false);
  });

  it('stays closed when @ is not preceded by whitespace', () => {
    // mid-word @-like token (e.g. email) should not trigger
    const state = trigger({
      draft: 'my@file',
      selectionStart: 4,
      selectionEnd: 4,
    });
    expect(state.active).toBe(false);
  });

  it('stays closed when @ is preceded by non-whitespace', () => {
    const state = trigger({
      draft: 'a@file',
      selectionStart: 4,
      selectionEnd: 4,
    });
    expect(state.active).toBe(false);
  });

  it('opens on @ at start of a new line', () => {
    const state = trigger({
      draft: 'Hello\n@file',
      selectionStart: 11,
      selectionEnd: 11,
    });
    expect(state.active).toBe(true);
    expect(state.query).toBe('file');
  });

  it('suppresses the exact dismissed draft and caret, and reopens on any change', () => {
    const signature = mentionDismissalSignature('Check @file', 10);
    const state = trigger({
      draft: 'Check @file',
      selectionStart: 10,
      selectionEnd: 10,
      dismissedSignature: signature,
    });
    expect(state.active).toBe(false);

    // Same draft, different caret reopens
    const state2 = trigger({
      draft: 'Check @file',
      selectionStart: 11,
      selectionEnd: 11,
      dismissedSignature: signature,
    });
    expect(state2.active).toBe(true);

    // Different draft, same caret reopens
    const state3 = trigger({
      draft: 'Check @files',
      selectionStart: 10,
      selectionEnd: 10,
      dismissedSignature: signature,
    });
    expect(state3.active).toBe(true);
  });

  it('derives the token end from the first whitespace', () => {
    const state = trigger({
      draft: 'Check @file here',
      selectionStart: 10,
      selectionEnd: 10,
    });
    expect(state.active).toBe(true);
    expect(state.query).toBe('file');
    expect(state.tokenEnd).toBe(11);
  });

  it('stays closed when caret is beyond the token', () => {
    const state = trigger({
      draft: '@file more',
      selectionStart: 7,
      selectionEnd: 7,
    });
    expect(state.active).toBe(false);
  });
});

describe('useMentionTrigger', () => {
  it('is a pure wrapper returning the same derivation without side effects', () => {
    const input: MentionTriggerInput = {
      draft: 'Check @file',
      selectionStart: 10,
      selectionEnd: 10,
      isFocused: true,
      isComposing: false,
      dismissedSignature: null,
    };
    expect(useMentionTrigger(input)).toEqual(deriveMentionTrigger(input));
    expect(useMentionTrigger({ ...input, isComposing: true })).toEqual(
      deriveMentionTrigger({ ...input, isComposing: true }),
    );
  });
});