// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Protocol Guards
// ───────────────────────────────────────────────────────────────────

import type {
  AcceptEditsGrantDto,
  AttentionChangedPayload,
  AttentionClass,
  AttentionItemDto,
  AttentionResolutionDto,
  ApprovalCardDto,
  ApprovalAuthorityConsumeRequest,
  ApprovalAuthorityConsumeResponse,
  ApprovalAuthorityRequest,
  ApprovalAuthorityRequestResponse,
  ApprovalDecisionCommand,
  ApprovalDecisionResponse,
  ApprovalRequestedPayload,
  ApprovalResultPayload,
  ApplicationSessionResponse,
  DevicePublicKeyJwk,
  EnrollmentQr,
  EnrollmentResponse,
  Envelope,
  JsonValue,
  PiRpcCommand,
  PiRpcEvent,
  PiRpcEventType,
  PiRpcResponse,
  PromptSubmitCommand,
  PromptSubmitResponse,
  SessionCardDto,
  SessionChallengeResponse,
  PushHintPayload,
  PushPreferences,
  PushSubscriptionInput,
  SyncMessage,
  TranscriptBlock,
  TranscriptPageDto,
  WebSocketTicketResponse,
} from './types.js';

const APPROVAL_RESULT_STATUSES = new Set([
  'approved',
  'denied',
  'expired',
  'revoked',
  'raced',
  'stale',
  'duplicate',
  'restart-invalidated',
  'consumed',
  'failed',
]);
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;

const RPC_EVENT_TYPES = new Set<PiRpcEventType>([
  'agent_start',
  'agent_end',
  'agent_settled',
  'turn_start',
  'turn_end',
  'message_start',
  'message_update',
  'message_end',
  'bash_execution_update',
  'tool_execution_start',
  'tool_execution_update',
  'tool_execution_end',
  'queue_update',
  'compaction_start',
  'compaction_end',
  'auto_retry_start',
  'auto_retry_end',
  'summarization_retry_scheduled',
  'summarization_retry_attempt_start',
  'summarization_retry_finished',
  'extension_error',
  'extension_ui_request',
]);

const OPAQUE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/;
const ATTENTION_CLASSES = new Set<AttentionClass>(['needs_input', 'finished', 'error']);

/** Return whether a value can be serialized as JSON without coercion. */
export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return true;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  if (!isRecord(value)) {
    return false;
  }
  return Object.values(value).every((item) => item === undefined || isJsonValue(item));
}

/** Return whether a string is suitable as an opaque wire identifier. */
export function isOpaqueId(value: unknown): value is string {
  return typeof value === 'string' && OPAQUE_ID_PATTERN.test(value);
}

export function isAttentionClass(value: unknown): value is AttentionClass {
  return typeof value === 'string' && ATTENTION_CLASSES.has(value as AttentionClass);
}

export function isAttentionChangedPayload(value: unknown): value is AttentionChangedPayload {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['lookupId', 'attentionClass', 'generation', 'nonce']) &&
    isOpaqueId(value.lookupId) &&
    isAttentionClass(value.attentionClass) &&
    isPositiveInteger(value.generation) &&
    isOpaqueId(value.nonce)
  );
}

export function isPushHintPayload(value: unknown): value is PushHintPayload {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['lookupId', 'attentionClass']) &&
    isOpaqueId(value.lookupId) &&
    isAttentionClass(value.attentionClass)
  );
}

export function isAttentionItemDto(value: unknown): value is AttentionItemDto {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['lookupId', 'attentionClass', 'generation', 'nonce', 'occurredAt']) &&
    isOpaqueId(value.lookupId) &&
    isAttentionClass(value.attentionClass) &&
    isPositiveInteger(value.generation) &&
    isOpaqueId(value.nonce) &&
    isTimestamp(value.occurredAt)
  );
}

export function isAttentionResolutionDto(value: unknown): value is AttentionResolutionDto {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['item', 'sessionId', 'epoch', 'target', 'focusId']) &&
    isAttentionItemDto(value.item) &&
    isOpaqueId(value.sessionId) &&
    isOpaqueId(value.epoch) &&
    (value.target === 'session' || value.target === 'review') &&
    (value.focusId === null || isOpaqueId(value.focusId))
  );
}

