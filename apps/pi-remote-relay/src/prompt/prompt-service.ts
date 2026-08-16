// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Prompt Submission Service
// ───────────────────────────────────────────────────────────────────

import { randomUUID } from 'node:crypto';

import {
  isTranscriptBlock,
  type Envelope,
  type PromptAbortResponse,
  type PromptSubmitCommand,
  type SlashSubmitIssueCode,
  type TextBlock,
} from '@pi-remote/pi-rpc-protocol';

import type { CommandService, SlashSubmissionVerdict } from '../commands/command-service.js';
import type { SyncHub } from '../replay/sync.js';
import type { RpcSupervisor } from '../rpc/supervisor.js';
import type { RelayStore } from '../store/relay-store.js';
import type { TranscriptProjector } from '../store/transcript-projector.js';

interface PromptServiceOptions {
  readonly store: RelayStore;
  readonly syncHub: SyncHub;
  readonly supervisor: RpcSupervisor;
  readonly projector: TranscriptProjector;
  readonly hostId: string;
  readonly workspaceRef: string;
  readonly sessionId: string;
  readonly epoch: string;
  readonly commands?: CommandService;
  readonly now?: () => Date;
}

/** A slash submission that failed revalidation; never retried and never forwarded. */
export class SlashSubmissionError extends Error {
  public constructor(readonly reason: SlashSubmitIssueCode) {
    super(reason);
    this.name = 'SlashSubmissionError';
  }
}

interface SubmissionRecord {
  readonly deviceId: string;
  readonly message: string;
  state: 'processing' | 'complete' | 'delivery-unknown';
  block?: TextBlock;
}

const MAX_SUBMISSION_RECORDS = 256;

/** Send steering input to Pi, then publish only its redacted transcript projection. */
export class PromptService {
  private active = false;
  private readonly submissions = new Map<string, SubmissionRecord>();

  public constructor(private readonly options: PromptServiceOptions) {}

  public async submit(command: PromptSubmitCommand, deviceId: string): Promise<TextBlock> {
    if (command.command !== undefined) {
      const verdict = await this.revalidateSlash(command);
      if (verdict !== 'allowed') throw new SlashSubmissionError(verdict);
    }
    const existing = this.submissions.get(command.submissionId);
    if (existing !== undefined) {
      if (existing.deviceId !== deviceId || existing.message !== command.message) {
        throw new Error('Prompt submission ID was reused with different content.');
      }
      if (existing.state === 'complete' && existing.block !== undefined) return existing.block;
      if (existing.state === 'delivery-unknown') {
        throw new Error('Prompt delivery outcome is unknown; automatic retry is blocked.');
      }
      throw new Error('Prompt submission is already in progress.');
    }
    if (this.active) throw new Error('Another prompt submission is in progress.');

    const record: SubmissionRecord = { deviceId, message: command.message, state: 'processing' };
    this.submissions.set(command.submissionId, record);
    this.pruneSubmissions();
    this.active = true;
    try {
      return await this.submitOne(command, record);
    } finally {
      this.active = false;
    }
  }

  /**
   * Interrupt the running agent. Sent immediately (not through the settled mutation
   * lane) so it can preempt an in-flight turn; an uncertain outcome is delivery-unknown
   * and is never retried automatically.
   */
  public async abort(): Promise<PromptAbortResponse> {
    try {
      const response = await this.options.supervisor.send({
        id: `abort_${randomUUID()}`,
        type: 'abort',
      });
      if (response.success && response.command === 'abort') {
        return { outcome: { status: 'aborted' } };
      }
      return {
        outcome: { status: 'unavailable', reason: response.error ?? 'Pi rejected the abort.' },
      };
    } catch (error: unknown) {
      return {
        outcome: {
          status: 'delivery-unknown',
          reason: error instanceof Error ? error.message : 'Abort transport failed.',
        },
      };
    }
  }

  private async submitOne(
    command: PromptSubmitCommand,
    record: SubmissionRecord,
  ): Promise<TextBlock> {
    if (command.sessionId !== this.options.sessionId) {
      throw new Error('Prompt session is unavailable.');
    }
    let response;
    try {
      response = await this.options.supervisor.send({
        id: command.submissionId,
        type: 'prompt',
        message: command.message,
        // A bound slash submission is explicit and is never steered or queued.
        ...(command.command === undefined && command.streamingBehavior !== undefined
          ? { streamingBehavior: command.streamingBehavior }
          : {}),
      });
    } catch (error: unknown) {
      this.submissions.delete(command.submissionId);
      throw error;
    }
    if (!response.success || response.command !== 'prompt') {
      this.submissions.delete(command.submissionId);
      throw new Error(response.error ?? 'Pi rejected the prompt command.');
    }

    const identity = {
      hostId: this.options.hostId,
      workspaceRef: this.options.workspaceRef,
      sessionId: this.options.sessionId,
    };
    const occurredAt = (this.options.now?.() ?? new Date()).toISOString();
    const block = this.options.projector.projectSubmittedPrompt(
      command.submissionId,
      command.message,
      {
        occurredAt,
        nextSequence: () => this.options.store.nextSequence(identity, this.options.epoch),
      },
    );
    const candidate: Envelope = {
      v: 1,
      eventId: `event_${randomUUID()}`,
      kind: 'transcript.block',
      ...identity,
      epoch: this.options.epoch,
      seq: block.seq,
      occurredAt,
      causedBy: command.submissionId,
      payload: block,
      redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
      replay: { eligible: true, snapshotEligible: true },
    };
    let committed;
    try {
      committed = this.options.syncHub.publish(candidate);
    } catch (error: unknown) {
      record.state = 'delivery-unknown';
      throw error;
    }
    if (
      !isTranscriptBlock(committed.payload) ||
      committed.payload.kind !== 'text' ||
      committed.payload.role !== 'user'
    ) {
      throw new Error('Relay failed to commit the submitted prompt projection.');
    }
    record.state = 'complete';
    record.block = committed.payload;
    return committed.payload;
  }

  /**
   * Fail-closed slash gate before any forwarding. Cross-session, non-matching
   * message prefixes, and missing authority are denied without a host read; the
   * catalog revalidation itself is the only Pi RPC a stale check may cause.
   */
  private async revalidateSlash(command: PromptSubmitCommand): Promise<SlashSubmissionVerdict> {
    const binding = command.command;
    if (binding === undefined) return 'allowed';
    if (command.sessionId !== this.options.sessionId) return 'stale_catalog';
    const service = this.options.commands;
    if (service === undefined) return 'command_denied';
    if (!slashMessageMatches(command.message, binding.name)) return 'command_denied';
    return service.revalidateSlashSubmission(binding);
  }

  private pruneSubmissions(): void {
    while (this.submissions.size > MAX_SUBMISSION_RECORDS) {
      const removable = [...this.submissions].find(([, record]) => record.state !== 'processing');
      if (removable === undefined) return;
      this.submissions.delete(removable[0]);
    }
  }
}

/** The forwarded body must be exactly the bound command, with or without arguments. */
function slashMessageMatches(message: string, name: string): boolean {
  return message === `/${name}` || message.startsWith(`/${name} `);
}
