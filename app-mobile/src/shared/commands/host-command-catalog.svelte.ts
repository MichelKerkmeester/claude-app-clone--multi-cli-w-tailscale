// ───────────────────────────────────────────────────────────────────
// MODULE: Session-Scoped Command Catalog Lifecycle (web)
// ───────────────────────────────────────────────────────────────────
// In-memory per-session catalog; scope-mismatched responses never overwrite the committed snapshot.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { untrack } from 'svelte';

import type { CommandCatalogDto } from '@pi-remote/pi-rpc-protocol';

import {
  CATALOG_STALE_AFTER_MS,
  type CatalogRefreshReason,
  type HostCommandCatalogState,
  type HostCommandCatalogStatus,
  type ScopedCommandSnapshot,
} from './commands.js';
import {
  CatalogLifecycleError,
  fetchCommands,
  type CatalogLifecycleCode,
} from '../transport/relay.js';
import type { ConnectionPhase } from '../state/state.js';

// ───────────────────────────────────────────────────────────────────
// 2. CATALOG STATE AND REDUCER
// ───────────────────────────────────────────────────────────────────

interface CatalogState {
  readonly status: HostCommandCatalogStatus;
  readonly snapshot: ScopedCommandSnapshot | null;
}

const INITIAL_CATALOG_STATE: CatalogState = { status: 'loading', snapshot: null };

type CatalogAction =
  | { readonly type: 'session-changed' }
  | { readonly type: 'begin' }
  | { readonly type: 'committed'; readonly snapshot: ScopedCommandSnapshot }
  | { readonly type: 'failed'; readonly code: CatalogLifecycleCode }
  | { readonly type: 'scope-mismatch' };

function catalogReducer(current: CatalogState, action: CatalogAction): CatalogState {
  switch (action.type) {
    case 'session-changed':
      // A different session cannot inherit another session's rows.
      return INITIAL_CATALOG_STATE;
    case 'begin':
      return {
        // Same-scope snapshot survives refresh so the palette stays usable during re-verify.
        status: current.snapshot === null ? 'loading' : 'refreshing',
        snapshot: current.snapshot,
      };
    case 'committed':
      return { status: 'ready', snapshot: action.snapshot };
    case 'failed':
      // Forbidden clears authority; other failures keep same-scope snapshot visible.
      return {
        status: action.code,
        snapshot: action.code === 'forbidden' ? null : current.snapshot,
      };
    case 'scope-mismatch':
      // Never commit rows for another session or host epoch.
      return { status: 'stale', snapshot: current.snapshot };
    default:
      return current;
  }
}

// ───────────────────────────────────────────────────────────────────
// 3. REFRESH LIFECYCLE
// ───────────────────────────────────────────────────────────────────

/** Session-scoped in-memory catalog with shared in-flight requests. */
export function useHostCommandCatalog(
  getSessionId: () => string,
  getConnection: () => ConnectionPhase,
): HostCommandCatalogState {
  let state = $state<CatalogState>(INITIAL_CATALOG_STATE);
  let stateRef: CatalogState = state;
  // Latest request id wins so superseded refreshes never commit stale rows.
  let requestIdRef = 0;
  let controllerRef: AbortController | null = null;
  let inFlightRef = false;
  let queuedReasonRef: CatalogRefreshReason | null = null;
  let previousConnectionRef: ConnectionPhase | null = getConnection();

  function dispatch(action: CatalogAction): void {
    state = catalogReducer(state, action);
    stateRef = state;
  }

  async function refresh(reason: CatalogRefreshReason = 'manual'): Promise<void> {
    // Skip foreground/online refresh when the snapshot is still fresh.
    if (
      (reason === 'foreground' || reason === 'online') &&
      stateRef.status === 'ready' &&
      stateRef.snapshot !== null &&
      Date.now() - stateRef.snapshot.fetchedAt < CATALOG_STALE_AFTER_MS
    ) {
      return;
    }
    // Concurrent triggers share one in-flight request; queued reason re-runs after settle.
    if (inFlightRef) {
      queuedReasonRef = reason;
      return;
    }
    inFlightRef = true;
    const requestId = requestIdRef + 1;
    requestIdRef = requestId;
    controllerRef?.abort();
    const controller = new AbortController();
    controllerRef = controller;
    dispatch({ type: 'begin' });
    try {
      const catalog: CommandCatalogDto = await fetchCommands(controller.signal);
      if (controller.signal.aborted || requestId !== requestIdRef) return;
      // Commit only when session id and host epoch match the current scope.
      if (catalog.sessionId !== getSessionId()) {
        dispatch({ type: 'scope-mismatch' });
        return;
      }
      const committed = stateRef.snapshot;
      if (committed !== null && committed.hostEpoch !== catalog.hostEpoch) {
        dispatch({ type: 'scope-mismatch' });
        return;
      }
      dispatch({
        type: 'committed',
        snapshot: {
          hostEpoch: catalog.hostEpoch,
          sessionId: catalog.sessionId,
          sessionRevision: catalog.sessionRevision,
          catalogRevision: catalog.catalogRevision,
          commands: catalog.commands,
          fetchedAt: Date.now(),
        },
      });
    } catch (error: unknown) {
      if (controller.signal.aborted || requestId !== requestIdRef) return;
      dispatch({ type: 'failed', code: catalogFailureCode(error) });
    } finally {
      if (controllerRef === controller) controllerRef = null;
      inFlightRef = false;
      const queued = queuedReasonRef;
      queuedReasonRef = null;
      // Re-run with the latest scope; never the closure that queued the refresh.
      if (queued !== null) void refresh(queued);
    }
  }

  // ───────────────────────────────────────────────────────────────────
  // 4. SCOPE AND CONNECTION EFFECTS
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    // Session change aborts in-flight reads and clears inherited rows.
    getSessionId();
    requestIdRef += 1;
    controllerRef?.abort();
    // untrack dispatch so this effect depends only on session id, not catalog state it clears.
    untrack(() => dispatch({ type: 'session-changed' }));
  });

  $effect(() => {
    const connection = getConnection();
    getSessionId();
    // Entering live triggers refresh; mount on live keeps the single prefetch.
    if (connection === 'live' && previousConnectionRef !== 'live') {
      untrack(() => void refresh(previousConnectionRef === null ? 'initial' : 'reconnect'));
    }
    previousConnectionRef = connection;
  });

  $effect(() => {
    getSessionId();
    untrack(() => void refresh('initial'));
    return () => {
      requestIdRef += 1;
      controllerRef?.abort();
    };
  });

  // ───────────────────────────────────────────────────────────────────
  // 5. PUBLIC API
  // ───────────────────────────────────────────────────────────────────

  return {
    get status() {
      return state.status;
    },
    get snapshot() {
      return state.snapshot;
    },
    get commands() {
      return state.snapshot?.commands ?? [];
    },
    refresh,
  };
}

// ───────────────────────────────────────────────────────────────────
// 6. FAILURE CODE MAPPING
// ───────────────────────────────────────────────────────────────────

function catalogFailureCode(error: unknown): CatalogLifecycleCode {
  if (error instanceof CatalogLifecycleError) return error.code;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'unavailable';
  return 'unavailable';
}
