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
  AvailableModelDto,
  CommandCatalogDto,
  CommandDescriptorDto,
  CommandSource,
  DevicePublicKeyJwk,
  EnrollmentQr,
  EnrollmentResponse,
  Envelope,
  JsonValue,
  PiRpcCommand,
  PiRpcEvent,
  PiRpcEventType,
  PiRpcResponse,
  PromptAbortResponse,
  PromptSubmitCommand,
  PromptSubmitResponse,
  RuntimeControlCommand,
  RuntimeControlResponse,
  RuntimeControlReasonCode,
  RuntimeIssueCode,
  RuntimeIssueDto,
  RuntimeIssueResponse,
  RuntimeModelTicketRequest,
  RuntimeModelTicketResponse,
  RuntimeModelCatalogDto,
  RuntimeMode,
  RuntimeOperation,
  RuntimeSnapshotDto,
  RuntimeStateDto,
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

import {
  MODEL_AVAILABILITIES,
  MODEL_AVAILABILITY_REASON_CODES,
  MODEL_INPUT_KINDS,
  RUNTIME_CONTROL_REASON_CODES,
  RUNTIME_ISSUE_CODES,
  RUNTIME_MODES,
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
  if (
    value.type === 'get_available_models' ||
    value.type === 'get_available_thinking_levels' ||
    value.type === 'get_commands'
  ) {
    return Object.keys(value).every((key) => key === 'type' || key === 'id');
  }
  if (value.type === 'set_model') {
    return (
      hasRequiredAndOptionalKeys(value, ['type', 'provider', 'modelId'], ['id']) &&
      isPathFreeToken(value.provider, 200) &&
      isPathFreeToken(value.modelId, 200)
    );
  }
  if (value.type === 'set_thinking_level') {
    return (
      hasRequiredAndOptionalKeys(value, ['type', 'level'], ['id']) &&
      isNonEmptyBoundedString(value.level, 64)
    );
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
const PROMPT_SUBMIT_KEYS = new Set([
  'type',
  'submissionId',
  'sessionId',
  'message',
  'ticket',
  'streamingBehavior',
]);

export function isPromptSubmitCommand(value: unknown): value is PromptSubmitCommand {
  return (
    isRecord(value) &&
    Object.keys(value).every((key) => PROMPT_SUBMIT_KEYS.has(key)) &&
    value.type === 'prompt.submit' &&
    isOpaqueId(value.submissionId) &&
    isOpaqueId(value.sessionId) &&
    typeof value.message === 'string' &&
    value.message.trim().length > 0 &&
    isOpaqueId(value.ticket) &&
    (value.streamingBehavior === undefined ||
      value.streamingBehavior === 'steer' ||
      value.streamingBehavior === 'followUp')
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

// ── Runtime control (model, thinking level, plan mode) ────────────────────────

const RUNTIME_MODE_SET = new Set<RuntimeMode>(RUNTIME_MODES);
const MODEL_INPUT_KIND_SET = new Set<string>(MODEL_INPUT_KINDS);
const MODEL_AVAILABILITY_SET = new Set<string>(MODEL_AVAILABILITIES);
const MODEL_AVAILABILITY_REASON_CODE_SET = new Set<string>(MODEL_AVAILABILITY_REASON_CODES);
const RUNTIME_CONTROL_REASON_CODE_SET = new Set<RuntimeControlReasonCode>(
  RUNTIME_CONTROL_REASON_CODES,
);
const RUNTIME_ISSUE_CODE_SET = new Set<RuntimeIssueCode>(RUNTIME_ISSUE_CODES);
const COMMAND_SOURCES = new Set<CommandSource>(['extension', 'prompt', 'skill']);

/** Narrow an unknown value to a bounded model descriptor (no path separators). */
export function isAvailableModelDto(value: unknown): value is AvailableModelDto {
  if (
    !isRecord(value) ||
    !hasRequiredAndOptionalKeys(
      value,
      ['provider', 'id', 'label'],
      [
        'reasoning',
        'input',
        'contextWindow',
        'maxTokens',
        'tools',
        'availability',
        'availabilityReasonCode',
        'pricing',
      ],
    ) ||
    !isPathFreeToken(value.provider, 200) ||
    !isPathFreeToken(value.id, 200) ||
    !isSafeDisplayString(value.label, 200) ||
    (value.reasoning !== undefined && typeof value.reasoning !== 'boolean') ||
    (value.input !== undefined &&
      (!Array.isArray(value.input) ||
        value.input.length > MODEL_INPUT_KINDS.length ||
        new Set(value.input).size !== value.input.length ||
        !value.input.every(
          (kind) => typeof kind === 'string' && MODEL_INPUT_KIND_SET.has(kind),
        ))) ||
    (value.contextWindow !== undefined && !isBoundedPositiveInteger(value.contextWindow)) ||
    (value.maxTokens !== undefined && !isBoundedPositiveInteger(value.maxTokens)) ||
    (value.tools !== undefined && typeof value.tools !== 'boolean') ||
    (value.availability !== undefined &&
      (typeof value.availability !== 'string' ||
        !MODEL_AVAILABILITY_SET.has(value.availability))) ||
    (value.availabilityReasonCode !== undefined &&
      (typeof value.availabilityReasonCode !== 'string' ||
        !MODEL_AVAILABILITY_REASON_CODE_SET.has(value.availabilityReasonCode)))
  ) {
    return false;
  }
  return value.pricing === undefined || isModelPricingDto(value.pricing);
}

/** Narrow an unknown value to the authoritative runtime state snapshot. */
export function isRuntimeStateDto(value: unknown): value is RuntimeStateDto {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      'sessionId',
      'revision',
      'model',
      'thinkingLevel',
      'availableThinkingLevels',
      'mode',
      'streaming',
      'updatedAt',
    ]) &&
    isOpaqueId(value.sessionId) &&
    isNonNegativeSafeInteger(value.revision) &&
    (value.model === null || isAvailableModelDto(value.model)) &&
    isRuntimeLevelToken(value.thinkingLevel) &&
    Array.isArray(value.availableThinkingLevels) &&
    value.availableThinkingLevels.length <= 32 &&
    new Set(value.availableThinkingLevels).size === value.availableThinkingLevels.length &&
    value.availableThinkingLevels.every(isRuntimeLevelToken) &&
    typeof value.mode === 'string' &&
    RUNTIME_MODE_SET.has(value.mode as RuntimeMode) &&
    typeof value.streaming === 'boolean' &&
    isTimestamp(value.updatedAt)
  );
}

/** Narrow an unknown value to a runtime operation; host-only states are never requests. */
export function isRuntimeOperation(value: unknown): value is RuntimeOperation {
  if (!isRecord(value)) {
    return false;
  }
  if (value.type === 'set_model') {
    return (
      hasOnlyKeys(value, ['type', 'provider', 'modelId']) &&
      isPathFreeToken(value.provider, 200) &&
      isPathFreeToken(value.modelId, 200)
    );
  }
  if (value.type === 'set_thinking_level') {
    return hasOnlyKeys(value, ['type', 'level']) && isRuntimeLevelToken(value.level);
  }
  if (value.type === 'set_mode') {
    return (
      hasOnlyKeys(value, ['type', 'mode']) && (value.mode === 'build' || value.mode === 'plan')
    );
  }
  return false;
}

/** Narrow an unknown value to a correlated runtime control command. */
export function isRuntimeControlCommand(value: unknown): value is RuntimeControlCommand {
  if (
    !isRecord(value) ||
    value.type !== 'runtime.control' ||
    !isOpaqueId(value.controlId) ||
    !isOpaqueId(value.sessionId) ||
    !isNonNegativeSafeInteger(value.expectedRevision) ||
    !isRuntimeOperation(value.operation) ||
    !isOpaqueId(value.ticket)
  ) {
    return false;
  }
  if (value.operation.type === 'set_model') {
    return (
      hasOnlyKeys(value, [
        'type',
        'controlId',
        'sessionId',
        'expectedRevision',
        'expectedCatalogRevision',
        'operation',
        'ticket',
      ]) && isNonNegativeSafeInteger(value.expectedCatalogRevision)
    );
  }
  return (
    hasOnlyKeys(value, [
      'type',
      'controlId',
      'sessionId',
      'expectedRevision',
      'operation',
      'ticket',
    ]) && value.expectedCatalogRevision === undefined
  );
}

/** Narrow an unknown value to an exact set-model ticket request. */
export function isRuntimeModelTicketRequest(value: unknown): value is RuntimeModelTicketRequest {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['sessionId', 'expectedRevision', 'expectedCatalogRevision', 'operation']) &&
    isOpaqueId(value.sessionId) &&
    isNonNegativeSafeInteger(value.expectedRevision) &&
    isNonNegativeSafeInteger(value.expectedCatalogRevision) &&
    isRecord(value.operation) &&
    value.operation.type === 'set_model' &&
    isRuntimeOperation(value.operation)
  );
}