export function isPushPreferences(value: unknown): value is PushPreferences {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['needs_input', 'finished', 'error']) &&
    typeof value.needs_input === 'boolean' &&
    typeof value.finished === 'boolean' &&
    typeof value.error === 'boolean'
  );
}

export function isPushSubscriptionInput(value: unknown): value is PushSubscriptionInput {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ['endpoint', 'expirationTime', 'keys']) ||
    typeof value.endpoint !== 'string' ||
    value.endpoint.length > 2_048 ||
    !isRecord(value.keys) ||
    !hasOnlyKeys(value.keys, ['p256dh', 'auth']) ||
    !isBase64Url(value.keys.p256dh, 40, 256) ||
    !isBase64Url(value.keys.auth, 16, 64) ||
    (value.expirationTime !== null &&
      (typeof value.expirationTime !== 'number' ||
        !Number.isSafeInteger(value.expirationTime) ||
        value.expirationTime <= 0))
  ) {
    return false;
  }
  try {
    return new URL(value.endpoint).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Narrow an unknown value to a supported Pi RPC command. */
export function isPiRpcCommand(value: unknown): value is PiRpcCommand {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return false;
  }
  if (value.id !== undefined && typeof value.id !== 'string') {
    return false;
  }
  if (value.type === 'prompt' || value.type === 'steer' || value.type === 'follow_up') {
    return typeof value.message === 'string' && isJsonValue(value);
  }
  if (value.type === 'get_entries') {
    return (value.since === undefined || typeof value.since === 'string') && isJsonValue(value);
  }
  return (
    [
      'abort',
      'get_state',
      'get_messages',
      'get_session_stats',
      'get_tree',
      'get_last_assistant_text',
    ].includes(value.type) && isJsonValue(value)
  );
}

/** Narrow an unknown value to the exact transient phone-to-relay prompt command. */
export function isPromptSubmitCommand(value: unknown): value is PromptSubmitCommand {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['type', 'submissionId', 'sessionId', 'message', 'ticket']) &&
    value.type === 'prompt.submit' &&
    isOpaqueId(value.submissionId) &&
    isOpaqueId(value.sessionId) &&
    typeof value.message === 'string' &&
    value.message.trim().length > 0 &&
    isOpaqueId(value.ticket)
  );
}

/** Narrow an unknown value to a correlated Pi RPC response. */
export function isPiRpcResponse(value: unknown): value is PiRpcResponse {
  return (
    isRecord(value) &&
    value.type === 'response' &&
    typeof value.command === 'string' &&
    typeof value.success === 'boolean' &&
    (value.id === undefined || typeof value.id === 'string') &&
    (value.error === undefined || typeof value.error === 'string') &&
    isJsonValue(value)
  );
}

/** Narrow an unknown value to a known asynchronous Pi RPC event. */
export function isPiRpcEvent(value: unknown): value is PiRpcEvent {
  return (
    isRecord(value) &&
    typeof value.type === 'string' &&
    RPC_EVENT_TYPES.has(value.type as PiRpcEventType) &&
    isJsonValue(value)
  );
}

/** Narrow an unknown value to the versioned relay envelope. */
export function isEnvelope(value: unknown): value is Envelope {
  if (!isRecord(value) || !isRecord(value.redaction) || !isRecord(value.replay)) {
    return false;
  }
  return (
    value.v === 1 &&
    isOpaqueId(value.eventId) &&
    typeof value.kind === 'string' &&
    value.kind.length > 0 &&
    isOpaqueId(value.hostId) &&
    isOpaqueId(value.workspaceRef) &&
    isOpaqueId(value.sessionId) &&
    isOpaqueId(value.epoch) &&
    Number.isSafeInteger(value.seq) &&
    typeof value.seq === 'number' &&
    value.seq > 0 &&
    typeof value.occurredAt === 'string' &&
    !Number.isNaN(Date.parse(value.occurredAt)) &&
    (value.causedBy === null || isOpaqueId(value.causedBy)) &&
    isJsonValue(value.payload) &&
    value.redaction.policyVersion === 1 &&
    Number.isSafeInteger(value.redaction.fieldsRedacted) &&
    Array.isArray(value.redaction.reasons) &&
    value.redaction.reasons.every((reason) => typeof reason === 'string') &&
    typeof value.replay.eligible === 'boolean' &&
    typeof value.replay.snapshotEligible === 'boolean'
  );
}

