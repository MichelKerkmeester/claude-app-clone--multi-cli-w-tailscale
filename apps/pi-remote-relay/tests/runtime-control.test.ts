// ───────────────────────────────────────────────────────────────────
// MODULE: Runtime Authority Core Tests
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import type {
  ExecutePlanCommand,
  PiRpcCommand,
  PiRpcEvent,
  PiRpcResponse,
  PlanControlCommand,
  RuntimeControlCommand,
  RuntimeOperation,
  SetModeCommand,
} from '@pi-remote/pi-rpc-protocol';
import { isRuntimeSnapshotDto, isRuntimeStateDto } from '@pi-remote/pi-rpc-protocol';

import type { RpcSupervisor, SupervisorLifecycleEvent } from '../src/rpc/supervisor.js';
import {
  projectCommandCatalog,
  projectRuntimeModelCatalog,
  projectRuntimeState,
} from '../src/store/redaction.js';
import { RuntimeIssueError, RuntimeService } from '../src/runtime/runtime-service.js';

const PLAN_TOKEN = 'token_plan_binding_abcdef0123456789';

const SESSION = 'session_local';

function ok(data: unknown): PiRpcResponse {
  return { type: 'response', command: 'x', success: true, data: data as PiRpcResponse['data'] };
}

/** A stateful fake pi child whose reads reflect prior mutations. */
class FakeSupervisor {
  public model = { provider: 'deepseek', id: 'deepseek-v4-flash', label: 'DeepSeek Flash' };
  public thinkingLevel = 'high';
  public levels: string[] = ['off', 'high', 'max'];
  public models = [
    { provider: 'deepseek', id: 'deepseek-v4-flash', label: 'DeepSeek Flash' },
    { provider: 'opencode-go', id: 'qwen3.8-max', label: 'Qwen 3.8 Max' },
  ];
  public rejectSettled = false;
  public hostReject = false;
  public readFailure: PiRpcCommand['type'] | null = null;
  public readCount = 0;
  public settledCount = 0;
  public readonly settled: PiRpcCommand[] = [];
  private readonly lifecycleListeners = new Set<(event: SupervisorLifecycleEvent) => void>();
  private readonly eventListeners = new Set<(event: PiRpcEvent) => void>();

  public onLifecycle(listener: (event: SupervisorLifecycleEvent) => void): () => void {
    this.lifecycleListeners.add(listener);
    return () => this.lifecycleListeners.delete(listener);
  }

