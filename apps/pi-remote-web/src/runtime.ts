// ───────────────────────────────────────────────────────────────────
// MODULE: Non-Optimistic Runtime Control State Machine
// ───────────────────────────────────────────────────────────────────
// The browser enforces the synthesis lifecycle at its final mutation
// boundary. Three buckets stay separate: the host-confirmed snapshot
// (`state`, which only ever changes to a value Pi confirmed), the pending
// intent (`pending`, shown as applying but never committed), and the
// bounded issue state (`issue`, redacted local copy only). The complete
// state table lives in `phase`; `status` is the coarse projection the
// legacy control surfaces already understand.

import { useCallback, useEffect, useReducer, useRef } from 'react';

import {
  RUNTIME_ISSUE_CODES,
  type AvailableModelDto,
  type RuntimeControlResponse,
  type RuntimeModelCatalogDto,
  type RuntimeOperation,
  type RuntimeSnapshotDto,
  type RuntimeStateDto,
} from '@pi-remote/pi-rpc-protocol';

import * as relay from './relay.js';
import { runtimeIssueMessage, type RuntimeIssueCode } from './runtime-issues.js';

export type RuntimeStatus = 'checking' | 'ready' | 'pending' | 'stale' | 'error';

/** The complete runtime state table, including readiness refinements and issue states. */
export type RuntimePhase =
  | 'checking'
  | 'ready-adjustable'
  | 'ready-off-only'
  | 'ready-empty'
  | 'streaming'
  | 'pending'
  | 'accepted'
  | 'stale'
  | 'unsupported'
  | 'offline'
  | 'foreground-required'
  | 'rate-limited'
  | 'host-unavailable'
  | 'delivery-unknown'
  | 'inconsistent-state';

export interface RuntimeIssue {
  readonly code: RuntimeIssueCode;
  /** Bounded retry metadata; set only for rate-limited outcomes. */
  readonly retryAfterMs: number | null;
}

export type CatalogPhase =
  'opening' | 'refreshing' | 'ready' | 'offline' | 'unreachable' | 'access_denied';
export type RuntimeTerminalOutcome =
  'stale' | 'unavailable' | 'policy_blocked' | 'delivery_unknown';

export interface RuntimeUiState {
  readonly status: RuntimeStatus;
  readonly phase?: RuntimePhase;
  readonly state: RuntimeStateDto | null;
  readonly pending: RuntimeOperation | null;
  readonly issue?: RuntimeIssue | null;
  readonly models: readonly AvailableModelDto[];
  readonly catalogRevision: number | null;
  readonly canSetModelWhileStreaming: boolean;
  readonly catalogPhase: CatalogPhase;
  readonly error: string | null;
  readonly deliveryUnknown: boolean;
  readonly lastOutcome: RuntimeTerminalOutcome | null;
}

export const INITIAL_RUNTIME_STATE: RuntimeUiState = {
  status: 'checking',
  phase: 'checking',
  state: null,
  pending: null,
  issue: null,
  models: [],
  catalogRevision: null,
  canSetModelWhileStreaming: false,
  catalogPhase: 'opening',
  error: null,
  deliveryUnknown: false,
  lastOutcome: null,
};

export type RuntimeAction =
  | { readonly type: 'checking'; readonly phase: 'opening' | 'refreshing' }
  | {
      readonly type: 'hydrated';
      readonly state: RuntimeStateDto;
      readonly models: RuntimeModelCatalogDto;
    }
  | {
      readonly type: 'hydrate-failed';
      readonly issueCode: RuntimeIssueCode;
      readonly retryAfterMs: number | null;
    }
  | { readonly type: 'control-start'; readonly operation: RuntimeOperation }
  | { readonly type: 'control-settled'; readonly response: RuntimeControlResponse };

