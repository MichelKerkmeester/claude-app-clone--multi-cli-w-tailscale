import {
  PLAN_ARTIFACT_KEY,
  PlanArtifactAdapter,
  type PlanArtifact,
  type PlanArtifactPublication,
  type PlanDraft,
} from './plan-artifact.js';

type PlanMode = 'build' | 'plan' | 'executing-plan';

export const STATUS_KEY = 'pi-remote-plan-mode';

/**
 * The only error text published for plan-safety failures. Bounded by design:
 * restoration and handoff failures never carry host detail, paths, or secrets.
 */
export const PLAN_SAFETY_ERROR = 'Plan safety could not be verified';

/**
 * Bounded execution lease. A successful handoff restores the full tool set for
 * at most this long; the lease then forces Plan restrictions back even if no
 * terminal agent event was observed.
 */
export const EXECUTION_LEASE_MS = 60 * 60_000;

interface ExtensionUIContext {
  setStatus(key: string, text: string | undefined): void;
  setPlan(key: string, publication: PlanArtifactPublication): void;
  reportError(message: string): void;
}

interface ExtensionContext {
  ui: ExtensionUIContext;
  mode: 'tui' | 'rpc' | 'json' | 'print';
}

type ExtensionCommandContext = ExtensionContext;

interface ToolCallEvent {
  toolName: string;
  input: Record<string, unknown>;
}

interface ToolCallResult {
  block: true;
  reason?: string;
  terminate?: boolean;
}

interface ExtensionAPI {
  on(
    event: 'tool_call',
    handler: (
      event: ToolCallEvent,
      context: ExtensionContext,
    ) => Promise<ToolCallResult | undefined> | ToolCallResult | undefined,
  ): void;
  on(event: 'agent_end', handler: (event: unknown, context: ExtensionContext) => void): void;
  registerCommand(
    name: string,
    options: {
      description: string;
      handler: (args: string, context: ExtensionCommandContext) => Promise<void>;
    },
  ): void;
  getActiveTools(): string[];
  setActiveTools(toolNames: string[]): void;
}

// Only bins that cannot mutate the workspace through their own flags. `find`,
// `sed`, `awk`, and `tee` are deliberately excluded: they write via primaries or
// flags (`find -delete`/`-exec`, `sed -i`, redirection) with no shell operator to
// catch. Read-only discovery in plan mode goes through pi's dedicated read/grep/
// find/ls tools, which are allowed as non-bash tool calls.
export const READ_ONLY_BASH_TOOLS = [
  'ls',
  'cat',
  'head',
  'tail',
  'grep',
  'rg',
  'pwd',
  'echo',
  'wc',
  'stat',
  'file',
  'which',
  'tree',
  'git',
] as const;

const READ_ONLY_GIT_COMMANDS = [
  'status',
  'log',
  'diff',
  'show',
  'branch',
  'remote',
  'rev-parse',
] as const;

const SHELL_CONTROL_TOKENS = [';', '&', '|', '>', '<', '`', '$(', '\n'];

/** Built-in tools that can mutate the workspace; never active during plan mode. */
export const MUTATION_CAPABLE_BUILTINS = ['edit', 'write', 'fetch', 'apply_patch'] as const;

/** Non-bash built-ins that are read-only by construction. */
export const READ_ONLY_BUILTIN_TOOLS = ['read', 'grep', 'find', 'ls'] as const;

/**
 * Extension/MCP tools the host has explicitly classified read-only. Empty until
 * a capability registry exists; until then every unknown tool stays denied.
 */
const READ_ONLY_EXTENSION_TOOLS: ReadonlySet<string> = new Set();

export interface PlanHost {
  acceptPlan(draft: PlanDraft, ctx: ExtensionContext): PlanArtifact;
  invalidatePlan(validity: 'superseded' | 'invalid', ctx: ExtensionContext): PlanArtifact | null;
}

/**
 * Default-deny plan classification. Only explicit read-only built-ins and
 * explicitly classified extension/MCP tools pass; unknown built-ins, unknown
 * extension tools, and unknown MCP tools are mutation-capable until proven
 * otherwise. Bash is classified separately against the narrow allowlist.
 */
export function isPlanReadOnlyTool(
  toolName: string,
  readOnlyExtensionTools: ReadonlySet<string> = READ_ONLY_EXTENSION_TOOLS,
): boolean {
  if ((READ_ONLY_BUILTIN_TOOLS as readonly string[]).includes(toolName)) return true;
  return readOnlyExtensionTools.has(toolName);
}

