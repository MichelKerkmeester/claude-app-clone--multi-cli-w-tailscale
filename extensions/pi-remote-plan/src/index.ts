type PlanMode = 'build' | 'plan' | 'executing-plan';

export const STATUS_KEY = 'pi-remote-plan-mode';

interface ExtensionUIContext {
  setStatus(key: string, text: string | undefined): void;
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
const READ_ONLY_BASH_TOOLS = [
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

export default function (pi: ExtensionAPI) {
  let mode: PlanMode = 'build';
  let capturedTools: string[] | undefined;

  const publishMode = (ctx: ExtensionContext): void => {
    ctx.ui.setStatus(STATUS_KEY, mode);
  };

  const publishError = (ctx: ExtensionContext): void => {
    ctx.ui.setStatus(STATUS_KEY, 'error');
  };

  const restoreTools = (ctx: ExtensionContext): boolean => {
    if (capturedTools === undefined) return true;

    try {
      pi.setActiveTools(capturedTools);
      const activeTools = pi.getActiveTools();
      if (!capturedTools.every((tool) => activeTools.includes(tool))) {
        publishError(ctx);
        return false;
      }
      return true;
    } catch {
      publishError(ctx);
      return false;
    }
  };

  const enterPlan = (ctx: ExtensionContext): void => {
    if (capturedTools === undefined) capturedTools = [...pi.getActiveTools()];
    pi.setActiveTools(capturedTools.filter((tool) => tool !== 'edit' && tool !== 'write'));
    mode = 'plan';
    publishMode(ctx);
  };

  const enterBuild = (ctx: ExtensionContext): void => {
    if (!restoreTools(ctx)) return;
    capturedTools = undefined;
    mode = 'build';
    publishMode(ctx);
  };

  const executePlan = (ctx: ExtensionContext): void => {
    if (!restoreTools(ctx)) return;
    mode = 'executing-plan';
    publishMode(ctx);
    capturedTools = undefined;
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
          executePlan(ctx);
          return;
        case 'status':
          publishMode(ctx);
          return;
        default:
          publishError(ctx);
      }
    },
  });

  pi.on('tool_call', async (event) => {
    if (mode !== 'plan') return undefined;

    if (event.toolName === 'edit' || event.toolName === 'write') {
      return { block: true, reason: 'Plan mode is read-only.' };
    }

    if (event.toolName !== 'bash') return undefined;

    const command = String(event.input.command ?? '');
    if (!isReadOnlyBash(command)) {
      return { block: true, reason: 'Plan mode allows only read-only bash.' };
    }

    return undefined;
  });
}

function isReadOnlyBash(command: string): boolean {
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