/** Narrow an unknown value to a replay, snapshot or gap sync message. */
export function isSyncMessage(value: unknown): value is SyncMessage {
  if (
    !isRecord(value) ||
    !['sync.delta', 'sync.snapshot', 'sync.gap'].includes(String(value.kind)) ||
    !isOpaqueId(value.sessionId) ||
    !isOpaqueId(value.epoch) ||
    !Number.isSafeInteger(value.coversThrough) ||
    typeof value.coversThrough !== 'number' ||
    value.coversThrough < 0
  ) {
    return false;
  }
  if (value.kind === 'sync.gap') {
    return ['retention', 'epoch', 'ahead', 'unknown-session'].includes(String(value.reason));
  }
  if (!Array.isArray(value.envelopes) || !value.envelopes.every(isEnvelope)) return false;
  let previousSequence = 0;
  for (const envelope of value.envelopes) {
    if (
      envelope.sessionId !== value.sessionId ||
      envelope.epoch !== value.epoch ||
      envelope.seq <= previousSequence ||
      envelope.seq > value.coversThrough
    ) {
      return false;
    }
    previousSequence = envelope.seq;
  }
  return true;
}

/** Narrow an unknown value to an opaque, redacted session card. */
export function isSessionCardDto(value: unknown): value is SessionCardDto {
  return (
    isRecord(value) &&
    isOpaqueId(value.id) &&
    ['idle', 'running', 'interrupted', 'unknown'].includes(String(value.status)) &&
    typeof value.updatedAt === 'string' &&
    !Number.isNaN(Date.parse(value.updatedAt)) &&
    Number.isSafeInteger(value.messageCount) &&
    typeof value.messageCount === 'number' &&
    value.messageCount >= 0
  );
}

/** Narrow an unknown value to one authoritative transcript block. */
export function isTranscriptBlock(value: unknown): value is TranscriptBlock {
  if (!isTranscriptBase(value)) {
    return false;
  }
  switch (value.kind) {
    case 'text':
      return (
        typeof value.text === 'string' &&
        (value.role === undefined || value.role === 'assistant' || value.role === 'user')
      );
    case 'thinking':
      return typeof value.summary === 'string';
    case 'plan':
      return Array.isArray(value.items) && value.items.every(isPlanItem);
    case 'tool_call':
      return typeof value.toolName === 'string' && typeof value.inputSummary === 'string';
    case 'tool_result':
      return (
        typeof value.toolName === 'string' &&
        typeof value.output === 'string' &&
        typeof value.isError === 'boolean'
      );
    case 'file_diff':
      return typeof value.summary === 'string' && typeof value.patch === 'string';
    case 'usage':
      return (
        isNonNegativeNumber(value.inputTokens) &&
        isNonNegativeNumber(value.outputTokens) &&
        isNonNegativeNumber(value.cost)
      );
    default:
      return false;
  }
}

/** Narrow an unknown value to a paginated transcript response. */
export function isTranscriptPageDto(value: unknown): value is TranscriptPageDto {
  return (
    isRecord(value) &&
    isOpaqueId(value.sessionId) &&
    Array.isArray(value.items) &&
    value.items.every(isTranscriptBlock) &&
    (value.nextSeq === null ||
      (typeof value.nextSeq === 'number' && Number.isSafeInteger(value.nextSeq))) &&
    typeof value.coversThrough === 'number' &&
    Number.isSafeInteger(value.coversThrough) &&
    value.coversThrough >= 0
  );
}

/** Narrow a value to a bounded single-use enrollment payload. */
export function isEnrollmentQr(value: unknown): value is EnrollmentQr {
  return (
    isRecord(value) &&
    value.v === 1 &&
    isExactOrigin(value.origin) &&
    isOpaqueId(value.pairingId) &&
    isOpaqueId(value.hostFingerprint) &&
    isOpaqueId(value.challenge) &&
    isTimestamp(value.expiresAt)
  );
}

