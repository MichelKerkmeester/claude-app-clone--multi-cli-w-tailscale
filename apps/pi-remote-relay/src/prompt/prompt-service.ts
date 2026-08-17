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

import type { AttachmentOwner } from '../attachments/attachment-types.js';
import type { PiImageBridge } from '../attachments/pi-image-bridge.js';
import type { CommandService, SlashSubmissionVerdict } from '../commands/command-service.js';
import type { SyncHub } from '../replay/sync.js';
import type { RpcSupervisor } from '../rpc/supervisor.js';
import type { RelayStore } from '../store/relay-store.js';
import type { TranscriptProjector } from '../store/transcript-projector.js';
import { PromptRevisionCoordinator } from './prompt-revision-coordinator.js';

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
  readonly imageBridge?: PiImageBridge;
  readonly getAttachmentOwner?: (deviceId: string) => AttachmentOwner | null;
  readonly revisionCoordinator?: PromptRevisionCoordinator;
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
  readonly fingerprint: string;
  state: 'processing' | 'complete' | 'delivery-unknown';
  pending?: Promise<TextBlock>;
  block?: TextBlock;
}

const MAX_SUBMISSION_RECORDS = 256;

/** Send steering input to Pi, then publish only its redacted transcript projection. */
export class PromptService {
  private active = false;
  private readonly submissions = new Map<string, SubmissionRecord>();
  private readonly revisionCoordinator: PromptRevisionCoordinator;

  public constructor(private readonly options: PromptServiceOptions) {
    this.revisionCoordinator = options.revisionCoordinator ?? new PromptRevisionCoordinator();
  }

