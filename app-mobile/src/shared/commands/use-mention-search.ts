// ───────────────────────────────────────────────────────────────────
// MODULE: @-Mention Search State (pure derivation)
// ───────────────────────────────────────────────────────────────────
// Consumer-side search state for the @-mention file search: debounce,
// row cap, generation-counter stale-safety, empty-while-in-flight.
// The host RPC is absent, so the search always returns empty results.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { FileSearchResponse, FileSearchResult } from './mention-file-search.js';
import { isFileSearchAvailable, FILE_SEARCH_DISABLED } from './mention-file-search.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** Debounce delay for the search query. */
export const MENTION_SEARCH_DEBOUNCE_MS = 120;
/** Maximum number of rows to show in the mention panel. */
export const MENTION_SEARCH_MAX_ROWS = 16;

// ───────────────────────────────────────────────────────────────────
// 3. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface MentionSearchInput {
  /** The query string (everything after @). */
  readonly query: string;
  /** Whether the trigger is active and the panel should be open. */
  readonly active: boolean;
  /** Generation counter to detect stale results. */
  readonly generation: number;
  /** Whether the host file-search capability is available. */
  readonly capabilityAvailable: boolean;
}

export interface MentionSearchState {
  /** Whether the search is active (should show the panel). */
  readonly active: boolean;
  /** Whether the search is currently waiting for results. */
  readonly loading: boolean;
  /** Whether the search is available (host capability present). */
  readonly available: boolean;
  /** The results, capped at MENTION_SEARCH_MAX_ROWS. */
  readonly results: readonly FileSearchResult[];
  /** Whether there are more results beyond the cap. */
  readonly hasMore: boolean;
  /** Current generation for the active query. */
  readonly generation: number;
}

// ───────────────────────────────────────────────────────────────────
// 4. INITIAL STATE
// ───────────────────────────────────────────────────────────────────

export const EMPTY_MENTION_SEARCH: MentionSearchState = {
  active: false,
  loading: false,
  available: false,
  results: [],
  hasMore: false,
  generation: 0,
};

// ───────────────────────────────────────────────────────────────────
// 5. STATE DERIVATION
// ───────────────────────────────────────────────────────────────────

/**
 * Derive the mention-search state from the trigger and query.
 * Without the host RPC the search is always inert (empty results, not available).
 * The derivation is pure so it can be tested without a DOM.
 */
export function deriveMentionSearchState(input: MentionSearchInput): MentionSearchState {
  if (!input.active || !input.capabilityAvailable) {
    return {
      ...EMPTY_MENTION_SEARCH,
      active: false,
      available: isFileSearchAvailable(FILE_SEARCH_DISABLED),
    };
  }
  // The host RPC is absent, so the search is always unavailable.
  // When the RPC lands, this is where the debounced fetch would be dispatched.
  return {
    active: true,
    loading: true,
    available: false,
    results: [],
    hasMore: false,
    generation: input.generation,
  };
}

/**
 * Validate a search response against the current generation.
 * Returns true if the response is still fresh.
 */
export function isMentionSearchFresh(
  responseGeneration: number,
  currentGeneration: number,
): boolean {
  return responseGeneration === currentGeneration;
}

/**
 * Process a search response into the capped state.
 * Returns the state with results capped at MENTION_SEARCH_MAX_ROWS.
 */
export function processMentionSearchResponse(
  response: FileSearchResponse,
  generation: number,
): Pick<MentionSearchState, 'results' | 'hasMore' | 'loading' | 'generation'> {
  return {
    results: response.matches.slice(0, MENTION_SEARCH_MAX_ROWS),
    hasMore: response.hasMore || response.matches.length > MENTION_SEARCH_MAX_ROWS,
    loading: false,
    generation,
  };
}

// ───────────────────────────────────────────────────────────────────
// 6. MOCK GENERATION (for the inert scaffold)
// ───────────────────────────────────────────────────────────────────

let generationCounter = 0;

/** Increment and return the next generation counter. */
export function nextMentionSearchGeneration(): number {
  generationCounter += 1;
  return generationCounter;
}

/** Reset the generation counter (for testing). */
export function resetMentionSearchGeneration(): void {
  generationCounter = 0;
}