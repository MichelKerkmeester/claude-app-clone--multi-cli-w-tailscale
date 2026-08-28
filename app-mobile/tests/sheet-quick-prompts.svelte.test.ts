// ───────────────────────────────────────────────────────────────────
// MODULE: Quick Prompts Sheet Behaviour Tests
// ───────────────────────────────────────────────────────────────────
// These tests exercise the local-only draft path and the sheet's named controls.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SheetQuickPrompts from '../src/pages/chat/chrome/sheet-quick-prompts.svelte';
import {
  insertQuickPrompt,
  QUICK_PROMPTS_STORAGE_KEY,
  type QuickPrompt,
} from '../src/shared/commands/insert-slash-command.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const QUICK_PROMPT: QuickPrompt = {
  label: 'Explain this code',
  prompt: 'Explain the selected code in plain language.',
};

const SECOND_QUICK_PROMPT: QuickPrompt = {
  label: 'Summarize the change',
  prompt: 'Summarize the change and list the remaining risks.',
};

type SetPrompt = (updater: (current: string) => string) => void;

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function seedQuickPrompts(prompts: readonly QuickPrompt[] = [QUICK_PROMPT, SECOND_QUICK_PROMPT]): void {
  window.localStorage.setItem(QUICK_PROMPTS_STORAGE_KEY, JSON.stringify(prompts));
}

function renderOpenSheet(setPrompt: SetPrompt, onOpenChange = vi.fn()) {
  return render(SheetQuickPrompts, {
    isOpen: true,
    onOpenChange,
    setPrompt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('insertQuickPrompt', () => {
  it('replaces the selected draft range and reports that the result was not sent', () => {
    const result = insertQuickPrompt({
      draft: 'Before old text after',
      selectionStart: 7,
      selectionEnd: 15,
      quickPrompt: QUICK_PROMPT,
    });

    expect(result.draft).toBe('Before Explain the selected code in plain language. after');
    expect(result.caretOffset).toBe(7 + QUICK_PROMPT.prompt.length);
    expect(result.announcement).toBe('Inserted Explain this code. Not sent.');
  });
});

describe('SheetQuickPrompts', () => {
  it('fills the composer draft through setPrompt without calling the send path', async () => {
    seedQuickPrompts([QUICK_PROMPT]);
    let draft = 'Existing draft';
    const setPrompt = vi.fn<SetPrompt>((updater) => {
      draft = updater(draft);
    });
    const sendPrompt = vi.fn();

    renderOpenSheet(setPrompt);
    await fireEvent.click(screen.getByRole('option', { name: QUICK_PROMPT.label }));

    expect(draft).toBe(QUICK_PROMPT.prompt);
    expect(setPrompt).toHaveBeenCalledTimes(1);
    expect(sendPrompt).not.toHaveBeenCalled();
  });

  it('gives every rendered control an accessible role and name', () => {
    seedQuickPrompts();
    const setPrompt = vi.fn<SetPrompt>();

    renderOpenSheet(setPrompt);

    expect(screen.getByRole('button', { name: 'Close quick prompts' })).toBeTruthy();
    expect(screen.getByRole('option', { name: QUICK_PROMPT.label })).toBeTruthy();
    expect(screen.getByRole('option', { name: SECOND_QUICK_PROMPT.label })).toBeTruthy();
  });

  it('renders an empty state when local storage cannot be read', () => {
    // Spy the storage instance the code actually calls. A Storage.prototype spy
    // is not picked up by window.localStorage here, so the throw never happens
    // and the assertion below passes through the empty-storage branch instead —
    // proving nothing about unreadable storage.
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    const setPrompt = vi.fn<SetPrompt>();

    renderOpenSheet(setPrompt);

    expect(screen.getByText('No saved quick prompts yet.')).toBeTruthy();
    expect(screen.queryByRole('option', { name: QUICK_PROMPT.label })).toBeNull();
  });
});
