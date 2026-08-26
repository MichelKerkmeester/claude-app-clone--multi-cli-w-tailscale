// ───────────────────────────────────────────────────────────────────
// MODULE: Prompt History Store Tests
// ───────────────────────────────────────────────────────────────────

// Proves the device-local prompt-history store skips empties and
// consecutive duplicates, and degrades to empty history on failure.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  readPromptHistory,
  recordPromptHistory,
  clearPromptHistory,
} from '../src/shared/state/state.js';

// ───────────────────────────────────────────────────────────────────
// 2. SETUP
// ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'pi-remote.prompt-history';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('prompt-history store', () => {
  it('returns empty array when no history exists', () => {
    expect(readPromptHistory()).toEqual([]);
  });

  it('records a prompt and returns it newest-first', () => {
    recordPromptHistory('Hello');
    expect(readPromptHistory()).toEqual(['Hello']);
  });

  it('keeps multiple prompts in reverse chronological order', () => {
    recordPromptHistory('First');
    recordPromptHistory('Second');
    recordPromptHistory('Third');
    expect(readPromptHistory()).toEqual(['Third', 'Second', 'First']);
  });

  it('skips empty prompts', () => {
    recordPromptHistory('');
    expect(readPromptHistory()).toEqual([]);
    recordPromptHistory('  ');
    expect(readPromptHistory()).toEqual([]);
  });

  it('skips consecutive duplicate prompts', () => {
    recordPromptHistory('Hello');
    recordPromptHistory('Hello');
    expect(readPromptHistory()).toEqual(['Hello']);
  });

  it('allows the same prompt after a different prompt', () => {
    recordPromptHistory('Hello');
    recordPromptHistory('World');
    recordPromptHistory('Hello');
    expect(readPromptHistory()).toEqual(['Hello', 'World', 'Hello']);
  });

  it('trims whitespace and skips empty after trim', () => {
    recordPromptHistory('  Hello  ');
    expect(readPromptHistory()).toEqual(['Hello']);
    recordPromptHistory('   ');
    expect(readPromptHistory()).toEqual(['Hello']);
  });

  it('degrades to empty history when localStorage is unreadable', () => {
    // Simulate corrupt data
    localStorage.setItem(STORAGE_KEY, 'not-json');
    expect(readPromptHistory()).toEqual([]);

    // Non-array JSON
    localStorage.setItem(STORAGE_KEY, '"string"');
    expect(readPromptHistory()).toEqual([]);
  });

  it('degrades to empty history when localStorage throws', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    expect(readPromptHistory()).toEqual([]);
    getItemSpy.mockRestore();
  });

  it('silently ignores storage errors on write', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });
    // Should not throw
    recordPromptHistory('Hello');
    expect(true).toBe(true); // reached here = no crash
    setItemSpy.mockRestore();
  });

  it('clears the history', () => {
    recordPromptHistory('Hello');
    expect(readPromptHistory()).toHaveLength(1);
    clearPromptHistory();
    expect(readPromptHistory()).toEqual([]);
  });
});