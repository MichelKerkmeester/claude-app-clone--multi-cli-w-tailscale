// ───────────────────────────────────────────────────────────────────
// MODULE: Non-Optimistic Runtime Control State Machine (Svelte runes)
// ───────────────────────────────────────────────────────────────────
// Runes port of `useRuntime`; synchronous `$state` collapses ref shadowing into direct reducer dispatch.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { RuntimeControlResponse, RuntimeOperation } from '@pi-remote/pi-rpc-protocol';

import { untrack } from 'svelte';
import * as relay from '../transport/relay.js';
import {
  BLOCKED_MUTATION_PHASES,
  HYDRATE_TIMEOUT_MS,
  INITIAL_RUNTIME_STATE,
  MUTATION_DEADLINE_MS,
  hydrateSnapshot,
  planExecutionTransport,
  runtimeIssueFrom,
  runtimeReducer,
  type RefreshReason,
  type RuntimeControls,
  type RuntimeUiState,
} from './runtime.js';

/** Host-authoritative runtime controls for one session. */
export function useRuntime(getSessionId: () => string): RuntimeControls {
  // ───────────────────────────────────────────────────────────────────
  // 2. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let runtime = $state<RuntimeUiState>(INITIAL_RUNTIME_STATE);
  let catalogController: AbortController | null = null;
  let mutationController: AbortController | null = null;
  let authorityGeneration = 0;
  // Same-tick double tap cannot reach transport twice.
  let mutationInFlight = false;
  let refreshInFlight = false;
  let refreshQueued: RefreshReason | null = null;
  let retryTimer: number | null = null;

  // ───────────────────────────────────────────────────────────────────
  // 3. READ-ONLY HYDRATE
  // ───────────────────────────────────────────────────────────────────

  const refresh = async (reason: RefreshReason = 'manual'): Promise<void> => {
    // Coalesce concurrent hydrates; latest reason wins.
    if (refreshInFlight) {
      refreshQueued = reason;
      return;
    }
    refreshInFlight = true;
    const generation = authorityGeneration + 1;
    authorityGeneration = generation;
    catalogController?.abort();
    const controller = new AbortController();
    catalogController = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, HYDRATE_TIMEOUT_MS);
    const checkingPhase =
      reason === 'initial' && runtime.models.length === 0 ? 'opening' : 'refreshing';
    // Fail-closed mutation boundary until this dispatch is applied.
    runtime = runtimeReducer(runtime, {
      type: 'checking',
      phase: checkingPhase,
    });
    try {
      const hydration = await hydrateSnapshot(getSessionId(), controller.signal);
      if (controller.signal.aborted || generation !== authorityGeneration) return;
      if (hydration.snapshot.sessionId !== getSessionId()) {
        runtime = runtimeReducer(runtime, {
          type: 'hydrate-failed',
          issueCode: 'invalid-response',
          retryAfterMs: null,
        });
        return;
      }
      runtime = runtimeReducer(runtime, {
        type: 'hydrated',
        state: hydration.snapshot.state,
        models: hydration.snapshot.models,
        planBinding: hydration.planBinding,
      });
    } catch (error: unknown) {
      if (generation !== authorityGeneration) return;
      // Superseding refresh/unmount is silent; deadline abort is host-unavailable.
      if (controller.signal.aborted && !timedOut) return;
      const relayIssue = runtimeIssueFrom(error);
      const issueCode =
        relayIssue !== null
          ? relayIssue.code
          : typeof navigator !== 'undefined' && !navigator.onLine
            ? 'offline'
            : 'host-unavailable';
      const retryAfterMs = relayIssue?.retryAfterMs ?? null;
      runtime = runtimeReducer(runtime, { type: 'hydrate-failed', issueCode, retryAfterMs });
      if (issueCode === 'rate-limited' && retryAfterMs !== null && retryAfterMs > 0) {
        // One bounded reconcile on rate-limit; mutations still need a fresh deliberate action.
        if (retryTimer !== null) window.clearTimeout(retryTimer);
        retryTimer = window.setTimeout(() => {
          retryTimer = null;
          void refresh('reconcile');
        }, retryAfterMs);
      }
    } finally {
      window.clearTimeout(timeout);
      if (catalogController === controller) catalogController = null;
      refreshInFlight = false;
      const queued = refreshQueued;
      refreshQueued = null;
      if (queued !== null) void refresh(queued);
    }
  };

  // ───────────────────────────────────────────────────────────────────
  // 4. MUTATION DISPATCH
  // ───────────────────────────────────────────────────────────────────

  const apply = async (operation: RuntimeOperation): Promise<RuntimeControlResponse | null> => {
    const current = runtime;
    if (
      mutationInFlight ||
      BLOCKED_MUTATION_PHASES.has(current.phase ?? 'checking') ||
      current.state === null ||
      current.deliveryUnknown
    ) {
      return null;
    }
    // While streaming, only host-gated model switch may mutate.
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
    const generation = authorityGeneration + 1;
    authorityGeneration = generation;
    mutationInFlight = true;
    const controller = new AbortController();
    mutationController = controller;
    // Unresolved delivery past deadline becomes delivery-unknown — no replay or retry.
    const deadline = window.setTimeout(() => controller.abort(), MUTATION_DEADLINE_MS);
    runtime = runtimeReducer(runtime, { type: 'control-start', operation });
    try {
      // Mode switches use the dedicated plan-control lane, not generic runtime traffic.
      const response =
        operation.type === 'set_mode'
          ? await relay.setMode(getSessionId(), expectedRevision, operation.mode, controller.signal)
          : await relay.controlRuntime(
              getSessionId(),
              expectedRevision,
              operation,
              expectedCatalogRevision,
              controller.signal,
            );
      if (generation !== authorityGeneration) return null;
      runtime = runtimeReducer(runtime, { type: 'control-settled', response });
      if (response.outcome.status === 'stale' || response.outcome.status === 'unsupported') {
        // Reconcile only; never retry the original mutation.
        void refresh('reconcile');
      }
      return response;
    } catch {
      if (generation !== authorityGeneration) return null;
      const response: RuntimeControlResponse = {
        outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' },
      };
      runtime = runtimeReducer(runtime, { type: 'control-settled', response });
      return response;
    } finally {
      window.clearTimeout(deadline);
      mutationInFlight = false;
      if (mutationController === controller) mutationController = null;
    }
  };

  // ───────────────────────────────────────────────────────────────────
  // 5. CONTROL WRAPPERS
  // ───────────────────────────────────────────────────────────────────

  const setModel = (provider: string, modelId: string): Promise<RuntimeControlResponse | null> =>
    apply({ type: 'set_model', provider, modelId });
  const setThinkingLevel = (level: string): Promise<RuntimeControlResponse | null> =>
    apply({ type: 'set_thinking_level', level });
  const setMode = (mode: 'build' | 'plan'): Promise<RuntimeControlResponse | null> =>
    apply({ type: 'set_mode', mode });

  // ───────────────────────────────────────────────────────────────────
  // 6. PLAN REVIEW AND EXECUTION
  // ───────────────────────────────────────────────────────────────────

  const openPlanReview = (): boolean => {
    const current = runtime;
    const next = runtimeReducer(current, { type: 'review-open' });
    if (next === current) return false;
    runtime = next;
    return true;
  };

  const dismissPlanReview = (): void => {
    runtime = runtimeReducer(runtime, { type: 'review-dismiss' });
  };

  const invalidatePlan = (validity: 'superseded' | 'invalid'): void => {
    runtime = runtimeReducer(runtime, { type: 'plan-invalidated', validity });
  };

  const executePlan = async (
    selectedApproachId?: string,
  ): Promise<RuntimeControlResponse | null> => {
    const current = runtime;
    const reviewed = current.reviewedPlan ?? null;
    if (
      mutationInFlight ||
      current.state === null ||
      current.state.mode !== 'plan' ||
      current.state.streaming ||
      current.deliveryUnknown ||
      current.planLive !== true ||
      current.executePending === true ||
      reviewed === null
    ) {
      return null;
    }
    const transport = planExecutionTransport();
    if (transport === null) return null;
    const generation = authorityGeneration + 1;
    authorityGeneration = generation;
    mutationInFlight = true;
    const controller = new AbortController();
    mutationController = controller;
    const deadline = window.setTimeout(() => controller.abort(), MUTATION_DEADLINE_MS);
    runtime = runtimeReducer(current, { type: 'execute-start' });
    try {
      const response = await transport(
        getSessionId(),
        current.state.revision,
        reviewed.artifact.planId,
        reviewed.artifact.planRevision,
        reviewed.planToken,
        selectedApproachId,
        controller.signal,
      );
      if (generation !== authorityGeneration) return null;
      runtime = runtimeReducer(runtime, { type: 'control-settled', response });
      return response;
    } catch {
      if (generation !== authorityGeneration) return null;
      const response: RuntimeControlResponse = {
        outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' },
      };
      runtime = runtimeReducer(runtime, { type: 'control-settled', response });
      return response;
    } finally {
      window.clearTimeout(deadline);
      mutationInFlight = false;
      if (mutationController === controller) mutationController = null;
    }
  };

  // ───────────────────────────────────────────────────────────────────
  // 7. LIFECYCLE
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    getSessionId();
    untrack(() => void refresh('initial'));
    return () => {
      authorityGeneration += 1;
      catalogController?.abort();
      mutationController?.abort();
      if (retryTimer !== null) window.clearTimeout(retryTimer);
    };
  });

  // ───────────────────────────────────────────────────────────────────
  // 8. PUBLIC CONTROLS
  // ───────────────────────────────────────────────────────────────────

  return {
    get runtime() {
      return runtime;
    },
    refresh,
    setModel,
    setThinkingLevel,
    setMode,
    openPlanReview,
    dismissPlanReview,
    invalidatePlan,
    executePlan,
  };
}
