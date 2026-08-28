// ───────────────────────────────────────────────────────────────────
// MODULE: Cross-session Search Harness
// ───────────────────────────────────────────────────────────────────

// This client-side coordinator stays inert until a later relay integration
// supplies the search capability and its host-resolved result values.

// ───────────────────────────────────────────────────────────────────
// 1. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** Wait long enough to combine a short burst of query edits into one request. */
export const SESSION_SEARCH_DEBOUNCE_MS = 180;
/** Avoid a cross-session scan for queries too short to be useful. */
export const SESSION_SEARCH_MIN_QUERY_LENGTH = 2;

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** A host-resolved row that can be displayed by a future search surface. */
export interface SessionSearchResult {
  readonly sessionId: string;
  readonly title: string;
  readonly snippet: string;
  readonly updatedAt: string;
}

/** The only input needed to connect this client harness to a search RPC later. */
export interface SessionSearchCapability {
  readonly search: (query: string) => Promise<readonly SessionSearchResult[]>;
}

export interface SessionSearchController {
  readonly results: readonly SessionSearchResult[];
  readonly setQuery: (query: string) => void;
  readonly dispose: () => void;
}

// ───────────────────────────────────────────────────────────────────
// 3. SEARCH CONTROLLER
// ───────────────────────────────────────────────────────────────────

/** Coordinate a debounced, capability-gated search without inventing host data. */
export function createSessionSearch(
  capability?: SessionSearchCapability,
): SessionSearchController {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  let requestGeneration = 0;
  let results: readonly SessionSearchResult[] = [];

  const clearTimer = (): void => {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
  };

  const runSearch = (query: string, generation: number): void => {
    if (capability === undefined) return;

    void capability.search(query)
      .then((nextResults) => {
        if (disposed || generation !== requestGeneration) return;
        results = [...nextResults];
      })
      .catch(() => {
        if (disposed || generation !== requestGeneration) return;
        results = [];
      });
  };

  return {
    get results(): readonly SessionSearchResult[] {
      return results;
    },
    setQuery: (query: string): void => {
      if (disposed) return;

      clearTimer();
      requestGeneration += 1;
      results = [];

      const normalizedQuery = query.trim();
      if (
        capability === undefined ||
        normalizedQuery.length < SESSION_SEARCH_MIN_QUERY_LENGTH
      ) {
        return;
      }

      const generation = requestGeneration;
      timer = setTimeout(() => {
        timer = null;
        runSearch(normalizedQuery, generation);
      }, SESSION_SEARCH_DEBOUNCE_MS);
    },
    dispose: (): void => {
      disposed = true;
      requestGeneration += 1;
      clearTimer();
      results = [];
    },
  };
}
