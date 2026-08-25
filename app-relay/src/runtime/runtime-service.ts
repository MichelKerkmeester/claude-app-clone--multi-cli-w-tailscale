// ───────────────────────────────────────────────────────────────────
// MODULE: Authoritative Runtime Control Service
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type {
  MediaPolicyDto,
  PiRpcCommand,
  PiRpcResponse,
  PlanControlCommand,
  PlanControlResponse,
  PlanSnapshotDto,
  RuntimeControlCommand,
  RuntimeControlResponse,
  RuntimeControlReasonCode,
  RuntimeIssueCode,
  RuntimeMediaCapabilityDto,
  RuntimeModelTicketRequest,
  RuntimeMode,
  RuntimeModelCatalogDto,
  RuntimeOperation,
  RuntimeSnapshotDto,
  RuntimeStateDto,
  SetModeCommand,
  ExecutePlanCommand,
} from '@pi-remote/pi-rpc-protocol';
import {
  DEFAULT_MEDIA_POLICY,
  isRuntimeSnapshotDto,
  isRuntimeStateDto,
} from '@pi-remote/pi-rpc-protocol';

import type { RpcSupervisor } from '../rpc/supervisor.js';
import {
  projectPlanSnapshot,
  projectRuntimeModelCatalog,
  projectRuntimeSnapshot,
  projectRuntimeState,
  projectRuntimeThinkingLevels,
} from '../store/redaction.js';

import {
  isPlanArtifactPublication,
  isPlanExtensionError,
  parsePlanArtifact,
  parsePlanStatus,
  type ParsedPlanArtifact,
} from './plan-status.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const IDEMPOTENCY_CAP = 256;
const MODE_CONFIRM_TIMEOUT_MS = 4_000;

// ───────────────────────────────────────────────────────────────────
// 3. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface RuntimeServiceOptions {
  readonly sessionId: string;
  readonly now?: () => number;
  readonly mediaEnabled?: boolean;
  readonly mediaPolicy?: MediaPolicyDto;
}

export interface LivePlanBinding {
  readonly sessionId: string;
  readonly planId: string;
  readonly planRevision: number;
  readonly runtimeRevision: number;
  readonly planToken: string;
}

interface ModeWaiter {
  readonly target: RuntimeMode;
  readonly resolve: () => void;
  readonly timer: NodeJS.Timeout;
}

type RuntimeValidationReason =
  | 'unsupported_operation'
  | 'model_unavailable'
  | 'tier_locked'
  | 'policy_blocked'
  | 'streaming_active';

/** A mutation the host delivered and explicitly rejected — never a delivery-unknown. */
// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

class HostRejectedError extends Error {
  public constructor(readonly reasonCode: 'policy_blocked' | 'host_rejected') {
    super(reasonCode);
  }
}

export class RuntimeIssueError extends Error {
  public constructor(readonly issueCode: RuntimeIssueCode) {
    super(issueCode);
    this.name = 'RuntimeIssueError';
  }
}

/** Mirrors host-confirmed runtime state; delivery-unknown is terminal until reconcile. */
export class RuntimeService {
  private revision = 0;
  private catalogRevision = 0;
  private planRevision = 0;
  private currentState: RuntimeStateDto | null = null;
  private modelCatalog: RuntimeModelCatalogDto | null = null;
  private mode: RuntimeMode = 'unknown';
  private planArtifact: ParsedPlanArtifact | null = null;
  private planArtifactOccurredAt: string | null = null;
  private availableThinkingLevels: readonly string[] = [];
  private live = false;
  private hydration: Promise<RuntimeSnapshotDto> | null = null;
  private lifecycleGeneration = 0;
  private mutationLane: Promise<unknown> = Promise.resolve();
  private readonly idempotency = new Map<string, RuntimeControlResponse>();
  private readonly planIdempotency = new Map<string, PlanControlResponse>();
  private modeWaiters: ModeWaiter[] = [];
  private readonly now: () => number;
  private readonly mediaEnabled: boolean;
  private readonly mediaPolicy: MediaPolicyDto;

