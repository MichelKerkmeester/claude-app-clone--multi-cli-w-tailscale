// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Web Relay Client
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import {
  isAcceptEditsGrantDto,
  isApprovalCardDto,
  isApprovalDecisionResponse,
  isAttachmentPartStatusDto,
  isAttachmentPartTicket,
  isAttachmentSetManifest,
  isAskQuestionAnswerResult,
  isAskQuestionAnswerTicketResponse,
  isAskQuestionDisplayDto,
  isCommandCatalogDto,
  isFilePreviewBlock,
  isOpaqueId,
  isOpaqueToken,
  isPlanControlResponse,
  isPromptAbortResponse,
  isRuntimeControlResponse,
  isRuntimeIssueCode,
  isRuntimeIssueDto,
  isRuntimeIssueResponse,
  isRuntimeMediaCapabilityDto,
  isRuntimeModelCatalogDto,
  isRuntimeModelTicketResponse,
  isRuntimeSnapshotDto,
  isRuntimeStateDto,
  isRichTranscriptBlock,
  isInboundImageReadyBlock,
  isSessionCardDto,
  isPromptSubmitResponse,
  isSlashSubmitIssueResponse,
  isSyncMessage,
  isTodoProjectionEnvelopeKind,
  isTodoProjectionEnvelopePayload,
  isTranscriptPageDto,
  isWebSocketTicketResponse,
  DEFAULT_MEDIA_POLICY,
  type CommandBindingDto,
  type CommandCatalogDto,
  type ExecutePlanCommand,
  type FilePreviewBlock,
  type InboundImageReadyBlock,
  type PlanControlOutcome,
  type PlanControlResponse,
  type PromptAbortResponse,
  type RuntimeControlCommand,
  type RuntimeControlResponse,
  type RuntimeIssueCode,
  type RuntimeMediaCapabilityDto,
  type RuntimeModelCatalogDto,
  type RuntimeModelTicketRequest,
  type RuntimeOperation,
  type RuntimeSnapshotDto,
  type RuntimeStateDto,
  type SessionCardDto,
  type SetModeCommand,
  type AcceptEditsGrantDto,
  type ApprovalCardDto,
  type ApprovalDecision,
  type AttachmentPartStatusDto,
  type AttachmentPartTicket,
  type AttachmentSetManifest,
  type AskQuestionAnswerRequest,
  type AskQuestionAnswerResult,
  type AskQuestionAnswerTicketRequest,
  type AskQuestionAnswerTicketResponse,
  type AskQuestionDisplayDto,
  type AskQuestionResultReason,
  type AskQuestionDisplayReadRequest,
  type SlashSubmitIssueCode,
  type SyncCursor,
  type SyncMessage,
  type TranscriptBlock,
  type TextBlock,
} from '@pi-remote/pi-rpc-protocol';

import { DEMO_SESSION_EXPIRES_AT, establishSession } from './auth.js';
import { demoArtifactBytes, demoPostJson, demoSocket, isDemoMode } from '../fixtures/demo.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS AND RELAY HEARTBEAT
// ───────────────────────────────────────────────────────────────────

const PAGE_LIMIT = 100;
const MAX_PAGES = 100;

// Retry metadata is bounded before it can reach UI state: only integer
// Delta-seconds are accepted, and any delay beyond the cap is clamped.
const MAX_RETRY_AFTER_MS = 60_000;
export const MAX_ARTIFACT_BYTES = 50 * 1024 * 1024;
const RELAY_HEARTBEAT_MAX_AGE_MS = 15_000;
let lastRelayHeartbeatAt: number | null = null;

export interface RelayHeartbeat {
  readonly state: 'fresh' | 'stale' | 'unknown';
  readonly lastSeenAt: number | null;
  readonly navigatorOnline: boolean;
}

/** Transport evidence is kept separate from navigator.onLine, which only describes the device. */
export function noteRelayHeartbeat(at = Date.now()): void {
  if (Number.isFinite(at)) lastRelayHeartbeatAt = at;
}

export function getRelayHeartbeat(now = Date.now()): RelayHeartbeat {
  const navigatorOnline = typeof navigator === 'undefined' || navigator.onLine;
  const state =
    lastRelayHeartbeatAt === null
      ? 'unknown'
      : now - lastRelayHeartbeatAt <= RELAY_HEARTBEAT_MAX_AGE_MS
        ? 'fresh'
        : 'stale';
  return { state, lastSeenAt: lastRelayHeartbeatAt, navigatorOnline };
}

// ───────────────────────────────────────────────────────────────────
// 3. ERROR TYPES AND RETRY PARSING
// ───────────────────────────────────────────────────────────────────

export class RelayRequestError extends Error {
  readonly code: 'access_denied' | 'request_failed';
  readonly status: number | null;
  readonly retryAfterMs: number | null;

