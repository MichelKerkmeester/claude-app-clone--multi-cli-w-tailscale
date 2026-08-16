// ───────────────────────────────────────────────────────────────────
// MODULE: Authoritative Runtime Control Service
// ───────────────────────────────────────────────────────────────────

import type {
  PiRpcResponse,
  RuntimeControlCommand,
  RuntimeControlResponse,
  RuntimeControlReasonCode,
  RuntimeModelTicketRequest,
  RuntimeMode,
  RuntimeModelCatalogDto,
  RuntimeOperation,
  RuntimeStateDto,
} from '@pi-remote/pi-rpc-protocol';

import type { RpcSupervisor } from '../rpc/supervisor.js';
import { projectRuntimeModelCatalog, projectRuntimeState } from '../store/redaction.js';

import { parsePlanStatus } from './plan-status.js';

const IDEMPOTENCY_CAP = 256;
const MODE_CONFIRM_TIMEOUT_MS = 4_000;

export interface RuntimeServiceOptions {
  readonly sessionId: string;
  readonly now?: () => number;
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
class HostRejectedError extends Error {
  public constructor(readonly reasonCode: 'policy_blocked' | 'host_rejected') {
    super(reasonCode);
  }
}

/**
 * Owns per-session runtime authority in memory. Pi is the source of truth for model,
 * thinking level, streaming, and plan mode; this service only mirrors host-confirmed
 * state, gates mutations behind an expected revision, and refuses to guess an outcome
 * it cannot confirm (delivery-unknown is terminal until reconciliation).
 */
export class RuntimeService {
  private revision = 0;
  private catalogRevision = 0;
  private currentState: RuntimeStateDto | null = null;
  private modelCatalog: RuntimeModelCatalogDto | null = null;
  private mode: RuntimeMode = 'unknown';
  private availableThinkingLevels: readonly string[] = [];
  private live = false;
  private readonly idempotency = new Map<string, RuntimeControlResponse>();
  private modeWaiters: ModeWaiter[] = [];
  private readonly now: () => number;

  public constructor(
    private readonly supervisor: RpcSupervisor,
    private readonly options: RuntimeServiceOptions,
  ) {
    this.now = options.now ?? ((): number => Date.now());
    supervisor.onLifecycle((event) => {
      if (event.reason === 'exit' || event.reason === 'restart' || event.reason === 'failed') {
        this.live = false;
        this.mode = 'unknown';
        this.currentState = null;
        this.modelCatalog = null;
      }
    });
    supervisor.onEvent((event) => {
      const parsed = parsePlanStatus(event);
      if (parsed !== null) {
        this.mode = parsed;
        this.resolveModeWaiters();
      }
    });
  }

  public getState(): RuntimeStateDto | null {
    return this.currentState;
  }

  public getModelCatalog(): RuntimeModelCatalogDto | null {
    return this.modelCatalog;
  }

  public getRevision(): number {
    return this.revision;
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

  /** Read authoritative host state; leaves the service not-live if any read fails. */
  public async hydrate(): Promise<RuntimeStateDto> {
    const [stateResponse, levelsResponse, modelsResponse] = await Promise.all([
      this.supervisor.send({ type: 'get_state' }),
      this.supervisor.send({ type: 'get_available_thinking_levels' }),
      this.supervisor.send({ type: 'get_available_models' }),
    ]);
    this.updateLevels(levelsResponse);
    const state = this.buildState(stateResponse);
    this.refreshCatalog(dataOf(modelsResponse), state);
    this.live = true;
    return state;
  }

  /** The single guarded mutation entrypoint. Fails closed and is idempotent by controlId. */
  public async control(command: RuntimeControlCommand): Promise<RuntimeControlResponse> {
    const settled = this.idempotency.get(command.controlId);
    if (settled !== undefined) {
      return settled;
    }
    if (!this.live || this.currentState === null) {
      return this.settle(command.controlId, {
        outcome: { status: 'unavailable', reasonCode: 'runtime_unavailable' },
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
          outcome: { status: 'policy_blocked', reasonCode: validationReason },
        });
      }
      if (validationReason === 'unsupported_operation') {
        return this.settle(command.controlId, {
          outcome: { status: 'unsupported', reasonCode: validationReason },
        });
      }
      return this.settle(command.controlId, {
        outcome: { status: 'unavailable', reasonCode: validationReason },
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
            ? { outcome: { status: 'policy_blocked', reasonCode: 'policy_blocked' } }
            : { outcome: { status: 'unavailable', reasonCode: 'host_rejected' } },
        );
      }
      // Delivery may have happened before the failure. This is terminal; never retry.
      return this.settle(command.controlId, {
        outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' },
      });
    }
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
    return this.buildState(stateResponse);
  }

  private updateLevels(levelsResponse: PiRpcResponse | null): void {
    if (levelsResponse === null) {
      return;
    }
    const rows = extractLevels(dataOf(levelsResponse));
    this.availableThinkingLevels = rows
      .filter((level): level is string => typeof level === 'string' && level.length > 0)
      .slice(0, 32);
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
    });
    if (state === null) {
      throw new Error('host runtime state could not be projected');
    }
    this.currentState = state;
    return state;
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
    if (this.idempotency.size >= IDEMPOTENCY_CAP) {
      const oldest = this.idempotency.keys().next().value;
      if (oldest !== undefined) {
        this.idempotency.delete(oldest);
      }
    }
    this.idempotency.set(controlId, response);
    return response;
  }
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

function extractLevels(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (
    data !== null &&
    typeof data === 'object' &&
    Array.isArray((data as { levels?: unknown }).levels)
  ) {
    return (data as { levels: unknown[] }).levels;
  }
  return [];
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
