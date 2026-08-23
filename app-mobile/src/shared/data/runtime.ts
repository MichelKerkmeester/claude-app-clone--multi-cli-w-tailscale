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

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import {
  RUNTIME_ISSUE_CODES,
  type AvailableModelDto,
  type RuntimeControlResponse,
  type RuntimeModelCatalogDto,
  type RuntimeOperation,
  type RuntimeSnapshotDto,
  type RuntimeStateDto,
  type PlanArtifactDto,
} from '@pi-remote/pi-rpc-protocol';

import * as relay from './relay.js';
import { runtimeIssueMessage, type RuntimeIssueCode } from './runtime-issues.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type RuntimeStatus = 'checking' | 'ready' | 'pending' | 'stale' | 'error';

// ── Plan-mode authority projection ────────────────────────────────────────────
// The browser models mode authority as INDEPENDENT fields, never one `isPlan`
// flag: the host-confirmed mode, the client's pending transition intent, the
// delivery verdict, the structured plan phase, the host runtime revision, and
// the turn state each come from a different source and fail closed separately.

/** The host-confirmed mode. Only a host snapshot can move this value. */
export type ConfirmedMode = 'build' | 'plan' | 'executing-plan' | 'unknown';

/** Client-side mode transition intent; never committed, always host-confirmed. */
export type ModeTransition = 'entering-plan' | 'leaving-plan' | null;

/** Whether the last mode mutation's delivery is known. */
export type ModeDelivery = 'settled' | 'unknown';

/** The structured plan lifecycle phase derived from the host snapshot. */
export type PlanPhase = 'none' | 'drafting' | 'ready' | 'superseded';

export type TurnState = 'idle' | 'running';

/** The opaque host binding is deliberately held only in this live runtime object. */
export interface RuntimePlanBinding {
  readonly planId: string;
  readonly planRevision: number;
  readonly runtimeRevision: number;
  readonly planToken: string;
}

export interface ReviewedPlan {
  readonly artifact: PlanArtifactDto;
  readonly planToken: string;
}

export interface ModeAuthority {
  readonly confirmedMode: ConfirmedMode;
  readonly transition: ModeTransition;
  readonly delivery: ModeDelivery;
  readonly planPhase: PlanPhase;
  readonly runtimeRevision: number | null;
  readonly turnState: TurnState;
}

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
  /** Current live artifact only; history is token-free and never executable. */
  readonly planArtifact?: PlanArtifactDto | null;
  readonly planLive?: boolean;
  readonly planToken?: string | null;
  readonly planHistory?: readonly PlanArtifactDto[];
  readonly reviewOpen?: boolean;
  readonly reviewedPlan?: ReviewedPlan | null;
  readonly executePending?: boolean;
  readonly executionError?: string | null;
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
  planArtifact: null,
  planLive: false,
  planToken: null,
  planHistory: [],
  reviewOpen: false,
  reviewedPlan: null,
  executePending: false,
  executionError: null,
};

// ───────────────────────────────────────────────────────────────────
// 3. REDUCER ACTIONS
// ───────────────────────────────────────────────────────────────────

export type RuntimeAction =
  | { readonly type: 'checking'; readonly phase: 'opening' | 'refreshing' }
  | {
      readonly type: 'hydrated';
      readonly state: RuntimeStateDto;
      readonly models: RuntimeModelCatalogDto;
      readonly planBinding?: RuntimePlanBinding | null;
    }
  | {
      readonly type: 'hydrate-failed';
      readonly issueCode: RuntimeIssueCode;
      readonly retryAfterMs: number | null;
    }
  | { readonly type: 'control-start'; readonly operation: RuntimeOperation }
  | { readonly type: 'control-settled'; readonly response: RuntimeControlResponse }
  | {
      readonly type: 'plan-event';
      readonly artifact: PlanArtifactDto | null;
      readonly planToken?: string | null;
      readonly live: boolean;
    }
  | { readonly type: 'plan-invalidated'; readonly validity: 'superseded' | 'invalid' }
  | { readonly type: 'review-open' }
  | { readonly type: 'review-dismiss' }
  | { readonly type: 'execute-start' };