  public constructor(
    private readonly supervisor: RpcSupervisor,
    private readonly options: RuntimeServiceOptions,
  ) {
    this.now = options.now ?? ((): number => Date.now());
    this.mediaEnabled = options.mediaEnabled === true;
    this.mediaPolicy = options.mediaPolicy ?? DEFAULT_MEDIA_POLICY;
    supervisor.onLifecycle((event) => {
      if (event.reason === 'exit' || event.reason === 'restart' || event.reason === 'failed') {
        this.lifecycleGeneration += 1;
        this.invalidateRuntime();
      }
    });
    supervisor.onEvent((event) => {
      const parsed = parsePlanStatus(event);
      if (parsed !== null) {
        this.mode = parsed;
        this.resolveModeWaiters();
        this.refreshModeProjection();
      }
      if (isPlanExtensionError(event)) {
        // Unhealthy extension never reads as Build until host republishes mode.
        this.mode = 'unknown';
        this.refreshModeProjection();
      }
      if (isPlanArtifactPublication(event)) {
        // Malformed plan publication drops the binding instead of guessing.
        const parsed = parsePlanArtifact(event);
        if (
          parsed !== null &&
          this.planArtifact !== null &&
          parsed.planId === this.planArtifact.planId &&
          parsed.planRevision < this.planArtifact.planRevision
        ) {
          return;
        }
        this.planArtifact = parsed;
        if (this.planArtifact !== null) {
          this.planRevision = this.planArtifact.planRevision;
          this.planArtifactOccurredAt = new Date(this.now()).toISOString();
        } else {
          this.planArtifactOccurredAt = null;
        }
        // Plan projection rides in state DTO without bumping runtime revision.
        this.refreshPlanProjection();
      }
    });
  }

  public getState(): RuntimeStateDto | null {
    return this.currentState;
  }

  public getModelCatalog(): RuntimeModelCatalogDto | null {
    return this.modelCatalog;
  }

  public getSnapshot(): RuntimeSnapshotDto | null {
    if (this.currentState === null || this.modelCatalog === null) return null;
    const snapshot = withMediaCapability(
      {
        sessionId: this.options.sessionId,
        state: this.currentState,
        models: this.modelCatalog,
      },
      this.mediaEnabled,
      this.mediaPolicy,
    );
    return isRuntimeSnapshotDto(snapshot) ? snapshot : null;
  }

  public getRevision(): number {
    return this.revision;
  }

  /** Opaque binding for live client pre-execution only; never in a runtime DTO. */
  public getPlanBinding(input: {
    readonly sessionId: string;
    readonly expectedRuntimeRevision: number;
    readonly planId: string;
    readonly expectedPlanRevision: number;
  }): LivePlanBinding | null {
    if (
      !this.live ||
      this.currentState === null ||
      this.currentState.sessionId !== input.sessionId ||
      this.currentState.revision !== input.expectedRuntimeRevision ||
      this.currentState.mode !== 'plan' ||
      this.mode !== 'plan' ||
      this.currentState.streaming ||
      this.planArtifact === null ||
      this.planArtifact.validity !== 'valid' ||
      this.planArtifact.planId !== input.planId ||
      this.planArtifact.planRevision !== input.expectedPlanRevision
    ) {
      return null;
    }
    return {
      sessionId: input.sessionId,
      planId: this.planArtifact.planId,
      planRevision: this.planArtifact.planRevision,
      runtimeRevision: this.revision,
      planToken: this.planArtifact.planToken,
    };
  }