export function runtimeReducer(current: RuntimeUiState, action: RuntimeAction): RuntimeUiState {
  switch (action.type) {
    case 'checking':
      // A read-only hydrate begins. Confirmed state and a terminal
      // delivery-unknown block survive until a successful hydrate clears them.
      return {
        ...current,
        status: 'checking',
        phase: 'checking',
        catalogPhase: action.phase,
        pending: null,
        error: null,
      };
    case 'hydrated':
      return hydrate(current, action.state, action.models);
    case 'hydrate-failed':
      return {
        ...current,
        status: 'error',
        phase: phaseForIssue(action.issueCode),
        issue: { code: action.issueCode, retryAfterMs: action.retryAfterMs },
        catalogPhase: action.issueCode === 'offline' ? 'offline' : 'unreachable',
        error: runtimeIssueMessage(action.issueCode),
      };
    case 'control-start':
      // No state mutation here — the chosen control shows pending, nothing commits.
      return {
        ...current,
        status: 'pending',
        phase: 'pending',
        pending: action.operation,
        issue: null,
        error: null,
        deliveryUnknown: false,
        lastOutcome: null,
      };
    case 'control-settled':
      return settle(current, action.response);
    default:
      return current;
  }
}

function hydrate(
  current: RuntimeUiState,
  state: RuntimeStateDto,
  models: RuntimeModelCatalogDto,
): RuntimeUiState {
  // A mutation in flight keeps the machine pending; confirmed data still updates.
  const phase = current.pending === null ? derivedReadyPhase(state, models) : 'pending';
  return {
    status: statusForPhase(phase),
    phase,
    state,
    models: models.models,
    catalogRevision: models.catalogRevision,
    canSetModelWhileStreaming: models.canSetModelWhileStreaming,
    catalogPhase: 'ready',
    pending: current.pending,
    issue: null,
    error: null,
    deliveryUnknown: false,
    lastOutcome: null,
  };
}

function settle(current: RuntimeUiState, response: RuntimeControlResponse): RuntimeUiState {
  const outcome = response.outcome;
  switch (outcome.status) {
    case 'accepted':
      // The check moves only when the accepted response supplies the new host state.
      return {
        ...current,
        status: 'ready',
        phase: 'accepted',
        state: outcome.state,
        pending: null,
        issue: null,
        error: null,
        deliveryUnknown: false,
        lastOutcome: null,
      };
    case 'stale':
      // The host's current authoritative state replaces our stale view; retry is user-initiated.
      return {
        ...current,
        status: 'stale',
        phase: 'stale',
        state: outcome.state,
        pending: null,
        issue: null,
        error: null,
        deliveryUnknown: false,
        lastOutcome: 'stale',
      };
    case 'unsupported':
      return {
        ...current,
        status: 'error',
        phase: 'unsupported',
        pending: null,
        issue: { code: 'unsupported', retryAfterMs: null },
        error: runtimeIssueMessage('unsupported'),
        deliveryUnknown: false,
        lastOutcome: 'unavailable',
      };
    case 'policy_blocked':
      return {
        ...current,
        status: 'error',
        phase: 'unsupported',
        pending: null,
        issue: { code: 'unsupported', retryAfterMs: null },
        error: runtimeIssueMessage('unsupported'),
        deliveryUnknown: false,
        lastOutcome: 'policy_blocked',
      };
    case 'unavailable': {
      const issueCode = outcome.issueCode ?? 'host-unavailable';
      return {
        ...current,
        status: 'error',
        phase: phaseForIssue(issueCode),
        pending: null,
        issue: { code: issueCode, retryAfterMs: null },
        error: runtimeIssueMessage(issueCode),
        deliveryUnknown: false,
        lastOutcome: 'unavailable',
      };
    }
    case 'delivery-unknown':
      // Terminal: reconcile before any retry; never auto-repeat the mutation.
      return {
        ...current,
        status: 'error',
        phase: 'delivery-unknown',
        pending: null,
        issue: { code: 'delivery-unknown', retryAfterMs: null },
        error: runtimeIssueMessage('delivery-unknown'),
        deliveryUnknown: true,
        lastOutcome: 'delivery_unknown',
      };
    default:
      return current;
  }
}