  constructor(
    code: 'access_denied' | 'request_failed',
    status: number | null = null,
    retryAfterMs: number | null = null,
    readonly serverCode: string | null = null,
  ) {
    super(code === 'access_denied' ? 'Relay access denied.' : 'Relay request failed.');
    this.name = 'RelayRequestError';
    this.code = code;
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

export class AskQuestionRelayError extends Error {
  readonly reason: AskQuestionResultReason;
  readonly status: number | null;

  constructor(reason: AskQuestionResultReason, status: number | null = null) {
    super('Ask-question request failed.');
    this.name = 'AskQuestionRelayError';
    this.reason = reason;
    this.status = status;
  }
}

export type ArtifactReadErrorCode =
  | 'unavailable'
  | 'invalid-response'
  | 'revision-conflict'
  | 'too-large'
  | 'digest-mismatch'
  | 'denied'
  | 'expired'
  | 'missing'
  | 'revoked'
  | 'conflict'
  | 'rate-limited';

export class ArtifactReadError extends Error {
  readonly code: ArtifactReadErrorCode;
  readonly status: number | null;

  constructor(code: ArtifactReadErrorCode, status: number | null = null) {
    super('Artifact preview is not available.');
    this.name = 'ArtifactReadError';
    this.code = code;
    this.status = status;
  }
}

/** Return only a local, allowlisted artifact code. Server response text is never surfaced. */
export function artifactReadDisplayCode(error: unknown): ArtifactReadErrorCode | null {
  if (error instanceof ArtifactReadError) return error.code;
  if (!isRecord(error) || typeof error.code !== 'string') return null;
  const codes: readonly ArtifactReadErrorCode[] = [
    'unavailable',
    'invalid-response',
    'revision-conflict',
    'too-large',
    'digest-mismatch',
    'denied',
    'expired',
    'missing',
    'revoked',
    'conflict',
    'rate-limited',
  ];
  return codes.includes(error.code as ArtifactReadErrorCode)
    ? (error.code as ArtifactReadErrorCode)
    : null;
}

export class RuntimeRelayError extends Error {
  readonly issueCode: RuntimeIssueCode;
  readonly retryAfterMs: number | null;

  constructor(issueCode: RuntimeIssueCode, retryAfterMs: number | null = null) {
    super(issueCode);
    this.name = 'RuntimeRelayError';
    this.issueCode = issueCode;
    this.retryAfterMs = retryAfterMs;
  }
}

export type CatalogLifecycleCode = 'unavailable' | 'forbidden' | 'incompatible';

/** A guarded command-catalog read failure, classified for fail-closed UI states. */
export class CatalogLifecycleError extends Error {
  readonly code: CatalogLifecycleCode;

  constructor(code: CatalogLifecycleCode) {
    super(catalogLifecycleMessage(code));
    this.name = 'CatalogLifecycleError';
    this.code = code;
  }
}

function catalogLifecycleMessage(code: CatalogLifecycleCode): string {
  switch (code) {
    case 'forbidden':
      return 'Commands are not available for this device.';
    case 'incompatible':
      return 'The phone and host versions do not agree.';
    default:
      return 'Pi is not responding.';
  }
}

/** A slash submission the relay rejected; never retried and never forwarded. */
export class SlashSubmitError extends Error {
  readonly reasonCode: SlashSubmitIssueCode;

  constructor(reasonCode: SlashSubmitIssueCode) {
    super(
      reasonCode === 'stale_catalog'
        ? 'Commands changed on the host.'
        : 'Command is not available.',
    );
    this.name = 'SlashSubmitError';
    this.reasonCode = reasonCode;
  }
}

/** Parse a Retry-After header into clamped milliseconds, or null when unbounded. */
export function parseBoundedRetryAfter(value: string | null): number | null {
  if (value === null) return null;
  const match = /^(\d{1,5})$/.exec(value.trim());
  if (match === null) return null;
  const seconds = Number(match[1]);
  if (!Number.isInteger(seconds) || seconds < 0) return null;
  return Math.min(seconds * 1_000, MAX_RETRY_AFTER_MS);
}

// ───────────────────────────────────────────────────────────────────
// 4. SHARED RESULT TYPES
// ───────────────────────────────────────────────────────────────────

export interface TranscriptLoad {
  readonly items: readonly RelayTranscriptBlock[];
  readonly coversThrough: number;
}

export type RelayTranscriptBlock = TranscriptBlock & {
  readonly provenance: 'relay';
  readonly richEligible: boolean;
};

export interface ArtifactResource {
  readonly bytes: Uint8Array;
  readonly contentType: string;
  readonly revision: string;
  readonly etag: string;
  readonly digest: string;
  readonly contentDigest?: string;
}

export type ArtifactReadVariant = 'thumbnail' | 'full';

export type ArtifactResourceBlock = FilePreviewBlock | InboundImageReadyBlock;

/** The opaque binding is accepted only into the live runtime object. */
export interface PlanBindingResponse {
  readonly sessionId: string;
  readonly planId: string;
  readonly planRevision: number;
  readonly runtimeRevision: number;
  readonly planToken: string;
}

// ───────────────────────────────────────────────────────────────────
// 5. SESSIONS, TICKETS, AND ATTACHMENTS
// ───────────────────────────────────────────────────────────────────

export async function fetchSessions(signal: AbortSignal): Promise<readonly SessionCardDto[]> {
  const payload = await postJson('/api/sessions', undefined, signal);
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.sessions) ||
    !payload.sessions.every(isSessionCardDto)
  ) {
    throw new Error('Relay returned an invalid session catalog.');
  }
  return payload.sessions;
}

/**
 * Request ONE fresh one-use relay ticket. Every write path mints its own
 * Ticket immediately before submission; tickets are never cached, replayed,
 * Or persisted. A malformed ticket response is rejected outright.
 */
export async function requestTicket(signal?: AbortSignal): Promise<string> {
  const ticketPayload = await postJson('/api/auth/ticket', undefined, signal);
  if (!isWebSocketTicketResponse(ticketPayload)) {
    throw new Error('Relay returned an invalid command ticket.');
  }
  return ticketPayload.ticket;
}

export interface AttachmentTicketResponse {
  readonly ticket: string;
  readonly expiresAt: string;
}

export interface AttachmentReservationResponse {
  readonly attachmentSetId: string;
  readonly revision: number;
  readonly expiresAt: string;
  readonly parts: readonly AttachmentPartTicket[];
  readonly statusTicket: AttachmentTicketResponse;
  readonly cancelTicket: AttachmentTicketResponse;
}

export type AttachmentSetStatus =
  | 'reserved'
  | 'uploading'
  | 'checking'
  | 'ready'
  | 'rejected'
  | 'cancelled'
  | 'expired'
  | 'delivery-unknown';

export interface AttachmentStatusResponse {
  readonly attachmentSetId: string;
  readonly revision: number;
  readonly status: AttachmentSetStatus;
  readonly expiresAt: string;
  readonly parts: readonly AttachmentPartStatusDto[];
}

export interface AttachmentUploadResponse {
  readonly attachmentSetId: string;
  readonly partId: string;
  readonly status: 'ready';
}

export interface AttachmentReserveBinding {
  readonly operation: 'reserve';
  readonly sessionId: string;
  readonly sessionEpoch: string;
  readonly expectedPromptRevision: number;
  readonly submissionId: string;
}

export type AttachmentUploadProgress = (loaded: number, total: number) => void;

export class AttachmentTransportError extends Error {
  public constructor(
    readonly code: 'canceled' | 'unknown',
    readonly status: number | null = null,
  ) {
    super(code === 'canceled' ? 'Attachment transfer canceled.' : 'Attachment transfer failed.');
    this.name = 'AttachmentTransportError';
  }
}

/** Reserve only a reference manifest; image bytes are never part of this request. */
export async function reserveAttachmentSet(
  manifest: AttachmentSetManifest,
  binding: AttachmentReserveBinding,
  signal?: AbortSignal,
): Promise<AttachmentReservationResponse> {
  if (!isAttachmentSetManifest(manifest) || !sameAttachmentBinding(manifest, binding)) {
    throw new Error('Attachment manifest binding is invalid.');
  }
  const ticketPayload = await postJson(
    '/api/auth/ticket',
    { action: 'attachment:reserve', binding },
    signal,
    [201],
  );
  if (!isWebSocketTicketResponse(ticketPayload)) {
    throw new Error('Relay returned an invalid attachment reservation ticket.');
  }
  const payload = await postJsonWithHeaders(
    '/api/attachment-sets',
    manifest,
    { 'x-attachment-ticket': ticketPayload.ticket },
    signal,
    [201],
  );
  if (!isAttachmentReservationResponse(payload)) {
    throw new Error('Relay returned an invalid attachment reservation.');
  }
  return payload;
}

/** Upload one exact transfer blob through its one-use ticket and nowhere else. */
export function uploadAttachmentPart(
  part: AttachmentPartTicket,
  bytes: Blob,
  digest: string,
  onProgress: AttachmentUploadProgress,
  signal?: AbortSignal,
): Promise<AttachmentUploadResponse> {
  if (!isAttachmentPartTicket(part) || bytes.size <= 0 || digest.length === 0) {
    return Promise.reject(new Error('Attachment upload input is invalid.'));
  }
  if (signal?.aborted === true) {
    return Promise.reject(new AttachmentTransportError('canceled'));
  }
  return new Promise<AttachmentUploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;
    const finish = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abort);
      callback();
    };
    const abort = (): void => {
      xhr.abort();
      finish(() => reject(new AttachmentTransportError('canceled')));
    };
    xhr.open(
      'PUT',
      `/api/attachment-sets/${encodeURIComponent(part.attachmentSetId)}/parts/${encodeURIComponent(part.partId)}`,
    );
    xhr.withCredentials = true;
    xhr.responseType = 'text';
    xhr.setRequestHeader('content-type', 'application/octet-stream');
    xhr.setRequestHeader('x-attachment-ticket', part.ticket);
    xhr.setRequestHeader('x-attachment-sha256', digest);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.loaded > 0) onProgress(event.loaded, event.total);
    };
    xhr.onload = () => {
      noteRelayHeartbeat();
      if (xhr.status !== 201) {
        finish(() =>
          reject(
            new RelayRequestError(
              xhr.status === 401 || xhr.status === 403 ? 'access_denied' : 'request_failed',
              xhr.status,
            ),
          ),
        );
        return;
      }
      let payload: unknown;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        finish(() => reject(new Error('Relay returned an invalid attachment upload response.')));
        return;
      }
      if (!isAttachmentUploadResponse(payload)) {
        finish(() => reject(new Error('Relay returned an invalid attachment upload response.')));
        return;
      }
      finish(() => resolve(payload));
    };
    xhr.onerror = () => finish(() => reject(new AttachmentTransportError('unknown')));
    xhr.ontimeout = () => finish(() => reject(new AttachmentTransportError('unknown')));
    xhr.onabort = () => {
      if (!settled) finish(() => reject(new AttachmentTransportError('canceled')));
    };
    signal?.addEventListener('abort', abort, { once: true });
    try {
      xhr.send(bytes);
    } catch {
      finish(() => reject(new AttachmentTransportError('unknown')));
    }
  });
}

