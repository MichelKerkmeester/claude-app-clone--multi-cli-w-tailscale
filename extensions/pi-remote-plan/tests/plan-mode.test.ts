import { describe, expect, it, vi } from 'vitest';

import piRemotePlan from '../src/index.js';

type PlanApi = Parameters<typeof piRemotePlan>[0];
type CommandOptions = Parameters<PlanApi['registerCommand']>[1];
type CommandHandler = CommandOptions['handler'];
type ToolCallHandler = Parameters<PlanApi['on']>[1];
type ToolCallEvent = Parameters<ToolCallHandler>[0];
type TestContext = Parameters<CommandHandler>[1];

const STATUS_KEY = 'pi-remote-plan-mode';

describe('Pi remote plan mode', () => {
  it('enters plan mode by removing edit and write and publishing the mode', async () => {
    const fixture = createFixture();

    await runCommand(fixture, 'on');

    expect(fixture.activeTools).toEqual(['read', 'bash', 'grep']);
    expect(fixture.statusCalls.at(-1)).toEqual([STATUS_KEY, 'plan']);
  });

  it('captures the active tools once for a plan episode', async () => {
    const fixture = createFixture();

    await runCommand(fixture, 'on');
    await runCommand(fixture, 'on');

    expect(fixture.getActiveTools).toHaveBeenCalledOnce();
  });

  it('uses the bare command to toggle every mode transition', async () => {
    const fixture = createFixture();

    await runCommand(fixture, '');
    expect(fixture.statusCalls.at(-1)).toEqual([STATUS_KEY, 'plan']);
    await runCommand(fixture, '');
    expect(fixture.statusCalls.at(-1)).toEqual([STATUS_KEY, 'build']);

    await runCommand(fixture, 'on');
    await runCommand(fixture, 'execute');
    await runCommand(fixture, '');

    expect(fixture.activeTools).toEqual(fixture.originalTools);
    expect(fixture.statusCalls.at(-1)).toEqual([STATUS_KEY, 'build']);
  });

  it('allows only the read-only bash allowlist in plan mode', async () => {
    const fixture = createFixture();
    await runCommand(fixture, 'on');

    expect(await runTool(fixture, 'bash', { command: 'ls -la' })).toBeUndefined();
    expect(await runTool(fixture, 'bash', { command: 'rm -rf x' })).toEqual({
      block: true,
      reason: 'Plan mode allows only read-only bash.',
    });
    expect(await runTool(fixture, 'bash', { command: 'cat a && rm b' })).toEqual({
      block: true,
      reason: 'Plan mode allows only read-only bash.',
    });
    expect(await runTool(fixture, 'bash', { command: 'git status' })).toBeUndefined();
    expect(await runTool(fixture, 'bash', { command: 'git push' })).toEqual({
      block: true,
      reason: 'Plan mode allows only read-only bash.',
    });
    // find can mutate via -delete/-exec with no shell operator, so bash-find is blocked.
    expect(await runTool(fixture, 'bash', { command: 'find . -delete' })).toEqual({
      block: true,
      reason: 'Plan mode allows only read-only bash.',
    });
    expect(await runTool(fixture, 'edit', { path: 'a', content: 'b' })).toEqual({
      block: true,
      reason: 'Plan mode is read-only.',
    });
    expect(await runTool(fixture, 'write', { path: 'a', content: 'b' })).toEqual({
      block: true,
      reason: 'Plan mode is read-only.',
    });
  });

  it('fails closed on every listed shell control and allows other tools', async () => {
    const fixture = createFixture();
    await runCommand(fixture, 'on');

    for (const command of [
      'ls; pwd',
      'ls & pwd',
      'ls | cat',
      'cat > out',
      'cat < in',
      'echo `pwd`',
      'echo $(pwd)',
      'pwd\nls',
    ]) {
      expect(await runTool(fixture, 'bash', { command })).toEqual({
        block: true,
        reason: 'Plan mode allows only read-only bash.',
      });
    }
    expect(await runTool(fixture, 'read', { path: 'a' })).toBeUndefined();
    expect(await runTool(fixture, 'find', { path: '.' })).toBeUndefined();
    expect(await runTool(fixture, 'ls', { path: '.' })).toBeUndefined();
  });

  it('restores the exact original tools when leaving plan mode', async () => {
    const fixture = createFixture();

    await runCommand(fixture, 'on');
    await runCommand(fixture, 'off');

    expect(fixture.activeTools).toEqual(fixture.originalTools);
    expect(fixture.statusCalls.at(-1)).toEqual([STATUS_KEY, 'build']);
  });

  it('restores tools and hands off to execution', async () => {
    const fixture = createFixture();

    await runCommand(fixture, 'on');
    await runCommand(fixture, 'execute');

    expect(fixture.activeTools).toEqual(fixture.originalTools);
    expect(fixture.statusCalls.at(-1)).toEqual([STATUS_KEY, 'executing-plan']);
    expect(await runTool(fixture, 'bash', { command: 'rm -rf x' })).toBeUndefined();
  });

  it('stays in plan mode when restoring tools fails', async () => {
    const fixture = createFixture();

    await runCommand(fixture, 'on');
    fixture.restoreWorks = false;
    await runCommand(fixture, 'execute');

    expect(fixture.activeTools).not.toEqual(fixture.originalTools);
    expect(fixture.statusCalls.at(-1)).toEqual([STATUS_KEY, 'error']);
    expect(await runTool(fixture, 'bash', { command: 'rm -rf x' })).toEqual({
      block: true,
      reason: 'Plan mode allows only read-only bash.',
    });
  });

  it('does not block mutating calls outside plan mode', async () => {
    const fixture = createFixture();

    expect(await runTool(fixture, 'bash', { command: 'rm -rf x' })).toBeUndefined();
    expect(await runTool(fixture, 'edit', { path: 'a', content: 'b' })).toBeUndefined();
  });

  it('republishes status without changing the current mode', async () => {
    const fixture = createFixture();

    await runCommand(fixture, 'on');
    fixture.statusCalls.length = 0;
    await runCommand(fixture, 'status');

    expect(fixture.activeTools).toEqual(['read', 'bash', 'grep']);
    expect(fixture.statusCalls).toEqual([[STATUS_KEY, 'plan']]);
  });

  it('rejects unknown command arguments without changing mode or tools', async () => {
    const fixture = createFixture();

    await runCommand(fixture, 'on');
    const restrictedTools = [...fixture.activeTools];
    fixture.statusCalls.length = 0;
    await runCommand(fixture, 'maybe');

    expect(fixture.activeTools).toEqual(restrictedTools);
    expect(fixture.statusCalls).toEqual([[STATUS_KEY, 'error']]);
    await runCommand(fixture, 'status');
    expect(fixture.statusCalls.at(-1)).toEqual([STATUS_KEY, 'plan']);
  });
});