/** The ready refinement derived from a host-confirmed snapshot. */
function derivedReadyPhase(state: RuntimeStateDto, models: RuntimeModelCatalogDto): RuntimePhase {
  if (state.streaming) return 'streaming';
  const levels = state.availableThinkingLevels;
  if (levels.length === 0) return 'ready-empty';
  if (!levels.includes(state.thinkingLevel)) return 'inconsistent-state';
  if (levels.length === 1 && levels[0] === 'off') return 'ready-off-only';
  if (
    state.model !== null &&
    !models.models.some(
      (model) => model.provider === state.model?.provider && model.id === state.model?.id,
    )
  ) {
    return 'inconsistent-state';
  }
  return 'ready-adjustable';
}

function statusForPhase(phase: RuntimePhase): RuntimeStatus {
  switch (phase) {
    case 'checking':
      return 'checking';
    case 'ready-adjustable':
    case 'ready-off-only':
    case 'ready-empty':
    case 'accepted':
      return 'ready';
    case 'streaming':
    case 'pending':
      return 'pending';
    case 'stale':
      return 'stale';
    default:
      return 'error';
  }
}

function phaseForIssue(issueCode: RuntimeIssueCode): RuntimePhase {
  switch (issueCode) {
    case 'offline':
      return 'offline';
    case 'foreground-required':
      return 'foreground-required';
    case 'rate-limited':
      return 'rate-limited';
    case 'host-unavailable':
      return 'host-unavailable';
    case 'delivery-unknown':
      return 'delivery-unknown';
    case 'invalid-response':
      return 'inconsistent-state';
    case 'unsupported':
      return 'unsupported';
  }
}

export type RefreshReason =
  'initial' | 'open' | 'foreground' | 'manual' | 'online' | 'live' | 'reconcile';

export interface RuntimeControls {
  readonly runtime: RuntimeUiState;
  readonly refresh: (reason?: RefreshReason) => Promise<void>;
  readonly setModel: (provider: string, modelId: string) => Promise<RuntimeControlResponse | null>;
  readonly setThinkingLevel: (level: string) => Promise<RuntimeControlResponse | null>;
  readonly setMode: (mode: 'build' | 'plan') => Promise<RuntimeControlResponse | null>;
}

// The mutation lane fails closed outside settled ready authority. Streaming is
// deliberately absent: the host-gated model switch stays legal while streaming,
// and the streaming capability check below blocks everything else.
const BLOCKED_MUTATION_PHASES: ReadonlySet<RuntimePhase> = new Set([
  'checking',
  'pending',
  'stale',
  'unsupported',
  'offline',
  'foreground-required',
  'rate-limited',
  'host-unavailable',
  'delivery-unknown',
  'inconsistent-state',
]);

const HYDRATE_TIMEOUT_MS = 8_000;
const MUTATION_DEADLINE_MS = 10_000;