/** Reconcile an attachment set through its authenticated read-only ticket. */
export async function fetchAttachmentStatus(
  attachmentSetId: string,
  statusTicket: AttachmentTicketResponse,
  signal?: AbortSignal,
): Promise<AttachmentStatusResponse> {
  const payload = await postJsonWithHeaders(
    `/api/attachment-sets/${encodeURIComponent(attachmentSetId)}/status`,
    undefined,
    { 'x-attachment-ticket': statusTicket.ticket },
    signal,
  );
  if (!isAttachmentStatusResponse(payload) || payload.attachmentSetId !== attachmentSetId) {
    throw new Error('Relay returned an invalid attachment status.');
  }
  return payload;
}

/** Cancel a still-uncommitted set; callers invoke this only on an explicit abort. */
export async function cancelAttachmentSet(
  attachmentSetId: string,
  cancelTicket: AttachmentTicketResponse,
  signal?: AbortSignal,
): Promise<void> {
  const payload = await postJsonWithHeaders(
    `/api/attachment-sets/${encodeURIComponent(attachmentSetId)}/cancel`,
    undefined,
    { 'x-attachment-ticket': cancelTicket.ticket },
    signal,
    [204],
  );
  if (payload !== null) throw new Error('Relay returned an invalid attachment cancellation.');
}

/** Commit references after the set is ready; no image bytes enter this JSON body. */
export async function submitPromptWithAttachmentRefs(
  sessionId: string,
  submissionId: string,
  message: string,
  expectedPromptRevision: number,
  attachmentSetId: string,
  attachmentIds: readonly string[],
  streamingBehavior?: 'steer' | 'followUp',
  signal?: AbortSignal,
): Promise<TextBlock> {
  const ticket = await requestTicket(signal);
  const payload = await postJson(
    '/api/prompt/submit',
    {
      type: 'prompt.submit',
      submissionId,
      sessionId,
      message,
      ticket,
      expectedPromptRevision,
      attachmentSetId,
      attachmentIds,
      ...(streamingBehavior === undefined ? {} : { streamingBehavior }),
    },
    signal,
    [202],
  );
  if (!isPromptSubmitResponse(payload)) {
    throw new Error('Relay returned an invalid attachment prompt acknowledgement.');
  }
  return payload.block;
}

// ───────────────────────────────────────────────────────────────────
// 6. PROMPT SUBMISSION
// ───────────────────────────────────────────────────────────────────

export async function submitPrompt(
  sessionId: string,
  submissionId: string,
  message: string,
  streamingBehavior?: 'steer' | 'followUp',
  signal?: AbortSignal,
): Promise<TextBlock> {
  const ticket = await requestTicket(signal);
  const payload = await postJson(
    '/api/prompt/submit',
    {
      type: 'prompt.submit',
      submissionId,
      sessionId,
      message,
      ticket,
      ...(streamingBehavior === undefined ? {} : { streamingBehavior }),
    },
    signal,
    [202],
  );
  if (!isPromptSubmitResponse(payload)) {
    throw new Error('Relay returned an invalid prompt acknowledgement.');
  }
  return payload.block;
}

/**
 * Submit one explicit slash command. A fresh one-use ticket is obtained
 * Immediately before the write, and the relay revalidates the bound host,
 * Session, and catalog revisions before any forwarding; stale and denied
 * Outcomes throw typed errors and are never retried automatically. The
 * Request body is built from guarded parts only, and the response must be
 * Either an accepted prompt projection or a typed issue response.
 */
export async function submitSlashCommand(
  sessionId: string,
  submissionId: string,
  message: string,
  binding: CommandBindingDto,
  signal?: AbortSignal,
): Promise<TextBlock> {
  const ticket = await requestTicket(signal);
  const payload = await postJson(
    '/api/prompt/submit',
    {
      type: 'prompt.submit',
      submissionId,
      sessionId,
      message,
      ticket,
      command: binding,
    },
    signal,
    [202, 403, 409],
  );
  if (isPromptSubmitResponse(payload)) return payload.block;
  if (isSlashSubmitIssueResponse(payload)) throw new SlashSubmitError(payload.error);
  throw new Error('Relay returned an invalid slash submission response.');
}

// ───────────────────────────────────────────────────────────────────
// 7. RUNTIME STATE, MODELS, AND PLAN BINDING READS
// ───────────────────────────────────────────────────────────────────

export async function fetchRuntimeState(signal?: AbortSignal): Promise<RuntimeStateDto> {
  const payload = await postJson('/api/runtime/state', undefined, signal);
  if (!isRecord(payload) || !isRuntimeStateDto(payload.state)) {
    throw new Error('Relay returned an invalid runtime state.');
  }
  return payload.state;
}

export async function fetchRuntimeModels(signal?: AbortSignal): Promise<RuntimeModelCatalogDto> {
  const payload = await postJson('/api/runtime/models', undefined, signal);
  if (!isRuntimeModelCatalogDto(payload)) {
    throw new Error('Relay returned an invalid model catalog.');
  }
  return payload;
}

export function parseRuntimeMediaCapability(value: unknown): RuntimeMediaCapabilityDto | null {
  return isRuntimeMediaCapabilityDto(value) ? value : null;
}

/** Typed local fixtures keep the media UI testable while production remains disabled by default. */
export const MEDIA_CAPABILITY_OFF_FIXTURE: RuntimeMediaCapabilityDto = {
  enabled: false,
  imageIn: false,
  policy: DEFAULT_MEDIA_POLICY,
};

export const MEDIA_CAPABILITY_ON_FIXTURE: RuntimeMediaCapabilityDto = {
  enabled: true,
  imageIn: true,
  policy: DEFAULT_MEDIA_POLICY,
};

export function mediaCapabilityFixture(enabled: boolean): RuntimeMediaCapabilityDto {
  return enabled ? MEDIA_CAPABILITY_ON_FIXTURE : MEDIA_CAPABILITY_OFF_FIXTURE;
}

export function parseRuntimeSnapshot(value: unknown): RuntimeSnapshotDto | null {
  if (!isRuntimeSnapshotDto(value)) return null;
  return value.media === undefined || parseRuntimeMediaCapability(value.media) !== null
    ? value
    : null;
}