  public validateModelTicketRequest(
    request: RuntimeModelTicketRequest,
  ): RuntimeControlReasonCode | null {
    if (
      !this.live ||
      this.currentState === null ||
      this.modelCatalog === null ||
      request.sessionId !== this.options.sessionId
    ) {
      return 'runtime_unavailable';
    }
    if (request.expectedRevision !== this.revision) return 'stale_revision';
    if (request.expectedCatalogRevision !== this.catalogRevision) return 'stale_catalog';
    const target = this.modelCatalog.models.find(
      (model) =>
        model.provider === request.operation.provider && model.id === request.operation.modelId,
    );
    if (target === undefined) return 'model_unavailable';
    if (target.availability === 'policy_blocked') return 'policy_blocked';
    if (target.availability === 'tier_locked') return 'tier_locked';
    if (this.currentState.streaming && !this.modelCatalog.canSetModelWhileStreaming) {
      return 'streaming_active';
    }
    return null;
  }

  /** Reconcile a read-only host snapshot before minting short-lived mutation authority. */
  public async validateFreshModelTicketRequest(
    request: RuntimeModelTicketRequest,
  ): Promise<RuntimeControlReasonCode | null> {
    if (!this.live || this.currentState === null || this.modelCatalog === null) {
      return 'runtime_unavailable';
    }
    try {
      const [stateResponse, modelsResponse] = await Promise.all([
        this.supervisor.send({ type: 'get_state' }),
        this.supervisor.send({ type: 'get_available_models' }),
      ]);
      const previousState = this.currentState;
      const freshState = this.buildState(stateResponse);
      if (!sameRuntimeState(previousState, freshState)) {
        this.revision += 1;
        this.buildState(stateResponse);
      }
      const currentState = this.currentState;
      if (currentState === null) return 'runtime_unavailable';
      const candidate = projectRuntimeModelCatalog(dataOf(modelsResponse), {
        sessionId: this.options.sessionId,
        catalogRevision: this.catalogRevision,
        runtimeRevision: this.revision,
        currentModel: currentState.model,
        streaming: currentState.streaming,
      });
      if (candidate === null) throw new Error('host model catalog could not be projected');
      if (!sameCatalog(this.modelCatalog, candidate)) {
        this.refreshCatalog(dataOf(modelsResponse), currentState);
      } else if (this.modelCatalog.runtimeRevision !== this.revision) {
        this.modelCatalog = { ...candidate, runtimeRevision: this.revision };
      }
      return this.validateModelTicketRequest(request);
    } catch {
      this.live = false;
      this.currentState = null;
      this.modelCatalog = null;
      return 'runtime_unavailable';
    }
  }

  public isLive(): boolean {
    return this.live;
  }

  /** Read and atomically publish the authoritative host snapshot. */
  public hydrate(): Promise<RuntimeSnapshotDto> {
    if (this.hydration !== null) return this.hydration;
    const generation = this.lifecycleGeneration;
    const pending = this.readSnapshot(generation).catch((error: unknown) => {
      const issue =
        error instanceof RuntimeIssueError ? error : new RuntimeIssueError('host-unavailable');
      this.invalidateRuntime();
      throw issue;
    });
    this.hydration = pending;
    const clear = (): void => {
      if (this.hydration === pending) this.hydration = null;
    };
    void pending.then(clear, clear);
    return pending;
  }

  public hydrateSnapshot(): Promise<RuntimeSnapshotDto> {
    return this.hydrate();
  }

