// ───────────────────────────────────────────────────────────────────
// MODULE: Runtime Authority Core Tests
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import type {
  PiRpcCommand,
  PiRpcEvent,
  PiRpcResponse,
  RuntimeControlCommand,
  RuntimeOperation,
} from '@pi-remote/pi-rpc-protocol';
import { isRuntimeStateDto } from '@pi-remote/pi-rpc-protocol';

import type { RpcSupervisor, SupervisorLifecycleEvent } from '../src/rpc/supervisor.js';
import {
  projectCommandCatalog,
  projectRuntimeModelCatalog,
  projectRuntimeState,
} from '../src/store/redaction.js';
import { RuntimeService } from '../src/runtime/runtime-service.js';

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

  private respond(command: PiRpcCommand): PiRpcResponse {
    switch (command.type) {
      case 'get_state':
        return ok({ thinkingLevel: this.thinkingLevel, model: this.model, streaming: false });
      case 'get_available_thinking_levels':
        return ok(this.levels);
      case 'get_available_models':
        return ok(this.models);
      case 'set_model': {
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
        const mode =
          (command as unknown as { message: string }).message === '/plan on' ? 'plan' : 'build';
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
  return {
    type: 'runtime.control',
    controlId,
    sessionId: SESSION,
    expectedRevision,
    operation,
    ticket: 'ticket_abcdef',
  };
}

describe('runtime authority core', () => {
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

    expect(badModel.outcome.status).toBe('unsupported');
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
    expect(svc.getRevision()).toBe(0);
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
            path: '/opt/models/x',
            authorization: 'Bearer y',
          },
        ],
      },
      SESSION,
      3,
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
    // The path-like command name was dropped; only the safe descriptor survives.
    expect(commands?.commands).toHaveLength(1);
    expect(commands?.commands[0]?.name).toBe('plan');
  });
});