/** Narrow an unknown value to a short-lived runtime ticket response. */
export function isRuntimeModelTicketResponse(value: unknown): value is RuntimeModelTicketResponse {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['ticket', 'expiresAt']) &&
    isOpaqueId(value.ticket) &&
    isTimestamp(value.expiresAt)
  );
}

/** Narrow an unknown value to a bounded runtime model catalog. */
export function isRuntimeModelCatalogDto(value: unknown): value is RuntimeModelCatalogDto {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      'sessionId',
      'catalogRevision',
      'runtimeRevision',
      'currentModel',
      'streaming',
      'canSetModelWhileStreaming',
      'models',
    ]) &&
    isOpaqueId(value.sessionId) &&
    isNonNegativeSafeInteger(value.catalogRevision) &&
    isNonNegativeSafeInteger(value.runtimeRevision) &&
    (value.currentModel === null || isAvailableModelDto(value.currentModel)) &&
    typeof value.streaming === 'boolean' &&
    typeof value.canSetModelWhileStreaming === 'boolean' &&
    Array.isArray(value.models) &&
    value.models.length <= 200 &&
    value.models.every(isAvailableModelDto)
  );
}

/** Narrow an atomic, session-bound runtime state and model catalog snapshot. */
export function isRuntimeSnapshotDto(value: unknown): value is RuntimeSnapshotDto {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['sessionId', 'state', 'models']) &&
    isOpaqueId(value.sessionId) &&
    isRuntimeStateDto(value.state) &&
    isRuntimeModelCatalogDto(value.models) &&
    value.state.sessionId === value.sessionId &&
    value.models.sessionId === value.sessionId &&
    value.state.revision === value.models.runtimeRevision
  );
}

