// ───────────────────────────────────────────────────────────────────
// MODULE: Host-Owned Ask-Question Authority
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { randomBytes } from 'node:crypto';

import {
  askQuestionAnswerDigest,
  isAskQuestionAnswer,
  isAskQuestionAnswerRequest,
  isAskQuestionAnswerTicketRequest,
  isAskQuestionPresentedEvent,
  normalizeAskQuestionAnswer,
  type AskQuestionAnswer,
  type AskQuestionAnswerRequest,
  type AskQuestionAnswerResult,
  type AskQuestionAnswerTicketRequest,
  type AskQuestionAnswerTicketResponse,
  type AskQuestionDisplayDto,
  type AskQuestionLifecycleEvent,
  type AskQuestionPresentedEvent,
  type AskQuestionResultReason,
  type AskQuestionTranscriptMeta,
} from '@pi-remote/pi-rpc-protocol';

import type {
  ApplicationSession,
  AuthService,
  AskQuestionTicketBinding,
} from '../auth/auth-service.js';
import type { SyncHub } from '../replay/sync.js';
import { projectAskQuestionDisplay } from '../store/redaction.js';
import { RelayStore, type StreamIdentity } from '../store/relay-store.js';
import { projectAskQuestionTranscriptMeta } from '../store/transcript-projector.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type AskQuestionAuthorityStatus =
  | 'pending'
  | 'settling'
  | 'answered'
  | 'withdrawn'
  | 'expired'
  | 'superseded'
  | 'delivery-unknown';

export interface AskQuestionAuthoritySnapshot {
  readonly questionId: string;
  readonly sessionId: string;
  readonly revision: number;
  readonly status: AskQuestionAuthorityStatus;
}

export type AskQuestionHandoffOutcome =
  | { readonly status: 'accepted' }
  | { readonly status: 'rejected'; readonly reason?: string }
  | { readonly status: 'delivery-unknown' };

export interface AskQuestionHandoffInput {
  readonly sessionId: string;
  readonly questionId: string;
  readonly expectedRevision: number;
  readonly principal: string;
  readonly answer: AskQuestionAnswer;
  readonly clientMutationId: string;
}

/** Adapter boundary for the host-to-extension callback. */
export interface AskQuestionHandoff {
  readonly submit: (input: AskQuestionHandoffInput) => Promise<AskQuestionHandoffOutcome>;
}

export interface AskQuestionServiceOptions {
  readonly store: RelayStore;
  readonly syncHub: SyncHub;
  readonly hostId: string;
  readonly workspaceRef: string;
  readonly sessionId: string;
  readonly epoch: string | (() => string);
  readonly now?: () => number;
  readonly handoff?: AskQuestionHandoff;
  readonly readAuthoritativeQuestion?: (
    questionId: string,
  ) => AskQuestionAuthoritySnapshot | Promise<AskQuestionAuthoritySnapshot | null> | null;
  readonly canAnswer?: () => boolean;
}

export type AskQuestionTicketIssueResult =
  | { readonly status: 'issued'; readonly ticket: AskQuestionAnswerTicketResponse }
  | { readonly status: 'rejected'; readonly reason: AskQuestionResultReason };

interface QuestionRecord {
  readonly presentation: AskQuestionPresentedEvent;
  readonly metadataId: string;
  status: AskQuestionAuthorityStatus;
  metadataRevision: number;
  display: AskQuestionPresentedEvent | null;
  lastMetadata: AskQuestionTranscriptMeta | null;
  readonly results: Map<string, AskQuestionAnswerResult>;
}

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/** Owns pending-question lifecycle, validation, idempotency and callback confirmation. */
export class AskQuestionService {
  private readonly now: () => number;
  private readonly identity: StreamIdentity;
  private readonly questions = new Map<string, QuestionRecord>();
  private readonly mutationLanes = new Map<string, Promise<AskQuestionAnswerResult>>();

  public constructor(private readonly options: AskQuestionServiceOptions) {
    this.now = options.now ?? Date.now;
    this.identity = {
      hostId: options.hostId,
      workspaceRef: options.workspaceRef,
      sessionId: options.sessionId,
    };
  }

