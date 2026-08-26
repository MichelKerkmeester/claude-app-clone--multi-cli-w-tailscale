// ───────────────────────────────────────────────────────────────────
// MODULE: @-Mention File Search Tests
// ───────────────────────────────────────────────────────────────────

// Proves the mention file-search scaffold is inert without the host RPC:
// no results, no FS walk, and the derivation correctly handles the
// disabled-capability state.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  isFileSearchAvailable,
  searchHostFiles,
  FILE_SEARCH_DISABLED,
} from '../src/shared/commands/mention-file-search.js';
import {
  deriveMentionSearchState,
  processMentionSearchResponse,
  isMentionSearchFresh,
  MENTION_SEARCH_MAX_ROWS,
  resetMentionSearchGeneration,
  nextMentionSearchGeneration,
} from '../src/shared/commands/use-mention-search.js';

// ───────────────────────────────────────────────────────────────────
// 2. TESTS
// ───────────────────────────────────────────────────────────────────

describe('mention file-search scaffold', () => {
  it('reports unavailable without the host RPC', () => {
    expect(isFileSearchAvailable(FILE_SEARCH_DISABLED)).toBe(false);
  });

  it('returns empty results from the disabled source', async () => {
    const response = await searchHostFiles({ query: 'test', limit: 16 });
    expect(response.matches).toEqual([]);
    expect(response.hasMore).toBe(false);
  });
});

describe('deriveMentionSearchState', () => {
  it('returns inactive without an active trigger', () => {
    const state = deriveMentionSearchState({
      query: 'test',
      active: false,
      generation: 0,
      capabilityAvailable: false,
    });
    expect(state.active).toBe(false);
    expect(state.results).toEqual([]);
    expect(state.available).toBe(false);
  });

  it('returns inactive when capability is absent', () => {
    const state = deriveMentionSearchState({
      query: 'test',
      active: true,
      generation: 1,
      capabilityAvailable: false,
    });
    // The state is inactive (the search panel stays closed) because the
    // host RPC is missing — inactive, not available, empty results.
    expect(state.active).toBe(false);
    expect(state.loading).toBe(false);
    expect(state.available).toBe(false);
    expect(state.results).toEqual([]);
  });
});

describe('processMentionSearchResponse', () => {
  it('caps results at MENTION_SEARCH_MAX_ROWS', () => {
    const matches = Array.from({ length: 30 }, (_, index) => ({
      path: `file-${index + 1}.ts`,
      label: `file-${index + 1}`,
    }));
    const response = { matches, hasMore: false };
    const processed = processMentionSearchResponse(response, 1);
    expect(processed.results.length).toBe(MENTION_SEARCH_MAX_ROWS);
    expect(processed.hasMore).toBe(true);
    expect(processed.loading).toBe(false);
  });

  it('returns all results when under the cap', () => {
    const matches = Array.from({ length: 5 }, (_, index) => ({
      path: `file-${index + 1}.ts`,
      label: `file-${index + 1}`,
    }));
    const response = { matches, hasMore: false };
    const processed = processMentionSearchResponse(response, 1);
    expect(processed.results.length).toBe(5);
    expect(processed.hasMore).toBe(false);
    expect(processed.generation).toBe(1);
  });
});

describe('isMentionSearchFresh', () => {
  it('returns true when generations match', () => {
    expect(isMentionSearchFresh(5, 5)).toBe(true);
  });

  it('returns false when generations differ', () => {
    expect(isMentionSearchFresh(5, 6)).toBe(false);
    expect(isMentionSearchFresh(5, 4)).toBe(false);
  });
});

describe('generation counter', () => {
  it('increments on each call', () => {
    resetMentionSearchGeneration();
    const gen1 = nextMentionSearchGeneration();
    const gen2 = nextMentionSearchGeneration();
    expect(gen2).toBe(gen1 + 1);
  });
});