// ───────────────────────────────────────────────────────────────────
// 4. CORE REDUCER
// ───────────────────────────────────────────────────────────────────

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
      return hydrate(current, action.state, action.models, action.planBinding);
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
        ...(action.operation.type === 'set_mode' && action.operation.mode === 'build'
          ? clearExecutablePlan(current)
          : {}),
      };
    case 'control-settled':
      return settle(current, action.response);
    case 'plan-event':
      return applyPlanEvent(current, action.artifact, action.planToken, action.live);
    case 'plan-invalidated':
      return invalidatePlan(current, action.validity);
    case 'review-open':
      return openPlanReview(current);
    case 'review-dismiss':
      return dismissPlanReview(current);
    case 'execute-start':
      return startPlanExecution(current);
    default:
      return current;
  }
}

function hydrate(
  current: RuntimeUiState,
  state: RuntimeStateDto,
  models: RuntimeModelCatalogDto,
  planBinding?: RuntimePlanBinding | null,
): RuntimeUiState {
  // A mutation in flight keeps the machine pending; confirmed data still updates.
  const plan = hydratePlan(current, state, planBinding);
  const phase =
    current.pending === null && current.executePending !== true
      ? derivedReadyPhase(state, models)
      : 'pending';
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
    ...plan,
  };
}

function settle(current: RuntimeUiState, response: RuntimeControlResponse): RuntimeUiState {
  const outcome = response.outcome;
  switch (outcome.status) {
    case 'accepted':
      // The check moves only when the accepted response supplies the new host state.
      const acceptedExecution = current.executePending === true;
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
        ...(acceptedExecution ? clearExecutablePlan(current) : {}),
        executePending: false,
        executionError: null,
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
        ...(current.executePending === true ? clearExecutablePlan(current) : {}),
        executePending: false,
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
        ...(current.executePending === true ? clearExecutablePlan(current) : {}),
        executePending: false,
        executionError: runtimeIssueMessage('unsupported'),
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
        ...(current.executePending === true ? clearExecutablePlan(current) : {}),
        executePending: false,
        executionError: runtimeIssueMessage('delivery-unknown'),
      };
    default:
      return current;
  }
}

// ───────────────────────────────────────────────────────────────────
// 5. PLAN LIFECYCLE HANDLERS
// ───────────────────────────────────────────────────────────────────

function hydratePlan(
  current: RuntimeUiState,
  state: RuntimeStateDto,
  binding?: RuntimePlanBinding | null,
): Pick<
  RuntimeUiState,
  'planArtifact' | 'planLive' | 'planToken' | 'planHistory' | 'reviewOpen' | 'reviewedPlan'
> {
  const snapshot = state.plan;
  if (snapshot === undefined || snapshot.artifact === null) {
    const validity =
      snapshot?.validity === 'superseded' || snapshot?.validity === 'invalid'
        ? snapshot.validity
        : 'none';
    return clearExecutablePlan(current, validity);
  }
  if (snapshot.validity !== 'valid') {
    const cleared = clearExecutablePlan(current, snapshot.validity);
    return {
      ...cleared,
      planHistory: appendPlanHistory(cleared.planHistory ?? [], snapshot.artifact),
    };
  }

  const previous = current.planArtifact ?? null;
  if (previous !== null && snapshot.artifact.planRevision < previous.planRevision) {
    return {
      ...clearExecutablePlan(current),
      planHistory: current.planHistory ?? [],
    };
  }

  const sameRevision =
    previous !== null &&
    previous.planId === snapshot.artifact.planId &&
    previous.planRevision === snapshot.artifact.planRevision;
  const token =
    binding !== undefined &&
    binding !== null &&
    binding.planId === snapshot.artifact.planId &&
    binding.planRevision === snapshot.artifact.planRevision &&
    binding.runtimeRevision === state.revision
      ? binding.planToken
      : sameRevision
        ? (current.planToken ?? null)
        : null;
  const live = state.mode === 'plan' && snapshot.validity === 'valid';
  const history =
    previous !== null && !sameRevision
      ? appendPlanHistory(current.planHistory ?? [], previous)
      : (current.planHistory ?? []);
  const reviewedCurrent = current.reviewedPlan ?? null;
  const reviewed =
    sameRevision && reviewedCurrent !== null && token !== null ? reviewedCurrent : null;
  return {
    planArtifact: snapshot.validity === 'valid' ? snapshot.artifact : null,
    planLive: live,
    planToken: live ? token : null,
    planHistory: history,
    reviewOpen: reviewed === null ? false : current.reviewOpen === true,
    reviewedPlan: reviewed,
  };
}

