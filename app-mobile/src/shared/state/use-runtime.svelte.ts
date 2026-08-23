// ───────────────────────────────────────────────────────────────────
// MODULE: Non-Optimistic Runtime Control State Machine (Svelte runes)
// ───────────────────────────────────────────────────────────────────
// Runes port of the React `useRuntime` hook. The host-confirmed snapshot,
// Pending intent, and bounded issue state stay separate; every generation
// Guard, synchronous mutation lock, and coalescing branch is preserved
// Verbatim. `$state` writes are synchronous, so the React `runtimeRef`
// Shadow and `refreshRef` self-reference collapse: every `dispatch(action)`
// Becomes `runtime = runtimeReducer(runtime, action)` and the retry/reconcile
// Re-entry calls the stable `refresh` closure directly.

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
  // Synchronous lock: set before dispatch, so a same-tick double tap can never
  // Reach the transport twice.
  let mutationInFlight = false;
  let refreshInFlight = false;
  let refreshQueued: RefreshReason | null = null;
  let retryTimer: number | null = null;

  // ───────────────────────────────────────────────────────────────────
  // 3. READ-ONLY HYDRATE
  // ───────────────────────────────────────────────────────────────────

  const refresh = async (reason: RefreshReason = 'manual'): Promise<void> => {
    // Concurrent triggers coalesce: one read-only hydrate at a time, latest
    // Reason wins.
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
    // React may not commit this dispatch before a same-tick control event;
    // Keep the imperative mutation boundary fail-closed until that render.
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
      // An unmount or superseding refresh cancels silently; a deadline abort is
      // A real failure and surfaces as host-unavailable.
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
        // Honor the bounded Retry-After with one read-only reconcile; a new
        // Mutation still requires a fresh deliberate selection.
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
    // Streaming sends zero tickets and zero mutations; model switching stays
    // Gated by the host's advertised capability.
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
    // Cross-browser delivery deadline: unresolved delivery becomes
    // Delivery-unknown — no ticket is replayed and nothing is retried.
    const deadline = window.setTimeout(() => controller.abort(), MUTATION_DEADLINE_MS);
    runtime = runtimeReducer(runtime, { type: 'control-start', operation });
    try {
      // Mode switches ride the dedicated plan-control lane with their own
      // One-use ticket and expected-runtime-revision guard; they never mix
      // With prompt traffic or the generic runtime lane in production.
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
        // One read-only reconcile; the original mutation is never retried.
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