  private async readSnapshot(generation: number): Promise<RuntimeSnapshotDto> {
    const [stateResponse, levelsResponse, modelsResponse] = await Promise.all([
      this.readHost({ type: 'get_state' }, 'host-unavailable'),
      this.readHost({ type: 'get_available_thinking_levels' }, 'unsupported'),
      this.readHost({ type: 'get_available_models' }, 'host-unavailable'),
    ]);
    const levels = projectRuntimeThinkingLevels(dataOf(levelsResponse));
    if (levels === null) throw new RuntimeIssueError('invalid-response');

    const provisionalCatalogRevision =
      this.modelCatalog === null ? Math.max(1, this.catalogRevision + 1) : this.catalogRevision;
    const plan = this.planSnapshot();
    const provisional = projectRuntimeSnapshot(
      dataOf(stateResponse),
      levels,
      dataOf(modelsResponse),
      {
        sessionId: this.options.sessionId,
        revision: this.revision,
        catalogRevision: provisionalCatalogRevision,
        mode: this.mode,
        updatedAt: new Date(this.now()).toISOString(),
        plan,
      },
    );
    if (provisional === null) throw new RuntimeIssueError('invalid-response');

    const stateChanged =
      this.currentState === null || !sameRuntimeState(this.currentState, provisional.state);
    const nextRevision = stateChanged
      ? this.revision + (this.currentState === null ? 0 : 1)
      : this.revision;
    const catalogChanged =
      this.modelCatalog === null || !sameCatalog(this.modelCatalog, provisional.models);
    const nextCatalogRevision =
      this.modelCatalog === null
        ? Math.max(1, this.catalogRevision + 1)
        : catalogChanged
          ? this.catalogRevision + 1
          : this.catalogRevision;
    const snapshotProjection = projectRuntimeSnapshot(
      dataOf(stateResponse),
      levels,
      dataOf(modelsResponse),
      {
        sessionId: this.options.sessionId,
        revision: nextRevision,
        catalogRevision: nextCatalogRevision,
        mode: this.mode,
        updatedAt: new Date(this.now()).toISOString(),
        plan,
      },
    );
    if (snapshotProjection === null) throw new RuntimeIssueError('invalid-response');
    const snapshot = withMediaCapability(
      snapshotProjection,
      this.mediaEnabled,
      this.mediaPolicy,
    );
    if (generation !== this.lifecycleGeneration) {
      throw new RuntimeIssueError('host-unavailable');
    }

    this.availableThinkingLevels = snapshot.state.availableThinkingLevels;
    this.revision = nextRevision;
    this.catalogRevision = nextCatalogRevision;
    this.currentState = snapshot.state;
    this.modelCatalog = snapshot.models;
    this.live = true;
    return snapshot;
  }

  private async readHost(
    command: PiRpcCommand,
    failureCode: RuntimeIssueCode,
  ): Promise<PiRpcResponse> {
    try {
      const response = await this.supervisor.send(command);
      if (response.success !== true) throw new RuntimeIssueError(failureCode);
      return response;
    } catch (error: unknown) {
      if (error instanceof RuntimeIssueError) throw error;
      throw new RuntimeIssueError(failureCode);
    }
  }

  private invalidateRuntime(): void {
    this.live = false;
    this.mode = 'unknown';
    this.currentState = null;
    this.modelCatalog = null;
    this.availableThinkingLevels = [];
    // Host authority loss also invalidates any plan binding it issued.
    this.planArtifact = null;
    this.planArtifactOccurredAt = null;
    this.planRevision = 0;
  }

  /** Fail-closed, idempotent mutations serialized through one single-flight lane. */
  public control(command: RuntimeControlCommand): Promise<RuntimeControlResponse> {
    const settled = this.idempotency.get(command.controlId);
    if (settled !== undefined) {
      return Promise.resolve(settled);
    }
    return this.enqueueMutation(() => {
      const replayed = this.idempotency.get(command.controlId);
      if (replayed !== undefined) {
        return Promise.resolve(replayed);
      }
      return this.executeControl(command);
    });
  }

  /** Plan-mode and reviewed-plan execution share the same guarded mutation lane. */
  public planControl(command: PlanControlCommand): Promise<PlanControlResponse> {
    const settled = this.planIdempotency.get(command.controlId);
    if (settled !== undefined) {
      return Promise.resolve(settled);
    }
    return this.enqueueMutation(() => {
      const replayed = this.planIdempotency.get(command.controlId);
      if (replayed !== undefined) {
        return Promise.resolve(replayed);
      }
      return this.executePlanControl(command);
    });
  }

  /** Serialize every host mutation so revisions advance without interleaving. */
  private enqueueMutation<T>(run: () => Promise<T>): Promise<T> {
    const pending = this.mutationLane.catch(() => undefined).then(run);
    this.mutationLane = pending;
    return pending;
  }