/** Narrow a JSON Web Key to the only device-key algorithm accepted by the relay. */
export function isDevicePublicKeyJwk(value: unknown): value is DevicePublicKeyJwk {
  return (
    isRecord(value) &&
    value.kty === 'EC' &&
    value.crv === 'P-256' &&
    isBase64Url(value.x, 43, 43) &&
    isBase64Url(value.y, 43, 43)
  );
}

export function isEnrollmentResponse(value: unknown): value is EnrollmentResponse {
  return isRecord(value) && isOpaqueId(value.deviceId) && isOpaqueId(value.hostFingerprint);
}

export function isSessionChallengeResponse(value: unknown): value is SessionChallengeResponse {
  return (
    isRecord(value) &&
    isOpaqueId(value.challengeId) &&
    isOpaqueId(value.challenge) &&
    isTimestamp(value.expiresAt)
  );
}

export function isApplicationSessionResponse(value: unknown): value is ApplicationSessionResponse {
  return isRecord(value) && value.mode === 'read-only' && isTimestamp(value.expiresAt);
}

export function isWebSocketTicketResponse(value: unknown): value is WebSocketTicketResponse {
  return isRecord(value) && isOpaqueId(value.ticket) && isTimestamp(value.expiresAt);
}

export function isPromptSubmitResponse(value: unknown): value is PromptSubmitResponse {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['accepted', 'block']) &&
    value.accepted === true &&
    isTranscriptBlock(value.block) &&
    value.block.kind === 'text' &&
    value.block.role === 'user'
  );
}

export function isApprovalDecisionCommand(value: unknown): value is ApprovalDecisionCommand {
  return (
    isRecord(value) &&
    Object.keys(value).every((key) =>
      ['type', 'approvalId', 'decision', 'idempotencyKey', 'epoch', 'revision', 'digest'].includes(
        key,
      ),
    ) &&
    value.type === 'approval.decide' &&
    isOpaqueId(value.approvalId) &&
    (value.decision === 'approve' || value.decision === 'deny') &&
    isOpaqueId(value.idempotencyKey) &&
    isOpaqueId(value.epoch) &&
    typeof value.revision === 'number' &&
    Number.isSafeInteger(value.revision) &&
    value.revision > 0 &&
    typeof value.digest === 'string' &&
    DIGEST_PATTERN.test(value.digest)
  );
}

export function isApprovalRequestedPayload(value: unknown): value is ApprovalRequestedPayload {
  return (
    isRecord(value) &&
    isOpaqueId(value.approvalId) &&
    isOpaqueId(value.sessionId) &&
    isOpaqueId(value.epoch) &&
    typeof value.tool === 'string' &&
    value.tool.length > 0 &&
    typeof value.canonicalArguments === 'string' &&
    typeof value.digest === 'string' &&
    DIGEST_PATTERN.test(value.digest) &&
    isPositiveInteger(value.policyVersion) &&
    isPositiveInteger(value.revision) &&
    isTimestamp(value.requestedAt) &&
    isTimestamp(value.expiresAt) &&
    (value.source === 'explicit' || value.source === 'accept-edits')
  );
}

export function isApprovalResultPayload(value: unknown): value is ApprovalResultPayload {
  return (
    isRecord(value) &&
    isOpaqueId(value.approvalId) &&
    isOpaqueId(value.sessionId) &&
    isOpaqueId(value.epoch) &&
    typeof value.digest === 'string' &&
    DIGEST_PATTERN.test(value.digest) &&
    isPositiveInteger(value.revision) &&
    typeof value.status === 'string' &&
    APPROVAL_RESULT_STATUSES.has(value.status) &&
    typeof value.reason === 'string' &&
    value.reason.length > 0 &&
    isTimestamp(value.settledAt)
  );
}

export function isApprovalCardDto(value: unknown): value is ApprovalCardDto {
  return (
    isApprovalRequestedPayload(value) &&
    typeof value.status === 'string' &&
    (value.status === 'pending' || APPROVAL_RESULT_STATUSES.has(value.status)) &&
    (value.reason === null || typeof value.reason === 'string')
  );
}