  /** Store display in volatile memory and publish only the metadata transcript block. */
  public presentQuestion(
    presentation: AskQuestionPresentedEvent,
  ): AskQuestionTranscriptMeta {
    if (!isAskQuestionPresentedEvent(presentation)) {
      throw new TypeError('Invalid ask-question presentation.');
    }
    if (presentation.sessionId !== this.options.sessionId) {
      throw new Error('Ask-question presentation belongs to another session.');
    }
    const existing = this.questions.get(presentation.questionId);
    if (existing !== undefined) {
      if (existing.presentation.revision === presentation.revision) {
        throw new Error('Ask-question identity already exists at this revision.');
      }
      if (existing.presentation.revision > presentation.revision) {
        throw new Error('Ask-question presentation revision is stale.');
      }
      this.transitionLifecycle(existing, 'superseded', 'revision-moved');
    }

    const record: QuestionRecord = {
      presentation,
      metadataId: opaqueId('ask_question_block'),
      status: 'pending',
      metadataRevision: 1,
      display: presentation,
      lastMetadata: null,
      results: new Map(),
    };
    this.questions.set(presentation.questionId, record);
    const metadata = this.publishMetadata(record, 'presented');
    return metadata;
  }

  public present(
    presentation: AskQuestionPresentedEvent,
  ): AskQuestionTranscriptMeta {
    return this.presentQuestion(presentation);
  }

  /** Return a strict display projection only for the exact current revision. */
  public getDisplay(sessionId: string, questionId: string, revision: number): AskQuestionDisplayDto | null {
    const record = this.questions.get(questionId);
    if (
      record === undefined ||
      record.display === null ||
      record.presentation.sessionId !== sessionId ||
      record.presentation.revision !== revision ||
      record.status !== 'pending'
    ) {
      return null;
    }
    return projectAskQuestionDisplay(record.display);
  }

  public readDisplay(sessionId: string, questionId: string, revision: number): AskQuestionDisplayDto | null {
    return this.getDisplay(sessionId, questionId, revision);
  }

  public getQuestionState(questionId: string): AskQuestionAuthoritySnapshot | null {
    const record = this.questions.get(questionId);
    return record === undefined ? null : this.snapshotFor(record);
  }

  /** Mint only after the current authoritative question is re-read as pending. */
  public async issueAnswerTicket(
    session: ApplicationSession,
    request: AskQuestionAnswerTicketRequest,
    auth: AuthService,
  ): Promise<AskQuestionTicketIssueResult> {
    if (!isAskQuestionAnswerTicketRequest(request) || request.sessionId !== this.options.sessionId) {
      return { status: 'rejected', reason: 'validation-failed' };
    }
    let current: AskQuestionAuthoritySnapshot | null;
    try {
      current = await this.readFreshQuestion(request.questionId);
    } catch {
      return { status: 'rejected', reason: 'host-unavailable' };
    }
    if (current === null || current.questionId !== request.questionId || current.status !== 'pending') {
      return { status: 'rejected', reason: this.reasonForUnavailable(current) };
    }
    if (
      current.sessionId !== request.sessionId ||
      current.revision !== request.expectedRevision
    ) {
      return { status: 'rejected', reason: 'revision-mismatch' };
    }
    const binding: AskQuestionTicketBinding = {
      sessionId: request.sessionId,
      questionId: request.questionId,
      expectedRevision: request.expectedRevision,
      answerDigest: request.answerDigest,
    };
    return {
      status: 'issued',
      ticket: auth.issueAskQuestionTicket(session, binding),
    };
  }

  public requestAnswerTicket(
    session: ApplicationSession,
    request: AskQuestionAnswerTicketRequest,
    auth: AuthService,
  ): Promise<AskQuestionTicketIssueResult> {
    return this.issueAnswerTicket(session, request, auth);
  }

  /** Commit one answer through a per-question single-flight lane. */
  public commitAnswer(
    session: ApplicationSession,
    request: AskQuestionAnswerRequest,
    auth: AuthService,
  ): Promise<AskQuestionAnswerResult> {
    if (!isAskQuestionAnswerRequest(request) || request.sessionId !== this.options.sessionId) {
      return Promise.resolve(this.rejectedResult(request, 'validation-failed'));
    }
    const record = this.questions.get(request.questionId);
    if (record === undefined) {
      return Promise.resolve(this.rejectedResult(request, 'question-withdrawn'));
    }
    const settled = record.results.get(request.clientMutationId);
    if (settled !== undefined) return Promise.resolve(settled);
    return this.enqueueQuestionMutation(request.questionId, () =>
      this.executeAnswer(record, session, request, auth),
    );
  }

  public answer(
    session: ApplicationSession,
    request: AskQuestionAnswerRequest,
    auth: AuthService,
  ): Promise<AskQuestionAnswerResult> {
    return this.commitAnswer(session, request, auth);
  }

  public getResult(questionId: string, clientMutationId: string): AskQuestionAnswerResult | null {
    return this.questions.get(questionId)?.results.get(clientMutationId) ?? null;
  }