export async function fetchRuntimeSnapshot(signal?: AbortSignal): Promise<RuntimeSnapshotDto> {
  if (isDemoMode()) {
    const [state, models] = await Promise.all([
      fetchRuntimeState(signal),
      fetchRuntimeModels(signal),
    ]);
    const snapshot = { sessionId: state.sessionId, state, models };
    const parsed = parseRuntimeSnapshot(snapshot);
    if (parsed !== null) return parsed;
    throw new RuntimeRelayError('invalid-response');
  }
  try {
    const payload = await postJson(
      '/api/runtime/reconcile',
      undefined,
      signal,
      [422, 429, 502, 503],
    );
    const snapshot = parseRuntimeSnapshot(payload);
    if (snapshot !== null) return snapshot;
    if (isRuntimeIssueResponse(payload)) throw new RuntimeRelayError(payload.error);
    if (isRuntimeIssueDto(payload)) throw new RuntimeRelayError(payload.issueCode);
    throw new RuntimeRelayError('invalid-response');
  } catch (error: unknown) {
    const retryAfterMs = error instanceof RelayRequestError ? error.retryAfterMs : null;
    throw new RuntimeRelayError(normalizeRuntimeIssue(error), retryAfterMs);
  }
}

/** Read the current host binding without caching or placing it in a URL. */
export async function fetchPlanBinding(
  sessionId: string,
  expectedRuntimeRevision: number,
  planId: string,
  expectedPlanRevision: number,
  signal?: AbortSignal,
): Promise<PlanBindingResponse> {
  const payload = await postJson(
    '/api/plan/binding',
    { sessionId, expectedRuntimeRevision, planId, expectedPlanRevision },
    signal,
    [409, 422, 503],
  );
  if (!isPlanBindingResponse(payload)) {
    throw new Error('Relay returned an invalid live plan binding.');
  }
  return payload;
}

export function normalizeRuntimeIssue(error: unknown): RuntimeIssueCode {
  if (error instanceof RuntimeRelayError) return error.issueCode;
  if (error instanceof RelayRequestError) {
    if (error.status === 422) return 'unsupported';
    if (error.status === 429) return 'rate-limited';
    if (error.status === 403) return 'foreground-required';
    if (error.status !== null && error.status >= 500) return 'host-unavailable';
  }
  if (error instanceof SyntaxError) return 'invalid-response';
  if (getRelayHeartbeat().state === 'stale') return 'offline';
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
  if (isAbortError(error)) return 'host-unavailable';
  if (isRecord(error) && isRuntimeIssueCode(error.issueCode)) return error.issueCode;
  return 'host-unavailable';
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { readonly name?: unknown }).name === 'AbortError'
  );
}

// ───────────────────────────────────────────────────────────────────
// 8. COMMAND CATALOG AND RUNTIME CONTROL
// ───────────────────────────────────────────────────────────────────

/**
 * Read the relay-filtered command catalog for the current host epoch and
 * Session. Transport failures are classified so the lifecycle can fail closed
 * Without guessing why a read failed; malformed payloads are rejected outright
 * And never partially rendered.
 */
export async function fetchCommands(signal?: AbortSignal): Promise<CommandCatalogDto> {
  let payload: unknown;
  try {
    payload = await postJson('/api/commands/list', undefined, signal);
  } catch (error: unknown) {
    if (isAbortError(error)) throw error;
    if (error instanceof RelayRequestError) {
      if (error.status === 401 || error.status === 403)
        throw new CatalogLifecycleError('forbidden');
      throw new CatalogLifecycleError('unavailable');
    }
    if (error instanceof SyntaxError) throw new CatalogLifecycleError('incompatible');
    throw new CatalogLifecycleError('unavailable');
  }
  if (!isCommandCatalogDto(payload)) {
    throw new CatalogLifecycleError('incompatible');
  }
  return payload;
}

/**
 * Send one host-confirmed runtime mutation. A fresh one-use ticket is obtained
 * Immediately before the write, and a unique control ID is minted per attempt;
 * Neither is cached or persisted. Every settled outcome — including stale,
 * Unsupported, and delivery-unknown — is returned rather than thrown, so the UI can
 * Reconcile without ever inventing an optimistic committed value or auto-retrying.
 */