/** Narrow one of the fixed runtime issue codes. */
export function isRuntimeIssueCode(value: unknown): value is RuntimeIssueCode {
  return typeof value === 'string' && RUNTIME_ISSUE_CODE_SET.has(value as RuntimeIssueCode);
}

/** Narrow a browser-visible runtime HTTP issue response. */
export function isRuntimeIssueResponse(value: unknown): value is RuntimeIssueResponse {
  return isRecord(value) && hasOnlyKeys(value, ['error']) && isRuntimeIssueCode(value.error);
}

/** Narrow an internal typed runtime issue DTO. */
export function isRuntimeIssueDto(value: unknown): value is RuntimeIssueDto {
  return (
    isRecord(value) && hasOnlyKeys(value, ['issueCode']) && isRuntimeIssueCode(value.issueCode)
  );
}

/** Narrow an unknown value to a bounded command descriptor. */
export function isCommandDescriptorDto(value: unknown): value is CommandDescriptorDto {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      'name',
      'description',
      'source',
      'enabled',
      'disabledReason',
      'requiresConfirmation',
    ]) &&
    isPathFreeToken(value.name, 200) &&
    (value.description === null || isBoundedString(value.description, 2_000)) &&
    typeof value.source === 'string' &&
    COMMAND_SOURCES.has(value.source as CommandSource) &&
    typeof value.enabled === 'boolean' &&
    (value.disabledReason === null || isBoundedString(value.disabledReason, 500)) &&
    typeof value.requiresConfirmation === 'boolean'
  );
}

/** Narrow an unknown value to a bounded command catalog. */
export function isCommandCatalogDto(value: unknown): value is CommandCatalogDto {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['sessionId', 'revision', 'commands']) &&
    isOpaqueId(value.sessionId) &&
    isNonNegativeSafeInteger(value.revision) &&
    Array.isArray(value.commands) &&
    value.commands.every(isCommandDescriptorDto)
  );
}

