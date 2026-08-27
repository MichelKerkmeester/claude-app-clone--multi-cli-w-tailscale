// ───────────────────────────────────────────────────────────────────
// MODULE: Per-session View-Mode Preference Tests
// ───────────────────────────────────────────────────────────────────

// Proves the view-mode store fails closed: an unreadable store returns
// the canonical default AND marks it unresolved, never "no overrides";
// the preference is per-session isolated.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  readViewModePreference,
  writeViewModePreference,
  DEFAULT_VIEW_MODE,
} from '../src/shared/state/view-mode.js';

// ───────────────────────────────────────────────────────────────────
// 2. SETUP
// ───────────────────────────────────────────────────────────────────

const SESSION_A = 'session_a_id';
const SESSION_B = 'session_b_id';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('per-session view-mode preference', () => {
  it('returns the default value with resolved=true when no preference is stored', () => {
    const result = readViewModePreference(SESSION_A);
    expect(result.value).toBe(DEFAULT_VIEW_MODE);
    expect(result.resolved).toBe(true);
  });

  it('persists and retrieves a preference per session', () => {
    writeViewModePreference(SESSION_A, 'chat');
    writeViewModePreference(SESSION_B, 'chat');

    const resultA = readViewModePreference(SESSION_A);
    expect(resultA.value).toBe('chat');
    expect(resultA.resolved).toBe(true);

    const resultB = readViewModePreference(SESSION_B);
    expect(resultB.value).toBe('chat');
    expect(resultB.resolved).toBe(true);
  });

  it('isolates preferences per session — different sessions do not interfere', () => {
    writeViewModePreference(SESSION_A, 'chat');

    // Session B has no stored preference
    const resultB = readViewModePreference(SESSION_B);
    expect(resultB.value).toBe(DEFAULT_VIEW_MODE);
    expect(resultB.resolved).toBe(true);

    // Session A still has its preference
    const resultA = readViewModePreference(SESSION_A);
    expect(resultA.value).toBe('chat');
    expect(resultA.resolved).toBe(true);
  });

  it('returns the default with resolved=true for an unknown value in storage', () => {
    // Simulate a future mode value the current client doesn't understand
    localStorage.setItem('pi-remote.view-mode:' + SESSION_A, 'compact');
    const result = readViewModePreference(SESSION_A);
    expect(result.value).toBe(DEFAULT_VIEW_MODE);
    expect(result.resolved).toBe(true);
  });

  it('returns the default with resolved=false when localStorage throws on read', () => {
    const getItemSpy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    const result = readViewModePreference(SESSION_A);
    expect(result.value).toBe(DEFAULT_VIEW_MODE);
    expect(result.resolved).toBe(false);

    getItemSpy.mockRestore();
  });

  it('performs a silent no-op when localStorage throws on write', () => {
    const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });

    // Should not throw
    writeViewModePreference(SESSION_A, 'chat');
    expect(true).toBe(true); // Reached here = no crash

    setItemSpy.mockRestore();
  });

  it('returns the default with resolved=true for a session with no stored preference after writing another session', () => {
    // Write session A, then read session B — B should get default resolved
    writeViewModePreference(SESSION_A, 'chat');

    const resultB = readViewModePreference(SESSION_B);
    expect(resultB.value).toBe(DEFAULT_VIEW_MODE);
    expect(resultB.resolved).toBe(true);
  });
});