  public withdrawQuestion(
    questionId: string,
    reason: AskQuestionLifecycleEvent['reason'] = 'host-cancelled',
  ): AskQuestionTranscriptMeta | null {
    const record = this.questions.get(questionId);
    if (record === undefined || !isLive(record.status)) return null;
    this.transitionLifecycle(record, 'withdrawn', reason);
    return this.metadataFor(record);
  }

  public expireQuestion(
    questionId: string,
    reason: AskQuestionLifecycleEvent['reason'] = 'timeout',
  ): AskQuestionTranscriptMeta | null {
    const record = this.questions.get(questionId);
    if (record === undefined || !isLive(record.status)) return null;
    this.transitionLifecycle(record, 'expired', reason);
    return this.metadataFor(record);
  }

  private enqueueQuestionMutation(
    questionId: string,
    run: () => Promise<AskQuestionAnswerResult>,
  ): Promise<AskQuestionAnswerResult> {
    const previous = this.mutationLanes.get(questionId) ?? Promise.resolve(this.rejectedResultForLane());
    const pending = previous.catch(() => this.rejectedResultForLane()).then(run);
    this.mutationLanes.set(questionId, pending);
    void pending.finally(() => {
      if (this.mutationLanes.get(questionId) === pending) this.mutationLanes.delete(questionId);
    });
    return pending;
  }

  private async executeAnswer(
    record: QuestionRecord,
    session: ApplicationSession,
    request: AskQuestionAnswerRequest,
    auth: AuthService,
  ): Promise<AskQuestionAnswerResult> {
    const replayed = record.results.get(request.clientMutationId);
    if (replayed !== undefined) return replayed;

    if (record.status !== 'pending') {
      return this.settleResult(record, request, this.reasonForStatus(record.status));
    }

    // This synchronous transition is the double-answer barrier. No await is allowed above it.
    record.status = 'settling';

    const consumed = auth.consumeAskQuestionTicket(request.ticket, session, request);
    if (consumed === null) {
      record.status = 'pending';
      return this.settleResult(record, request, 'invalid-ticket');
    }
    if (!this.canAnswerNow()) {
      record.status = 'pending';
      return this.settleResult(record, request, 'plan-mode-blocked');
    }
    if (!isAskQuestionAnswer(request.answer) || !this.answerMatches(record, request.answer)) {
      record.status = 'pending';
      return this.settleResult(record, request, 'validation-failed');
    }

    const recompute = askQuestionAnswerDigest(request.answer, {
      questionId: request.questionId,
      expectedRevision: request.expectedRevision,
      principal: session.principal,
    });
    if (recompute !== consumed.binding.answerDigest || request.answerDigest !== recompute) {
      record.status = 'pending';
      return this.settleResult(record, request, 'validation-failed');
    }

    let fresh: AskQuestionAuthoritySnapshot | null;
    try {
      fresh = await this.readFreshQuestion(request.questionId);
    } catch {
      record.status = 'pending';
      return this.settleResult(record, request, 'host-unavailable');
    }
    if (
      fresh === null ||
      fresh.questionId !== request.questionId ||
      fresh.status !== 'pending' ||
      fresh.revision !== consumed.binding.expectedRevision ||
      fresh.sessionId !== consumed.binding.sessionId ||
      record.status !== 'settling'
    ) {
      if (record.status === 'settling') record.status = 'pending';
      return this.settleResult(
        record,
        request,
        fresh === null || fresh.status === 'withdrawn' || fresh.status === 'expired'
          ? 'question-withdrawn'
          : 'revision-mismatch',
      );
    }

    let handoff: AskQuestionHandoffOutcome;
    try {
      handoff =
        this.options.handoff === undefined
          ? { status: 'delivery-unknown' as const }
          : await this.options.handoff.submit({
              sessionId: request.sessionId,
              questionId: request.questionId,
              expectedRevision: request.expectedRevision,
              principal: session.principal,
              answer: normalizeAskQuestionAnswer(request.answer),
              clientMutationId: request.clientMutationId,
            });
    } catch {
      handoff = { status: 'delivery-unknown' };
    }

    if (handoff.status === 'accepted' && record.status === 'settling') {
      record.status = 'answered';
      record.display = null;
      const result = this.settleResult(record, request, undefined, true);
      this.publishMetadata(record, 'answered');
      return result;
    }
    if (handoff.status === 'delivery-unknown' || record.status !== 'settling') {
      record.status = 'delivery-unknown';
      record.display = null;
      const result = this.settleResult(record, request, 'delivery-unknown');
      this.publishMetadata(record, 'error');
      return result;
    }

    record.status = 'pending';
    return this.settleResult(
      record,
      request,
      mapHandoffRejection(handoff.status === 'rejected' ? handoff.reason : undefined),
    );
  }