/** Narrow an unknown value to a fail-closed runtime control response. */
export function isRuntimeControlResponse(value: unknown): value is RuntimeControlResponse {
  if (!isRecord(value) || !hasOnlyKeys(value, ['outcome']) || !isRecord(value.outcome)) {
    return false;
  }
  if (value.outcome.status === 'accepted' || value.outcome.status === 'stale') {
    return (
      hasOnlyKeys(value.outcome, ['status', 'state']) && isRuntimeStateDto(value.outcome.state)
    );
  }
  if (value.outcome.status === 'unsupported') {
    return (
      hasRequiredAndOptionalKeys(value.outcome, ['status', 'reasonCode'], ['issueCode']) &&
      value.outcome.reasonCode === 'unsupported_operation' &&
      (value.outcome.issueCode === undefined || value.outcome.issueCode === 'unsupported')
    );
  }
  if (value.outcome.status === 'policy_blocked') {
    return (
      hasRequiredAndOptionalKeys(value.outcome, ['status', 'reasonCode'], ['issueCode']) &&
      value.outcome.reasonCode === 'policy_blocked' &&
      (value.outcome.issueCode === undefined || value.outcome.issueCode === 'unsupported')
    );
  }
  if (value.outcome.status === 'delivery-unknown') {
    return (
      hasRequiredAndOptionalKeys(value.outcome, ['status', 'reasonCode'], ['issueCode']) &&
      value.outcome.reasonCode === 'delivery_unknown' &&
      (value.outcome.issueCode === undefined || value.outcome.issueCode === 'delivery-unknown')
    );
  }
  if (value.outcome.status === 'unavailable') {
    return (
      hasRequiredAndOptionalKeys(value.outcome, ['status', 'reasonCode'], ['issueCode']) &&
      typeof value.outcome.reasonCode === 'string' &&
      RUNTIME_CONTROL_REASON_CODE_SET.has(value.outcome.reasonCode as RuntimeControlReasonCode) &&
      value.outcome.reasonCode !== 'unsupported_operation' &&
      value.outcome.reasonCode !== 'policy_blocked' &&
      value.outcome.reasonCode !== 'delivery_unknown' &&
      (value.outcome.issueCode === undefined || isRuntimeIssueCode(value.outcome.issueCode))
    );
  }
  return false;
}

/** Narrow an unknown value to a fail-closed prompt abort response. */
export function isPromptAbortResponse(value: unknown): value is PromptAbortResponse {
  if (!isRecord(value) || !hasOnlyKeys(value, ['outcome']) || !isRecord(value.outcome)) {
    return false;
  }
  if (value.outcome.status === 'aborted') {
    return hasOnlyKeys(value.outcome, ['status']);
  }
  if (value.outcome.status === 'unavailable' || value.outcome.status === 'delivery-unknown') {
    return (
      hasOnlyKeys(value.outcome, ['status', 'reason']) &&
      isNonEmptyBoundedString(value.outcome.reason, 500)
    );
  }
  return false;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length <= maxLength;
}

function isNonEmptyBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}

function isRuntimeLevelToken(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 64 &&
    /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/u.test(value)
  );
}

function isPathFreeToken(value: unknown, maxLength: number): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maxLength &&
    value !== '.' &&
    value !== '..' &&
    !value.includes('/') &&
    !value.includes('\\') &&
    !/[\u0000-\u001f\u007f-\u009f]/u.test(value)
  );
}

function isSafeDisplayString(value: unknown, maxLength: number): value is string {
  return (
    isNonEmptyBoundedString(value, maxLength) &&
    !/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(value) &&
    !/(?:https?|file):\/\/|(?:^|\s)\/(?:Users|home|private|tmp|var|etc|opt|usr|Volumes)\/|\b[A-Za-z]:\\|\b(?:api[_-]?key|authorization|cookie|password|secret|token)\s*[:=]|\bBearer\s+/iu.test(
      value,
    )
  );
}

function isBoundedPositiveInteger(value: unknown): value is number {
  return isPositiveInteger(value) && value <= 1_000_000_000;
}

function isModelPricingDto(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasRequiredAndOptionalKeys(value, ['currency'], ['inputPerMillion', 'outputPerMillion']) &&
    typeof value.currency === 'string' &&
    /^[A-Z]{3}$/.test(value.currency) &&
    (value.inputPerMillion === undefined || isBoundedNonNegativeNumber(value.inputPerMillion)) &&
    (value.outputPerMillion === undefined || isBoundedNonNegativeNumber(value.outputPerMillion))
  );
}

function hasRequiredAndOptionalKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
): boolean {
  const allowed = new Set([...required, ...optional]);
  return (
    Object.keys(value).every((key) => allowed.has(key)) && required.every((key) => key in value)
  );
}

function isBoundedNonNegativeNumber(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1_000_000_000
  );
}
