// ───────────────────────────────────────────────────────────────────
// MODULE: Non-Optimistic Runtime Control State
// ───────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useReducer, useRef } from 'react';

import type {
  AvailableModelDto,
  RuntimeControlResponse,
  RuntimeModelCatalogDto,
  RuntimeOperation,
  RuntimeStateDto,
} from '@pi-remote/pi-rpc-protocol';

import { controlRuntime, fetchRuntimeModels, fetchRuntimeState } from './relay.js';

export type RuntimeStatus = 'checking' | 'ready' | 'pending' | 'stale' | 'error';
export type CatalogPhase =
  'opening' | 'refreshing' | 'ready' | 'offline' | 'unreachable' | 'access_denied';
export type RuntimeTerminalOutcome =
  'stale' | 'unavailable' | 'policy_blocked' | 'delivery_unknown';

export interface RuntimeUiState {
  readonly status: RuntimeStatus;
  readonly state: RuntimeStateDto | null;
  readonly models: readonly AvailableModelDto[];
  readonly catalogRevision: number | null;
  readonly canSetModelWhileStreaming: boolean;
  readonly catalogPhase: CatalogPhase;
  readonly pending: RuntimeOperation | null;
  readonly error: string | null;
  readonly deliveryUnknown: boolean;
  readonly lastOutcome: RuntimeTerminalOutcome | null;
}

export const INITIAL_RUNTIME_STATE: RuntimeUiState = {
  status: 'checking',
  state: null,
  models: [],
  catalogRevision: null,
  canSetModelWhileStreaming: false,
  catalogPhase: 'opening',
  pending: null,
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
      readonly error: string;
      readonly phase: 'offline' | 'unreachable' | 'access_denied';
    }
  | { readonly type: 'control-start'; readonly operation: RuntimeOperation }
  | { readonly type: 'control-settled'; readonly response: RuntimeControlResponse };