/** Host-authoritative runtime controls for one session. */
export function useRuntime(sessionId: string): RuntimeControls {
  const [runtime, dispatch] = useReducer(runtimeReducer, INITIAL_RUNTIME_STATE);
  const runtimeRef = useRef(runtime);
  const catalogControllerRef = useRef<AbortController | null>(null);
  const mutationControllerRef = useRef<AbortController | null>(null);
  const authorityGenerationRef = useRef(0);
  // Synchronous lock: set before dispatch, so a same-tick double tap can never
  // reach the transport twice.
  const mutationInFlightRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const refreshQueuedRef = useRef<RefreshReason | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  runtimeRef.current = runtime;

  const refresh = useCallback(
    async (reason: RefreshReason = 'manual') => {
      // Concurrent triggers coalesce: one read-only hydrate at a time, latest
      // reason wins.
      if (refreshInFlightRef.current) {
        refreshQueuedRef.current = reason;
        return;
      }
      refreshInFlightRef.current = true;
      const generation = authorityGenerationRef.current + 1;
      authorityGenerationRef.current = generation;
      catalogControllerRef.current?.abort();
      const controller = new AbortController();
      catalogControllerRef.current = controller;
      let timedOut = false;
      const timeout = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, HYDRATE_TIMEOUT_MS);
      dispatch({
        type: 'checking',
        phase:
          reason === 'initial' && runtimeRef.current.models.length === 0 ? 'opening' : 'refreshing',
      });
      try {
        const snapshot = await hydrateSnapshot(controller.signal);
        if (controller.signal.aborted || generation !== authorityGenerationRef.current) return;
        if (snapshot.sessionId !== sessionId) {
          dispatch({ type: 'hydrate-failed', issueCode: 'invalid-response', retryAfterMs: null });
          return;
        }
        dispatch({ type: 'hydrated', state: snapshot.state, models: snapshot.models });
      } catch (error: unknown) {
        if (generation !== authorityGenerationRef.current) return;
        // An unmount or superseding refresh cancels silently; a deadline abort is
        // a real failure and surfaces as host-unavailable.
        if (controller.signal.aborted && !timedOut) return;
        const relayIssue = runtimeIssueFrom(error);
        const issueCode =
          relayIssue !== null
            ? relayIssue.code
            : typeof navigator !== 'undefined' && !navigator.onLine
              ? 'offline'
              : 'host-unavailable';
        const retryAfterMs = relayIssue?.retryAfterMs ?? null;
        dispatch({ type: 'hydrate-failed', issueCode, retryAfterMs });
        if (issueCode === 'rate-limited' && retryAfterMs !== null && retryAfterMs > 0) {
          // Honor the bounded Retry-After with one read-only reconcile; a new
          // mutation still requires a fresh deliberate selection.
          if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
          retryTimerRef.current = window.setTimeout(() => {
            retryTimerRef.current = null;
            void refreshRef.current('reconcile');
          }, retryAfterMs);
        }
      } finally {
        window.clearTimeout(timeout);
        if (catalogControllerRef.current === controller) catalogControllerRef.current = null;
        refreshInFlightRef.current = false;
        const queued = refreshQueuedRef.current;
        refreshQueuedRef.current = null;
        if (queued !== null) void refresh(queued);
      }
    },
    [sessionId],
  );
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const apply = useCallback(
    async (operation: RuntimeOperation): Promise<RuntimeControlResponse | null> => {
      const current = runtimeRef.current;
      if (
        mutationInFlightRef.current ||
        BLOCKED_MUTATION_PHASES.has(current.phase ?? 'checking') ||
        current.state === null ||
        current.deliveryUnknown
      ) {
        return null;
      }
      // Streaming sends zero tickets and zero mutations; model switching stays
      // gated by the host's advertised capability.
      if (
        current.state.streaming &&
        (operation.type !== 'set_model' || !current.canSetModelWhileStreaming)
      ) {
        return null;
      }
      if (
        operation.type === 'set_model' &&
        !current.models.some(
          (model) =>
            model.provider === operation.provider &&
            model.id === operation.modelId &&
            (model.availability ?? 'available') === 'available',
        )
      ) {
        return null;
      }
      const expectedRevision = current.state.revision;
      const expectedCatalogRevision =
        operation.type === 'set_model' ? (current.catalogRevision ?? undefined) : undefined;
      if (operation.type === 'set_model' && expectedCatalogRevision === undefined) return null;
      const generation = authorityGenerationRef.current + 1;
      authorityGenerationRef.current = generation;
      mutationInFlightRef.current = true;
      const controller = new AbortController();
      mutationControllerRef.current = controller;
      // Cross-browser delivery deadline: unresolved delivery becomes
      // delivery-unknown — no ticket is replayed and nothing is retried.
      const deadline = window.setTimeout(() => controller.abort(), MUTATION_DEADLINE_MS);
      dispatch({ type: 'control-start', operation });
      try {
        const response = await relay.controlRuntime(
          sessionId,
          expectedRevision,
          operation,
          expectedCatalogRevision,
          controller.signal,
        );
        if (generation !== authorityGenerationRef.current) return null;
        dispatch({ type: 'control-settled', response });
        if (response.outcome.status === 'stale' || response.outcome.status === 'unsupported') {
          // One read-only reconcile; the original mutation is never retried.
          void refreshRef.current('reconcile');
        }
        return response;
      } catch {
        if (generation !== authorityGenerationRef.current) return null;
        const response: RuntimeControlResponse = {
          outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' },
        };
        dispatch({ type: 'control-settled', response });
        return response;
      } finally {
        window.clearTimeout(deadline);
        mutationInFlightRef.current = false;
        if (mutationControllerRef.current === controller) mutationControllerRef.current = null;
      }
    },
    [sessionId],
  );

  const setModel = useCallback(
    (provider: string, modelId: string) => apply({ type: 'set_model', provider, modelId }),
    [apply],
  );
  const setThinkingLevel = useCallback(
    (level: string) => apply({ type: 'set_thinking_level', level }),
    [apply],
  );
  const setMode = useCallback(
    (mode: 'build' | 'plan') => apply({ type: 'set_mode', mode }),
    [apply],
  );

  useEffect(() => {
    void refresh('initial');
    return () => {
      authorityGenerationRef.current += 1;
      catalogControllerRef.current?.abort();
      mutationControllerRef.current?.abort();
      if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
    };
  }, [refresh]);

  return { runtime, refresh, setModel, setThinkingLevel, setMode };
}