function applyPlanEvent(
  current: RuntimeUiState,
  artifact: PlanArtifactDto | null,
  planToken: string | null | undefined,
  live: boolean,
): RuntimeUiState {
  if (artifact === null || artifact.validity !== 'valid') {
    const validity =
      artifact?.validity === 'superseded' || artifact?.validity === 'invalid'
        ? artifact.validity
        : 'none';
    return { ...current, ...clearExecutablePlan(current, validity) };
  }
  const previous = current.planArtifact ?? null;
  if (previous !== null && artifact.planRevision < previous.planRevision) {
    return { ...current, ...clearExecutablePlan(current) };
  }
  const sameRevision =
    previous !== null &&
    previous.planId === artifact.planId &&
    previous.planRevision === artifact.planRevision;
  const history =
    previous !== null && !sameRevision
      ? appendPlanHistory(current.planHistory ?? [], previous)
      : (current.planHistory ?? []);
  const nextLive = live && artifact.validity === 'valid';
  return {
    ...current,
    planArtifact: artifact,
    planLive: nextLive,
    planToken: nextLive ? (planToken ?? (sameRevision ? (current.planToken ?? null) : null)) : null,
    planHistory: history,
    reviewOpen: sameRevision ? current.reviewOpen === true : false,
    reviewedPlan: sameRevision ? (current.reviewedPlan ?? null) : null,
  };
}

function invalidatePlan(
  current: RuntimeUiState,
  validity: 'superseded' | 'invalid',
): RuntimeUiState {
  return {
    ...current,
    ...clearExecutablePlan(current, validity),
    executePending: false,
    executionError: null,
  };
}

function openPlanReview(current: RuntimeUiState): RuntimeUiState {
  if (
    current.planLive !== true ||
    current.planArtifact === null ||
    current.planArtifact === undefined ||
    current.planArtifact.validity !== 'valid' ||
    current.planToken === null ||
    current.planToken === undefined ||
    current.executePending === true
  ) {
    return current;
  }
  return {
    ...current,
    reviewOpen: true,
    reviewedPlan: { artifact: current.planArtifact, planToken: current.planToken },
    executionError: null,
  };
}

function dismissPlanReview(current: RuntimeUiState): RuntimeUiState {
  return { ...current, reviewOpen: false, reviewedPlan: null };
}

function startPlanExecution(current: RuntimeUiState): RuntimeUiState {
  if (
    current.reviewOpen !== true ||
    current.reviewedPlan === null ||
    current.reviewedPlan === undefined ||
    current.planLive !== true ||
    current.executePending === true ||
    current.state?.mode !== 'plan' ||
    current.state.streaming
  ) {
    return current;
  }
  return {
    ...current,
    status: 'pending',
    phase: 'pending',
    executePending: true,
    executionError: null,
    error: null,
  };
}

function clearExecutablePlan(
  current: RuntimeUiState,
  validity: 'none' | 'superseded' | 'invalid' = 'superseded',
): Pick<
  RuntimeUiState,
  'planArtifact' | 'planLive' | 'planToken' | 'planHistory' | 'reviewOpen' | 'reviewedPlan'