  private async executeControl(command: RuntimeControlCommand): Promise<RuntimeControlResponse> {
    if (!this.live || this.currentState === null) {
      return this.settle(command.controlId, {
        outcome: {
          status: 'unavailable',
          reasonCode: 'runtime_unavailable',
          issueCode: 'host-unavailable',
        },
      });
    }
    if (
      command.sessionId !== this.options.sessionId ||
      command.expectedRevision !== this.revision ||
      (command.operation.type === 'set_model' &&
        command.expectedCatalogRevision !== this.catalogRevision)
    ) {
      return this.settle(command.controlId, {
        outcome: { status: 'stale', state: this.currentState },
      });
    }
    const validationReason = this.validate(command.operation);
    if (validationReason !== null) {
      if (validationReason === 'policy_blocked') {
        return this.settle(command.controlId, {
          outcome: {
            status: 'policy_blocked',
            reasonCode: validationReason,
            issueCode: 'unsupported',
          },
        });
      }
      if (validationReason === 'unsupported_operation') {
        return this.settle(command.controlId, {
          outcome: {
            status: 'unsupported',
            reasonCode: validationReason,
            issueCode: 'unsupported',
          },
        });
      }
      return this.settle(command.controlId, {
        outcome: {
          status: 'unavailable',
          reasonCode: validationReason,
          issueCode: 'unsupported',
        },
      });
    }
    try {
      const state = await this.apply(command.operation);
      return this.settle(command.controlId, { outcome: { status: 'accepted', state } });
    } catch (error) {
      if (error instanceof HostRejectedError) {
        return this.settle(
          command.controlId,
          error.reasonCode === 'policy_blocked'
            ? {
                outcome: {
                  status: 'policy_blocked',
                  reasonCode: 'policy_blocked',
                  issueCode: 'unsupported',
                },
              }
            : {
                outcome: {
                  status: 'unavailable',
                  reasonCode: 'host_rejected',
                  issueCode: 'host-unavailable',
                },
              },
        );
      }
      // Delivery may have happened before the failure. This is terminal; never retry.
      return this.settle(command.controlId, {
        outcome: {
          status: 'delivery-unknown',
          reasonCode: 'delivery_unknown',
          issueCode: 'delivery-unknown',
        },
      });
    }
  }

  /** Plan control: checks run before dispatch; transport failure is terminal. */
  private async executePlanControl(command: PlanControlCommand): Promise<PlanControlResponse> {
    if (!this.live || this.currentState === null) {
      return this.settlePlan(command.controlId, {
        outcome: {
          status: 'unavailable',
          reasonCode: 'runtime_unavailable',
          issueCode: 'host-unavailable',
        },
      });
    }
    if (command.expectedRuntimeRevision !== this.revision) {
      return this.settlePlan(command.controlId, {
        outcome: { status: 'stale', state: this.currentState },
      });
    }
    if (command.type === 'set_mode') {
      return this.applyModeSwitch(command);
    }
    const executionPrecondition = await this.refreshExecutionPrecondition();
    if (executionPrecondition === 'unavailable') {
      return this.settlePlan(command.controlId, {
        outcome: {
          status: 'unavailable',
          reasonCode: 'runtime_unavailable',
          issueCode: 'host-unavailable',
        },
      });
    }
    if (executionPrecondition === 'stale') {
      return this.settlePlan(command.controlId, {
        outcome: { status: 'stale', state: this.currentState },
      });
    }
    if (!this.isExecutablePlanBinding(command)) {
      return this.settlePlan(command.controlId, {
        outcome: { status: 'stale', state: this.currentState },
      });
    }
    return this.applyPlanExecution(command);
  }

