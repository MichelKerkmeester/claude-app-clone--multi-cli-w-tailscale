// ───────────────────────────────────────────────────────────────────
// MODULE: Cross-session Search Harness Tests
// ───────────────────────────────────────────────────────────────────

// These tests exercise the client scheduler with an explicit capability;
// no relay or protocol shape is assumed until wiring supplies one.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createSessionSearch,
  SESSION_SEARCH_DEBOUNCE_MS,
  SESSION_SEARCH_MIN_QUERY_LENGTH,
  type SessionSearchCapability,
  type SessionSearchResult,
} from '../src/shared/format/session-search.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const RESULT: SessionSearchResult = {
  sessionId: 'session-001',
  title: 'Accessibility review',
  snippet: 'Keyboard focus follows the onboarding step.',
  updatedAt: '2026-08-13T10:00:00.000Z',
};

function createCapability(): {
  readonly capability: SessionSearchCapability;
  readonly search: ReturnType<typeof vi.fn<SessionSearchCapability['search']>>;
} {
  const search = vi.fn<SessionSearchCapability['search']>().mockResolvedValue([RESULT]);
  return { capability: { search }, search };
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('cross-session search query length', () => {
  it('does not search one character but searches at the two-character boundary', async () => {
    const { capability, search } = createCapability();
    const controller = createSessionSearch(capability);

    controller.setQuery('a');
    await vi.advanceTimersByTimeAsync(SESSION_SEARCH_DEBOUNCE_MS);
    expect(search).not.toHaveBeenCalled();

    controller.setQuery('ab');
    await vi.advanceTimersByTimeAsync(SESSION_SEARCH_DEBOUNCE_MS);

    expect(SESSION_SEARCH_MIN_QUERY_LENGTH).toBe(2);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenLastCalledWith('ab');
    expect(controller.results).toEqual([RESULT]);

    controller.dispose();
  });
});

describe('cross-session search debounce', () => {
  it('waits 179ms and fires at exactly 180ms', async () => {
    const { capability, search } = createCapability();
    const controller = createSessionSearch(capability);

    controller.setQuery('ab');
    expect(vi.getTimerCount()).toBe(1);

    expect(SESSION_SEARCH_DEBOUNCE_MS).toBe(180);
    await vi.advanceTimersByTimeAsync(179);
    expect(search).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenLastCalledWith('ab');
    expect(controller.results).toEqual([RESULT]);

    controller.dispose();
  });
});

describe('cross-session search capability gate', () => {
  it('returns no results and schedules no query without a search capability', async () => {
    const controller = createSessionSearch();

    controller.setQuery('ab');
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(SESSION_SEARCH_DEBOUNCE_MS);

    expect(controller.results).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);

    controller.dispose();
  });
});