  private answerMatches(record: QuestionRecord, answer: AskQuestionAnswer): boolean {
    const display = record.presentation.display;
    const optionIds = new Set(display.options.map((option) => option.id));
    if (answer.optionIds.some((optionId) => !optionIds.has(optionId))) return false;
    const selectedCount = answer.optionIds.length;
    const minSelections = display.minSelections ?? (display.options.length === 0 ? 0 : 1);
    const maxSelections = display.maxSelections ??
      (record.presentation.selectionMode === 'single' ? 1 : display.options.length);
    if (record.presentation.selectionMode === 'single' && selectedCount > 1) return false;
    if (
      selectedCount < minSelections ||
      selectedCount > maxSelections ||
      (record.presentation.selectionMode === 'single' && selectedCount !== 1)
    ) {
      return false;
    }
    const freeText = answer.freeText;
    if (!display.freeText.allowed && freeText !== undefined) return false;
    if (display.freeText.required && (freeText === undefined || freeText.trim().length === 0)) {
      return false;
    }
    if (
      freeText !== undefined &&
      display.freeText.maxLength !== undefined &&
      freeText.length > display.freeText.maxLength
    ) {
      return false;
    }
    return selectedCount > 0 || (freeText !== undefined && freeText.trim().length > 0);
  }

  private async readFreshQuestion(questionId: string): Promise<AskQuestionAuthoritySnapshot | null> {
    const read = this.options.readAuthoritativeQuestion;
    if (read !== undefined) {
      return (await read(questionId)) ?? null;
    }
    const record = this.questions.get(questionId);
    return record === undefined ? null : this.snapshotFor(record, record.status === 'settling');
  }

  private canAnswerNow(): boolean {
    return this.options.canAnswer?.() ?? false;
  }

  private snapshotFor(
    record: QuestionRecord,
    settlingIsPending = false,
  ): AskQuestionAuthoritySnapshot {
    return {
      questionId: record.presentation.questionId,
      sessionId: record.presentation.sessionId,
      revision: record.presentation.revision,
      status: settlingIsPending && record.status === 'settling' ? 'pending' : record.status,
    };
  }

  private metadataFor(record: QuestionRecord): AskQuestionTranscriptMeta {
    if (record.lastMetadata !== null) return record.lastMetadata;
    return projectAskQuestionTranscriptMeta({
      id: record.metadataId,
      revision: record.metadataRevision,
      seq: Math.max(1, record.metadataRevision),
      occurredAt: new Date(this.now()).toISOString(),
      activityId: record.presentation.activityId,
      questionId: record.presentation.questionId,
      sessionId: record.presentation.sessionId,
      presentedRevision: record.presentation.revision,
      status: transcriptStatus(record.status),
    });
  }

  private publishMetadata(
    record: QuestionRecord,
    status: 'presented' | 'answered' | 'error' | 'expired' | 'superseded',
  ): AskQuestionTranscriptMeta {
    if (status !== 'presented') record.metadataRevision += 1;
    const metadata = projectAskQuestionTranscriptMeta({
      id: record.metadataId,
      revision: record.metadataRevision,
      seq: this.options.store.nextSequence(this.identity, this.currentEpoch()),
      occurredAt: new Date(this.now()).toISOString(),
      activityId: record.presentation.activityId,
      questionId: record.presentation.questionId,
      sessionId: record.presentation.sessionId,
      presentedRevision: record.presentation.revision,
      status,
    });
    record.lastMetadata = metadata;
    this.options.syncHub.publishAskQuestionMetadata({
      v: 1,
      eventId: opaqueId('event'),
      kind: 'transcript.block',
      ...this.identity,
      epoch: this.currentEpoch(),
      seq: metadata.seq,
      occurredAt: metadata.occurredAt,
      causedBy: record.presentation.questionId,
      payload: metadata,
      redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
      replay: { eligible: true, snapshotEligible: true },
    });
    return metadata;
  }

  private transitionLifecycle(
    record: QuestionRecord,
    status: 'withdrawn' | 'expired' | 'superseded',
    reason: AskQuestionLifecycleEvent['reason'],
  ): void {
    record.status = status;
    record.display = null;
    const lifecycle: AskQuestionLifecycleEvent = {
      type:
        status === 'withdrawn'
          ? 'session.ask-question.withdrawn'
          : status === 'expired'
            ? 'session.ask-question.expired'
            : 'session.ask-question.superseded',
      sessionId: record.presentation.sessionId,
      questionId: record.presentation.questionId,
      revision: record.presentation.revision,
      ...(reason === undefined ? {} : { reason }),
    };
    this.options.syncHub.publish(this.makeEnvelope(`session.ask-question.${status}`, lifecycle, record));
    this.publishMetadata(record, status === 'withdrawn' ? 'expired' : status);
  }