  /** Re-read the turn immediately before the privileged host handoff. */
  private async refreshExecutionPrecondition(): Promise<'ok' | 'stale' | 'unavailable'> {
    if (this.currentState === null) return 'unavailable';
    try {
      const response = await this.supervisor.send({ type: 'get_state' });
      if (response.success !== true) return 'unavailable';
      const fresh = projectRuntimeState(dataOf(response), {
        sessionId: this.options.sessionId,
        revision: this.revision,
        mode: this.mode,
        availableThinkingLevels: this.availableThinkingLevels,
        updatedAt: new Date(this.now()).toISOString(),
        plan: this.planSnapshot(),
      });
      if (fresh === null) return 'unavailable';
      if (!sameRuntimeState(this.currentState, fresh)) {
        this.revision += 1;
        const revised = projectRuntimeState(dataOf(response), {
          sessionId: this.options.sessionId,
          revision: this.revision,
          mode: this.mode,
          availableThinkingLevels: this.availableThinkingLevels,
          updatedAt: new Date(this.now()).toISOString(),
          plan: this.planSnapshot(),
        });
        if (revised === null) return 'unavailable';
        this.currentState = revised;
        if (this.modelCatalog !== null) {
          this.modelCatalog = {
            ...this.modelCatalog,
            runtimeRevision: this.revision,
            streaming: revised.streaming,
          };
        }
        return 'stale';
      }
      return fresh.streaming ? 'stale' : 'ok';
    } catch {
      return 'unavailable';
    }
  }

  /** The exact plan binding, current Plan mode and post-run contract must all hold. */
  private isExecutablePlanBinding(command: ExecutePlanCommand): boolean {
    return (
      command.postRunMode === 'plan' &&
      this.mode === 'plan' &&
      this.currentState?.mode === 'plan' &&
      this.currentState.streaming === false &&
      this.planArtifact !== null &&
      this.planArtifact.validity === 'valid' &&
      command.planId === this.planArtifact.planId &&
      command.expectedPlanRevision === this.planRevision &&
      command.planToken === this.planArtifact.planToken
    );
  }

  private async applyModeSwitch(command: SetModeCommand): Promise<PlanControlResponse> {
    try {
      ensureAccepted(
        await this.supervisor.sendSettled({
          type: 'prompt',
          message: command.target === 'plan' ? '/plan on' : '/plan off',
        }),
      );
      await this.waitForMode(command.target);
      const state = this.commit(await this.supervisor.send({ type: 'get_state' }), null);
      return this.settlePlan(command.controlId, { outcome: { status: 'accepted', state } });
    } catch (error) {
      return this.settlePlanControlFailure(command.controlId, error);
    }
  }

  private async applyPlanExecution(command: ExecutePlanCommand): Promise<PlanControlResponse> {
    try {
      // Dedicated host op—not a prompt; no transcript or model-visible content.
      ensureAccepted(await this.supervisor.sendSettled(command as unknown as PiRpcCommand));
      await this.waitForMode('executing-plan');
      const state = this.commit(await this.supervisor.send({ type: 'get_state' }), null);
      return this.settlePlan(command.controlId, { outcome: { status: 'accepted', state } });
    } catch (error) {
      return this.settlePlanControlFailure(command.controlId, error);
    }
  }

  private settlePlanControlFailure(controlId: string, error: unknown): PlanControlResponse {
    if (error instanceof HostRejectedError) {
      return this.settlePlan(
        controlId,
        error.reasonCode === 'policy_blocked'
          ? {
              outcome: {
                status: 'policy_blocked',
                reasonCode: 'policy_blocked',
                issueCode: 'unsupported',
              },
            }
          : {
              outcome: {
                status: 'unavailable',
                reasonCode: 'host_rejected',
                issueCode: 'host-unavailable',
              },
            },
      );
    }
    // Delivery may have happened before the failure. This is terminal; never retry.
    return this.settlePlan(controlId, {
      outcome: {
        status: 'delivery-unknown',
        reasonCode: 'delivery_unknown',
        issueCode: 'delivery-unknown',
      },
    });
  }