  public onEvent(listener: (event: PiRpcEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  public send(command: PiRpcCommand): Promise<PiRpcResponse> {
    return Promise.resolve(this.respond(command));
  }

  public sendSettled(command: PiRpcCommand): Promise<PiRpcResponse> {
    this.settledCount += 1;
    this.settled.push(command);
    if (this.rejectSettled) {
      return Promise.reject(new Error('transport failed after write'));
    }
    return Promise.resolve(this.respond(command));
  }

  public emitLifecycle(event: SupervisorLifecycleEvent): void {
    for (const listener of this.lifecycleListeners) listener(event);
  }

  public emitPlanStatus(mode: 'build' | 'plan' | 'executing-plan'): void {
    for (const listener of this.eventListeners) {
      listener({
        type: 'extension_ui_request',
        method: 'setStatus',
        statusKey: 'pi-remote-plan-mode',
        statusText: mode,
      } as unknown as PiRpcEvent);
    }
  }

  public emitPlanArtifact(
    options: Partial<{
      planId: string;
      planRevision: number;
      planToken: string;
      validity: 'valid' | 'superseded' | 'invalid';
    }> = {},
  ): void {
    for (const listener of this.eventListeners) {
      listener({
        type: 'extension_ui_request',
        method: 'setPlan',
        statusKey: 'pi-remote-plan-artifact',
        plan: {
          planId: options.planId ?? 'plan_007',
          planRevision: options.planRevision ?? 1,
          planToken: options.planToken ?? PLAN_TOKEN,
          validity: options.validity ?? 'valid',
          title: 'Harden the relay boundary',
          summary: 'Redacted outline only',
          stepCount: 4,
          approachCount: 2,
        },
      } as unknown as PiRpcEvent);
    }
  }

  private respond(command: PiRpcCommand): PiRpcResponse {
    if (
      command.type === 'get_state' ||
      command.type === 'get_available_thinking_levels' ||
      command.type === 'get_available_models'
    ) {
      this.readCount += 1;
      if (this.readFailure === command.type) {
        return {
          type: 'response',
          command: command.type,
          success: false,
          error: 'raw host failure /Users/private secret=LEAK',
        };
      }
    }
    if ((command as unknown as { readonly type: string }).type === 'execute_plan') {
      if (this.hostReject) {
        return {
          type: 'response',
          command: 'execute_plan',
          success: false,
          error: 'policy denied /Users/private token=SECRET',
        };
      }
      queueMicrotask(() => this.emitPlanStatus('executing-plan'));
      return ok({});
    }
    switch (command.type) {
      case 'get_state':
        return ok({ thinkingLevel: this.thinkingLevel, model: this.model, streaming: false });
      case 'get_available_thinking_levels':
        return ok(this.levels);
      case 'get_available_models':
        return ok(this.models);
      case 'set_model': {
        if (this.hostReject) {
          return {
            type: 'response',
            command: 'set_model',
            success: false,
            error: 'policy denied /Users/private token=SECRET',
          };
        }
        const c = command as unknown as { provider: string; modelId: string };
        this.model = { provider: c.provider, id: c.modelId, label: c.modelId };
        // A model change narrows the supported thinking levels.
        this.levels = ['off', 'max'];
        this.thinkingLevel = 'max';
        return ok({});
      }
      case 'set_thinking_level':
        this.thinkingLevel = (command as unknown as { level: string }).level;
        return ok({});
      case 'prompt': {
        if (this.hostReject) {
          return {
            type: 'response',
            command: 'prompt',
            success: false,
            error: 'policy denied /Users/private token=SECRET',
          };
        }
        const message = (command as unknown as { message: string }).message;
        const mode = message === '/plan on' ? 'plan' : 'build';
        queueMicrotask(() => this.emitPlanStatus(mode));
        return ok({});
      }
      default:
        throw new Error(`unexpected command ${command.type}`);
    }
  }
}

function service(fake: FakeSupervisor): RuntimeService {
  return new RuntimeService(fake as unknown as RpcSupervisor, {
    sessionId: SESSION,
    now: () => Date.parse('2026-01-01T00:00:00.000Z'),
  });
}

function control(
  operation: RuntimeOperation,
  expectedRevision: number,
  controlId = 'control_1',
): RuntimeControlCommand {
  const base = {
    type: 'runtime.control',
    controlId,
    sessionId: SESSION,
    expectedRevision,
    ticket: 'ticket_abcdef',
  } as const;
  return operation.type === 'set_model'
    ? { ...base, expectedCatalogRevision: 1, operation }
    : { ...base, operation };
}

function setModeCommand(
  target: 'build' | 'plan',
  expectedRevision: number,
  controlId = 'plan_control_1',
): SetModeCommand {
  return {
    type: 'set_mode',
    target,
    expectedRuntimeRevision: expectedRevision,
    controlId,
    oneUseTicket: 'ticket_plan_mode_abcdef',
  };
}

function executePlanCommand(options: Partial<ExecutePlanCommand> = {}): ExecutePlanCommand {
  return {
    type: 'execute_plan',
    planId: 'plan_007',
    expectedPlanRevision: 1,
    planToken: PLAN_TOKEN,
    expectedRuntimeRevision: 1,
    postRunMode: 'plan',
    controlId: 'plan_exec_1',
    oneUseTicket: 'ticket_plan_exec_abcdef',
    ...options,
  };
}

/** The host-published preconditions for one reviewed-plan execution. */
async function readyForExecution(fake: FakeSupervisor, svc: RuntimeService): Promise<void> {
  await svc.hydrate();
  fake.emitPlanArtifact();
  const mode = await svc.planControl(setModeCommand('plan', 0, 'plan_mode_entry'));
  expect(mode.outcome.status).toBe('accepted');
}

describe('runtime authority core', () => {
  it('deduplicates concurrent read-only hydration and preserves advertised level order', async () => {
    const fake = new FakeSupervisor();
    fake.levels = ['max', 'off', 'high'];
    const svc = service(fake);
    const first = svc.hydrate();
    const second = svc.hydrate();

    expect(second).toBe(first);
    const snapshot = await first;
    expect(isRuntimeSnapshotDto(snapshot)).toBe(true);
    expect(snapshot.state.availableThinkingLevels).toEqual(['max', 'off', 'high']);
    expect(fake.readCount).toBe(3);
  });

  it('maps unsupported host reads to a fixed issue code and invalidates runtime authority', async () => {
    const fake = new FakeSupervisor();
    fake.readFailure = 'get_available_thinking_levels';
    const svc = service(fake);

    await expect(svc.hydrate()).rejects.toMatchObject({ issueCode: 'unsupported' });
    try {
      await svc.hydrate();
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(RuntimeIssueError);
      expect(JSON.stringify(error)).not.toContain('raw host failure');
    }
    expect(svc.isLive()).toBe(false);
    expect(svc.getState()).toBeNull();
  });

  it('accepts a valid set_model, increments revision, and reconciles thinking levels', async () => {
    const fake = new FakeSupervisor();
    const svc = service(fake);
    await svc.hydrate();
    expect(svc.getRevision()).toBe(0);

    const response = await svc.control(
      control({ type: 'set_model', provider: 'opencode-go', modelId: 'qwen3.8-max' }, 0),
    );

    expect(response.outcome.status).toBe('accepted');
    if (response.outcome.status !== 'accepted') throw new Error('unreachable');
    expect(svc.getRevision()).toBe(1);
    expect(response.outcome.state.model).toEqual({
      provider: 'opencode-go',
      id: 'qwen3.8-max',
      label: 'qwen3.8-max',
    });
    // Levels were re-read as one reconciled update with the model change.
    expect(response.outcome.state.availableThinkingLevels).toEqual(['off', 'max']);
    expect(isRuntimeStateDto(response.outcome.state)).toBe(true);
  });

  it('rejects a stale expectedRevision without sending any pi command', async () => {
    const fake = new FakeSupervisor();
    const svc = service(fake);
    await svc.hydrate();

    const response = await svc.control(control({ type: 'set_thinking_level', level: 'max' }, 7));

    expect(response.outcome.status).toBe('stale');
    expect(fake.settledCount).toBe(0);
  });

  it('rejects a stale catalog revision and exact-target mismatch without host delivery', async () => {
    const fake = new FakeSupervisor();
    const svc = service(fake);
    await svc.hydrate();
    const staleCatalog = {
      ...control({ type: 'set_model', provider: 'opencode-go', modelId: 'qwen3.8-max' }, 0),
      expectedCatalogRevision: 0,
    };
    expect((await svc.control(staleCatalog)).outcome.status).toBe('stale');
    expect(
      (
        await svc.control(
          control(
            { type: 'set_model', provider: 'opencode-go', modelId: 'substitute' },
            0,
            'c_sub',
          ),
        )
      ).outcome,
    ).toEqual({
      status: 'unavailable',
      reasonCode: 'model_unavailable',
      issueCode: 'unsupported',
    });
    expect(fake.settledCount).toBe(0);
  });

  it('rechecks the host catalog before ticket issuance and advances only changed authority', async () => {
    const fake = new FakeSupervisor();
    const svc = service(fake);
    await svc.hydrate();
    const request = {
      sessionId: SESSION,
      expectedRevision: 0,
      expectedCatalogRevision: 1,
      operation: { type: 'set_model', provider: 'opencode-go', modelId: 'qwen3.8-max' },
    } as const;
    expect(await svc.validateFreshModelTicketRequest(request)).toBeNull();
    expect(svc.getModelCatalog()?.catalogRevision).toBe(1);

    fake.models.push({ provider: 'openai', id: 'gpt-5', label: 'GPT-5' });
    expect(await svc.validateFreshModelTicketRequest(request)).toBe('stale_catalog');
    expect(svc.getModelCatalog()?.catalogRevision).toBe(2);

    fake.model = { provider: 'opencode-go', id: 'qwen3.8-max', label: 'Qwen 3.8 Max' };
    expect(
      await svc.validateFreshModelTicketRequest({ ...request, expectedCatalogRevision: 2 }),
    ).toBe('stale_revision');
    expect(svc.getRevision()).toBe(1);
  });

  it('rejects unsupported model and unsupported thinking level, sending no pi command', async () => {
    const fake = new FakeSupervisor();
    const svc = service(fake);
    await svc.hydrate();

    const badModel = await svc.control(
      control({ type: 'set_model', provider: 'ghost', modelId: 'nope' }, 0, 'c_a'),
    );
    const badLevel = await svc.control(
      control({ type: 'set_thinking_level', level: 'ultra' }, 0, 'c_b'),
    );

    expect(badModel.outcome.status).toBe('unavailable');
    expect(badLevel.outcome.status).toBe('unsupported');
    expect(fake.settledCount).toBe(0);
  });

  it('replays a settled controlId idempotently without a second pi mutation', async () => {
    const fake = new FakeSupervisor();
    const svc = service(fake);
    await svc.hydrate();

    const first = await svc.control(
      control({ type: 'set_thinking_level', level: 'max' }, 0, 'dup'),
    );
    const replay = await svc.control(
      control({ type: 'set_thinking_level', level: 'max' }, 0, 'dup'),
    );

    expect(first).toBe(replay);
    expect(fake.settledCount).toBe(1);
  });

  it('drops authority to unavailable on lifecycle exit and restores after re-hydrate', async () => {
    const fake = new FakeSupervisor();
    const svc = service(fake);
    await svc.hydrate();

    fake.emitLifecycle({ state: 'running', reason: 'exit' });
    const afterExit = await svc.control(
      control({ type: 'set_thinking_level', level: 'max' }, 0, 'c_x'),
    );
    expect(afterExit.outcome.status).toBe('unavailable');
    expect(fake.settledCount).toBe(0);

    await svc.hydrate();
    const afterHydrate = await svc.control(
      control({ type: 'set_thinking_level', level: 'max' }, 0, 'c_y'),
    );
    expect(afterHydrate.outcome.status).toBe('accepted');
  });

  it('confirms set_mode against the plan-status bridge before accepting', async () => {
    const fake = new FakeSupervisor();
    const svc = service(fake);
    await svc.hydrate();

    const response = await svc.control(control({ type: 'set_mode', mode: 'plan' }, 0));

    expect(response.outcome.status).toBe('accepted');
    if (response.outcome.status !== 'accepted') throw new Error('unreachable');
    expect(response.outcome.state.mode).toBe('plan');
  });

  it('returns delivery-unknown when the mutation transport fails, leaving revision unchanged', async () => {
    const fake = new FakeSupervisor();
    const svc = service(fake);
    await svc.hydrate();

    fake.rejectSettled = true;
    const response = await svc.control(control({ type: 'set_thinking_level', level: 'max' }, 0));

    expect(response.outcome.status).toBe('delivery-unknown');
    expect(response.outcome).toEqual({
      status: 'delivery-unknown',
      reasonCode: 'delivery_unknown',
      issueCode: 'delivery-unknown',
    });
    expect(svc.getRevision()).toBe(0);
    expect(fake.settledCount).toBe(1);
    expect(await svc.control(control({ type: 'set_thinking_level', level: 'max' }, 0))).toBe(
      response,
    );
    expect(fake.settledCount).toBe(1);
  });

  it('maps host rejection to a bounded policy code without exposing the raw host error', async () => {
    const fake = new FakeSupervisor();
    const svc = service(fake);
    await svc.hydrate();
    fake.hostReject = true;
    const response = await svc.control(
      control({ type: 'set_model', provider: 'opencode-go', modelId: 'qwen3.8-max' }, 0),
    );
    expect(response.outcome).toEqual({
      status: 'policy_blocked',
      reasonCode: 'policy_blocked',
      issueCode: 'unsupported',
    });
    expect(JSON.stringify(response)).not.toContain('/Users/private');
    expect(fake.settledCount).toBe(1);
  });
});

describe('runtime redaction projectors', () => {
  it('strips session files, paths, and secrets from projected state and catalogs', () => {
    const state = projectRuntimeState(
      {
        thinkingLevel: 'high',
        streaming: true,
        sessionFile: '/Users/someone/.pi/session.jsonl',
        model: {
          provider: 'deepseek',
          id: 'deepseek-v4-flash',
          label: 'DeepSeek',
          apiKey: 'sk-LEAK',
        },
      },
      {
        sessionId: SESSION,
        revision: 3,
        mode: 'build',
        availableThinkingLevels: ['off', 'high', 'max'],
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    );
    const models = projectRuntimeModelCatalog(
      {
        models: [
          {
            provider: 'deepseek',
            id: 'deepseek-v4-flash',
            label: 'DeepSeek Flash',
            reasoning: true,
            input: ['text', 'image'],
            contextWindow: 128_000,
            maxTokens: 8_192,
            tools: true,
            availability: 'available',
            pricing: { currency: 'USD', inputPerMillion: 1.25, secret: 'drop-me' },
            path: '/opt/models/x',
            authorization: 'Bearer y',
          },
        ],
      },
      {
        sessionId: SESSION,
        catalogRevision: 4,
        runtimeRevision: 3,
        currentModel: state?.model ?? null,
        streaming: true,
      },
    );
    const commands = projectCommandCatalog(
      {
        commands: [
          {
            name: 'plan',
            description: 'Toggle plan',
            source: 'extension',
            path: '/Users/x/plan.ts',
          },
          { name: '/usr/bin/evil' },
        ],
      },
      SESSION,
      3,
    );

    const serialized = JSON.stringify({ state, models, commands });
    for (const canary of [
      'sessionFile',
      '/Users/',
      '/opt/models',
      'sk-LEAK',
      'Bearer',
      'path',
      '/usr/bin/evil',
    ]) {
      expect(serialized.includes(canary)).toBe(false);
    }
    expect(state?.model).toEqual({
      provider: 'deepseek',
      id: 'deepseek-v4-flash',
      label: 'DeepSeek',
    });
    expect(models?.models).toHaveLength(1);
    expect(models?.models[0]).toEqual({
      provider: 'deepseek',
      id: 'deepseek-v4-flash',
      label: 'DeepSeek Flash',
      reasoning: true,
      input: ['text', 'image'],
      contextWindow: 128_000,
      maxTokens: 8_192,
      tools: true,
      availability: 'available',
      pricing: { currency: 'USD', inputPerMillion: 1.25 },
    });
    expect(models).toMatchObject({
      catalogRevision: 4,
      runtimeRevision: 3,
      streaming: true,
      canSetModelWhileStreaming: false,
    });
    // The path-like command name was dropped; only the safe descriptor survives.
    expect(commands?.commands).toHaveLength(1);
    expect(commands?.commands[0]?.name).toBe('plan');
  });
});

describe('plan control authority', () => {
  it('accepts a host-confirmed mode switch and projects a token-free plan snapshot', async () => {
    const fake = new FakeSupervisor();
    const svc = service(fake);
    await svc.hydrate();
    fake.emitPlanArtifact();

    const response = await svc.planControl(setModeCommand('plan', 0));

    expect(response.outcome.status).toBe('accepted');
    if (response.outcome.status !== 'accepted') throw new Error('unreachable');
    expect(response.outcome.state.mode).toBe('plan');
    expect(response.outcome.state.revision).toBe(1);
    expect(response.outcome.state.plan).toEqual({
      planId: 'plan_007',
      planRevision: 1,
      validity: 'valid',
      artifact: {
        planId: 'plan_007',
        planRevision: 1,
        title: 'Harden the relay boundary',
        summary: 'Redacted outline only',
        stepCount: 4,
        approachCount: 2,
        validity: 'valid',
        occurredAt: '2026-01-01T00:00:00.000Z',
      },
    });
    expect(JSON.stringify(response)).not.toContain(PLAN_TOKEN);
  });

  it('executes only the exact reviewed-plan binding and returns to the plan contract', async () => {
    const fake = new FakeSupervisor();
    const svc = service(fake);
    await readyForExecution(fake, svc);

    const response = await svc.planControl(executePlanCommand());

    expect(response.outcome.status).toBe('accepted');
    if (response.outcome.status !== 'accepted') throw new Error('unreachable');
    expect(response.outcome.state.mode).toBe('executing-plan');
    expect(response.outcome.state.revision).toBe(2);
    expect(fake.settledCount).toBe(2);
    expect(JSON.stringify(response)).not.toContain(PLAN_TOKEN);
  });

  it('rejects a mismatched plan binding, wrong token, or missing plan mode without dispatch', async () => {
    const fake = new FakeSupervisor();
    const svc = service(fake);
    await readyForExecution(fake, svc);

    const cases: ExecutePlanCommand[] = [
      executePlanCommand({ planId: 'plan_other', controlId: 'c_a' }),
      executePlanCommand({ expectedPlanRevision: 9, controlId: 'c_b' }),
      executePlanCommand({ planToken: 'token_wrong_binding_0000000000000', controlId: 'c_c' }),
      executePlanCommand({ postRunMode: 'build', controlId: 'c_d' }),
    ];
    for (const command of cases) {
      const response = await svc.planControl(command);
      expect(response.outcome.status).toBe('stale');
      expect(fake.settledCount).toBe(1);
    }
  });

  it('fails closed when the host has not published a valid plan artifact', async () => {
    const fake = new FakeSupervisor();
    const svc = service(fake);
    await svc.hydrate();
    fake.emitPlanArtifact({ validity: 'superseded' });
    await svc.planControl(setModeCommand('plan', 0, 'plan_mode_superseded'));

    const stale = await svc.planControl(executePlanCommand({ controlId: 'c_no_plan' }));
    expect(stale.outcome.status).toBe('stale');
    expect(fake.settledCount).toBe(1);

    // A malformed artifact publication drops the binding entirely.
    fake.emitPlanArtifact({ planToken: 'short' } as never);
    const dropped = await svc.planControl(
      executePlanCommand({ controlId: 'c_dropped', expectedRuntimeRevision: 1 }),
    );
    expect(dropped.outcome.status).toBe('stale');
    expect(svc.getState()?.plan).toEqual({
      planId: null,
      planRevision: 0,
      validity: 'none',
      artifact: null,
    });
    expect(fake.settledCount).toBe(1);
  });

  it('lets ten repeated submissions with one control ID produce one host mutation', async () => {
    const fake = new FakeSupervisor();
    const svc = service(fake);
    await readyForExecution(fake, svc);

    const command = executePlanCommand();
    const settled = await svc.planControl(command);
    const repeats = await Promise.all(Array.from({ length: 9 }, () => svc.planControl(command)));
    expect(repeats.every((response) => response === settled)).toBe(true);
    expect(fake.settledCount).toBe(2);
    expect(repeats.every((response) => JSON.stringify(response).includes('accepted'))).toBe(true);
  });

  it('answers two clients acting on one revision with one accepted and one stale', async () => {
    const fake = new FakeSupervisor();
    const svc = service(fake);
    await svc.hydrate();

    const [first, second] = await Promise.all([
      svc.planControl(setModeCommand('plan', 0, 'client_a')),
      svc.planControl(setModeCommand('plan', 0, 'client_b')),
    ]);

    const statuses = [first.outcome.status, second.outcome.status].sort();
    expect(statuses).toEqual(['accepted', 'stale']);
    expect(fake.settledCount).toBe(1);
    expect(svc.getRevision()).toBe(1);
  });

  it('reports delivery-unknown on transport failure without any automatic second request', async () => {
    const fake = new FakeSupervisor();
    const svc = service(fake);
    await readyForExecution(fake, svc);

    fake.rejectSettled = true;
    const response = await svc.planControl(executePlanCommand({ controlId: 'c_delivery' }));

    expect(response.outcome).toEqual({
      status: 'delivery-unknown',
      reasonCode: 'delivery_unknown',
      issueCode: 'delivery-unknown',
    });
    expect(fake.settledCount).toBe(2);
    // Replaying the same control ID returns the settled outcome and never retries.
    expect(await svc.planControl(executePlanCommand({ controlId: 'c_delivery' }))).toBe(response);
    expect(fake.settledCount).toBe(2);
    // A fresh control ID also does not auto-retry the failed mutation.
    expect(
      (await svc.planControl(executePlanCommand({ controlId: 'c_delivery_2' }))).outcome.status,
    ).toBe('delivery-unknown');
    expect(fake.settledCount).toBe(3);
  });

  it('rejects stale runtime revisions and unavailable hosts with no pi dispatch', async () => {
    const fake = new FakeSupervisor();
    const svc = service(fake);
    await readyForExecution(fake, svc);

    const stale = await svc.planControl(setModeCommand('plan', 9, 'c_stale'));
    expect(stale.outcome.status).toBe('stale');
    expect(fake.settledCount).toBe(1);

    const unavailable = service(new FakeSupervisor());
    const blocked = await unavailable.planControl(setModeCommand('plan', 0, 'c_unavail'));
    expect(blocked.outcome).toEqual({
      status: 'unavailable',
      reasonCode: 'runtime_unavailable',
      issueCode: 'host-unavailable',
    });
  });

  it('maps a host rejection to a bounded policy outcome without exposing the raw error', async () => {
    const fake = new FakeSupervisor();
    const svc = service(fake);
    await readyForExecution(fake, svc);

    fake.hostReject = true;
    const response = await svc.planControl(executePlanCommand({ controlId: 'c_reject' }));

    expect(response.outcome).toEqual({
      status: 'policy_blocked',
      reasonCode: 'policy_blocked',
      issueCode: 'unsupported',
    });
    expect(JSON.stringify(response)).not.toContain('/Users/private');
    expect(JSON.stringify(response)).not.toContain('SECRET');
  });
});