  private settleResult(
    record: QuestionRecord,
    request: AskQuestionAnswerRequest,
    reason: AskQuestionResultReason | undefined,
    accepted = false,
  ): AskQuestionAnswerResult {
    const result: AskQuestionAnswerResult = {
      type: 'session.ask-question.answer-result',
      sessionId: request.sessionId,
      questionId: request.questionId,
      revision: record.presentation.revision,
      clientMutationId: request.clientMutationId,
      status: accepted ? 'accepted' : 'rejected',
      ...(reason === undefined ? {} : { reason }),
    };
    record.results.set(request.clientMutationId, result);
    this.options.syncHub.publish(
      this.makeEnvelope('session.ask-question.answer-result', result, record),
    );
    return result;
  }

  private rejectedResult(
    request: Partial<AskQuestionAnswerRequest>,
    reason: AskQuestionResultReason,
  ): AskQuestionAnswerResult {
    return {
      type: 'session.ask-question.answer-result',
      sessionId: typeof request.sessionId === 'string' ? request.sessionId : this.options.sessionId,
      questionId: typeof request.questionId === 'string' ? request.questionId : 'question_unknown',
      revision: typeof request.expectedRevision === 'number' ? request.expectedRevision : 1,
      clientMutationId:
        typeof request.clientMutationId === 'string' ? request.clientMutationId : 'mutation_unknown',
      status: 'rejected',
      reason,
    };
  }

  private rejectedResultForLane(): AskQuestionAnswerResult {
    return {
      type: 'session.ask-question.answer-result',
      sessionId: this.options.sessionId,
      questionId: 'question_lane',
      revision: 1,
      clientMutationId: 'mutation_lane',
      status: 'rejected',
      reason: 'host-unavailable',
    };
  }

  private reasonForUnavailable(
    current: AskQuestionAuthoritySnapshot | null,
  ): AskQuestionResultReason {
    if (current === null) return 'question-withdrawn';
    return current.status === 'expired' || current.status === 'withdrawn'
      ? 'question-withdrawn'
      : current.status === 'superseded'
        ? 'revision-mismatch'
        : 'question-already-answered';
  }

  private reasonForStatus(status: AskQuestionAuthorityStatus): AskQuestionResultReason {
    if (status === 'delivery-unknown') return 'delivery-unknown';
    if (status === 'withdrawn' || status === 'expired') return 'question-withdrawn';
    if (status === 'superseded') return 'revision-mismatch';
    return 'question-already-answered';
  }

  private makeEnvelope<T extends Record<string, unknown>>(
    kind: string,
    payload: T,
    record: QuestionRecord,
  ) {
    const epoch = this.currentEpoch();
    return {
      v: 1 as const,
      eventId: opaqueId('event'),
      kind,
      ...this.identity,
      epoch,
      seq: this.options.store.nextSequence(this.identity, epoch),
      occurredAt: new Date(this.now()).toISOString(),
      causedBy: record.presentation.questionId,
      payload,
      redaction: { policyVersion: 1 as const, fieldsRedacted: 0, reasons: [] as const },
      replay: { eligible: true, snapshotEligible: true },
    };
  }

  private currentEpoch(): string {
    return typeof this.options.epoch === 'function' ? this.options.epoch() : this.options.epoch;
  }
}

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function transcriptStatus(status: AskQuestionAuthorityStatus): AskQuestionTranscriptMeta['status'] {
  if (status === 'pending') return 'presented';
  if (status === 'settling') return 'submitting';
  if (status === 'withdrawn') return 'expired';
  if (status === 'delivery-unknown') return 'error';
  return status;
}

function isLive(status: AskQuestionAuthorityStatus): boolean {
  return status === 'pending' || status === 'settling';
}

function mapHandoffRejection(reason: string | undefined): AskQuestionResultReason {
  if (
    reason === 'question-withdrawn' ||
    reason === 'already-answered' ||
    reason === 'question-already-answered' ||
    reason === 'revision-mismatch' ||
    reason === 'validation-failed' ||
    reason === 'plan-mode-blocked' ||
    reason === 'redaction-policy-blocked'
  ) {
    return reason === 'already-answered' ? 'question-already-answered' : reason;
  }
  return 'validation-failed';
}

function opaqueId(prefix: string): string {
  return `${prefix}_${randomBytes(18).toString('base64url')}`;
}