  private validate(operation: RuntimeOperation): RuntimeValidationReason | null {
    if (operation.type === 'set_model') {
      const known =
        this.modelCatalog?.models.some(
          (model) => model.provider === operation.provider && model.id === operation.modelId,
        ) ?? false;
      if (!known) return 'model_unavailable';
      if (this.currentState?.streaming && !this.modelCatalog?.canSetModelWhileStreaming) {
        return 'streaming_active';
      }
      const target = this.modelCatalog?.models.find(
        (model) => model.provider === operation.provider && model.id === operation.modelId,
      );
      if (target?.availability === 'policy_blocked') return 'policy_blocked';
      return target?.availability === 'tier_locked' ? 'tier_locked' : null;
    }
    if (operation.type === 'set_thinking_level') {
      return this.availableThinkingLevels.includes(operation.level)
        ? null
        : 'unsupported_operation';
    }
    return null;
  }

  private async apply(operation: RuntimeOperation): Promise<RuntimeStateDto> {
    if (operation.type === 'set_model') {
      ensureAccepted(
        await this.supervisor.sendSettled({
          type: 'set_model',
          provider: operation.provider,
          modelId: operation.modelId,
        }),
      );
      // A model change can change the supported thinking levels; reconcile both.
      const [stateResponse, levelsResponse, modelsResponse] = await Promise.all([
        this.supervisor.send({ type: 'get_state' }),
        this.supervisor.send({ type: 'get_available_thinking_levels' }),
        this.supervisor.send({ type: 'get_available_models' }),
      ]);
      const state = this.commit(stateResponse, levelsResponse);
      this.refreshCatalog(dataOf(modelsResponse), state);
      return state;
    }
    if (operation.type === 'set_thinking_level') {
      ensureAccepted(
        await this.supervisor.sendSettled({ type: 'set_thinking_level', level: operation.level }),
      );
      return this.commit(await this.supervisor.send({ type: 'get_state' }), null);
    }
    ensureAccepted(
      await this.supervisor.sendSettled({
        type: 'prompt',
        message: operation.mode === 'plan' ? '/plan on' : '/plan off',
      }),
    );
    await this.waitForMode(operation.mode);
    return this.commit(await this.supervisor.send({ type: 'get_state' }), null);
  }

  private commit(
    stateResponse: PiRpcResponse,
    levelsResponse: PiRpcResponse | null,
  ): RuntimeStateDto {
    this.revision += 1;
    this.updateLevels(levelsResponse);
    const state = this.buildState(stateResponse);
    if (this.modelCatalog !== null) {
      this.modelCatalog = {
        ...this.modelCatalog,
        runtimeRevision: this.revision,
        currentModel: state.model,
        streaming: state.streaming,
      };
    }
    return state;
  }

  private updateLevels(levelsResponse: PiRpcResponse | null): void {
    if (levelsResponse === null) {
      return;
    }
    this.availableThinkingLevels = projectRuntimeThinkingLevels(dataOf(levelsResponse)) ?? [];
  }

  private refreshCatalog(rawData: unknown, state: RuntimeStateDto): void {
    const nextRevision = this.catalogRevision + 1;
    const catalog = projectRuntimeModelCatalog(rawData, {
      sessionId: this.options.sessionId,
      catalogRevision: nextRevision,
      runtimeRevision: this.revision,
      currentModel: state.model,
      streaming: state.streaming,
    });
    if (catalog === null) throw new Error('host model catalog could not be projected');
    this.catalogRevision = nextRevision;
    this.modelCatalog = catalog;
  }

  private buildState(stateResponse: PiRpcResponse): RuntimeStateDto {
    const state = projectRuntimeState(dataOf(stateResponse), {
      sessionId: this.options.sessionId,
      revision: this.revision,
      mode: this.mode,
      availableThinkingLevels: this.availableThinkingLevels,
      updatedAt: new Date(this.now()).toISOString(),
      plan: this.planSnapshot(),
    });
    if (state === null) {
      throw new Error('host runtime state could not be projected');
    }
    this.currentState = state;
    return state;
  }