export async function controlRuntime(
  sessionId: string,
  expectedRevision: number,
  operation: RuntimeOperation,
  expectedCatalogRevision?: number,
  signal?: AbortSignal,
): Promise<RuntimeControlResponse> {
  const controlId = `control_${crypto.randomUUID().replaceAll('-', '_')}`;
  let controlStarted = false;
  try {
    let command: RuntimeControlCommand;
    if (operation.type === 'set_model') {
      if (expectedCatalogRevision === undefined) {
        throw new Error('A catalog revision is required to switch models.');
      }
      const ticketRequest: RuntimeModelTicketRequest = {
        sessionId,
        expectedRevision,
        expectedCatalogRevision,
        operation,
      };
      const ticketPayload = await postJson('/api/runtime/ticket', ticketRequest, signal, [201]);
      if (!isRuntimeModelTicketResponse(ticketPayload)) {
        throw new Error('Relay returned an invalid runtime ticket.');
      }
      command = {
        type: 'runtime.control',
        controlId,
        sessionId,
        expectedRevision,
        expectedCatalogRevision,
        operation,
        ticket: ticketPayload.ticket,
      };
    } else {
      command = {
        type: 'runtime.control',
        controlId,
        sessionId,
        expectedRevision,
        operation,
        ticket: await requestTicket(signal),
      };
    }
    controlStarted = true;
    const payload = await postJson('/api/runtime/control', command, signal, [202, 409, 422, 503]);
    if (!isRuntimeControlResponse(payload)) {
      return { outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' } };
    }
    return payload;
  } catch (error: unknown) {
    if (!controlStarted) {
      // The mutation never reached the host: map transport blocks to bounded
      // Issues. An ambiguous failure here is still safe to redact.
      const issueCode = runtimeIssueForTransportError(error);
      return {
        outcome: {
          status: 'unavailable',
          reasonCode: 'runtime_unavailable',
          ...(issueCode === null ? {} : { issueCode }),
        },
      };
    }
    // Once the command submission starts, transport failure is terminal and ambiguous.
    // A retry could apply the same user intent twice, so reconciliation is the only safe path.
    return { outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' } };
  }
}

/**
 * Send one host-confirmed Build/Plan mode switch through the dedicated plan
 * Control lane. A fresh one-use ticket is obtained immediately before the
 * Write and a unique control ID is minted per attempt; neither is cached or
 * Persisted. The request carries the expected runtime revision so a stale
 * Client can never move authority, and every outcome — accepted, stale,
 * Unsupported, and delivery-unknown — returns as a bounded response so the UI
 * Reconciles read-only instead of retrying an uncertain mutation.
 */
export async function setMode(
  sessionId: string,
  expectedRuntimeRevision: number,
  target: 'build' | 'plan',
  signal?: AbortSignal,
): Promise<RuntimeControlResponse> {
  if (isDemoMode()) {
    // The preview fixture answers mode switches on the generic lane; real
    // Deployments never send a mode switch through that lane.
    return controlRuntime(
      sessionId,
      expectedRuntimeRevision,
      { type: 'set_mode', mode: target },
      undefined,
      signal,
    );
  }
  const controlId = `control_${crypto.randomUUID().replaceAll('-', '_')}`;
  let controlStarted = false;
  try {
    const oneUseTicket = await requestTicket(signal);
    const command: SetModeCommand = {
      type: 'set_mode',
      target,
      expectedRuntimeRevision,
      controlId,
      oneUseTicket,
    };
    controlStarted = true;
    const payload = await postJson('/api/plan/control', command, signal, [202, 409, 422, 503]);
    if (!isPlanControlResponse(payload)) {
      return { outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' } };
    }
    return normalizePlanControlResponse(payload);
  } catch (error: unknown) {
    if (!controlStarted) {
      // The mutation never reached the host: map transport blocks to bounded issues.
      const issueCode = runtimeIssueForTransportError(error);
      return {
        outcome: {
          status: 'unavailable',
          reasonCode: 'runtime_unavailable',
          ...(issueCode === null ? {} : { issueCode }),
        },
      };
    }
    // Once submission starts, transport failure is terminal and ambiguous:
    // Reconciliation is the only safe path, never an automatic retry.
    return { outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' } };
  }
}

/**
 * Submit one atomic reviewed-plan handoff. The ticket is minted immediately
 * Before the request and is never retained for a later attempt.
 */
export async function executePlan(
  sessionId: string,
  expectedRuntimeRevision: number,
  planId: string,
  expectedPlanRevision: number,
  planToken: string,
  selectedApproachId?: string,
  signal?: AbortSignal,
): Promise<RuntimeControlResponse> {
  const controlId = `control_${crypto.randomUUID().replaceAll('-', '_')}`;
  let controlStarted = false;
  try {
    const oneUseTicket = await requestTicket(signal);
    const command: ExecutePlanCommand = {
      type: 'execute_plan',
      planId,
      expectedPlanRevision,
      planToken,
      expectedRuntimeRevision,
      postRunMode: 'plan',
      controlId,
      oneUseTicket,
      ...(selectedApproachId === undefined ? {} : { selectedApproachId }),
    };
    controlStarted = true;
    const payload = await postJson('/api/plan/control', command, signal, [202, 409, 422, 503]);
    if (!isPlanControlResponse(payload)) {
      return { outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' } };
    }
    if (
      payload.outcome.status === 'accepted' &&
      (payload.outcome.state.sessionId !== sessionId ||
        payload.outcome.state.mode !== 'executing-plan')
    ) {
      return { outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' } };
    }
    return normalizePlanControlResponse(payload);
  } catch (error: unknown) {
    if (!controlStarted) {
      const issueCode = runtimeIssueForTransportError(error);
      return {
        outcome: {
          status: 'unavailable',
          reasonCode: 'runtime_unavailable',
          ...(issueCode === null ? {} : { issueCode }),
        },
      };
    }
    return { outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' } };
  }
}

/**
 * Fold the plan control outcome into the shared runtime response shape. Only
 * The status and the bounded issue code are load-bearing for the reducer; the
 * Plan-specific reason codes are intentionally dropped so no raw reason text
 * Can reach UI state.
 */
function normalizePlanControlResponse(response: PlanControlResponse): RuntimeControlResponse {
  const outcome: PlanControlOutcome = response.outcome;
  switch (outcome.status) {
    case 'accepted':
    case 'stale':
      return { outcome };
    case 'unsupported':
    case 'policy_blocked':
    case 'delivery-unknown':
      return { outcome };
    case 'unavailable':
      return {
        outcome: {
          status: 'unavailable',
          reasonCode: 'runtime_unavailable',
          ...(outcome.issueCode === undefined ? {} : { issueCode: outcome.issueCode }),
        },
      };
  }
}

function runtimeIssueForTransportError(error: unknown): RuntimeIssueCode | null {
  if (error instanceof RelayRequestError) {
    if (error.status === 403) return 'foreground-required';
    if (error.status === 429) return 'rate-limited';
    if (error.status !== null && error.status >= 500) return 'host-unavailable';
    return 'host-unavailable';
  }
  if (error instanceof SyntaxError) return 'invalid-response';
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
  if (isRecord(error) && isRuntimeIssueCode(error.issueCode)) return error.issueCode;
  return null;
}

function isPlanBindingResponse(value: unknown): value is PlanBindingResponse {
  return (
    isRecord(value) &&
    Object.keys(value).every((key) =>
      ['sessionId', 'planId', 'planRevision', 'runtimeRevision', 'planToken'].includes(key),
    ) &&
    isOpaqueId(value.sessionId) &&
    isOpaqueId(value.planId) &&
    typeof value.planRevision === 'number' &&
    Number.isSafeInteger(value.planRevision) &&
    value.planRevision >= 0 &&
    typeof value.runtimeRevision === 'number' &&
    Number.isSafeInteger(value.runtimeRevision) &&
    value.runtimeRevision >= 0 &&
    isOpaqueToken(value.planToken)
  );
}

// ───────────────────────────────────────────────────────────────────
// 9. PROMPT ABORT AND APPROVALS
// ───────────────────────────────────────────────────────────────────

/** Interrupt the running agent. A fresh one-use ticket is obtained immediately before. */
export async function abortPrompt(signal?: AbortSignal): Promise<PromptAbortResponse> {
  const ticket = await requestTicket(signal);
  const payload = await postJson('/api/prompt/abort', { ticket }, signal, [202, 503]);
  if (!isPromptAbortResponse(payload)) {
    throw new Error('Relay returned an invalid abort result.');
  }
  return payload;
}

export async function fetchApprovals(
  sessionId: string,
  signal?: AbortSignal,
): Promise<readonly ApprovalCardDto[]> {
  const payload = await postJson('/api/approvals', { sessionId }, signal);
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.approvals) ||
    !payload.approvals.every(isApprovalCardDto)
  ) {
    throw new Error('Relay returned an invalid approval review.');
  }
  return payload.approvals;
}

export async function decideApproval(
  approval: ApprovalCardDto,
  decision: ApprovalDecision,
  signal?: AbortSignal,
): Promise<void> {
  const payload = await postJson(
    '/api/approval/decide',
    {
      type: 'approval.decide',
      approvalId: approval.approvalId,
      decision,
      idempotencyKey: `decision_${crypto.randomUUID().replaceAll('-', '_')}`,
      epoch: approval.epoch,
      revision: approval.revision,
      digest: approval.digest,
    },
    signal,
    [202, 409],
  );
  if (!isApprovalDecisionResponse(payload))
    throw new Error('Relay returned an invalid approval result.');
  if (!payload.accepted) throw new Error(denialMessage(payload.result.reason));
}

export async function createAcceptEditsGrant(
  approval: ApprovalCardDto,
  remainingActions: number,
  signal?: AbortSignal,
): Promise<AcceptEditsGrantDto> {
  const payload = await postJson(
    '/api/accept-edits',
    {
      sessionId: approval.sessionId,
      epoch: approval.epoch,
      allowedTools: [approval.tool],
      remainingActions,
      ttlMs: 10 * 60_000,
    },
    signal,
  );
  if (!isAcceptEditsGrantDto(payload))
    throw new Error('Relay returned an invalid accept-edits grant.');
  return payload;
}

// ───────────────────────────────────────────────────────────────────
// 10. TRANSCRIPT AND ASK-QUESTION FLOW
// ───────────────────────────────────────────────────────────────────

export async function fetchTranscript(
  sessionId: string,
  signal: AbortSignal,
): Promise<TranscriptLoad> {
  const items: RelayTranscriptBlock[] = [];
  let after = 0;
  for (let pageNumber = 0; pageNumber < MAX_PAGES; pageNumber += 1) {
    const payload = await postJson(
      `/api/sessions/${encodeURIComponent(sessionId)}/transcript`,
      { after, limit: PAGE_LIMIT },
      signal,
    );
    if (!isTranscriptPageDto(payload) || payload.sessionId !== sessionId) {
      throw new Error('Relay returned an invalid transcript page.');
    }
    items.push(...payload.items.map(annotateRelayBlock));
    if (payload.nextSeq === null) return { items, coversThrough: payload.coversThrough };
    after = payload.nextSeq;
  }
  throw new Error('Transcript exceeded the bounded page limit.');
}

export async function fetchAskQuestionDisplay(
  sessionId: string,
  questionId: string,
  revision: number,
  signal?: AbortSignal,
): Promise<AskQuestionDisplayDto> {
  const request: AskQuestionDisplayReadRequest = { sessionId, questionId, revision };
  let payload: unknown;
  try {
    payload = await postJson('/api/ask-question/display', request, signal);
  } catch (cause: unknown) {
    throw askQuestionRelayError(cause, 'display');
  }
  if (
    !isAskQuestionDisplayDto(payload) ||
    payload.sessionId !== sessionId ||
    payload.questionId !== questionId ||
    payload.revision !== revision
  ) {
    throw new AskQuestionRelayError('host-unavailable');
  }
  return payload;
}

export async function requestAskQuestionAnswerTicket(
  request: AskQuestionAnswerTicketRequest,
  signal?: AbortSignal,
): Promise<AskQuestionAnswerTicketResponse> {
  let payload: unknown;
  try {
    payload = await postJson(
      '/api/ask-question/ticket',
      request,
      signal,
      [201, 400, 401, 403, 409, 422, 429, 503],
    );
  } catch (cause: unknown) {
    throw askQuestionRelayError(cause, 'ticket');
  }
  if (isAskQuestionAnswerTicketResponse(payload)) return payload;
  throw new AskQuestionRelayError(askQuestionReasonFromPayload(payload));
}

export async function submitAskQuestionAnswer(
  request: AskQuestionAnswerRequest,
  signal?: AbortSignal,
): Promise<AskQuestionAnswerResult> {
  let payload: unknown;
  try {
    payload = await postJson(
      '/api/ask-question/answer',
      request,
      signal,
      [202, 400, 401, 403, 409, 422, 429, 503],
    );
  } catch (cause: unknown) {
    throw askQuestionRelayError(cause, 'answer');
  }
  if (
    isAskQuestionAnswerResult(payload) &&
    payload.sessionId === request.sessionId &&
    payload.questionId === request.questionId &&
    payload.revision === request.expectedRevision &&
    payload.clientMutationId === request.clientMutationId
  ) {
    return payload;
  }
  throw new AskQuestionRelayError(askQuestionReasonFromPayload(payload));
}

function askQuestionRelayError(
  cause: unknown,
  phase: 'display' | 'ticket' | 'answer',
): AskQuestionRelayError {
  if (cause instanceof AskQuestionRelayError) return cause;
  if (cause instanceof RelayRequestError) {
    if (cause.status === null) {
      return new AskQuestionRelayError(phase === 'answer' ? 'delivery-unknown' : 'host-unavailable');
    }
    return new AskQuestionRelayError(
      askQuestionReasonFromServerCode(cause.serverCode, cause.status, phase),
      cause.status,
    );
  }
  return new AskQuestionRelayError(phase === 'answer' ? 'delivery-unknown' : 'host-unavailable');
}

function askQuestionReasonFromPayload(value: unknown): AskQuestionResultReason {
  if (isRecord(value) && typeof value.error === 'string') {
    return askQuestionReasonFromServerCode(value.error, null, 'ticket');
  }
  return 'host-unavailable';
}

function askQuestionReasonFromServerCode(
  code: string | null,
  status: number | null,
  phase: 'display' | 'ticket' | 'answer',
): AskQuestionResultReason {
  switch (code) {
    case 'invalid-ticket':
    case 'invalid_ticket':
      return 'invalid-ticket';
    case 'revision-mismatch':
    case 'revision_mismatch':
      return 'revision-mismatch';
    case 'question-withdrawn':
    case 'question_withdrawn':
    case 'question-not-found':
    case 'question_not_found':
      return 'question-withdrawn';
    case 'question-already-answered':
    case 'question_already_answered':
      return 'question-already-answered';
    case 'plan-mode-blocked':
    case 'plan_mode_blocked':
      return 'plan-mode-blocked';
    case 'redaction-policy-blocked':
    case 'redaction_policy_blocked':
      return 'redaction-policy-blocked';
    case 'validation-failed':
    case 'invalid_request':
    case 'invalid_ticket_request':
    case 'invalid_answer_request':
    case 'foreground_required':
      return 'validation-failed';
    case 'delivery-unknown':
    case 'delivery_unknown':
      return 'delivery-unknown';
    case 'host-unavailable':
    case 'host_unavailable':
    case 'ask_question_unavailable':
    case 'rate_limited':
      return 'host-unavailable';
    default:
      if (status === 404 && phase === 'display') return 'question-withdrawn';
      return 'host-unavailable';
  }
}

function annotateRelayBlock(block: TranscriptBlock): RelayTranscriptBlock {
  return {
    ...block,
    provenance: 'relay',
    richEligible: isRichTranscriptBlock(block),
  };
}

// ───────────────────────────────────────────────────────────────────
// 11. ARTIFACT READS
// ───────────────────────────────────────────────────────────────────

/** Read one relay-authored artifact revision without routing bytes through JSON transport. */
export async function readArtifact(
  sessionId: string,
  block: ArtifactResourceBlock,
  signal?: AbortSignal,
  variant?: ArtifactReadVariant,
): Promise<ArtifactResource> {
  if (isInboundImageReadyBlock(block)) {
    return readInboundArtifact(sessionId, block, variant ?? 'full', signal);
  }
  if (isFilePreviewBlock(block) && block.renderer === 'image') {
    return readInboundArtifact(
      sessionId,
      block as FilePreviewBlock & { readonly renderer: 'image' },
      variant ?? 'full',
      signal,
    );
  }
  if (
    !isOpaqueId(sessionId) ||
    !isFilePreviewBlock(block) ||
    (block.availability !== undefined && block.availability !== 'ready') ||
    block.content.kind !== 'artifact-ref'
  ) {
    throw new ArtifactReadError('unavailable');
  }

  if (isDemoMode()) {
    const bytes = demoArtifactBytes(block);
    noteRelayHeartbeat();
    return validateArtifactBytes(bytes, block);
  }

  const path = `/api/sessions/${encodeURIComponent(sessionId)}/artifacts/${encodeURIComponent(
    block.artifactId,
  )}/revisions/${encodeURIComponent(block.revision)}`;
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      redirect: 'error',
      headers: { accept: block.mimeType },
      ...(signal === undefined ? {} : { signal }),
    });
  } catch (error: unknown) {
    if (isAbortError(error)) throw error;
    throw new ArtifactReadError('unavailable');
  }
  noteRelayHeartbeat();
  if (response.status !== 200 || !response.ok) {
    const code: ArtifactReadErrorCode =
      response.status === 401 || response.status === 403
        ? 'denied'
        : response.status === 404
          ? 'missing'
          : response.status === 410
            ? 'expired'
            : response.status === 409
              ? 'revision-conflict'
              : response.status === 429
                ? 'rate-limited'
                : response.status >= 500
                  ? 'unavailable'
                  : 'invalid-response';
    throw new ArtifactReadError(code, response.status);
  }

  const contentType = response.headers.get('content-type')?.split(';', 1)[0]?.trim() ?? '';
  const revision = response.headers.get('x-artifact-revision');
  const etag = response.headers.get('etag');
  const cacheControl = response.headers.get('cache-control') ?? '';
  const nosniff = response.headers.get('x-content-type-options');
  const resourcePolicy = response.headers.get('cross-origin-resource-policy');
  if (
    contentType !== block.mimeType ||
    revision !== block.revision ||
    etag === null ||
    etag.startsWith('W/') ||
    stripEtagQuotes(etag) !== block.digest ||
    !cacheControl.toLowerCase().includes('no-store') ||
    nosniff?.toLowerCase() !== 'nosniff' ||
    resourcePolicy?.toLowerCase() !== 'same-origin'
  ) {
    throw new ArtifactReadError('revision-conflict', response.status);
  }
  const declaredLength = parseContentLength(response.headers.get('content-length'));
  if (declaredLength !== null && declaredLength > MAX_ARTIFACT_BYTES) {
    throw new ArtifactReadError('too-large', response.status);
  }
  const bytes = await readBoundedBody(response, MAX_ARTIFACT_BYTES);
  return validateArtifactBytes(bytes, block, contentType, revision, etag);
}

async function readInboundArtifact(
  sessionId: string,
  block: InboundImageReadyBlock | (FilePreviewBlock & { readonly renderer: 'image' }),
  variant: ArtifactReadVariant,
  signal?: AbortSignal,
): Promise<ArtifactResource> {
  if (!isOpaqueId(sessionId) || block.content.kind !== 'artifact-ref') {
    throw new ArtifactReadError('unavailable');
  }
  const expected = isInboundImageReadyBlock(block)
    ? {
        artifactId: block.artifact.id,
        revision: block.artifact.revision,
        digest: block.artifact[variant].digest,
        byteLength: block.artifact[variant].byteLength,
        contentType: block.artifact[variant].mediaType,
      }
    : {
        artifactId: block.artifactId,
        revision: block.revision,
        digest: block.digest,
        byteLength: block.byteLength,
        contentType: block.mimeType,
      };

  if (isDemoMode()) {
    if (!isFilePreviewBlock(block)) throw new ArtifactReadError('unavailable');
    const bytes = demoArtifactBytes(block);
    noteRelayHeartbeat();
    return validateArtifactBytes(bytes, block);
  }

  let response: Response;
  try {
    response = await fetch('/api/artifacts/read', {
      method: 'POST',
      cache: 'no-store',
      credentials: 'same-origin',
      redirect: 'error',
      headers: {
        accept: expected.contentType,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        artifactId: expected.artifactId,
        revision: expected.revision,
        variant,
      }),
      ...(signal === undefined ? {} : { signal }),
    });
  } catch (error: unknown) {
    if (isAbortError(error)) throw error;
    throw new ArtifactReadError('unavailable');
  }
  noteRelayHeartbeat();
  if (response.status !== 200 || !response.ok) {
    throw new ArtifactReadError(artifactReadCodeForStatus(response.status), response.status);
  }

  const contentType = response.headers.get('content-type')?.split(';', 1)[0]?.trim() ?? '';
  const contentLength = parseContentLength(response.headers.get('content-length'));
  const contentDigest = parseContentDigest(response.headers.get('content-digest'));
  const etag = response.headers.get('etag');
  const cacheControl = response.headers.get('cache-control') ?? '';
  const contentDisposition = response.headers.get('content-disposition') ?? '';
  const nosniff = response.headers.get('x-content-type-options');
  const resourcePolicy = response.headers.get('cross-origin-resource-policy');
  const referrerPolicy = response.headers.get('referrer-policy');
  if (
    contentLength === null ||
    contentLength > MAX_ARTIFACT_BYTES ||
    (expected.byteLength !== null && contentLength !== expected.byteLength) ||
    contentType !== expected.contentType ||
    etag === null ||
    etag.startsWith('W/') ||
    contentDigest === null ||
    !cacheControl.toLowerCase().includes('no-store') ||
    !contentDisposition.toLowerCase().startsWith('attachment;') ||
    nosniff?.toLowerCase() !== 'nosniff' ||
    resourcePolicy?.toLowerCase() !== 'same-origin' ||
    referrerPolicy?.toLowerCase() !== 'no-referrer'
  ) {
    throw new ArtifactReadError('revision-conflict', response.status);
  }

  const bytes = await readBoundedBody(response, MAX_ARTIFACT_BYTES, contentLength);
  if (
    bytes.byteLength !== contentLength ||
    stripEtagQuotes(etag).toLowerCase() !== expected.digest.toLowerCase() ||
    contentDigest.toLowerCase() !== expected.digest.toLowerCase()
  ) {
    throw new ArtifactReadError('digest-mismatch', response.status);
  }
  const digest = await digestBytes(bytes);
  if (digest !== expected.digest.toLowerCase()) {
    throw new ArtifactReadError('digest-mismatch', response.status);
  }
  return {
    bytes,
    contentType,
    revision: expected.revision,
    etag,
    digest,
    contentDigest,
  };
}

function artifactReadCodeForStatus(status: number): ArtifactReadErrorCode {
  return status === 401 || status === 403
    ? 'denied'
    : status === 404
      ? 'missing'
      : status === 410
        ? 'expired'
        : status === 409
          ? 'revision-conflict'
          : status === 429
            ? 'rate-limited'
            : status >= 500
              ? 'unavailable'
              : 'invalid-response';
}

export const fetchArtifactRevision = readArtifact;
export const readArtifactRevision = readArtifact;

async function digestBytes(bytes: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle === undefined) throw new ArtifactReadError('invalid-response');
  const hash = await subtle.digest('SHA-256', bytes.slice());
  return [...new Uint8Array(hash)].map((part) => part.toString(16).padStart(2, '0')).join('');
}