> {
  const history =
    current.planArtifact === null || current.planArtifact === undefined
      ? (current.planHistory ?? [])
      : appendPlanHistory(current.planHistory ?? [], {
          ...current.planArtifact,
          validity: validity === 'none' ? current.planArtifact.validity : validity,
        });
  return {
    planArtifact: null,
    planLive: false,
    planToken: null,
    planHistory: history,
    reviewOpen: false,
    reviewedPlan: null,
  };
}

function appendPlanHistory(
  history: readonly PlanArtifactDto[],
  artifact: PlanArtifactDto,
): readonly PlanArtifactDto[] {
  const withoutDuplicate = history.filter(
    (item) => !(item.planId === artifact.planId && item.planRevision === artifact.planRevision),
  );
  return [...withoutDuplicate, artifact].slice(-20);
}

// ───────────────────────────────────────────────────────────────────
// 6. PHASE AND AUTHORITY PROJECTION
// ───────────────────────────────────────────────────────────────────

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

/**
 * The one authority projection every mode surface reads. Everything is
 * derived straight from the committed host snapshot and the pending intent;
 * no optimistic value can leak in because `state` only ever changes to a
 * value the host confirmed.
 */
export function modeAuthority(runtime: RuntimeUiState): ModeAuthority {
  const state = runtime.state;
  const transition: ModeTransition =
    runtime.pending?.type === 'set_mode'
      ? runtime.pending.mode === 'plan'
        ? 'entering-plan'
        : 'leaving-plan'
      : null;
  return {
    confirmedMode: state?.mode ?? 'unknown',
    transition,
    delivery: runtime.deliveryUnknown ? 'unknown' : 'settled',
    planPhase:
      state?.plan !== undefined && state.plan.artifact !== null && state.plan.validity === 'valid'
        ? 'ready'
        : state?.plan?.validity === 'superseded'
          ? 'superseded'
          : 'none',
    runtimeRevision: state?.revision ?? null,
    turnState: state?.streaming === true ? 'running' : 'idle',
  };
}

// ───────────────────────────────────────────────────────────────────
// 7. CONTROL SURFACE CONTRACT
// ───────────────────────────────────────────────────────────────────

export type RefreshReason =
  'initial' | 'open' | 'foreground' | 'manual' | 'online' | 'live' | 'reconcile';

export interface RuntimeControls {
  readonly runtime: RuntimeUiState;
  readonly refresh: (reason?: RefreshReason) => Promise<void>;
  readonly setModel: (provider: string, modelId: string) => Promise<RuntimeControlResponse | null>;
  readonly setThinkingLevel: (level: string) => Promise<RuntimeControlResponse | null>;
  readonly setMode: (mode: 'build' | 'plan') => Promise<RuntimeControlResponse | null>;
  readonly openPlanReview?: () => boolean;
  readonly dismissPlanReview?: () => void;
  readonly invalidatePlan?: (validity: 'superseded' | 'invalid') => void;
  readonly executePlan?: (selectedApproachId?: string) => Promise<RuntimeControlResponse | null>;
}

