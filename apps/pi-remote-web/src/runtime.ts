// ───────────────────────────────────────────────────────────────────
// MODULE: Non-Optimistic Runtime Control State
// ───────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useReducer } from 'react';

import type {
  AvailableModelDto,
  RuntimeControlResponse,
  RuntimeModelCatalogDto,
  RuntimeOperation,
  RuntimeStateDto,
} from '@pi-remote/pi-rpc-protocol';

import { controlRuntime, fetchRuntimeModels, fetchRuntimeState } from './relay.js';

export type RuntimeStatus = 'checking' | 'ready' | 'pending' | 'stale' | 'error';

export interface RuntimeUiState {
  readonly status: RuntimeStatus;
  readonly state: RuntimeStateDto | null;
  readonly models: readonly AvailableModelDto[];
  readonly catalogRevision: number | null;
  readonly canSetModelWhileStreaming: boolean;
  readonly pending: RuntimeOperation | null;
  readonly error: string | null;
  readonly deliveryUnknown: boolean;
}

export const INITIAL_RUNTIME_STATE: RuntimeUiState = {
  status: 'checking',
  state: null,
  models: [],
  catalogRevision: null,
  canSetModelWhileStreaming: false,
  pending: null,
  error: null,
  deliveryUnknown: false,
};

export type RuntimeAction =
  | { readonly type: 'checking' }
  | {
      readonly type: 'hydrated';
      readonly state: RuntimeStateDto;
      readonly models: RuntimeModelCatalogDto;
    }
  | { readonly type: 'hydrate-failed'; readonly error: string }
  | { readonly type: 'control-start'; readonly operation: RuntimeOperation }
  | { readonly type: 'control-settled'; readonly response: RuntimeControlResponse };

// The browser may show a pending intent but never an optimistic committed value.
// `state` therefore only ever changes to a value Pi has confirmed — on hydrate,
// on an accepted mutation, or to the host's current value on a stale rejection.
export function runtimeReducer(current: RuntimeUiState, action: RuntimeAction): RuntimeUiState {
  switch (action.type) {
    case 'checking':
      return { ...current, status: 'checking', pending: null, error: null, deliveryUnknown: false };
    case 'hydrated':
      return {
        status: 'ready',
        state: action.state,
        models: action.models.models,
        catalogRevision: action.models.catalogRevision,
        canSetModelWhileStreaming: action.models.canSetModelWhileStreaming,
        pending: null,
        error: null,
        deliveryUnknown: false,
      };
    case 'hydrate-failed':
      return { ...current, status: 'error', error: action.error };
    case 'control-start':
      // No state mutation here — the chosen control shows pending, nothing commits.
      return {
        ...current,
        status: 'pending',
        pending: action.operation,
        error: null,
        deliveryUnknown: false,
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
      };
    case 'delivery-unknown':
      // Terminal: reconcile before any retry; never auto-repeat the mutation.
      return {
        ...current,
        status: 'error',
        pending: null,
        error: runtimeReasonMessage(outcome.reasonCode),
        deliveryUnknown: true,
      };
    default:
      return current;
  }
}

export interface RuntimeControls {
  readonly runtime: RuntimeUiState;
  readonly refresh: () => Promise<void>;
  readonly setModel: (provider: string, modelId: string) => Promise<void>;
  readonly setThinkingLevel: (level: string) => Promise<void>;
  readonly setMode: (mode: 'build' | 'plan') => Promise<void>;
}

/** Host-authoritative runtime controls for one session; disabled outside `ready`. */
export function useRuntime(sessionId: string): RuntimeControls {
  const [runtime, dispatch] = useReducer(runtimeReducer, INITIAL_RUNTIME_STATE);

  const refresh = useCallback(async () => {
    dispatch({ type: 'checking' });
    try {
      const [state, models] = await Promise.all([fetchRuntimeState(), fetchRuntimeModels()]);
      dispatch({ type: 'hydrated', state, models });
    } catch (error) {
      dispatch({ type: 'hydrate-failed', error: messageOf(error) });
    }
  }, []);

  const apply = useCallback(
    async (operation: RuntimeOperation) => {
      // Only mutate from a settled, host-confirmed state with a known revision.
      if (runtime.status !== 'ready' || runtime.state === null) {
        return;
      }
      const expectedRevision = runtime.state.revision;
      const expectedCatalogRevision =
        operation.type === 'set_model' ? (runtime.catalogRevision ?? undefined) : undefined;
      if (operation.type === 'set_model' && expectedCatalogRevision === undefined) return;
      dispatch({ type: 'control-start', operation });
      try {
        const response = await controlRuntime(
          sessionId,
          expectedRevision,
          operation,
          expectedCatalogRevision,
        );
        dispatch({ type: 'control-settled', response });
      } catch (error) {
        dispatch({
          type: 'control-settled',
          response: { outcome: { status: 'unavailable', reasonCode: 'runtime_unavailable' } },
        });
      }
    },
    [runtime.status, runtime.state, runtime.catalogRevision, sessionId],
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
    void refresh();
  }, [refresh]);

  return { runtime, refresh, setModel, setThinkingLevel, setMode };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