async function readBoundedBody(
  response: Response,
  maximumBytes: number,
  expectedLength: number | null = null,
): Promise<Uint8Array> {
  if (response.body === null || typeof response.body.getReader !== 'function') {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (
      bytes.byteLength > maximumBytes ||
      (expectedLength !== null && bytes.byteLength !== expectedLength)
    ) {
      throw new ArtifactReadError(
        bytes.byteLength > maximumBytes ? 'too-large' : 'invalid-response',
        response.status,
      );
    }
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      const chunk = next.value;
      total += chunk.byteLength;
      if (total > maximumBytes) {
        await reader.cancel();
        throw new ArtifactReadError('too-large', response.status);
      }
      chunks.push(chunk.slice());
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  if (expectedLength !== null && total !== expectedLength) {
    throw new ArtifactReadError('invalid-response', response.status);
  }
  return bytes;
}

function validateArtifactBytes(
  bytes: Uint8Array,
  block: FilePreviewBlock,
  contentType = block.mimeType,
  revision = block.revision,
  etag = `"${block.digest}"`,
): Promise<ArtifactResource> {
  if (bytes.byteLength > MAX_ARTIFACT_BYTES) {
    return Promise.reject(new ArtifactReadError('too-large'));
  }
  if (block.byteLength !== null && bytes.byteLength !== block.byteLength) {
    return Promise.reject(new ArtifactReadError('revision-conflict'));
  }
  return digestBytes(bytes).then((digest) => {
    if (digest !== block.digest || stripEtagQuotes(etag) !== block.digest) {
      throw new ArtifactReadError('digest-mismatch');
    }
    return { bytes, contentType, revision, etag, digest };
  });
}

function stripEtagQuotes(value: string): string {
  return value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
}

function parseContentLength(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseContentDigest(value: string | null): string | null {
  if (value === null) return null;
  const match = /^sha-256=:([A-Za-z0-9+/]+={0,2}):$/i.exec(value.trim());
  if (match === null || match[1] === undefined) return null;
  try {
    const decoded = atob(match[1]);
    if (decoded.length !== 32) return null;
    return [...decoded].map((part) => part.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

// ───────────────────────────────────────────────────────────────────
// 12. SYNC SOCKET
// ───────────────────────────────────────────────────────────────────

export type SyncSocket = WebSocket & {
  readonly sessionExpiresAt?: string;
};

export async function openSyncSocket(
  sessionId: string,
  cursor: SyncCursor | null,
  onMessage: (message: SyncMessage) => void,
  signal?: AbortSignal,
): Promise<SyncSocket> {
  if (isDemoMode()) {
    return withSessionExpiry(
      demoSocket(sessionId, onMessage as (message: unknown) => void),
      DEMO_SESSION_EXPIRES_AT,
    );
  }
  const session = await establishSession();
  if (session === null) {
    throw new Error('Device enrollment is required before opening the read-only stream.');
  }
  const ticket = await requestTicket(signal);
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = new URL(`${protocol}//${window.location.host}/api/sync`);
  url.searchParams.set('ticket', ticket);
  const socket = new WebSocket(url);
  socket.addEventListener('open', () => {
    noteRelayHeartbeat();
    socket.send(
      JSON.stringify({
        type: 'subscribe',
        sessionId,
        ...(cursor === null ? {} : { cursor }),
      }),
    );
  });
  socket.addEventListener('message', (event) => {
    try {
      const value: unknown = JSON.parse(String(event.data));
      if (isReadOnlySyncMessage(value, sessionId)) {
        noteRelayHeartbeat();
        onMessage(value);
      }
    } catch {
      // Malformed frames cannot enter display state.
    }
  });
  return withSessionExpiry(socket, session.expiresAt);
}

function withSessionExpiry(socket: WebSocket, expiresAt: string): SyncSocket {
  Object.defineProperty(socket, 'sessionExpiresAt', {
    configurable: true,
    value: expiresAt,
  });
  return socket as SyncSocket;
}

export function isReadOnlySyncMessage(value: unknown, sessionId: string): value is SyncMessage {
  if (!isSyncMessage(value) || value.sessionId !== sessionId) return false;
  if (value.kind === 'sync.gap') return true;
  return value.envelopes.every(
    (envelope) =>
      !isTodoProjectionEnvelopeKind(envelope.kind) ||
      isTodoProjectionEnvelopePayload(envelope.kind, envelope.payload),
  );
}

// ───────────────────────────────────────────────────────────────────
// 13. HTTP TRANSPORT
// ───────────────────────────────────────────────────────────────────

async function postJson(
  path: string,
  body: unknown,
  signal?: AbortSignal,
  acceptedStatuses: readonly number[] = [],
): Promise<unknown> {
  return postJsonWithHeaders(
    path,
    body,
    body === undefined ? {} : { 'content-type': 'application/json' },
    signal,
    acceptedStatuses,
  );
}

async function postJsonWithHeaders(
  path: string,
  body: unknown,
  headers: Readonly<Record<string, string>>,
  signal?: AbortSignal,
  acceptedStatuses: readonly number[] = [],
): Promise<unknown> {
  if (isDemoMode()) return demoPostJson(path, body);
  const response = await fetch(path, {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers,
    body: body === undefined ? null : JSON.stringify(body),
    ...(signal === undefined ? {} : { signal }),
  });
  noteRelayHeartbeat();
  if (!response.ok && !acceptedStatuses.includes(response.status)) {
    let serverCode: string | null = null;
    try {
      const errorBody: unknown = await response.clone().json();
      if (
        isRecord(errorBody) &&
        typeof errorBody.error === 'string' &&
        errorBody.error.length <= 64
      ) {
        serverCode = errorBody.error;
      }
    } catch {
      serverCode = null;
    }
    throw new RelayRequestError(
      response.status === 401 || response.status === 403 ? 'access_denied' : 'request_failed',
      response.status,
      response.status === 429 ? parseBoundedRetryAfter(response.headers.get('retry-after')) : null,
      serverCode,
    );
  }
  return response.status === 204 ? null : (response.json() as Promise<unknown>);
}

// ───────────────────────────────────────────────────────────────────
// 14. PAYLOAD VALIDATION HELPERS
// ───────────────────────────────────────────────────────────────────

function sameAttachmentBinding(
  manifest: AttachmentSetManifest,
  binding: AttachmentReserveBinding,
): boolean {
  return (
    manifest.submissionId === binding.submissionId &&
    manifest.sessionId === binding.sessionId &&
    manifest.sessionEpoch === binding.sessionEpoch &&
    manifest.expectedPromptRevision === binding.expectedPromptRevision
  );
}

function isAttachmentReservationResponse(value: unknown): value is AttachmentReservationResponse {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      'attachmentSetId',
      'revision',
      'expiresAt',
      'parts',
      'statusTicket',
      'cancelTicket',
    ]) &&
    isOpaqueId(value.attachmentSetId) &&
    isSafeNonNegativeInteger(value.revision) &&
    isTimestampLike(value.expiresAt) &&
    Array.isArray(value.parts) &&
    value.parts.every(isAttachmentPartTicket) &&
    isWebSocketTicketResponse(value.statusTicket) &&
    isWebSocketTicketResponse(value.cancelTicket)
  );
}

function isAttachmentStatusResponse(value: unknown): value is AttachmentStatusResponse {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['attachmentSetId', 'revision', 'status', 'expiresAt', 'parts']) &&
    isOpaqueId(value.attachmentSetId) &&
    isSafeNonNegativeInteger(value.revision) &&
    isAttachmentSetStatus(value.status) &&
    isTimestampLike(value.expiresAt) &&
    Array.isArray(value.parts) &&
    value.parts.every(isAttachmentPartStatusDto)
  );
}