  /** The token-free plan projection; the opaque binding stays relay-side only. */
  private planSnapshot(): PlanSnapshotDto {
    return projectPlanSnapshot(
      this.planArtifact,
      this.planArtifactOccurredAt ?? new Date(this.now()).toISOString(),
    );
  }

  /** Refresh the plan projection in the published state without a revision bump. */
  private refreshPlanProjection(): void {
    if (this.currentState === null) return;
    const state: RuntimeStateDto = { ...this.currentState, plan: this.planSnapshot() };
    this.currentState = isRuntimeStateDto(state) ? state : this.currentState;
  }

  /** Mirror host mode into published state without a revision bump. */
  private refreshModeProjection(): void {
    if (this.currentState === null) return;
    const state: RuntimeStateDto = { ...this.currentState, mode: this.mode };
    this.currentState = isRuntimeStateDto(state) ? state : this.currentState;
  }

  private waitForMode(target: RuntimeMode): Promise<void> {
    if (this.mode === target) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.modeWaiters = this.modeWaiters.filter((waiter) => waiter.timer !== timer);
        reject(new Error('plan mode was not confirmed by the host'));
      }, MODE_CONFIRM_TIMEOUT_MS);
      this.modeWaiters.push({ target, resolve, timer });
    });
  }

  private resolveModeWaiters(): void {
    const remaining: ModeWaiter[] = [];
    for (const waiter of this.modeWaiters) {
      if (waiter.target === this.mode) {
        clearTimeout(waiter.timer);
        waiter.resolve();
      } else {
        remaining.push(waiter);
      }
    }
    this.modeWaiters = remaining;
  }

  private settle(controlId: string, response: RuntimeControlResponse): RuntimeControlResponse {
    return storeSettled(this.idempotency, controlId, response);
  }

  private settlePlan(controlId: string, response: PlanControlResponse): PlanControlResponse {
    return storeSettled(this.planIdempotency, controlId, response);
  }
}

// ───────────────────────────────────────────────────────────────────
// 5. HELPERS
// ───────────────────────────────────────────────────────────────────

function withMediaCapability(
  snapshot: RuntimeSnapshotDto,
  enabled: boolean,
  policy: MediaPolicyDto,
): RuntimeSnapshotDto {
  const media: RuntimeMediaCapabilityDto = {
    enabled,
    imageIn: snapshot.state.model?.input?.includes('image') === true,
    policy,
  };
  return { ...snapshot, media };
}

function storeSettled<K, V>(map: Map<K, V>, key: K, value: V): V {
  if (map.size >= IDEMPOTENCY_CAP) {
    const oldest = map.keys().next().value;
    if (oldest !== undefined) {
      map.delete(oldest);
    }
  }
  map.set(key, value);
  return value;
}

function ensureAccepted(response: PiRpcResponse): void {
  if (response.success !== true) {
    const normalized = response.error?.toLowerCase() ?? '';
    throw new HostRejectedError(normalized.includes('policy') ? 'policy_blocked' : 'host_rejected');
  }
}

function dataOf(response: PiRpcResponse): unknown {
  return response.success === true ? response.data : undefined;
}

function sameRuntimeState(left: RuntimeStateDto, right: RuntimeStateDto): boolean {
  return (
    JSON.stringify(left.model) === JSON.stringify(right.model) &&
    left.thinkingLevel === right.thinkingLevel &&
    JSON.stringify(left.availableThinkingLevels) ===
      JSON.stringify(right.availableThinkingLevels) &&
    left.mode === right.mode &&
    left.streaming === right.streaming
  );
}

function sameCatalog(left: RuntimeModelCatalogDto, right: RuntimeModelCatalogDto): boolean {
  return (
    left.sessionId === right.sessionId &&
    JSON.stringify(left.currentModel) === JSON.stringify(right.currentModel) &&
    left.streaming === right.streaming &&
    left.canSetModelWhileStreaming === right.canSetModelWhileStreaming &&
    JSON.stringify(left.models) === JSON.stringify(right.models)
  );
}
