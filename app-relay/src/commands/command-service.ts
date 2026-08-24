// ───────────────────────────────────────────────────────────────────
// MODULE: Versioned Command Catalog Authority
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { randomUUID } from 'node:crypto';

import type {
  CommandBindingDto,
  CommandCatalogDto,
  CommandDescriptorDto,
  PiRpcResponse,
  SlashSubmitIssueCode,
} from '@pi-remote/pi-rpc-protocol';

import type { RpcSupervisor } from '../rpc/supervisor.js';
import { projectCommandCatalog } from '../store/redaction.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

// Names that could carry a privileged or destructive action are hidden from the
// phone by default. Discovery is a convenience; it must never widen what a remote
// device can reach beyond the ticketed prompt path.
const PRIVILEGED_COMMAND_PATTERN =
  /credential|password|secret|token|api[-_]?key|authoriz|login|logout|session|reload|share|install|uninstall|package|trust|revoke|reset|delete|shutdown|exit|quit/i;

// The extension's plan control command is host-authoritative: entering, leaving,
// or executing a plan must go through the ticketed plan-control lane, never the
// phone slash catalog. Safe non-control commands stay discoverable.
const PLAN_CONTROL_COMMAND_NAMES = new Set(['plan']);

// ───────────────────────────────────────────────────────────────────
// 3. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type CommandAvailability = 'idle' | 'running';

/** Fail-closed verdict for one explicit slash submission binding. */
export type SlashSubmissionVerdict = 'allowed' | SlashSubmitIssueCode;

export interface CommandServiceOptions {
  readonly sessionId: string;
  /** Explicit host generation identity; omitted only in tests. */
  readonly hostEpoch?: string;
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * The relay's sole authority for what a phone may discover and submit as a slash
 * command. Snapshots are complete replacements bound to the live host epoch,
 * session revision, and catalog revision; there is no fallback catalog and a
 * submission that cannot be proven current and allowed is denied before Pi sees it.
 */
export class CommandService {
  private hostEpoch: string;
  private sessionRevision = 0;
  private catalogRevision = 0;
  private availability: CommandAvailability = 'idle';
  private snapshot: CommandCatalogDto | null = null;
  private allowedNames = new Set<string>();

  public constructor(
    private readonly supervisor: RpcSupervisor,
    private readonly options: CommandServiceOptions,
  ) {
    this.hostEpoch = options.hostEpoch ?? `epoch_${randomUUID()}`;
  }

  /** Fetch, redact, safe-filter, and atomically replace the complete catalog snapshot. */
  public async listCommands(): Promise<CommandCatalogDto> {
    const response = await this.supervisor.send({ type: 'get_commands' });
    const projected = projectCommandCatalog(
      dataOf(response),
      this.options.sessionId,
      this.catalogRevision,
      {
        hostEpoch: this.hostEpoch,
        sessionRevision: this.sessionRevision,
      },
    );
    if (projected === null) {
      throw new Error('host command catalog could not be projected');
    }
    const commands = projected.commands.filter(isSafeCommand);
    if (this.snapshot === null || !sameCommandSet(this.snapshot.commands, commands)) {
      this.catalogRevision += 1;
    }
    this.snapshot = {
      hostEpoch: this.hostEpoch,
      sessionId: this.options.sessionId,
      sessionRevision: this.sessionRevision,
      catalogRevision: this.catalogRevision,
      commands,
    };
    this.allowedNames = new Set(commands.map((command) => command.name));
    return this.snapshot;
  }

  /** The last complete bounded snapshot, or null before the first host read. */
  public getSnapshot(): CommandCatalogDto | null {
    return this.snapshot;
  }

  public getAvailability(): CommandAvailability {
    return this.availability;
  }

  /** Record a settled-availability transition; every change ages out prior bindings. */
  public setAvailability(availability: CommandAvailability): void {
    if (this.availability !== availability) {
      this.availability = availability;
      this.sessionRevision += 1;
    }
  }

  /** Drop everything a previous host generation proved; nothing may outlive it. */
  public invalidate(): void {
    this.hostEpoch = `epoch_${randomUUID()}`;
    this.snapshot = null;
    this.allowedNames.clear();
    this.availability = 'idle';
  }

  /**
   * Fail-closed revalidation for one explicit slash submission. A mismatch in host
   * epoch, session revision, or the fresh catalog revision is stale; an unknown,
   * hidden, or currently-unsafe name is denied. Neither outcome reaches Pi.
   */
  public async revalidateSlashSubmission(
    binding: CommandBindingDto,
  ): Promise<SlashSubmissionVerdict> {
    if (binding.hostEpoch !== this.hostEpoch) return 'stale_catalog';
    if (binding.sessionRevision !== this.sessionRevision) return 'stale_catalog';
    if (this.availability !== 'idle') return 'command_denied';
    const snapshot = await this.listCommands();
    // The availability check must also hold after the fresh read completes.
    if (this.availability !== 'idle') return 'command_denied';
    if (binding.catalogRevision !== snapshot.catalogRevision) return 'stale_catalog';
    if (!this.allowedNames.has(binding.name)) return 'command_denied';
    return 'allowed';
  }
}

// ───────────────────────────────────────────────────────────────────
// 5. HELPERS
// ───────────────────────────────────────────────────────────────────

function isSafeCommand(descriptor: CommandDescriptorDto): boolean {
  return (
    !PLAN_CONTROL_COMMAND_NAMES.has(descriptor.name) &&
    !PRIVILEGED_COMMAND_PATTERN.test(descriptor.name)
  );
}

function sameCommandSet(
  left: readonly CommandDescriptorDto[],
  right: readonly CommandDescriptorDto[],
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function dataOf(response: PiRpcResponse): unknown {
  return response.success === true ? response.data : undefined;
}