export default function piRemotePlan(pi: ExtensionAPI): PlanHost {
  let mode: PlanMode = 'build';
  let capturedTools: string[] | undefined;
  let leaseTimer: ReturnType<typeof setTimeout> | undefined;
  const artifact = new PlanArtifactAdapter();

  const publishMode = (ctx: ExtensionContext): void => {
    ctx.ui.setStatus(STATUS_KEY, mode);
  };

  const publishError = (ctx: ExtensionContext): void => {
    ctx.ui.setStatus(STATUS_KEY, 'error');
  };

  const reportPlanSafetyError = (ctx: ExtensionContext): void => {
    ctx.ui.reportError(PLAN_SAFETY_ERROR);
  };

  const publishPlan = (ctx: ExtensionContext, publication: PlanArtifactPublication): void => {
    ctx.ui.setPlan(publication.statusKey, publication);
  };

  const clearLease = (): void => {
    if (leaseTimer !== undefined) {
      clearTimeout(leaseTimer);
      leaseTimer = undefined;
    }
  };

  const applyToolSet = (tools: string[], verify: (active: string[]) => boolean): boolean => {
    try {
      pi.setActiveTools(tools);
      return verify(pi.getActiveTools());
    } catch {
      return false;
    }
  };

  const restoreTools = (ctx: ExtensionContext): boolean => {
    const full = capturedTools;
    if (full === undefined) return true;

    if (!applyToolSet(full, (active) => full.every((tool) => active.includes(tool)))) {
      publishError(ctx);
      return false;
    }
    return true;
  };

  const enterPlan = (ctx: ExtensionContext): void => {
    if (capturedTools === undefined) capturedTools = [...pi.getActiveTools()];
    pi.setActiveTools(restrictedTools());
    mode = 'plan';
    publishMode(ctx);
  };

  const enterBuild = (ctx: ExtensionContext): void => {
    clearLease();
    if (!restoreTools(ctx)) return;
    capturedTools = undefined;
    mode = 'build';
    publishMode(ctx);
  };

  /** The plan-restricted tool set: the captured set minus mutation-capable built-ins. */
  const restrictedTools = (): string[] =>
    (capturedTools ?? [...pi.getActiveTools()]).filter(
      (tool) => !(MUTATION_CAPABLE_BUILTINS as readonly string[]).includes(tool),
    );

  /**
   * Reapply Plan restrictions after execution. The classifier gate is the real
   * enforcement; the active-tool set is verified as well so no mutation-capable
   * built-in survives an execution episode.
   */
  const restorePlanRestrictions = (ctx: ExtensionContext): boolean => {
    if (capturedTools === undefined) capturedTools = [...pi.getActiveTools()];
    const full = capturedTools;
    const restricted = restrictedTools();
    const verified = (active: string[]): boolean =>
      restricted.every((tool) => active.includes(tool)) &&
      full
        .filter((tool) => (MUTATION_CAPABLE_BUILTINS as readonly string[]).includes(tool))
        .every((tool) => !active.includes(tool));
    if (!applyToolSet(restricted, verified)) {
      publishError(ctx);
      return false;
    }
    return true;
  };

  /**
   * Atomic handoff: full tools return only when restoration succeeds, and the
   * bounded lease starts only after the handoff has been published.
   */
  const beginExecution = (ctx: ExtensionContext): boolean => {
    if (!restoreTools(ctx)) {
      reportPlanSafetyError(ctx);
      return false;
    }
    clearLease();
    mode = 'executing-plan';
    publishMode(ctx);
    leaseTimer = setTimeout(() => endExecution(ctx), EXECUTION_LEASE_MS);
    return true;
  };

  /** Every terminal path — success, cancellation, failure, lease expiry — restores Plan. */
  const endExecution = (ctx: ExtensionContext): void => {
    clearLease();
    if (mode !== 'executing-plan') return;
    if (!restorePlanRestrictions(ctx)) {
      // Restrictions stay active (the classifier gate remains in plan mode);
      // only the bounded safe error is emitted, never host detail.
      mode = 'plan';
      publishError(ctx);
      reportPlanSafetyError(ctx);
      return;
    }
    mode = 'plan';
    publishMode(ctx);
  };

  pi.registerCommand('plan', {
    description: 'Toggle or control read-only plan mode',
    handler: async (args, ctx) => {
      switch (args.trim()) {
        case '':
          if (mode === 'build') {
            enterPlan(ctx);
          } else {
            enterBuild(ctx);
          }
          return;
        case 'on':
          enterPlan(ctx);
          return;
        case 'off':
          enterBuild(ctx);
          return;
        case 'execute':
          beginExecution(ctx);
          return;
        case 'status':
          publishMode(ctx);
          return;
        default:
          publishError(ctx);
      }
    },
  });

  pi.on('agent_end', (_event, ctx) => {
    endExecution(ctx);
  });

  pi.on('tool_call', async (event) => {
    if (mode !== 'plan') return undefined;

    if (event.toolName === 'bash') {
      const command = String(event.input.command ?? '');
      if (!isReadOnlyBash(command)) {
        return { block: true, reason: 'Plan mode allows only read-only bash.' };
      }
      return undefined;
    }

    // Default-deny: only explicitly read-only tools pass; every unclassified
    // built-in, extension, and MCP tool is mutation-capable in plan mode.
    if (!isPlanReadOnlyTool(event.toolName)) {
      return { block: true, reason: 'Plan mode is read-only.' };
    }
    return undefined;
  });

  return {
    acceptPlan: (draft, ctx) => {
      const { superseded, accepted } = artifact.accept(draft);
      // Invalidation of the old binding is authoritative before the replacement.
      if (superseded !== null) publishPlan(ctx, superseded);
      publishPlan(ctx, accepted);
      return artifact.get() as PlanArtifact;
    },
    invalidatePlan: (validity, ctx) => {
      const publication = artifact.invalidate(validity);
      if (publication === null) return null;
      publishPlan(ctx, publication);
      return artifact.get();
    },
  };
}

export function isReadOnlyBash(command: string): boolean {
  if (SHELL_CONTROL_TOKENS.some((token) => command.includes(token))) return false;

  const tokens = command.trim() === '' ? [] : command.trim().split(/\s+/);
  const bin = tokens[0];
  if (
    bin === undefined ||
    !READ_ONLY_BASH_TOOLS.includes(bin as (typeof READ_ONLY_BASH_TOOLS)[number])
  ) {
    return false;
  }

  if (bin !== 'git') return true;

  const subcommand = tokens[1];
  return (
    subcommand !== undefined &&
    READ_ONLY_GIT_COMMANDS.includes(subcommand as (typeof READ_ONLY_GIT_COMMANDS)[number])
  );
}