export function isApprovalDecisionResponse(value: unknown): value is ApprovalDecisionResponse {
  return (
    isRecord(value) && typeof value.accepted === 'boolean' && isApprovalResultPayload(value.result)
  );
}

export function isApprovalAuthorityRequest(value: unknown): value is ApprovalAuthorityRequest {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['action', 'digest']) &&
    isApprovalAction(value.action) &&
    typeof value.digest === 'string' &&
    DIGEST_PATTERN.test(value.digest)
  );
}

export function isApprovalAuthorityConsumeRequest(
  value: unknown,
): value is ApprovalAuthorityConsumeRequest {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['approvalId', 'action', 'digest']) &&
    isOpaqueId(value.approvalId) &&
    isApprovalAction(value.action) &&
    typeof value.digest === 'string' &&
    DIGEST_PATTERN.test(value.digest)
  );
}

export function isApprovalAuthorityRequestResponse(
  value: unknown,
): value is ApprovalAuthorityRequestResponse {
  if (!isRecord(value) || typeof value.requested !== 'boolean') return false;
  return value.requested
    ? hasOnlyKeys(value, ['requested', 'approval']) && isApprovalCardDto(value.approval)
    : hasOnlyKeys(value, ['requested', 'reason']) &&
        typeof value.reason === 'string' &&
        value.reason.length > 0;
}

export function isApprovalAuthorityConsumeResponse(
  value: unknown,
): value is ApprovalAuthorityConsumeResponse {
  if (!isRecord(value) || typeof value.allowed !== 'boolean') return false;
  return value.allowed
    ? hasOnlyKeys(value, ['allowed'])
    : hasOnlyKeys(value, ['allowed', 'reason']) &&
        typeof value.reason === 'string' &&
        value.reason.length > 0;
}

export function isAcceptEditsGrantDto(value: unknown): value is AcceptEditsGrantDto {
  return (
    isRecord(value) &&
    isOpaqueId(value.grantId) &&
    isOpaqueId(value.sessionId) &&
    isOpaqueId(value.epoch) &&
    Array.isArray(value.allowedTools) &&
    value.allowedTools.length > 0 &&
    value.allowedTools.every(
      (tool) => typeof tool === 'string' && tool.length > 0 && tool !== '*',
    ) &&
    typeof value.remainingActions === 'number' &&
    Number.isSafeInteger(value.remainingActions) &&
    value.remainingActions >= 0 &&
    isTimestamp(value.expiresAt) &&
    ['active', 'expired', 'revoked', 'restart-invalidated', 'exhausted'].includes(
      String(value.status),
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isApprovalAction(value: unknown): value is ApprovalAuthorityRequest['action'] {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['principal', 'sessionId', 'epoch', 'tool', 'arguments', 'policyVersion']) &&
    typeof value.principal === 'string' &&
    value.principal.length > 0 &&
    isOpaqueId(value.sessionId) &&
    isOpaqueId(value.epoch) &&
    typeof value.tool === 'string' &&
    value.tool.length > 0 &&
    isJsonValue(value.arguments) &&
    isPositiveInteger(value.policyVersion)
  );
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key)) && keys.every((key) => key in value);
}

function isTranscriptBase(value: unknown): value is Record<string, unknown> & {
  readonly kind: string;
} {
  return (
    isRecord(value) &&
    typeof value.kind === 'string' &&
    isOpaqueId(value.id) &&
    isPositiveInteger(value.revision) &&
    typeof value.seq === 'number' &&
    Number.isSafeInteger(value.seq) &&
    value.seq > 0 &&
    typeof value.occurredAt === 'string' &&
    !Number.isNaN(Date.parse(value.occurredAt))
  );
}

function isPlanItem(value: unknown): boolean {
  return isRecord(value) && typeof value.text === 'string' && typeof value.done === 'boolean';
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isBase64Url(value: unknown, minimum: number, maximum: number): value is string {
  return (
    typeof value === 'string' &&
    value.length >= minimum &&
    value.length <= maximum &&
    /^[A-Za-z0-9_-]+$/.test(value)
  );
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isExactOrigin(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value).origin === value;
  } catch {
    return false;
  }
}
