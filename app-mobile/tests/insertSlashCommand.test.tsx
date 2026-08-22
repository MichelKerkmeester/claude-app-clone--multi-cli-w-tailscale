// ───────────────────────────────────────────────────────────────────
// MODULE: Slash Command Insertion Tests
// ───────────────────────────────────────────────────────────────────
// Proves the canonical `/${name} ` replacement, synchronous controlled
// draft update, caret placement, binding pass-through, the "Not sent"
// announcement, and the token-edit-clears / argument-edit-retains binding
// rules. The function is pure: no network, no storage, no side effects.

import { describe, expect, it } from 'vitest';

import type { SelectedCommandBinding } from '../src/shared/data/commands.js';
import {
  bindingAfterDraftChange,
  insertSlashCommand,
} from '../src/shared/data/insertSlashCommand.js';

const BINDING: SelectedCommandBinding = {
  hostEpoch: 'epoch-1',
  sessionId: 'session-1',
  name: 'plan',
  sessionRevision: 3,
  catalogRevision: 7,
};

describe('insertSlashCommand', () => {
  it('replaces the complete token range with the canonical command and trailing space', () => {
    const result = insertSlashCommand({
      draft: '/pl',
      selectionStart: 0,
      selectionEnd: 0,
      commandName: 'plan',
      binding: BINDING,
      replaceRange: { start: 0, end: 3 },
    });
    expect(result.draft).toBe('/plan ');
    expect(result.caretOffset).toBe(6);
    expect(result.binding).toBe(BINDING);
  });

  it('replaces the selection when no explicit range is given', () => {
    const result = insertSlashCommand({
      draft: 'write /pl now',
      selectionStart: 6,
      selectionEnd: 9,
      commandName: 'plan',
      binding: BINDING,
    });
    expect(result.draft).toBe('write /plan  now');
    expect(result.caretOffset).toBe(12);
  });

  it('appends at the draft end for the palette route', () => {
    const result = insertSlashCommand({
      draft: 'hello',
      selectionStart: 5,
      selectionEnd: 5,
      commandName: 'plan',
      binding: BINDING,
      replaceRange: { start: 5, end: 5 },
    });
    expect(result.draft).toBe('hello/plan ');
    expect(result.caretOffset).toBe(11);
  });

  it('announces the insertion as not sent', () => {
    const result = insertSlashCommand({
      draft: '',
      selectionStart: 0,
      selectionEnd: 0,
      commandName: 'plan',
      binding: BINDING,
    });
    expect(result.announcement).toBe('Inserted slash command plan. Not sent.');
  });

  it('produces the identical canonical string for inline and palette callers', () => {
    const inline = insertSlashCommand({
      draft: '/pl',
      selectionStart: 3,
      selectionEnd: 3,
      commandName: 'plan',
      binding: BINDING,
      replaceRange: { start: 0, end: 3 },
    });
    const palette = insertSlashCommand({
      draft: '',
      selectionStart: 0,
      selectionEnd: 0,
      commandName: 'plan',
      binding: BINDING,
      replaceRange: { start: 0, end: 0 },
    });
    expect(palette.draft).toBe('/plan ');
    expect(inline.draft).toBe('/plan ');
    expect(palette.caretOffset).toBe(6);
    expect(inline.caretOffset).toBe(6);
    expect(palette.binding).toEqual(BINDING);
    expect(inline.binding).toEqual(BINDING);
  });
});

describe('bindingAfterDraftChange', () => {
  const intact = '/plan ';

  it('retains the binding while arguments change', () => {
    expect(
      bindingAfterDraftChange({ previousDraft: intact, nextDraft: '/plan go faster', binding: BINDING }),
    ).toBe(BINDING);
  });

  it('clears the binding when the command token is edited', () => {
    expect(
      bindingAfterDraftChange({ previousDraft: intact, nextDraft: '/plam ', binding: BINDING }),
    ).toBeNull();
  });

  it('clears the binding when the token is extended past the boundary', () => {
    expect(
      bindingAfterDraftChange({ previousDraft: intact, nextDraft: '/plango', binding: BINDING }),
    ).toBeNull();
  });

  it('retains the binding when the trailing space is deleted', () => {
    expect(
      bindingAfterDraftChange({ previousDraft: intact, nextDraft: '/plan', binding: BINDING }),
    ).toBe(BINDING);
  });

  it('clears the binding when the draft is replaced entirely', () => {
    expect(
      bindingAfterDraftChange({ previousDraft: intact, nextDraft: 'a different draft', binding: BINDING }),
    ).toBeNull();
  });

  it('keeps a null binding null', () => {
    expect(
      bindingAfterDraftChange({ previousDraft: 'plain text', nextDraft: 'plain text!', binding: null }),
    ).toBeNull();
  });

  it('clears when the previous draft was already not token-intact (fail closed)', () => {
    expect(
      bindingAfterDraftChange({ previousDraft: '/plam ', nextDraft: '/plan ', binding: BINDING }),
    ).toBeNull();
  });
});
