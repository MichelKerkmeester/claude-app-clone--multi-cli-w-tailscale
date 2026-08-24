// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Plan Mode TESTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from 'vitest';

import piRemotePlan, {
  EXECUTION_LEASE_MS,
  PLAN_SAFETY_ERROR,
  STATUS_KEY,
  isPlanReadOnlyTool,
} from '../src/index.js';
import type { PlanArtifactPublication, PlanDraft } from '../src/plan-artifact.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

type PlanApi = Parameters<typeof piRemotePlan>[0];
type CommandOptions = Parameters<PlanApi['registerCommand']>[1];
type CommandHandler = CommandOptions['handler'];
type ToolCallHandler = Parameters<PlanApi['on']>[1];
type ToolCallEvent = Parameters<ToolCallHandler>[0];
type AgentEndHandler = Parameters<PlanApi['on']>[1];
type TestContext = Parameters<CommandHandler>[1];

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

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

  it('denies every unclassified mutation-capable tool, including built-ins, extension tools, and MCP tools', async () => {
    const fixture = createFixture();
    await runCommand(fixture, 'on');

    for (const toolName of [
      'edit',
      'write',
      'fetch',
      'apply_patch',
      'my-extension-tool',
      'mcp__filesystem__write_file',
      'mcp__server__delete',
      'another-extension',
    ]) {
      expect(await runTool(fixture, toolName, {})).toEqual({
        block: true,
        reason: 'Plan mode is read-only.',
      });
    }
    // The read-only built-ins stay permitted; bash is gated separately.
    expect(await runTool(fixture, 'read', { path: 'a' })).toBeUndefined();
    expect(await runTool(fixture, 'grep', { pattern: 'x', path: '.' })).toBeUndefined();
  });

  it('permits only extension or MCP tools the host explicitly classified read-only', () => {
    const readOnly = new Set(['mcp__search__lookup']);
    expect(isPlanReadOnlyTool('mcp__search__lookup', readOnly)).toBe(true);
    expect(isPlanReadOnlyTool('mcp__server__write_file', readOnly)).toBe(false);
    expect(isPlanReadOnlyTool('read')).toBe(true);
    expect(isPlanReadOnlyTool('write')).toBe(false);
    expect(isPlanReadOnlyTool('bash')).toBe(false);
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
    prepareExecution(fixture);
    await runCommand(fixture, 'execute');

    expect(fixture.activeTools).toEqual(fixture.originalTools);
    expect(fixture.statusCalls.at(-1)).toEqual([STATUS_KEY, 'executing-plan']);
    expect(await runTool(fixture, 'bash', { command: 'rm -rf x' })).toBeUndefined();
  });

  it('stays in plan mode and emits only the bounded error when restoring tools fails', async () => {
    const fixture = createFixture();

    await runCommand(fixture, 'on');
    fixture.restoreWorks = false;
    await runCommand(fixture, 'execute');

    expect(fixture.activeTools).not.toEqual(fixture.originalTools);
    expect(fixture.statusCalls.at(-1)).toEqual([STATUS_KEY, 'error']);
    expect(fixture.errorReports).toEqual([PLAN_SAFETY_ERROR]);
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

  it('never publishes a plan-ready artifact from prose, tool activity, or status alone', async () => {
    const fixture = createFixture();

    await runCommand(fixture, 'on');
    await runTool(fixture, 'read', { path: 'a' });
    await runTool(fixture, 'bash', { command: 'ls -la' });
    await runCommand(fixture, 'status');
    runAgentEnd(fixture);

    expect(fixture.planPublications).toEqual([]);
  });

  it('publishes a structured bounded artifact with a host-minted opaque token', async () => {
    const fixture = createFixture();

    const artifact = fixture.host.acceptPlan(
      {
        title: 'Harden the relay boundary',
        summary: 'Redacted outline only',
        steps: [{ do: 'x' }, { do: 'y' }],
        approaches: [{ label: 'Fast' }, { label: 'Safe' }],
      },
      fixture.ctx,
    );

    expect(artifact.validity).toBe('valid');
    expect(artifact.planRevision).toBe(1);
    expect(artifact.stepCount).toBe(2);
    expect(artifact.approachCount).toBe(2);
    expect(artifact.approachIds).toHaveLength(2);
    expect(artifact.planToken).toMatch(/^[A-Za-z0-9][A-Za-z0-9_-]{15,255}$/);
    expect(artifact.planToken).not.toContain('Harden');
    expect(artifact.planToken).not.toContain('relay');

    expect(fixture.planPublications).toHaveLength(1);
    const publication = fixture.planPublications[0];
    expect(publication).not.toBeUndefined();
    expect(publication?.type).toBe('extension_ui_request');
    expect(publication?.method).toBe('setPlan');
    expect(publication?.statusKey).toBe('pi-remote-plan-artifact');
    expect(publication?.plan).toEqual({
      planId: artifact.planId,
      planRevision: 1,
      planToken: artifact.planToken,
      validity: 'valid',
      title: 'Harden the relay boundary',
      summary: 'Redacted outline only',
      stepCount: 2,
      approachCount: 2,
    });
    // Raw plan step content never crosses the projection.
    expect(JSON.stringify(publication)).not.toContain('"do":"x"');
  });

  it('keeps the stable plan id, increments the revision, and mints a fresh token per accept', async () => {
    const fixture = createFixture();

    const first = fixture.host.acceptPlan(draft('first'), fixture.ctx);
    const second = fixture.host.acceptPlan(draft('first'), fixture.ctx);

    expect(second.planId).toBe(first.planId);
    expect(second.planRevision).toBe(first.planRevision + 1);
    expect(second.planToken).not.toBe(first.planToken);
    // Identical text with unrelated tokens: the token is never derived from the plan.
    expect(second.planToken).not.toContain('first');
  });

  it('invalidates the old artifact before a replacement is accepted', async () => {
    const fixture = createFixture();

    const first = fixture.host.acceptPlan(draft('first'), fixture.ctx);
    fixture.planPublications.length = 0;
    fixture.host.acceptPlan(draft('second'), fixture.ctx);

    expect(fixture.planPublications.map((publication) => publication.plan.validity)).toEqual([
      'superseded',
      'valid',
    ]);
    expect(fixture.planPublications[0]?.plan.planId).toBe(first.planId);
    expect(fixture.planPublications[0]?.plan.planRevision).toBe(first.planRevision);
    expect(fixture.planPublications[1]?.plan.planRevision).toBe(first.planRevision + 1);
  });

  it('marks the artifact superseded or invalid on host invalidation', async () => {
    const fixture = createFixture();

    fixture.host.acceptPlan(draft('first'), fixture.ctx);
    fixture.planPublications.length = 0;

    expect(fixture.host.invalidatePlan('superseded', fixture.ctx)?.validity).toBe('superseded');
    expect(fixture.planPublications.at(-1)?.plan.validity).toBe('superseded');
    // Nothing valid remains, so a second invalidation publishes nothing.
    expect(fixture.host.invalidatePlan('invalid', fixture.ctx)).toBeNull();
    expect(fixture.planPublications).toHaveLength(1);
  });

  it('bounds and redacts projection fields before publishing', async () => {
    const fixture = createFixture();

    const artifact = fixture.host.acceptPlan(
      {
        title: 'Fix /Users/operator/private-repo with token=sk-secret and https://example.com/x',
        summary: `Plan\u0000summary ${'x'.repeat(2_500)}`,
        steps: Array.from({ length: 12_000 }, () => ({})),
        approaches: [{ label: '/etc/passwd approach' }, { label: '' }],
      },
      fixture.ctx,
    );

    expect(artifact.title).toContain('[REDACTED_PATH]');
    expect(artifact.title).toContain('[REDACTED_SECRET]');
    expect(artifact.title).not.toContain('/Users/operator');
    expect(artifact.title).not.toContain('sk-secret');
    expect(artifact.title).not.toContain('https://');
    expect(artifact.summary.length).toBeLessThanOrEqual(2_000);
    expect(artifact.summary).not.toContain('\u0000');
    expect(artifact.stepCount).toBe(10_000);
    expect(artifact.approachCount).toBe(1);
    expect(artifact.approachIds).toHaveLength(1);
  });

  it('requires the exact reviewed binding before publishing executing-plan', async () => {
    const fixture = createFixture();
    await runCommand(fixture, 'on');
    const artifact = fixture.host.acceptPlan(draft('handoff'), fixture.ctx);

    expect(
      fixture.host.executePlan(
        {
          planId: artifact.planId,
          planRevision: artifact.planRevision,
          planToken: 'token_plan_binding_wrong_1234',
        },
        fixture.ctx,
      ),
    ).toBe(false);
    expect(fixture.statusCalls.at(-1)).toEqual([STATUS_KEY, 'error']);
    expect(fixture.activeTools).toEqual(['read', 'bash', 'grep']);

    expect(
      fixture.host.executePlan(
        {
          planId: artifact.planId,
          planRevision: artifact.planRevision,
          planToken: artifact.planToken,
        },
        fixture.ctx,
      ),
    ).toBe(true);
    expect(fixture.activeTools).toEqual(fixture.originalTools);
    expect(fixture.statusCalls.at(-1)).toEqual([STATUS_KEY, 'executing-plan']);
  });

  it('rejects a draft that projects to an empty bounded field', () => {
    const fixture = createFixture();

    expect(() =>
      fixture.host.acceptPlan({ title: '\u0000\u0000', summary: '', steps: [] }, fixture.ctx),
    ).toThrow(TypeError);
    expect(fixture.planPublications).toEqual([]);
  });

  it('restores plan restrictions on the terminal agent event after execution', async () => {
    const fixture = createFixture();

    await runCommand(fixture, 'on');
    prepareExecution(fixture);
    await runCommand(fixture, 'execute');
    expect(fixture.activeTools).toEqual(fixture.originalTools);

    runAgentEnd(fixture);

    expect(fixture.activeTools).toEqual(['read', 'bash', 'grep']);
    expect(fixture.statusCalls.at(-1)).toEqual([STATUS_KEY, 'plan']);
    expect(await runTool(fixture, 'bash', { command: 'rm -rf x' })).toEqual({
      block: true,
      reason: 'Plan mode allows only read-only bash.',
    });
    expect(await runTool(fixture, 'edit', { path: 'a', content: 'b' })).toEqual({
      block: true,
      reason: 'Plan mode is read-only.',
    });

    // A repeated terminal event is a no-op.
    runAgentEnd(fixture);
    expect(fixture.statusCalls.at(-1)).toEqual([STATUS_KEY, 'plan']);
  });

  it('restores plan restrictions when the bounded execution lease expires', async () => {
    vi.useFakeTimers();
    try {
      const fixture = createFixture();

      await runCommand(fixture, 'on');
      prepareExecution(fixture);
      await runCommand(fixture, 'execute');
      expect(fixture.statusCalls.at(-1)).toEqual([STATUS_KEY, 'executing-plan']);

      vi.advanceTimersByTime(EXECUTION_LEASE_MS);

      expect(fixture.activeTools).toEqual(['read', 'bash', 'grep']);
      expect(fixture.statusCalls.at(-1)).toEqual([STATUS_KEY, 'plan']);
      expect(await runTool(fixture, 'bash', { command: 'rm -rf x' })).toEqual({
        block: true,
        reason: 'Plan mode allows only read-only bash.',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps restrictions active and emits only the bounded error when restoration fails after execution', async () => {
    const fixture = createFixture();

    await runCommand(fixture, 'on');
    prepareExecution(fixture);
    await runCommand(fixture, 'execute');
    fixture.restoreWorks = false;
    runAgentEnd(fixture);

    expect(fixture.statusCalls.at(-1)).toEqual([STATUS_KEY, 'error']);
    expect(fixture.errorReports).toEqual([PLAN_SAFETY_ERROR]);
    expect(await runTool(fixture, 'bash', { command: 'rm -rf x' })).toEqual({
      block: true,
      reason: 'Plan mode allows only read-only bash.',
    });
    expect(await runTool(fixture, 'edit', { path: 'a', content: 'b' })).toEqual({
      block: true,
      reason: 'Plan mode is read-only.',
    });
  });
});

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function draft(title: string): PlanDraft {
  return { title, summary: `Summary of ${title}`, steps: [{ step: title }] };
}

function createFixture() {
  const originalTools = ['read', 'bash', 'edit', 'write', 'grep'];
  let activeTools = [...originalTools];
  const statusCalls: Array<[string, string | undefined]> = [];
  const planPublications: PlanArtifactPublication[] = [];
  const errorReports: string[] = [];
  const registeredCommands = new Map<string, CommandOptions>();
  const toolCallHandlers: ToolCallHandler[] = [];
  const agentEndHandlers: AgentEndHandler[] = [];
  const ctx = {
    mode: 'rpc' as const,
    ui: {
      setStatus: (key: string, text: string | undefined) => {
        statusCalls.push([key, text]);
      },
      setPlan: (_key: string, publication: PlanArtifactPublication) => {
        planPublications.push(publication);
      },
      reportError: (message: string) => {
        errorReports.push(message);
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
    on: (event: 'tool_call' | 'agent_end', handler: ToolCallHandler | AgentEndHandler) => {
      if (event === 'agent_end') {
        agentEndHandlers.push(handler as AgentEndHandler);
      } else {
        toolCallHandlers.push(handler as ToolCallHandler);
      }
    },
    getActiveTools,
    setActiveTools,
  } satisfies PlanApi;

  const host = piRemotePlan(pi);

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
    agentEndHandlers,
    planPublications,
    errorReports,
    host,
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

function prepareExecution(fixture: ReturnType<typeof createFixture>): void {
  fixture.host.acceptPlan(draft('execution'), fixture.ctx);
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

function runAgentEnd(fixture: ReturnType<typeof createFixture>): void {
  const handler = fixture.agentEndHandlers[0];
  if (!handler) throw new Error('agent_end handler was not registered');
  handler({}, fixture.ctx);
}
