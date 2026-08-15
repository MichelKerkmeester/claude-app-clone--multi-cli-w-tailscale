// ───────────────────────────────────────────────────────────────────
// MODULE: Authoritative Runtime Control Service
// ───────────────────────────────────────────────────────────────────

import type {
  PiRpcResponse,
  RuntimeControlCommand,
  RuntimeControlResponse,
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
const MAX_REASON_LENGTH = 500;

export interface RuntimeServiceOptions {
  readonly sessionId: string;
  readonly now?: () => number;
}

interface ModeWaiter {
  readonly target: RuntimeMode;
  readonly resolve: () => void;
  readonly timer: NodeJS.Timeout;
}

/** A mutation the host delivered and explicitly rejected — never a delivery-unknown. */
class HostRejectedError extends Error {}

/**
 * Owns per-session runtime authority in memory. Pi is the source of truth for model,
 * thinking level, streaming, and plan mode; this service only mirrors host-confirmed
 * state, gates mutations behind an expected revision, and refuses to guess an outcome
 * it cannot confirm (delivery-unknown is terminal until reconciliation).
 */
export class RuntimeService {
  private revision = 0;
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
    this.modelCatalog = projectRuntimeModelCatalog(
      dataOf(modelsResponse),
      this.options.sessionId,
      this.revision,
    );
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
        outcome: { status: 'unavailable', reason: 'runtime authority is unknown' },
      });
    }
    if (command.expectedRevision !== this.revision) {
      return this.settle(command.controlId, {
        outcome: { status: 'stale', state: this.currentState },
      });
    }
    const unsupported = this.validate(command.operation);
    if (unsupported !== null) {
      return this.settle(command.controlId, {
        outcome: { status: 'unsupported', reason: unsupported },
      });
    }
    try {
      const state = await this.apply(command.operation);
      return this.settle(command.controlId, { outcome: { status: 'accepted', state } });
    } catch (error) {
      const reason = bounded(error instanceof Error ? error.message : String(error));
      if (error instanceof HostRejectedError) {
        return this.settle(command.controlId, { outcome: { status: 'unavailable', reason } });
      }
      // Delivery may have happened before the failure. This is terminal; never retry.
      return this.settle(command.controlId, {
        outcome: { status: 'delivery-unknown', reason },
      });
    }
  }

  private validate(operation: RuntimeOperation): string | null {
    if (operation.type === 'set_model') {
      const known =
        this.modelCatalog?.models.some(
          (model) => model.provider === operation.provider && model.id === operation.modelId,
        ) ?? false;
      return known ? null : 'model is not in the current catalog';
    }
    if (operation.type === 'set_thinking_level') {
      return this.availableThinkingLevels.includes(operation.level)
        ? null
        : 'thinking level is not supported by the active model';
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
      const [stateResponse, levelsResponse] = await Promise.all([
        this.supervisor.send({ type: 'get_state' }),
        this.supervisor.send({ type: 'get_available_thinking_levels' }),
      ]);
      return this.commit(stateResponse, levelsResponse);
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
    throw new HostRejectedError(response.error ?? 'host rejected the mutation');
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

function bounded(value: string): string {
  return value.length > MAX_REASON_LENGTH ? `${value.slice(0, MAX_REASON_LENGTH)}…` : value;
}