function createFixture() {
  const originalTools = ['read', 'bash', 'edit', 'write', 'grep'];
  let activeTools = [...originalTools];
  const statusCalls: Array<[string, string | undefined]> = [];
  const registeredCommands = new Map<string, CommandOptions>();
  const toolCallHandlers: ToolCallHandler[] = [];
  const ctx = {
    mode: 'rpc' as const,
    ui: {
      setStatus: (key: string, text: string | undefined) => {
        statusCalls.push([key, text]);
      },
    },
  } as TestContext;
  let restoreWorks = true;
  const getActiveTools = vi.fn(() => [...activeTools]);
  const setActiveTools = vi.fn((tools: string[]) => {
    if (restoreWorks) activeTools = [...tools];
  });
  const pi = {
    registerCommand: (name: string, options: CommandOptions) => {
      registeredCommands.set(name, options);
    },
    on: (_event: 'tool_call', handler: ToolCallHandler) => {
      toolCallHandlers.push(handler);
    },
    getActiveTools,
    setActiveTools,
  } satisfies PlanApi;

  piRemotePlan(pi);

  return {
    get activeTools() {
      return activeTools;
    },
    getActiveTools,
    originalTools,
    registeredCommands,
    setActiveTools,
    statusCalls,
    toolCallHandlers,
    ctx,
    get restoreWorks() {
      return restoreWorks;
    },
    set restoreWorks(value: boolean) {
      restoreWorks = value;
    },
  };
}

async function runCommand(fixture: ReturnType<typeof createFixture>, args: string): Promise<void> {
  const command = fixture.registeredCommands.get('plan');
  if (!command) throw new Error('plan command was not registered');
  await command.handler(args, fixture.ctx);
}

async function runTool(
  fixture: ReturnType<typeof createFixture>,
  toolName: string,
  input: Record<string, unknown>,
) {
  const handler = fixture.toolCallHandlers[0];
  if (!handler) throw new Error('tool_call handler was not registered');
  return handler({ toolName, input } as ToolCallEvent, fixture.ctx);
}