// The mutation lane fails closed outside settled ready authority. Streaming is
// deliberately absent: the host-gated model switch stays legal while streaming,
// and the streaming capability check below blocks everything else.
export const BLOCKED_MUTATION_PHASES: ReadonlySet<RuntimePhase> = new Set([
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

export const HYDRATE_TIMEOUT_MS = 8_000;
export const MUTATION_DEADLINE_MS = 10_000;

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
      return runtime.executePending === true
        ? 'Preparing reviewed plan…'
        : runtime.pending === null
          ? 'Working…'
          : 'Applying change…';
    case 'accepted':
      return runtime.state?.mode === 'executing-plan'
        ? 'Approved plan execution started.'
        : 'Runtime change accepted.';
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

// ───────────────────────────────────────────────────────────────────
// 8. HYDRATION AND TRANSPORT ADAPTERS
// ───────────────────────────────────────────────────────────────────

/**
 * Prefer the bounded reconcile snapshot; compose it from the two read-only
 * endpoints when the transport does not expose the reconcile function.
 */
interface RuntimeHydration {
  readonly snapshot: RuntimeSnapshotDto;
  readonly planBinding: RuntimePlanBinding | null;
}

export async function hydrateSnapshot(sessionId: string, signal: AbortSignal): Promise<RuntimeHydration> {
  const reconcileTransport = snapshotTransport();
  const snapshot =
    reconcileTransport !== null
      ? await reconcileTransport(signal)
      : await (async () => {
          const [state, models] = await Promise.all([
            relay.fetchRuntimeState(signal),
            relay.fetchRuntimeModels(signal),
          ]);
          return { sessionId: state.sessionId, state, models };
        })();
  const planBinding = await fetchLivePlanBinding(sessionId, snapshot, signal);
  return { snapshot, planBinding };
}

async function fetchLivePlanBinding(
  sessionId: string,
  snapshot: RuntimeSnapshotDto,
  signal: AbortSignal,
): Promise<RuntimePlanBinding | null> {
  const transport = planBindingTransport();
  const plan = snapshot.state.plan;
  if (
    transport === null ||
    plan === undefined ||
    plan.artifact === null ||
    plan.validity !== 'valid' ||
    snapshot.state.mode !== 'plan' ||
    snapshot.state.streaming
  ) {
    return null;
  }
  try {
    return await transport(
      sessionId,
      snapshot.state.revision,
      plan.artifact.planId,
      plan.artifact.planRevision,
      signal,
    );
  } catch {
    return null;
  }
}

function planBindingTransport():
  | ((
      sessionId: string,
      expectedRuntimeRevision: number,
      planId: string,
      expectedPlanRevision: number,
      signal: AbortSignal,
    ) => Promise<RuntimePlanBinding>)
  | null {
  try {
    const candidate = (relay as { fetchPlanBinding?: unknown }).fetchPlanBinding;
    return typeof candidate === 'function'
      ? (candidate as (
          sessionId: string,
          expectedRuntimeRevision: number,
          planId: string,
          expectedPlanRevision: number,
          signal: AbortSignal,
        ) => Promise<RuntimePlanBinding>)
      : null;
  } catch {
    return null;
  }
}

export function planExecutionTransport():
  | ((
      sessionId: string,
      expectedRuntimeRevision: number,
      planId: string,
      expectedPlanRevision: number,
      planToken: string,
      selectedApproachId: string | undefined,
      signal: AbortSignal,
    ) => Promise<RuntimeControlResponse>)
  | null {
  try {
    const candidate = (relay as { executePlan?: unknown }).executePlan;
    return typeof candidate === 'function'
      ? (candidate as (
          sessionId: string,
          expectedRuntimeRevision: number,
          planId: string,
          expectedPlanRevision: number,
          planToken: string,
          selectedApproachId: string | undefined,
          signal: AbortSignal,
        ) => Promise<RuntimeControlResponse>)
      : null;
  } catch {
    return null;
  }
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

// ───────────────────────────────────────────────────────────────────
// 9. ISSUE NORMALIZATION
// ───────────────────────────────────────────────────────────────────

interface RelayIssueShape {
  readonly code: RuntimeIssueCode;
  readonly retryAfterMs: number | null;
}

/**
 * Only an allowlisted issue code on a thrown error may drive issue state.
 * The shape is validated rather than the class so every transport normalizes
 * identically; retry metadata stays clamped to the bounded window.
 */
export function runtimeIssueFrom(error: unknown): RelayIssueShape | null {
  if (typeof error !== 'object' || error === null) return null;
  const candidate = error as { readonly issueCode?: unknown; readonly retryAfterMs?: unknown };
  if (typeof candidate.issueCode !== 'string') return null;
  if (!(RUNTIME_ISSUE_CODES as readonly string[]).includes(candidate.issueCode)) return null;
  const raw = candidate.retryAfterMs;
  const retryAfterMs =
    typeof raw === 'number' && Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 60_000) : null;
  return { code: candidate.issueCode as RuntimeIssueCode, retryAfterMs };
}
