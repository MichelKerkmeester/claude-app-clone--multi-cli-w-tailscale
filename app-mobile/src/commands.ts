// ───────────────────────────────────────────────────────────────────
// MODULE: Session-Scoped Command Catalog Lifecycle (web)
// ───────────────────────────────────────────────────────────────────
// One in-memory catalog lifecycle per session. Every committed snapshot is
// scoped to the authenticated host epoch and session: responses that no
// longer match the current scope are refused outright, so a reconnect,
// foreground refresh, session switch, or host-epoch change can never
// overwrite the current snapshot with a different session's rows. The
// snapshot is intentionally never persisted to any browser storage.

import { useCallback, useEffect, useReducer, useRef } from 'react';

import type { CommandCatalogDto, CommandDescriptorDto } from '@pi-remote/pi-rpc-protocol';

import type { ConnectionPhase } from './state.js';
import { CatalogLifecycleError, fetchCommands, type CatalogLifecycleCode } from './relay.js';

export type HostCommandCatalogStatus =
  | 'loading'
  | 'ready'
  | 'refreshing'
  | 'unavailable'
  | 'forbidden'
  | 'incompatible'
  | 'stale';

/** One committed catalog snapshot, bound to host epoch, session, and revisions. */
export interface ScopedCommandSnapshot {
  readonly hostEpoch: string;
  readonly sessionId: string;
  readonly sessionRevision: number;
  readonly catalogRevision: number;
  readonly commands: readonly CommandDescriptorDto[];
  /** Monotonic wall-clock commit time, used only for foreground staleness gating. */
  readonly fetchedAt: number;
}

/** The explicit binding a draft carries for fail-closed revalidation at Send. */
export interface SelectedCommandBinding {
  readonly hostEpoch: string;
  readonly sessionId: string;
  readonly name: string;
  readonly sessionRevision: number;
  readonly catalogRevision: number;
}

export interface HostCommandCatalogState {
  readonly status: HostCommandCatalogStatus;
  /** The committed snapshot for the current scope, or null while none exists. */
  readonly snapshot: ScopedCommandSnapshot | null;
  readonly commands: readonly CommandDescriptorDto[];
  readonly refresh: (reason?: CatalogRefreshReason) => Promise<void>;
}

export type CatalogRefreshReason =
  | 'initial'
  | 'live'
  | 'reconnect'
  | 'foreground'
  | 'online'
  | 'manual';

/** Revalidation triggers that must wait until the snapshot is older than this. */
export const CATALOG_STALE_AFTER_MS = 30_000;

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
        // stays usable while the host is re-verified.
        status: current.snapshot === null ? 'loading' : 'refreshing',
        snapshot: current.snapshot,
      };
    case 'committed':
      return { status: 'ready', snapshot: action.snapshot };
    case 'failed':
      // A forbidden response clears authority immediately; other failures keep
      // the same-scope snapshot visible with the failure state represented.
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

/** Session-scoped in-memory catalog with shared in-flight requests. */
export function useHostCommandCatalog(
  sessionId: string,
  connection: ConnectionPhase,
): HostCommandCatalogState {
  const [state, dispatch] = useReducer(catalogReducer, INITIAL_CATALOG_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;
  // Monotonic request identity: a settling response commits only when its own
  // request is still the latest, so aborts and superseded refreshes are inert.
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const queuedReasonRef = useRef<CatalogRefreshReason | null>(null);
  const previousConnectionRef = useRef(connection);

  const refresh = useCallback(
    async (reason: CatalogRefreshReason = 'manual') => {
      // Foreground/online revalidation only matters when the snapshot is old
      // enough to be suspect; a fresh one needs no network read.
      if (
        (reason === 'foreground' || reason === 'online') &&
        stateRef.current.status === 'ready' &&
        stateRef.current.snapshot !== null &&
        Date.now() - stateRef.current.snapshot.fetchedAt < CATALOG_STALE_AFTER_MS
      ) {
        return;
      }
      // Concurrent triggers share one in-flight request; a later trigger
      // re-runs after it settles so no refresh is ever lost.
      if (inFlightRef.current) {
        queuedReasonRef.current = reason;
        return;
      }
      inFlightRef.current = true;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      dispatch({ type: 'begin' });
      try {
        const catalog: CommandCatalogDto = await fetchCommands(controller.signal);
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;
        // Commit only on match: the response must be for this session and for
        // the same host epoch the scope already committed. A mismatched
        // response fails closed and never touches the snapshot.
        if (catalog.sessionId !== sessionId) {
          dispatch({ type: 'scope-mismatch' });
          return;
        }
        const committed = stateRef.current.snapshot;
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
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;
        dispatch({ type: 'failed', code: catalogFailureCode(error) });
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null;
        inFlightRef.current = false;
        const queued = queuedReasonRef.current;
        queuedReasonRef.current = null;
        // Re-run through the latest callback: a queued trigger must observe
        // the current session scope, never the closure that queued it.
        if (queued !== null) void refreshRef.current(queued);
      }
    },
    [sessionId],
  );
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    // A host-epoch or session transition invalidates every in-flight read and
    // clears the snapshot so no other session's rows can be shown.
    requestIdRef.current += 1;
    controllerRef.current?.abort();
    dispatch({ type: 'session-changed' });
  }, [sessionId]);

  useEffect(() => {
    // Reconnect is the moment authority changes: entering live refreshes the
    // scope, while an already-live mount keeps the single prefetch.
    if (connection === 'live' && previousConnectionRef.current !== 'live') {
      void refresh(previousConnectionRef.current === null ? 'initial' : 'reconnect');
    }
    previousConnectionRef.current = connection;
  }, [connection, refresh]);

  useEffect(() => {
    void refresh('initial');
    return () => {
      requestIdRef.current += 1;
      controllerRef.current?.abort();
    };
  }, [refresh]);

  return {
    status: state.status,
    snapshot: state.snapshot,
    commands: state.snapshot?.commands ?? [],
    refresh,
  };
}

function catalogFailureCode(error: unknown): CatalogLifecycleCode {
  if (error instanceof CatalogLifecycleError) return error.code;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'unavailable';
  return 'unavailable';
}

/**
 * Resolve a canonical name inside the CURRENT scoped snapshot. No binding is
 * ever created from a missing, disabled, or out-of-scope row.
 */
export function bindingFor(
  snapshot: ScopedCommandSnapshot | null,
  name: string,
): SelectedCommandBinding | null {
  if (snapshot === null) return null;
  const descriptor = snapshot.commands.find((command) => command.name === name);
  if (descriptor === undefined || !descriptor.enabled) return null;
  return {
    hostEpoch: snapshot.hostEpoch,
    sessionId: snapshot.sessionId,
    name,
    sessionRevision: snapshot.sessionRevision,
    catalogRevision: snapshot.catalogRevision,
  };
}

/**
 * Fail-closed binding validity: a binding is only current for its exact
 * scope, and only while its canonical row still exists as an ENABLED entry
 * in the committed snapshot. A refresh that disables the command ages the
 * binding out just like a revision bump.
 */
export function bindingMatchesSnapshot(
  binding: SelectedCommandBinding | null,
  snapshot: ScopedCommandSnapshot | null,
): boolean {
  if (binding === null) return true;
  if (snapshot === null) return false;
  return (
    binding.hostEpoch === snapshot.hostEpoch &&
    binding.sessionId === snapshot.sessionId &&
    binding.sessionRevision === snapshot.sessionRevision &&
    binding.catalogRevision === snapshot.catalogRevision &&
    snapshot.commands.some((command) => command.name === binding.name && command.enabled)
  );
}