/**
 * Bounded announcement copy for the one document-level polite atomic status
 * region. Every branch comes from the local catalog; raw host or transport
 * text can never reach assistive copy through this path.
 */
export function runtimeAnnouncement(runtime: RuntimeUiState): string {
  switch (runtime.phase) {
    case 'checking':
      return 'Checking runtime…';
    case 'streaming':
      return 'Available when the current turn ends.';
    case 'pending':
      return runtime.pending === null ? 'Working…' : 'Applying change…';
    case 'accepted':
      return 'Runtime change accepted.';
    case 'stale':
      return 'The host runtime changed. Refreshed.';
    case 'unsupported':
      return runtimeIssueMessage('unsupported');
    case 'offline':
      return runtimeIssueMessage('offline');
    case 'foreground-required':
      return runtimeIssueMessage('foreground-required');
    case 'rate-limited':
      return runtimeIssueMessage('rate-limited');
    case 'host-unavailable':
      return runtimeIssueMessage('host-unavailable');
    case 'delivery-unknown':
      return runtimeIssueMessage('delivery-unknown');
    case 'inconsistent-state':
      return runtimeIssueMessage('invalid-response');
    default:
      return '';
  }
}

/**
 * Prefer the bounded reconcile snapshot; compose it from the two read-only
 * endpoints when the transport does not expose the reconcile function.
 */
async function hydrateSnapshot(signal: AbortSignal): Promise<RuntimeSnapshotDto> {
  const reconcileTransport = snapshotTransport();
  if (reconcileTransport !== null) return reconcileTransport(signal);
  const [state, models] = await Promise.all([
    relay.fetchRuntimeState(signal),
    relay.fetchRuntimeModels(signal),
  ]);
  return { sessionId: state.sessionId, state, models };
}

function snapshotTransport(): ((signal: AbortSignal) => Promise<RuntimeSnapshotDto>) | null {
  try {
    const candidate = (relay as { fetchRuntimeSnapshot?: unknown }).fetchRuntimeSnapshot;
    if (typeof candidate !== 'function') return null;
    return candidate as (signal: AbortSignal) => Promise<RuntimeSnapshotDto>;
  } catch {
    // Transports that do not expose the reconcile snapshot fall back to the
    // two read-only endpoints.
    return null;
  }
}

interface RelayIssueShape {
  readonly code: RuntimeIssueCode;
  readonly retryAfterMs: number | null;
}

/**
 * Only an allowlisted issue code on a thrown error may drive issue state.
 * The shape is validated rather than the class so every transport normalizes
 * identically; retry metadata stays clamped to the bounded window.
 */
function runtimeIssueFrom(error: unknown): RelayIssueShape | null {
  if (typeof error !== 'object' || error === null) return null;
  const candidate = error as { readonly issueCode?: unknown; readonly retryAfterMs?: unknown };
  if (typeof candidate.issueCode !== 'string') return null;
  if (!(RUNTIME_ISSUE_CODES as readonly string[]).includes(candidate.issueCode)) return null;
  const raw = candidate.retryAfterMs;
  const retryAfterMs =
    typeof raw === 'number' && Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 60_000) : null;
  return { code: candidate.issueCode as RuntimeIssueCode, retryAfterMs };
}
