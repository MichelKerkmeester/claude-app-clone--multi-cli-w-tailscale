// ───────────────────────────────────────────────────────────────────
// MODULE: Slash Trigger Predicate Tests
// ───────────────────────────────────────────────────────────────────
// Proves the leading-slash predicate is a pure function of draft, caret,
// selection, focus, IME composition, and the Escape dismissal latch — with
// zero transport or filtering involvement.

import { describe, expect, it } from 'vitest';

import {
  deriveSlashTrigger,
  slashDismissalSignature,
  useSlashTrigger,
  type SlashTriggerInput,
} from '../src/shared/data/useSlashTrigger.js';

function trigger(overrides: Partial<SlashTriggerInput>): ReturnType<typeof deriveSlashTrigger> {
  return deriveSlashTrigger({
    draft: '/plan',
    selectionStart: 5,
    selectionEnd: 5,
    isFocused: true,
    isComposing: false,
    dismissedSignature: null,
    ...overrides,
  });
}

describe('deriveSlashTrigger', () => {
  it('opens on a bare slash at index zero', () => {
    const state = trigger({ draft: '/', selectionStart: 1, selectionEnd: 1 });
    expect(state.active).toBe(true);
    expect(state.query).toBe('');
    expect(state.tokenStart).toBe(0);
    expect(state.tokenEnd).toBe(1);
  });

  it('opens while the caret is inside the first token', () => {
    const state = trigger({ draft: '/plan', selectionStart: 3, selectionEnd: 3 });
    expect(state.active).toBe(true);
    expect(state.query).toBe('plan');
  });

  it('opens with the caret at the token end before a space', () => {
    const state = trigger({ draft: '/plan args', selectionStart: 5, selectionEnd: 5 });
    expect(state.active).toBe(true);
    expect(state.query).toBe('plan');
  });

  it('derives the token end from the first whitespace', () => {
    const state = trigger({ draft: '/pla\ttext', selectionStart: 4, selectionEnd: 4 });
    expect(state.active).toBe(true);
    expect(state.query).toBe('pla');
    expect(state.tokenEnd).toBe(4);
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

  it('stays closed when the slash is not at index zero', () => {
    expect(trigger({ draft: ' /plan', selectionStart: 6, selectionEnd: 6 }).active).toBe(false);
    expect(trigger({ draft: 'hello /plan', selectionStart: 11, selectionEnd: 11 }).active).toBe(false);
    expect(trigger({ draft: 'hello\n/plan', selectionStart: 11, selectionEnd: 11 }).active).toBe(false);
  });

  it('stays closed when the caret is beyond the first token', () => {
    const state = trigger({ draft: '/plan args', selectionStart: 6, selectionEnd: 6 });
    expect(state.active).toBe(false);
  });

  it('stays closed when the token contains a second slash', () => {
    expect(trigger({ draft: '//plan', selectionStart: 6, selectionEnd: 6 }).active).toBe(false);
    expect(trigger({ draft: '/plan/x', selectionStart: 7, selectionEnd: 7 }).active).toBe(false);
  });

  it('stays closed for a non-collapsed selection', () => {
    expect(trigger({ draft: '/plan', selectionStart: 1, selectionEnd: 4 }).active).toBe(false);
  });

  it('suppresses the exact dismissed draft and caret, and reopens on any change', () => {
    const signature = slashDismissalSignature('/plan', 3);
    expect(trigger({ selectionStart: 3, selectionEnd: 3, dismissedSignature: signature }).active).toBe(
      false,
    );
    // The same draft at a different caret reopens.
    expect(
      trigger({ selectionStart: 5, selectionEnd: 5, dismissedSignature: signature }).active,
    ).toBe(true);
    // A changed draft at the same caret reopens.
    expect(
      trigger({
        draft: '/planner',
        selectionStart: 3,
        selectionEnd: 3,
        dismissedSignature: signature,
      }).active,
    ).toBe(true);
  });

  it('opens with the caret at the start of the token', () => {
    const state = trigger({ draft: '/plan', selectionStart: 0, selectionEnd: 0 });
    expect(state.active).toBe(true);
    expect(state.query).toBe('plan');
  });
});

describe('useSlashTrigger', () => {
  it('is a pure wrapper returning the same derivation without side effects', () => {
    const input: SlashTriggerInput = {
      draft: '/pla',
      selectionStart: 4,
      selectionEnd: 4,
      isFocused: true,
      isComposing: false,
      dismissedSignature: null,
    };
    expect(useSlashTrigger(input)).toEqual(deriveSlashTrigger(input));
    expect(useSlashTrigger({ ...input, isComposing: true })).toEqual(
      deriveSlashTrigger({ ...input, isComposing: true }),
    );
  });
});