function isAttachmentUploadResponse(value: unknown): value is AttachmentUploadResponse {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['attachmentSetId', 'partId', 'status']) &&
    isOpaqueId(value.attachmentSetId) &&
    isOpaqueId(value.partId) &&
    value.status === 'ready'
  );
}

function isAttachmentSetStatus(value: unknown): value is AttachmentSetStatus {
  return (
    value === 'reserved' ||
    value === 'uploading' ||
    value === 'checking' ||
    value === 'ready' ||
    value === 'rejected' ||
    value === 'cancelled' ||
    value === 'expired' ||
    value === 'delivery-unknown'
  );
}

function isTimestampLike(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return (
    Object.keys(value).every((key) => allowed.has(key)) && Object.keys(value).length === keys.length
  );
}

function denialMessage(reason: string): string {
  const messages: Readonly<Record<string, string>> = {
    'approval-not-found': 'This approval no longer exists.',
    'principal-mismatch': 'This approval belongs to another operator.',
    'epoch-mismatch': 'The session changed before your decision arrived.',
    'revision-mismatch': 'Another device settled this approval first.',
    'digest-mismatch': 'The exact action changed and was denied.',
    'lease-expired': 'The approval expired before it could settle.',
    'lease-already-settled': 'This approval was already settled.',
    'idempotency-key-replayed': 'This decision was already submitted.',
  };
  return messages[reason] ?? `Approval denied: ${reason}.`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
