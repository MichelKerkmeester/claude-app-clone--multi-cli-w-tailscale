// ───────────────────────────────────────────────────────────────────
// MODULE: Filtered Command Catalog Service
// ───────────────────────────────────────────────────────────────────

import type {
  CommandCatalogDto,
  CommandDescriptorDto,
  PiRpcResponse,
} from '@pi-remote/pi-rpc-protocol';

import type { RpcSupervisor } from '../rpc/supervisor.js';
import { projectCommandCatalog } from '../store/redaction.js';

// Names that could carry a privileged or destructive action are hidden from the
// phone by default. Discovery is a convenience; it must never widen what a remote
// device can reach beyond the ticketed prompt path.
const PRIVILEGED_COMMAND_PATTERN =
  /credential|password|secret|token|api[-_]?key|authoriz|login|logout|session|reload|share|install|uninstall|package|trust|revoke|reset|delete|shutdown|exit|quit/i;

export interface CommandServiceOptions {
  readonly sessionId: string;
}

/** Expose only a safe, redacted slice of the host command catalog. */
export class CommandService {
  private revision = 0;
  private allowedNames = new Set<string>();

  public constructor(
    private readonly supervisor: RpcSupervisor,
    private readonly options: CommandServiceOptions,
  ) {}

  /** Fetch, redact, and safe-filter the host commands, bumping the catalog revision. */
  public async listCommands(): Promise<CommandCatalogDto> {
    const revision = this.revision;
    const response = await this.supervisor.send({ type: 'get_commands' });
    const projected = projectCommandCatalog(dataOf(response), this.options.sessionId, revision);
    if (projected === null) {
      throw new Error('host command catalog could not be projected');
    }
    const commands = projected.commands.filter(isSafeCommand);
    this.revision = revision + 1;
    this.allowedNames = new Set(commands.map((command) => command.name));
    return { sessionId: this.options.sessionId, revision, commands };
  }

  /**
   * Revalidate a leading-slash prompt against the freshly filtered catalog. A slash
   * command the phone may not see must never be smuggled through the prompt path.
   */
  public async isSlashCommandAllowed(name: string): Promise<boolean> {
    await this.listCommands();
    return this.allowedNames.has(name);
  }
}

function isSafeCommand(descriptor: CommandDescriptorDto): boolean {
  const name = descriptor.name;
  if (name.length === 0 || name.startsWith('!') || name.includes('$') || name.includes(' ')) {
    return false;
  }
  return !PRIVILEGED_COMMAND_PATTERN.test(name);
}

function dataOf(response: PiRpcResponse): unknown {
  return response.success === true ? response.data : undefined;
}