  public async submit(command: PromptSubmitCommand, deviceId: string): Promise<TextBlock> {
    if (isPlanControlMessage(command.message)) {
      // Plan control is a host-authoritative operation. A leading /plan token
      // must never become a host prompt, transcript block, or model-visible
      // message, so it is rejected before any forwarding or recording.
      throw new SlashSubmissionError('command_denied');
    }
    if (command.command !== undefined) {
      if (hasAttachmentReferences(command)) throw new SlashSubmissionError('command_denied');
      const verdict = await this.revalidateSlash(command);
      if (verdict !== 'allowed') throw new SlashSubmissionError(verdict);
    }
    const fingerprint = promptFingerprint(command);
    const existing = this.submissions.get(command.submissionId);
    if (existing !== undefined) {
      if (existing.deviceId !== deviceId || existing.fingerprint !== fingerprint) {
        throw new Error('Prompt submission ID was reused with different content.');
      }
      if (existing.state === 'complete' && existing.block !== undefined) return existing.block;
      if (existing.state === 'delivery-unknown') {
        throw new Error('Prompt delivery outcome is unknown; automatic retry is blocked.');
      }
      if (existing.pending !== undefined) return existing.pending;
      throw new Error('Prompt submission is already in progress.');
    }
    if (this.active) throw new Error('Another prompt submission is in progress.');

    const record: SubmissionRecord = {
      deviceId,
      message: command.message,
      fingerprint,
      state: 'processing',
    };
    this.submissions.set(command.submissionId, record);
    this.pruneSubmissions();
    this.active = true;
    const pending = this.submitOne(command, record);
    record.pending = pending;
    try {
      return await pending;
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
    if (
      command.expectedPromptRevision !== undefined &&
      !this.revisionCoordinator.matches(command.expectedPromptRevision)
    ) {
      this.submissions.delete(command.submissionId);
      throw new Error('Prompt revision is stale.');
    }

    let imageDelivery: { readonly status: 'delivered' | 'delivery-unknown'; readonly attachmentCount: number } | null = null;
    try {
      if (hasAttachmentReferences(command)) {
        const bridge = this.options.imageBridge;
        const owner = this.options.getAttachmentOwner?.(record.deviceId) ?? null;
        if (bridge === undefined || owner === null) {
          throw new Error('Image delivery is unavailable.');
        }
        imageDelivery = await bridge.submit(command, owner);
      } else {
        const response = await this.options.supervisor.send({
          id: command.submissionId,
          type: 'prompt',
          message: command.message,
          // A bound slash submission is explicit and is never steered or queued.
          ...(command.command === undefined && command.streamingBehavior !== undefined
            ? { streamingBehavior: command.streamingBehavior }
            : {}),
        });
        if (!response.success || response.command !== 'prompt') {
          throw new Error('Pi rejected the prompt command.');
        }
      }
    } catch (error: unknown) {
      this.submissions.delete(command.submissionId);
      throw error;
    }

    const identity = {
      hostId: this.options.hostId,
      workspaceRef: this.options.workspaceRef,
      sessionId: this.options.sessionId,
    };
    const occurredAt = (this.options.now?.() ?? new Date()).toISOString();
    const context = {
      occurredAt,
      nextSequence: () => this.options.store.nextSequence(identity, this.options.epoch),
    };
    let block: TextBlock;
    try {
      if (command.message.length > 0) {
        const promptBlock = this.options.projector.projectSubmittedPrompt(
          command.submissionId,
          command.message,
          context,
        );
        if (
          !isTranscriptBlock(promptBlock) ||
          promptBlock.kind !== 'text' ||
          promptBlock.role !== 'user'
        ) {
          throw new Error('Relay failed to create the submitted prompt projection.');
        }
        const committedPrompt = this.publishBlock(
          promptBlock,
          identity,
          occurredAt,
          command.submissionId,
        );
        if (
          !isTranscriptBlock(committedPrompt) ||
          committedPrompt.kind !== 'text' ||
          committedPrompt.role !== 'user'
        ) {
          throw new Error('Relay failed to commit the submitted prompt projection.');
        }
        block = committedPrompt;
      } else if (imageDelivery !== null) {
        block = createPromptAcknowledgement(command.submissionId, occurredAt);
      } else {
        throw new Error('Prompt message is empty.');
      }

      if (imageDelivery !== null) {
        const cards = this.options.projector.projectSubmittedAttachments(
          command.submissionId,
          imageDelivery.attachmentCount,
          imageDelivery.status,
          context,
        );
        for (const card of cards) {
          this.publishBlock(card, identity, occurredAt, command.submissionId);
        }
      }
      if (imageDelivery === null || imageDelivery.status === 'delivered') {
        this.revisionCoordinator.accept('user');
      }
    } catch (error: unknown) {
      record.state = 'delivery-unknown';
      throw error;
    }
    record.state = imageDelivery?.status === 'delivery-unknown' ? 'delivery-unknown' : 'complete';
    record.block = block;
    return block;
  }

  private publishBlock(
    block: ReturnType<TranscriptProjector['projectSubmittedPrompt']>,
    identity: { readonly hostId: string; readonly workspaceRef: string; readonly sessionId: string },
    occurredAt: string,
    submissionId: string,
  ): ReturnType<TranscriptProjector['projectSubmittedPrompt']> {
    const candidate: Envelope = {
      v: 1,
      eventId: `event_${randomUUID()}`,
      kind: 'transcript.block',
      ...identity,
      epoch: this.options.epoch,
      seq: block.seq,
      occurredAt,
      causedBy: submissionId,
      payload: block,
      redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
      replay: { eligible: true, snapshotEligible: true },
    };
    const committed = this.options.syncHub.publish(candidate);
    if (!isTranscriptBlock(committed.payload)) {
      throw new Error('Relay failed to commit the submitted projection.');
    }
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

/**
 * True when the first token after leading-whitespace normalization is the plan
 * control command. Any argument form (`/plan on|off|execute`) is caught by the
 * token match, and the check is case-sensitive like pi's own command matching.
 */
function isPlanControlMessage(message: string): boolean {
  const firstToken = message.trimStart().split(/\s+/, 1)[0];
  return firstToken === '/plan';
}

function hasAttachmentReferences(command: PromptSubmitCommand): boolean {
  return command.attachmentSetId !== undefined || command.attachmentIds !== undefined;
}

function promptFingerprint(command: PromptSubmitCommand): string {
  return JSON.stringify({
    message: command.message,
    expectedPromptRevision: command.expectedPromptRevision ?? null,
    attachmentSetId: command.attachmentSetId ?? null,
    attachmentIds: command.attachmentIds ?? null,
    streamingBehavior: command.streamingBehavior ?? null,
    command: command.command ?? null,
  });
}

function createPromptAcknowledgement(submissionId: string, occurredAt: string): TextBlock {
  return {
    kind: 'text',
    id: `prompt_ack_${submissionId}`,
    revision: 1,
    seq: 1,
    occurredAt,
    role: 'user',
    text: '',
  };
}
