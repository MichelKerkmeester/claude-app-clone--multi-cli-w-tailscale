// ───────────────────────────────────────────────────────────────────
// MODULE: Session-Scoped Command Catalog Lifecycle (web)
// ───────────────────────────────────────────────────────────────────
// One in-memory catalog lifecycle per session. Every committed snapshot is
// Scoped to the authenticated host epoch and session: responses that no
// Longer match the current scope are refused outright, so a reconnect,
// Foreground refresh, session switch, or host-epoch change can never
// Overwrite the current snapshot with a different session's rows. The
// Snapshot is intentionally never persisted to any browser storage.

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
      // A different session can never inherit another session's rows.
      return INITIAL_CATALOG_STATE;
    case 'begin':
      return {
        // A committed same-scope snapshot survives a refresh so the palette
        // Stays usable while the host is re-verified.
        status: current.snapshot === null ? 'loading' : 'refreshing',
        snapshot: current.snapshot,
      };
    case 'committed':
      return { status: 'ready', snapshot: action.snapshot };
    case 'failed':
      // A forbidden response clears authority immediately; other failures keep
      // The same-scope snapshot visible with the failure state represented.
      return {
        status: action.code,
        snapshot: action.code === 'forbidden' ? null : current.snapshot,
      };
    case 'scope-mismatch':
      // Fail closed: never commit rows for another session or host epoch.
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
  // Monotonic request identity: a settling response commits only when its own
  // Request is still the latest, so aborts and superseded refreshes are inert.
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
    // Foreground/online revalidation only matters when the snapshot is old
    // Enough to be suspect; a fresh one needs no network read.
    if (
      (reason === 'foreground' || reason === 'online') &&
      stateRef.status === 'ready' &&
      stateRef.snapshot !== null &&
      Date.now() - stateRef.snapshot.fetchedAt < CATALOG_STALE_AFTER_MS
    ) {
      return;
    }
    // Concurrent triggers share one in-flight request; a later trigger
    // Re-runs after it settles so no refresh is ever lost.
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
      // Commit only on match: the response must be for this session and for
      // The same host epoch the scope already committed. A mismatched
      // Response fails closed and never touches the snapshot.
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
      // Re-run through the latest callback: a queued trigger must observe
      // The current session scope, never the closure that queued it.
      if (queued !== null) void refresh(queued);
    }
  }

  // ───────────────────────────────────────────────────────────────────
  // 4. SCOPE AND CONNECTION EFFECTS
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    // A host-epoch or session transition invalidates every in-flight read and
    // Clears the snapshot so no other session's rows can be shown.
    getSessionId();
    requestIdRef += 1;
    controllerRef?.abort();
    // Dispatch reduces the catalog state (reads + writes it); untrack so this effect depends only
    // On the session id and does not re-run on the state it just cleared → no self-invalidation.
    untrack(() => dispatch({ type: 'session-changed' }));
  });

  $effect(() => {
    const connection = getConnection();
    getSessionId();
    // Reconnect is the moment authority changes: entering live refreshes the
    // Scope, while an already-live mount keeps the single prefetch.
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