// The browser may show a pending intent but never an optimistic committed value.
// `state` therefore only ever changes to a value Pi has confirmed — on hydrate,
// on an accepted mutation, or to the host's current value on a stale rejection.
export function runtimeReducer(current: RuntimeUiState, action: RuntimeAction): RuntimeUiState {
  switch (action.type) {
    case 'checking':
      return {
        ...current,
        status: 'checking',
        catalogPhase: action.phase,
        pending: null,
        error: null,
      };
    case 'hydrated':
      return {
        status: 'ready',
        state: action.state,
        models: action.models.models,
        catalogRevision: action.models.catalogRevision,
        canSetModelWhileStreaming: action.models.canSetModelWhileStreaming,
        catalogPhase: 'ready',
        pending: null,
        error: null,
        deliveryUnknown: false,
        lastOutcome: null,
      };
    case 'hydrate-failed':
      if (action.phase === 'access_denied') {
        return {
          ...INITIAL_RUNTIME_STATE,
          status: 'error',
          catalogPhase: 'access_denied',
          error: action.error,
        };
      }
      return { ...current, status: 'error', catalogPhase: action.phase, error: action.error };
    case 'control-start':
      // No state mutation here — the chosen control shows pending, nothing commits.
      return {
        ...current,
        status: 'pending',
        pending: action.operation,
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

function settle(current: RuntimeUiState, response: RuntimeControlResponse): RuntimeUiState {
  const outcome = response.outcome;
  switch (outcome.status) {
    case 'accepted':
      return {
        ...current,
        status: 'ready',
        state: outcome.state,
        pending: null,
        error: null,
        deliveryUnknown: false,
        lastOutcome: null,
      };
    case 'stale':
      // The host's current authoritative state replaces our stale view; retry is user-initiated.
      return {
        ...current,
        status: 'stale',
        state: outcome.state,
        pending: null,
        error: null,
        deliveryUnknown: false,
        lastOutcome: 'stale',
      };
    case 'unsupported':
    case 'unavailable':
    case 'policy_blocked':
      return {
        ...current,
        status: 'error',
        pending: null,
        error: runtimeReasonMessage(outcome.reasonCode),
        deliveryUnknown: false,
        lastOutcome: outcome.status === 'policy_blocked' ? 'policy_blocked' : 'unavailable',
      };
    case 'delivery-unknown':
      // Terminal: reconcile before any retry; never auto-repeat the mutation.
      return {
        ...current,
        status: 'error',
        pending: null,
        error: runtimeReasonMessage(outcome.reasonCode),
        deliveryUnknown: true,
        lastOutcome: 'delivery_unknown',
      };
    default:
      return current;
  }
}

export interface RuntimeControls {
  readonly runtime: RuntimeUiState;
  readonly refresh: (reason?: 'initial' | 'open' | 'foreground' | 'manual') => Promise<void>;
  readonly setModel: (provider: string, modelId: string) => Promise<RuntimeControlResponse | null>;
  readonly setThinkingLevel: (level: string) => Promise<RuntimeControlResponse | null>;
  readonly setMode: (mode: 'build' | 'plan') => Promise<RuntimeControlResponse | null>;
}

/** Host-authoritative runtime controls for one session; disabled outside `ready`. */
export function useRuntime(sessionId: string): RuntimeControls {
  const [runtime, dispatch] = useReducer(runtimeReducer, INITIAL_RUNTIME_STATE);
  const runtimeRef = useRef(runtime);
  const catalogControllerRef = useRef<AbortController | null>(null);
  const mutationControllerRef = useRef<AbortController | null>(null);
  const authorityGenerationRef = useRef(0);
  const mutationInFlightRef = useRef(false);
  runtimeRef.current = runtime;

  const refresh = useCallback(
    async (reason: 'initial' | 'open' | 'foreground' | 'manual' = 'manual') => {
      const generation = authorityGenerationRef.current + 1;
      authorityGenerationRef.current = generation;
      catalogControllerRef.current?.abort();
      const controller = new AbortController();
      catalogControllerRef.current = controller;
      const timeout = window.setTimeout(() => controller.abort(), 8_000);
      dispatch({
        type: 'checking',
        phase:
          reason === 'initial' && runtimeRef.current.models.length === 0 ? 'opening' : 'refreshing',
      });
      try {
        const [state, models] = await Promise.all([
          fetchRuntimeState(controller.signal),
          fetchRuntimeModels(controller.signal),
        ]);
        if (controller.signal.aborted || generation !== authorityGenerationRef.current) return;
        if (state.sessionId !== sessionId || models.sessionId !== sessionId) {
          throw new Error('Relay returned runtime data for another session.');
        }
        dispatch({ type: 'hydrated', state, models });
      } catch (error) {
        if (controller.signal.aborted || generation !== authorityGenerationRef.current) return;
        const phase = catalogFailurePhase(error);
        dispatch({ type: 'hydrate-failed', error: catalogFailureMessage(phase), phase });
      } finally {
        window.clearTimeout(timeout);
        if (catalogControllerRef.current === controller) catalogControllerRef.current = null;
      }
    },
    [sessionId],
  );

  const apply = useCallback(
    async (operation: RuntimeOperation): Promise<RuntimeControlResponse | null> => {
      const current = runtimeRef.current;
      // Only mutate from a settled, host-confirmed state with a known revision.
      if (
        mutationInFlightRef.current ||
        current.status !== 'ready' ||
        current.state === null ||
        current.deliveryUnknown
      ) {
        return null;
      }
      if (
        operation.type === 'set_model' &&
        current.state.streaming &&
        !current.canSetModelWhileStreaming
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
      const timeout = window.setTimeout(() => controller.abort(), 8_000);
      dispatch({ type: 'control-start', operation });
      try {
        const response = await controlRuntime(
          sessionId,
          expectedRevision,
          operation,
          expectedCatalogRevision,
          controller.signal,
        );
        if (generation !== authorityGenerationRef.current) return null;
        dispatch({ type: 'control-settled', response });
        return response;
      } catch (error) {
        if (generation !== authorityGenerationRef.current) return null;
        const response: RuntimeControlResponse = {
          outcome: { status: 'unavailable', reasonCode: 'runtime_unavailable' },
        };
        dispatch({
          type: 'control-settled',
          response,
        });
        return response;
      } finally {
        window.clearTimeout(timeout);
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
    };
  }, [refresh]);

  return { runtime, refresh, setModel, setThinkingLevel, setMode };
}

function catalogFailurePhase(error: unknown): 'offline' | 'unreachable' | 'access_denied' {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'access_denied'
  ) {
    return 'access_denied';
  }
  return 'unreachable';
}

function catalogFailureMessage(phase: 'offline' | 'unreachable' | 'access_denied'): string {
  switch (phase) {
    case 'offline':
      return 'You’re offline. Catalog browsing is read-only.';
    case 'access_denied':
      return 'Access expired. Reconnect to load runtime data.';
    default:
      return 'The host is unreachable. Try a read-only refresh.';
  }
}

function runtimeReasonMessage(reasonCode: string): string {
  const messages: Readonly<Record<string, string>> = {
    stale_revision: 'The host runtime changed. Refresh and choose again.',
    stale_catalog: 'The model catalog changed. Refresh and choose again.',
    unsupported_operation: 'This runtime operation is not supported.',
    runtime_unavailable: 'The host runtime is unavailable.',
    model_unavailable: 'That model is no longer available.',
    tier_locked: 'That model is unavailable for the active account tier.',
    policy_blocked: 'The host policy blocked this model.',
    streaming_active: 'Model switching is unavailable during the current turn.',
    host_rejected: 'The host rejected the model change.',
    delivery_unknown: 'The outcome is unknown. Refresh before trying another change.',
  };
  return messages[reasonCode] ?? 'The runtime request could not be completed.';
}
