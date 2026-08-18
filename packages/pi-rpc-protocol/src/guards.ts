// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Protocol Guards
// ───────────────────────────────────────────────────────────────────

import type {
  AcceptEditsGrantDto,
  AskQuestionAnswer,
  AskQuestionAnswerRequest,
  AskQuestionAnswerResult,
  AskQuestionAnswerTicketRequest,
  AskQuestionAnswerTicketResponse,
  AskQuestionAnswerCapability,
  AskQuestionContentAvailability,
  AskQuestionDisplay,
  AskQuestionDisplayDto,
  AskQuestionDisplayReadRequest,
  AskQuestionFreeText,
  AskQuestionLifecycleEvent,
  AskQuestionOption,
  AskQuestionPresentedEvent,
  AskQuestionRedaction,
  AskQuestionRedactedField,
  AskQuestionSelectionMode,
  AskQuestionTranscriptMeta,
  AskQuestionTranscriptStatus,
  AttentionChangedPayload,
  AttentionClass,
  AttentionItemDto,
  AttentionResolutionDto,
  AttachmentManifestItem,
  AttachmentCancellation,
  AttachmentPartStatusDto,
  AttachmentPartTicket,
  AttachmentSetManifest,
  AttachmentSubmissionResult,
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
  CommandBindingDto,
  CommandCatalogDto,
  CommandDescriptorDto,
  CommandSource,
  DevicePublicKeyJwk,
  EnrollmentQr,
  EnrollmentResponse,
  Envelope,
  FilePreviewAvailability,
  FilePreviewBlock,
  FilePreviewCompleteness,
  FilePreviewContent,
  FilePreviewDescriptor,
  FilePreviewRedaction,
  FilePreviewRenderer,
  InboundImageArtifact,
  InboundImageArtifactVariant,
  InboundImageBlock,
  InboundImagePresentation,
  InboundImageProcessingBlock,
  InboundImageReadyBlock,
  InboundImageRedaction,
  InboundImageTerminalBlock,
  JsonValue,
  MediaPolicyDto,
  NormalizedPiImage,
  PiRpcCommand,
  PiRpcEvent,
  PiRpcEventType,
  PiRpcResponse,
  RedactionMetadata,
  RedactedAttachmentBlock,
  RichToolCallBlock,
  RichToolResultBlock,
  PlanArtifactDto,
  PlanControlCommand,
  PlanControlReasonCode,
  PlanControlResponse,
  PlanSnapshotDto,
  PlanValidityValue,
  PromptAbortResponse,
  PromptAttachmentReference,
  PromptSubmitCommand,
  PromptSubmitResponse,
  RuntimeControlCommand,
  RuntimeControlResponse,
  RuntimeControlReasonCode,
  RuntimeIssueCode,
  RuntimeIssueDto,
  RuntimeIssueResponse,
  RuntimeMediaCapabilityDto,
  RuntimeModelTicketRequest,
  RuntimeModelTicketResponse,
  RuntimeModelCatalogDto,
  RuntimeMode,
  RuntimeOperation,
  RuntimeSnapshotDto,
  RuntimeStateDto,
  SessionCardDto,
  SessionChallengeResponse,
  SetModeCommand,
  ExecutePlanCommand,
  TodoProjectionCapabilityDto,
  TodoProjectionDeltaV1,
  TodoProjectionEnvelopeKind,
  TodoProjectionV1,
  TodoTaskProjectionV1,
  TodoTaskState,
  PushHintPayload,
  PushPreferences,
  PushSubscriptionInput,
  SlashSubmitIssueCode,
  SlashSubmitIssueResponse,
  SyncMessage,
  TranscriptBlock,
  TextArtifactBlock,
  TextArtifactLabel,
  TranscriptLifecycle,
  TranscriptOutputCompleteness,
  TranscriptPageDto,
  TranscriptShellKind,
  TranscriptTerminalCheckpoint,
  RedactedAttachmentStatus,
  WebSocketTicketResponse,
} from './types.js';

import {
  ASK_QUESTION_CONTENT_AVAILABILITIES,
  ASK_QUESTION_REDACTED_FIELDS,
  ASK_QUESTION_RESULT_REASONS,
  ASK_QUESTION_SELECTION_MODES,
  ASK_QUESTION_TRANSCRIPT_STATUSES,
  MODEL_AVAILABILITIES,
  MODEL_AVAILABILITY_REASON_CODES,
  MODEL_INPUT_KINDS,
  ATTACHMENT_CANCELLATION_REASONS,
  ATTACHMENT_PART_STATUSES,
  ATTACHMENT_SUBMISSION_STATUSES,
  FILE_PREVIEW_AVAILABILITIES,
  FILE_PREVIEW_COMPLETENESS_STATES,
  FILE_PREVIEW_REDACTION_STATES,
  FILE_PREVIEW_RENDERERS,
  PLAN_CONTROL_REASON_CODES,
  PLAN_VALIDITY_VALUES,
  RUNTIME_CONTROL_REASON_CODES,
  RUNTIME_ISSUE_CODES,
  RUNTIME_MODES,
  SLASH_SUBMIT_ISSUE_CODES,
  TEXT_ARTIFACT_LABELS,
  TRANSCRIPT_LIFECYCLES,
  TRANSCRIPT_OUTPUT_COMPLETENESS,
  TRANSCRIPT_SHELL_KINDS,
  TRANSCRIPT_TERMINAL_CHECKPOINTS,
  MEDIA_OUTPUT_MIME_TYPES,
  MEDIA_SOURCE_MIME_TYPES,
  INBOUND_IMAGE_ARTIFACT_MEDIA_TYPES,
  INBOUND_IMAGE_AVAILABILITIES,
  INBOUND_IMAGE_CONTENT_KINDS,
  INBOUND_IMAGE_DISPLAY_NAMES,
  INBOUND_IMAGE_MEDIA_CLASSES,
  INBOUND_IMAGE_REDACTION_STATUSES,
  INBOUND_IMAGE_SOURCES,
  INBOUND_IMAGE_TERMINAL_REASONS,
  REDACTED_ATTACHMENT_STATUSES,
  TODO_PROJECTION_ENVELOPE_KINDS,
  TODO_TASK_STATES,
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
const OPAQUE_TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{15,255}$/;
const OPAQUE_ARTIFACT_REVISION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const ATTENTION_CLASSES = new Set<AttentionClass>(['needs_input', 'finished', 'error']);
const FILE_PREVIEW_RENDERER_SET = new Set<FilePreviewRenderer>(FILE_PREVIEW_RENDERERS);
const FILE_PREVIEW_REDACTION_SET = new Set<FilePreviewRedaction>(FILE_PREVIEW_REDACTION_STATES);
const FILE_PREVIEW_COMPLETENESS_SET = new Set<FilePreviewCompleteness>(
  FILE_PREVIEW_COMPLETENESS_STATES,
);
const FILE_PREVIEW_AVAILABILITY_SET = new Set<FilePreviewAvailability>(FILE_PREVIEW_AVAILABILITIES);
const FILE_PREVIEW_MAX_BYTES = 50 * 1024 * 1024;
const FILE_PREVIEW_MAX_INLINE_TEXT = 256 * 1024;
const FILE_PREVIEW_MAX_DISPLAY_NAME = 200;
const FILE_PREVIEW_MAX_MIME_TYPE = 127;
const FILE_PREVIEW_MAX_LANGUAGE = 64;
const FILE_PREVIEW_MAX_ALT_TEXT = 500;
const FILE_PREVIEW_MAX_THUMBNAIL_REF = 200;
const REDACTION_MAX_FIELDS = 10_000;
const REDACTION_MAX_REASONS = 8;
const REDACTION_MAX_REASON_LENGTH = 32;
const ASK_QUESTION_OPTION_CAP = 64;
const ASK_QUESTION_ANSWER_OPTION_CAP = 64;
const ASK_QUESTION_PROMPT_MAX_LENGTH = 4_096;
const ASK_QUESTION_LABEL_MAX_LENGTH = 512;
const ASK_QUESTION_DESCRIPTION_MAX_LENGTH = 1_024;
const ASK_QUESTION_PLACEHOLDER_MAX_LENGTH = 256;
const ASK_QUESTION_FREE_TEXT_MAX_LENGTH = 4_096;
const ASK_QUESTION_FREE_TEXT_MAX_BYTES = 8 * 1_024;
const ASK_QUESTION_SELECTION_CAP = 64;
const RICH_TOOL_NAME_MAX_LENGTH = 128;
const RICH_INPUT_SUMMARY_MAX_LENGTH = 64 * 1024;
const RICH_OUTPUT_MAX_LENGTH = 128 * 1024;
const RICH_TEXT_ARTIFACT_SOURCE_MAX_LENGTH = 256 * 1024;
const TRANSCRIPT_SHELL_KIND_SET = new Set<TranscriptShellKind>(TRANSCRIPT_SHELL_KINDS);
const TRANSCRIPT_LIFECYCLE_SET = new Set<TranscriptLifecycle>(TRANSCRIPT_LIFECYCLES);
const TRANSCRIPT_CHECKPOINT_SET = new Set<TranscriptTerminalCheckpoint>(
  TRANSCRIPT_TERMINAL_CHECKPOINTS,
);
const TRANSCRIPT_COMPLETENESS_SET = new Set<TranscriptOutputCompleteness>(
  TRANSCRIPT_OUTPUT_COMPLETENESS,
);
const TEXT_ARTIFACT_LABEL_SET = new Set<TextArtifactLabel>(TEXT_ARTIFACT_LABELS);
const MEDIA_SOURCE_MIME_TYPE_SET = new Set<string>(MEDIA_SOURCE_MIME_TYPES);
const MEDIA_OUTPUT_MIME_TYPE_SET = new Set<string>(MEDIA_OUTPUT_MIME_TYPES);
const ATTACHMENT_PART_STATUS_SET = new Set<string>(ATTACHMENT_PART_STATUSES);
const ATTACHMENT_CANCELLATION_REASON_SET = new Set<string>(ATTACHMENT_CANCELLATION_REASONS);
const ATTACHMENT_SUBMISSION_STATUS_SET = new Set<string>(ATTACHMENT_SUBMISSION_STATUSES);
const REDACTED_ATTACHMENT_STATUS_SET = new Set<RedactedAttachmentStatus>(
  REDACTED_ATTACHMENT_STATUSES,
);
const INBOUND_IMAGE_MEDIA_CLASS_SET = new Set<string>(INBOUND_IMAGE_MEDIA_CLASSES);
const INBOUND_IMAGE_DISPLAY_NAME_SET = new Set<string>(INBOUND_IMAGE_DISPLAY_NAMES);
const INBOUND_IMAGE_SOURCE_SET = new Set<string>(INBOUND_IMAGE_SOURCES);
const INBOUND_IMAGE_AVAILABILITY_SET = new Set<string>(INBOUND_IMAGE_AVAILABILITIES);
const INBOUND_IMAGE_ARTIFACT_MEDIA_TYPE_SET = new Set<string>(INBOUND_IMAGE_ARTIFACT_MEDIA_TYPES);
const INBOUND_IMAGE_REDACTION_STATUS_SET = new Set<string>(INBOUND_IMAGE_REDACTION_STATUSES);
const INBOUND_IMAGE_TERMINAL_REASON_SET = new Set<string>(INBOUND_IMAGE_TERMINAL_REASONS);
const INBOUND_IMAGE_CONTENT_KIND_SET = new Set<string>(INBOUND_IMAGE_CONTENT_KINDS);
const TODO_PROJECTION_ENVELOPE_KIND_SET = new Set<string>(TODO_PROJECTION_ENVELOPE_KINDS);
const TODO_TASK_STATE_SET = new Set<TodoTaskState>(TODO_TASK_STATES);
const ASK_QUESTION_SELECTION_MODE_SET = new Set<AskQuestionSelectionMode>(
  ASK_QUESTION_SELECTION_MODES,
);
const ASK_QUESTION_CONTENT_AVAILABILITY_SET = new Set<AskQuestionContentAvailability>(
  ASK_QUESTION_CONTENT_AVAILABILITIES,
);
const ASK_QUESTION_REDACTED_FIELD_SET = new Set<AskQuestionRedactedField>(
  ASK_QUESTION_REDACTED_FIELDS,
);
const ASK_QUESTION_TRANSCRIPT_STATUS_SET = new Set<AskQuestionTranscriptStatus>(
  ASK_QUESTION_TRANSCRIPT_STATUSES,
);
const ASK_QUESTION_RESULT_REASON_SET = new Set<string>(ASK_QUESTION_RESULT_REASONS);
const INBOUND_IMAGE_FULL_MAX_EDGE = 2_000;
const INBOUND_IMAGE_THUMBNAIL_MAX_EDGE = 640;
const INBOUND_IMAGE_FULL_MAX_BYTES = 2 * 1024 * 1024;
const INBOUND_IMAGE_THUMBNAIL_MAX_BYTES = 256 * 1024;
const INBOUND_IMAGE_MAX_DECODED_AREA = 60_000_000;
const INBOUND_IMAGE_ARTIFACT_ID_MIN_LENGTH = 22;
const INBOUND_IMAGE_SAFE_ALT_MAX_SCALARS = 240;
const INBOUND_IMAGE_SAFE_ALT_MAX_BYTES = 512;
const INBOUND_IMAGE_SAFE_DESCRIPTION_MAX_SCALARS = 1_000;
const INBOUND_IMAGE_SAFE_DESCRIPTION_MAX_BYTES = 4_096;
const MEDIA_MAX_IMAGES = 4;
const MEDIA_MAX_SOURCE_BYTES_PER_IMAGE = 15 * 1024 * 1024;
const MEDIA_MAX_SOURCE_BYTES_PER_BATCH = 30 * 1024 * 1024;
const MEDIA_MAX_DECODED_MEGAPIXELS = 60;
const MEDIA_MAX_SOURCE_EDGE_PIXELS = 12_000;
const MEDIA_MAX_NORMALIZED_EDGE_PIXELS = 2_000;
const MEDIA_MAX_NORMALIZED_BYTES_PER_IMAGE = 2 * 1024 * 1024;
const MEDIA_MAX_NORMALIZED_BYTES_PER_TURN = 8 * 1024 * 1024;
const MEDIA_MAX_PARALLEL_UPLOADS = 2;
const MEDIA_MAX_UNCOMMITTED_TTL_SECONDS = 10 * 60;
const MEDIA_MAX_UPLOAD_TICKET_TTL_SECONDS = 90;
const MEDIA_MAX_UPLOAD_BODY_DEADLINE_SECONDS = 120;
const MEDIA_MAX_ATTACHMENTS_PER_WINDOW = 12;
const MEDIA_MAX_ATTACHMENT_RATE_WINDOW_SECONDS = 5 * 60;
const MEDIA_MAX_BYTES_PER_WINDOW = 120 * 1024 * 1024;
const MEDIA_MAX_BYTE_RATE_WINDOW_SECONDS = 60 * 60;
const MEDIA_MAX_QUARANTINE_BYTES_PER_DEVICE = 30 * 1024 * 1024;
const MEDIA_MAX_QUARANTINE_BYTES_RELAY_WIDE = 256 * 1024 * 1024;
const MEDIA_MAX_SESSION_EPOCH_LENGTH = 256;
const MEDIA_MAX_NORMALIZED_BASE64 = Math.ceil(MEDIA_MAX_NORMALIZED_BYTES_PER_IMAGE / 3) * 4;

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

/** Return whether a string is a long opaque secret-bearing token, never a path. */
export function isOpaqueToken(value: unknown): value is string {
  return typeof value === 'string' && OPAQUE_TOKEN_PATTERN.test(value);
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
    const optional =
      value.type === 'prompt'
        ? ['id', 'images', 'streamingBehavior']
        : ['id', 'images'];
    return (
      hasRequiredAndOptionalKeys(value, ['type', 'message'], optional) &&
      typeof value.message === 'string' &&
      (value.images === undefined ||
        isNormalizedPiImageArray(value.images)) &&
      (value.type !== 'prompt' ||
        value.streamingBehavior === undefined ||
        value.streamingBehavior === 'steer' ||
        value.streamingBehavior === 'followUp')
    );
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
  'expectedPromptRevision',
  'attachmentSetId',
  'attachmentIds',
  'streamingBehavior',
  'command',
]);

export function isPromptSubmitCommand(value: unknown): value is PromptSubmitCommand {
  if (
    !isRecord(value) ||
    !Object.keys(value).every((key) => PROMPT_SUBMIT_KEYS.has(key)) ||
    value.type !== 'prompt.submit' ||
    !isOpaqueId(value.submissionId) ||
    !isOpaqueId(value.sessionId) ||
    typeof value.message !== 'string' ||
    !isOpaqueId(value.ticket) ||
    (value.command !== undefined && !isCommandBindingDto(value.command)) ||
    (value.streamingBehavior !== undefined &&
      (value.command !== undefined ||
        (value.streamingBehavior !== 'steer' && value.streamingBehavior !== 'followUp')))
  ) {
    return false;
  }
  const hasAttachmentReferences =
    value.attachmentSetId !== undefined || value.attachmentIds !== undefined;
  if (hasAttachmentReferences) {
    return (
      isBoundedNonNegativeInteger(value.expectedPromptRevision, 1_000_000_000) &&
      isPromptAttachmentReference({
        attachmentSetId: value.attachmentSetId,
        attachmentIds: value.attachmentIds,
      }) &&
      value.message.length <= 256 * 1024
    );
  }
  return (
    value.message.trim().length > 0 &&
    (value.expectedPromptRevision === undefined ||
      isBoundedNonNegativeInteger(value.expectedPromptRevision, 1_000_000_000))
  );
}

/** Narrow the host-published still-image policy to its fixed bounded contract. */
export function isMediaPolicyDto(value: unknown): value is MediaPolicyDto {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'mediaKind',
      'sourceMimeTypes',
      'outputMimeTypes',
      'maxImagesPerTurn',
      'maxSourceBytesPerImage',
      'maxSourceBytesPerBatch',
      'maxDecodedMegapixels',
      'maxSourceEdgePixels',
      'maxNormalizedEdgePixels',
      'maxNormalizedBytesPerImage',
      'maxNormalizedBytesPerTurn',
      'maxParallelUploads',
      'uncommittedTtlSeconds',
      'uploadTicketTtlSeconds',
      'uploadBodyDeadlineSeconds',
      'maxAttachmentsPerWindow',
      'attachmentRateWindowSeconds',
      'maxBytesPerWindow',
      'byteRateWindowSeconds',
      'maxQuarantineBytesPerDevice',
      'maxQuarantineBytesRelayWide',
    ]) ||
    value.mediaKind !== 'image' ||
    !Array.isArray(value.sourceMimeTypes) ||
    value.sourceMimeTypes.length === 0 ||
    value.sourceMimeTypes.length > MEDIA_SOURCE_MIME_TYPES.length ||
    !value.sourceMimeTypes.every(
      (mimeType) =>
        typeof mimeType === 'string' && MEDIA_SOURCE_MIME_TYPE_SET.has(mimeType),
    ) ||
    new Set(value.sourceMimeTypes).size !== value.sourceMimeTypes.length ||
    !Array.isArray(value.outputMimeTypes) ||
    value.outputMimeTypes.length === 0 ||
    value.outputMimeTypes.length > MEDIA_OUTPUT_MIME_TYPES.length ||
    !value.outputMimeTypes.every(
      (mimeType) => typeof mimeType === 'string' && MEDIA_OUTPUT_MIME_TYPE_SET.has(mimeType),
    ) ||
    new Set(value.outputMimeTypes).size !== value.outputMimeTypes.length
  ) {
    return false;
  }
  return (
    isBoundedPositiveInteger(value.maxImagesPerTurn) &&
    value.maxImagesPerTurn <= MEDIA_MAX_IMAGES &&
    isBoundedPositiveInteger(value.maxSourceBytesPerImage) &&
    value.maxSourceBytesPerImage <= MEDIA_MAX_SOURCE_BYTES_PER_IMAGE &&
    isBoundedPositiveInteger(value.maxSourceBytesPerBatch) &&
    value.maxSourceBytesPerBatch <= MEDIA_MAX_SOURCE_BYTES_PER_BATCH &&
    value.maxSourceBytesPerBatch >= value.maxSourceBytesPerImage &&
    isBoundedPositiveInteger(value.maxDecodedMegapixels) &&
    value.maxDecodedMegapixels <= MEDIA_MAX_DECODED_MEGAPIXELS &&
    isBoundedPositiveInteger(value.maxSourceEdgePixels) &&
    value.maxSourceEdgePixels <= MEDIA_MAX_SOURCE_EDGE_PIXELS &&
    isBoundedPositiveInteger(value.maxNormalizedEdgePixels) &&
    value.maxNormalizedEdgePixels <= MEDIA_MAX_NORMALIZED_EDGE_PIXELS &&
    isBoundedPositiveInteger(value.maxNormalizedBytesPerImage) &&
    value.maxNormalizedBytesPerImage <= MEDIA_MAX_NORMALIZED_BYTES_PER_IMAGE &&
    isBoundedPositiveInteger(value.maxNormalizedBytesPerTurn) &&
    value.maxNormalizedBytesPerTurn <= MEDIA_MAX_NORMALIZED_BYTES_PER_TURN &&
    value.maxNormalizedBytesPerTurn >= value.maxNormalizedBytesPerImage &&
    isBoundedPositiveInteger(value.maxParallelUploads) &&
    value.maxParallelUploads <= MEDIA_MAX_PARALLEL_UPLOADS &&
    isBoundedPositiveInteger(value.uncommittedTtlSeconds) &&
    value.uncommittedTtlSeconds <= MEDIA_MAX_UNCOMMITTED_TTL_SECONDS &&
    isBoundedPositiveInteger(value.uploadTicketTtlSeconds) &&
    value.uploadTicketTtlSeconds <= MEDIA_MAX_UPLOAD_TICKET_TTL_SECONDS &&
    isBoundedPositiveInteger(value.uploadBodyDeadlineSeconds) &&
    value.uploadBodyDeadlineSeconds <= MEDIA_MAX_UPLOAD_BODY_DEADLINE_SECONDS &&
    isBoundedPositiveInteger(value.maxAttachmentsPerWindow) &&
    value.maxAttachmentsPerWindow <= MEDIA_MAX_ATTACHMENTS_PER_WINDOW &&
    isBoundedPositiveInteger(value.attachmentRateWindowSeconds) &&
    value.attachmentRateWindowSeconds <= MEDIA_MAX_ATTACHMENT_RATE_WINDOW_SECONDS &&
    isBoundedPositiveInteger(value.maxBytesPerWindow) &&
    value.maxBytesPerWindow <= MEDIA_MAX_BYTES_PER_WINDOW &&
    isBoundedPositiveInteger(value.byteRateWindowSeconds) &&
    value.byteRateWindowSeconds <= MEDIA_MAX_BYTE_RATE_WINDOW_SECONDS &&
    isBoundedPositiveInteger(value.maxQuarantineBytesPerDevice) &&
    value.maxQuarantineBytesPerDevice <= MEDIA_MAX_QUARANTINE_BYTES_PER_DEVICE &&
    isBoundedPositiveInteger(value.maxQuarantineBytesRelayWide) &&
    value.maxQuarantineBytesRelayWide <= MEDIA_MAX_QUARANTINE_BYTES_RELAY_WIDE &&
    value.maxQuarantineBytesRelayWide >= value.maxQuarantineBytesPerDevice
  );
}

/** Narrow the host capability and its policy without accepting client claims. */
export function isRuntimeMediaCapabilityDto(
  value: unknown,
): value is RuntimeMediaCapabilityDto {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['enabled', 'imageIn', 'policy']) &&
    typeof value.enabled === 'boolean' &&
    typeof value.imageIn === 'boolean' &&
    isMediaPolicyDto(value.policy)
  );
}

/** Narrow one manifest item before any byte-bearing route exists. */
export function isAttachmentManifestItem(value: unknown): value is AttachmentManifestItem {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['clientId', 'ordinal', 'declaredType', 'byteLength', 'sha256']) &&
    isOpaqueId(value.clientId) &&
    isBoundedPositiveInteger(value.ordinal) &&
    value.ordinal <= MEDIA_MAX_IMAGES &&
    typeof value.declaredType === 'string' &&
    MEDIA_SOURCE_MIME_TYPE_SET.has(value.declaredType) &&
    isBoundedPositiveInteger(value.byteLength) &&
    value.byteLength <= MEDIA_MAX_SOURCE_BYTES_PER_IMAGE &&
    isSha256Digest(value.sha256)
  );
}

/** Narrow an ordered, bounded attachment-set manifest. */
export function isAttachmentSetManifest(value: unknown): value is AttachmentSetManifest {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'submissionId',
      'sessionId',
      'sessionEpoch',
      'expectedPromptRevision',
      'items',
    ]) ||
    !isOpaqueId(value.submissionId) ||
    !isOpaqueId(value.sessionId) ||
    !isOpaqueId(value.sessionEpoch) ||
    typeof value.sessionEpoch !== 'string' ||
    value.sessionEpoch.length > MEDIA_MAX_SESSION_EPOCH_LENGTH ||
    !isBoundedNonNegativeInteger(value.expectedPromptRevision, 1_000_000_000) ||
    !Array.isArray(value.items) ||
    value.items.length === 0 ||
    value.items.length > MEDIA_MAX_IMAGES ||
    !value.items.every(isAttachmentManifestItem)
  ) {
    return false;
  }
  const items = value.items as readonly AttachmentManifestItem[];
  const clientIds = new Set(items.map((item) => item.clientId));
  const totalBytes = items.reduce((total, item) => total + item.byteLength, 0);
  return (
    clientIds.size === items.length &&
    totalBytes <= MEDIA_MAX_SOURCE_BYTES_PER_BATCH &&
    items.every((item, index) => item.ordinal === index + 1)
  );
}

/** Narrow one opaque, revision-free upload-part ticket projection. */
export function isAttachmentPartTicket(value: unknown): value is AttachmentPartTicket {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      'attachmentSetId',
      'attachmentId',
      'partId',
      'ordinal',
      'ticket',
      'expiresAt',
    ]) &&
    isOpaqueId(value.attachmentSetId) &&
    isOpaqueId(value.attachmentId) &&
    isOpaqueId(value.partId) &&
    isBoundedPositiveInteger(value.ordinal) &&
    value.ordinal <= MEDIA_MAX_IMAGES &&
    isOpaqueToken(value.ticket) &&
    isTimestamp(value.expiresAt)
  );
}

/** Narrow a part status projection; it has no source bytes or derived metadata. */
export function isAttachmentPartStatusDto(value: unknown): value is AttachmentPartStatusDto {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['attachmentSetId', 'attachmentId', 'partId', 'ordinal', 'status']) &&
    isOpaqueId(value.attachmentSetId) &&
    isOpaqueId(value.attachmentId) &&
    isOpaqueId(value.partId) &&
    isBoundedPositiveInteger(value.ordinal) &&
    value.ordinal <= MEDIA_MAX_IMAGES &&
    typeof value.status === 'string' &&
    ATTACHMENT_PART_STATUS_SET.has(value.status)
  );
}

/** Narrow a one-use cancellation reference. */
export function isAttachmentCancellation(value: unknown): value is AttachmentCancellation {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['attachmentSetId', 'ticket', 'reason']) &&
    isOpaqueId(value.attachmentSetId) &&
    isOpaqueToken(value.ticket) &&
    typeof value.reason === 'string' &&
    ATTACHMENT_CANCELLATION_REASON_SET.has(value.reason)
  );
}

/** Narrow the non-pixel submission result used by later attachment phases. */
export function isAttachmentSubmissionResult(
  value: unknown,
): value is AttachmentSubmissionResult {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['submissionId', 'status', 'revision', 'attachmentIds']) &&
    isOpaqueId(value.submissionId) &&
    typeof value.status === 'string' &&
    ATTACHMENT_SUBMISSION_STATUS_SET.has(value.status) &&
    isBoundedNonNegativeInteger(value.revision, 1_000_000_000) &&
    Array.isArray(value.attachmentIds) &&
    value.attachmentIds.length <= MEDIA_MAX_IMAGES &&
    value.attachmentIds.every(isOpaqueId) &&
    new Set(value.attachmentIds).size === value.attachmentIds.length
  );
}

/** Narrow the reference-only extension accepted by prompt submission. */
export function isPromptAttachmentReference(value: unknown): value is PromptAttachmentReference {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['attachmentSetId', 'attachmentIds']) &&
    isOpaqueId(value.attachmentSetId) &&
    Array.isArray(value.attachmentIds) &&
    value.attachmentIds.length > 0 &&
    value.attachmentIds.length <= MEDIA_MAX_IMAGES &&
    value.attachmentIds.every(isOpaqueId) &&
    new Set(value.attachmentIds).size === value.attachmentIds.length
  );
}

/** Narrow the host-to-Pi normalized image block without decoding it here. */
export function isNormalizedPiImage(value: unknown): value is NormalizedPiImage {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['type', 'data', 'mimeType']) &&
    value.type === 'image' &&
    typeof value.mimeType === 'string' &&
    MEDIA_OUTPUT_MIME_TYPE_SET.has(value.mimeType) &&
    isBase64(value.data, 4, MEDIA_MAX_NORMALIZED_BASE64, MEDIA_MAX_NORMALIZED_BYTES_PER_IMAGE)
  );
}

function isNormalizedPiImageArray(value: unknown): value is readonly NormalizedPiImage[] {
  if (!Array.isArray(value) || value.length > MEDIA_MAX_IMAGES) return false;
  let totalBytes = 0;
  for (const image of value) {
    if (!isNormalizedPiImage(image)) return false;
    totalBytes += normalizedImageByteLength(image.data);
    if (totalBytes > MEDIA_MAX_NORMALIZED_BYTES_PER_TURN) return false;
  }
  return true;
}

/** Narrow the structural, metadata-only durable attachment block. */
export function isRedactedAttachmentBlock(value: unknown): value is RedactedAttachmentBlock {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      'kind',
      'id',
      'revision',
      'seq',
      'occurredAt',
      'role',
      'mediaKind',
      'ordinal',
      'status',
      'previewRetained',
    ]) &&
    isTranscriptBase(value) &&
    value.kind === 'attachment' &&
    value.role === 'user' &&
    value.mediaKind === 'image' &&
    isBoundedPositiveInteger(value.ordinal) &&
    value.ordinal <= MEDIA_MAX_IMAGES &&
    typeof value.status === 'string' &&
    REDACTED_ATTACHMENT_STATUS_SET.has(value.status as RedactedAttachmentStatus) &&
    value.previewRetained === false
  );
}

const INBOUND_IMAGE_COMMON_KEYS = [
  'kind',
  'id',
  'revision',
  'seq',
  'occurredAt',
  'schemaVersion',
  'mediaClass',
  'displayName',
  'source',
] as const;

/** Narrow the metadata-only inbound image lifecycle without accepting content-bearing fields. */
export function isInboundImageBlock(value: unknown): value is InboundImageBlock {
  return (
    isInboundImageProcessingBlock(value) ||
    isInboundImageReadyBlock(value) ||
    isInboundImageTerminalBlock(value)
  );
}

export function isInboundImageProcessingBlock(
  value: unknown,
): value is InboundImageProcessingBlock {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [...INBOUND_IMAGE_COMMON_KEYS, 'availability']) &&
    isInboundImageCommon(value) &&
    value.availability === 'processing'
  );
}

export function isInboundImageReadyBlock(value: unknown): value is InboundImageReadyBlock {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      ...INBOUND_IMAGE_COMMON_KEYS,
      'availability',
      'artifact',
      'presentation',
      'redaction',
      'shareAllowed',
      'content',
    ]) &&
    isInboundImageCommon(value) &&
    value.availability === 'ready' &&
    isInboundImageArtifact(value.artifact) &&
    isInboundImagePresentation(value.presentation) &&
    isInboundImageRedaction(value.redaction) &&
    value.shareAllowed === false &&
    isInboundImageContent(value.content, 'artifact-ref')
  );
}

export function isInboundImageTerminalBlock(value: unknown): value is InboundImageTerminalBlock {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      ...INBOUND_IMAGE_COMMON_KEYS,
      'availability',
      'reason',
      'shareAllowed',
      'content',
    ]) &&
    isInboundImageCommon(value) &&
    typeof value.availability === 'string' &&
    INBOUND_IMAGE_AVAILABILITY_SET.has(value.availability) &&
    value.availability !== 'processing' &&
    value.availability !== 'ready' &&
    typeof value.reason === 'string' &&
    INBOUND_IMAGE_TERMINAL_REASON_SET.has(value.reason) &&
    value.shareAllowed === false &&
    isInboundImageContent(value.content, 'none')
  );
}

export function isInboundImageArtifact(value: unknown): value is InboundImageArtifact {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['id', 'revision', 'expiresAt', 'full', 'thumbnail']) &&
    isOpaqueInboundArtifactId(value.id) &&
    isOpaqueInboundRevision(value.revision) &&
    isInboundIsoTimestamp(value.expiresAt) &&
    isInboundImageArtifactVariant(
      value.full,
      INBOUND_IMAGE_FULL_MAX_EDGE,
      INBOUND_IMAGE_FULL_MAX_BYTES,
    ) &&
    isInboundImageArtifactVariant(
      value.thumbnail,
      INBOUND_IMAGE_THUMBNAIL_MAX_EDGE,
      INBOUND_IMAGE_THUMBNAIL_MAX_BYTES,
    )
  );
}

export function isInboundImageArtifactVariant(
  value: unknown,
  maxEdge = INBOUND_IMAGE_FULL_MAX_EDGE,
  maxBytes = INBOUND_IMAGE_FULL_MAX_BYTES,
): value is InboundImageArtifactVariant {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['digest', 'mediaType', 'width', 'height', 'byteLength']) &&
    isInboundSha256Digest(value.digest) &&
    typeof value.mediaType === 'string' &&
    INBOUND_IMAGE_ARTIFACT_MEDIA_TYPE_SET.has(value.mediaType) &&
    isBoundedPositiveInteger(value.width) &&
    value.width <= maxEdge &&
    isBoundedPositiveInteger(value.height) &&
    value.height <= maxEdge &&
    value.width * value.height <= INBOUND_IMAGE_MAX_DECODED_AREA &&
    isBoundedPositiveInteger(value.byteLength) &&
    value.byteLength <= maxBytes
  );
}

export function isInboundImagePresentation(value: unknown): value is InboundImagePresentation {
  return (
    isRecord(value) &&
    hasRequiredAndOptionalKeys(value, ['safeAlt'], ['safeDescription']) &&
    isInboundSafeText(
      value.safeAlt,
      INBOUND_IMAGE_SAFE_ALT_MAX_SCALARS,
      INBOUND_IMAGE_SAFE_ALT_MAX_BYTES,
    ) &&
    (value.safeDescription === undefined ||
      isInboundSafeText(
        value.safeDescription,
        INBOUND_IMAGE_SAFE_DESCRIPTION_MAX_SCALARS,
        INBOUND_IMAGE_SAFE_DESCRIPTION_MAX_BYTES,
      ))
  );
}

export function isInboundImageRedaction(value: unknown): value is InboundImageRedaction {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['status']) &&
    typeof value.status === 'string' &&
    INBOUND_IMAGE_REDACTION_STATUS_SET.has(value.status)
  );
}

function isInboundImageCommon(value: Record<string, unknown>): boolean {
  return (
    value.kind === 'inbound_image' &&
    value.schemaVersion === 1 &&
    isOpaqueId(value.id) &&
    isPositiveInteger(value.revision) &&
    typeof value.seq === 'number' &&
    Number.isSafeInteger(value.seq) &&
    value.seq > 0 &&
    isTimestamp(value.occurredAt) &&
    typeof value.mediaClass === 'string' &&
    INBOUND_IMAGE_MEDIA_CLASS_SET.has(value.mediaClass) &&
    typeof value.displayName === 'string' &&
    INBOUND_IMAGE_DISPLAY_NAME_SET.has(value.displayName) &&
    typeof value.source === 'string' &&
    INBOUND_IMAGE_SOURCE_SET.has(value.source)
  );
}

function isInboundImageContent(value: unknown, expected: 'artifact-ref' | 'none'): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['kind']) &&
    typeof value.kind === 'string' &&
    INBOUND_IMAGE_CONTENT_KIND_SET.has(value.kind) &&
    value.kind === expected
  );
}

export function isMediaPolicy(value: unknown): value is MediaPolicyDto {
  return isMediaPolicyDto(value);
}

export function isRuntimeMediaCapability(value: unknown): value is RuntimeMediaCapabilityDto {
  return isRuntimeMediaCapabilityDto(value);
}

export function isAttachmentManifestItemDto(value: unknown): value is AttachmentManifestItem {
  return isAttachmentManifestItem(value);
}

export function isAttachmentSetManifestDto(value: unknown): value is AttachmentSetManifest {
  return isAttachmentSetManifest(value);
}

export function isAttachmentPartTicketDto(value: unknown): value is AttachmentPartTicket {
  return isAttachmentPartTicket(value);
}

export function isAttachmentPartStatus(value: unknown): value is AttachmentPartStatusDto {
  return isAttachmentPartStatusDto(value);
}

export function isAttachmentCancellationDto(value: unknown): value is AttachmentCancellation {
  return isAttachmentCancellation(value);
}

export function isAttachmentSubmissionResultDto(
  value: unknown,
): value is AttachmentSubmissionResult {
  return isAttachmentSubmissionResult(value);
}

export function isPromptAttachmentReferenceDto(
  value: unknown,
): value is PromptAttachmentReference {
  return isPromptAttachmentReference(value);
}

export function isNormalizedImage(value: unknown): value is NormalizedPiImage {
  return isNormalizedPiImage(value);
}

export function isNormalizedImageBlock(value: unknown): value is NormalizedPiImage {
  return isNormalizedPiImage(value);
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
  if (
    typeof value.kind === 'string' &&
    value.kind.startsWith('todo.') &&
    (!isTodoProjectionEnvelopeKind(value.kind) ||
      !isTodoProjectionEnvelopePayload(value.kind, value.payload))
  ) {
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
    isRedactionMetadata(value.redaction) &&
    typeof value.replay.eligible === 'boolean' &&
    typeof value.replay.snapshotEligible === 'boolean'
  );
}

/** Narrow one host-owned, metadata-only todo task. */
export function isTodoTaskProjectionV1(value: unknown): value is TodoTaskProjectionV1 {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['id', 'title', 'state', 'group', 'order', 'revision', 'updatedAt']) &&
    isOpaqueId(value.id) &&
    isSafeDisplayString(value.title, 500) &&
    typeof value.state === 'string' &&
    TODO_TASK_STATE_SET.has(value.state as TodoTaskState) &&
    (value.group === null || isSafeDisplayString(value.group, 200)) &&
    isBoundedNonNegativeInteger(value.order, 1_000_000) &&
    isBoundedPositiveInteger(value.revision) &&
    (value.updatedAt === null || isTodoTimestamp(value.updatedAt))
  );
}

/** Narrow a complete host todo snapshot without accepting duplicate identities. */
export function isTodoProjectionV1(value: unknown): value is TodoProjectionV1 {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ['planId', 'source', 'revision', 'updatedAt', 'tasks']) ||
    !isOpaqueId(value.planId) ||
    value.source !== 'pi' ||
    !isBoundedPositiveInteger(value.revision) ||
    (value.updatedAt !== null && !isTodoTimestamp(value.updatedAt)) ||
    !Array.isArray(value.tasks) ||
    value.tasks.length > 1_000 ||
    !value.tasks.every(isTodoTaskProjectionV1)
  ) {
    return false;
  }
  const taskIds = value.tasks.map((task) => task.id);
  return new Set(taskIds).size === taskIds.length;
}

/** Narrow a host todo delta with one unambiguous operation per task identity. */
export function isTodoProjectionDeltaV1(value: unknown): value is TodoProjectionDeltaV1 {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'planId',
      'baseRevision',
      'revision',
      'upsertedTasks',
      'removedTaskIds',
      'updatedAt',
    ]) ||
    !isOpaqueId(value.planId) ||
    !isBoundedNonNegativeInteger(value.baseRevision, 1_000_000_000) ||
    !isBoundedPositiveInteger(value.revision) ||
    value.revision <= value.baseRevision ||
    (value.updatedAt !== null && !isTodoTimestamp(value.updatedAt)) ||
    !Array.isArray(value.upsertedTasks) ||
    value.upsertedTasks.length > 1_000 ||
    !value.upsertedTasks.every(isTodoTaskProjectionV1) ||
    !Array.isArray(value.removedTaskIds) ||
    value.removedTaskIds.length > 1_000 ||
    !value.removedTaskIds.every(isOpaqueId)
  ) {
    return false;
  }
  const upsertedIds = value.upsertedTasks.map((task) => task.id);
  const removedIds = value.removedTaskIds;
  return (
    new Set(upsertedIds).size === upsertedIds.length &&
    new Set(removedIds).size === removedIds.length &&
    removedIds.every((id) => !upsertedIds.includes(id))
  );
}

/** Narrow the optional authenticated-session capability advertisement. */
export function isTodoProjectionCapabilityDto(
  value: unknown,
): value is TodoProjectionCapabilityDto {
  return isRecord(value) && hasOnlyKeys(value, ['todoProjection']) && value.todoProjection === 1;
}

/** Return whether an envelope kind is one of the typed todo projection kinds. */
export function isTodoProjectionEnvelopeKind(value: unknown): value is TodoProjectionEnvelopeKind {
  return typeof value === 'string' && TODO_PROJECTION_ENVELOPE_KIND_SET.has(value);
}

/** Validate a todo payload according to its exact envelope kind. */
export function isTodoProjectionEnvelopePayload(
  kind: unknown,
  value: unknown,
): value is TodoProjectionV1 | TodoProjectionDeltaV1 {
  if (kind === 'todo.snapshot.v1') return isTodoProjectionV1(value);
  if (kind === 'todo.delta.v1') return isTodoProjectionDeltaV1(value);
  return false;
}

/** Narrow either supported host todo projection payload. */
export function isTodoProjection(value: unknown): value is TodoProjectionV1 | TodoProjectionDeltaV1 {
  return isTodoProjectionV1(value) || isTodoProjectionDeltaV1(value);
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

export function isAskQuestionOption(value: unknown): value is AskQuestionOption {
  if (!isRecord(value)) return false;
  const hasDescription = hasOnlyKeys(value, ['id', 'label', 'description']);
  const withoutDescription = hasOnlyKeys(value, ['id', 'label']);
  return (
    (hasDescription || withoutDescription) &&
    isOpaqueId(value.id) &&
    isSafeDisplayString(value.label, ASK_QUESTION_LABEL_MAX_LENGTH) &&
    (value.description === undefined ||
      isSafeDisplayString(value.description, ASK_QUESTION_DESCRIPTION_MAX_LENGTH))
  );
}

export function isAskQuestionFreeText(value: unknown): value is AskQuestionFreeText {
  if (!isRecord(value)) return false;
  const exactShape =
    hasOnlyKeys(value, ['allowed', 'required']) ||
    hasOnlyKeys(value, ['allowed', 'required', 'placeholder']) ||
    hasOnlyKeys(value, ['allowed', 'required', 'maxLength']) ||
    hasOnlyKeys(value, ['allowed', 'required', 'placeholder', 'maxLength']);
  if (
    !exactShape ||
    typeof value.allowed !== 'boolean' ||
    typeof value.required !== 'boolean' ||
    (value.required && !value.allowed) ||
    (value.placeholder !== undefined &&
      !isSafeDisplayString(value.placeholder, ASK_QUESTION_PLACEHOLDER_MAX_LENGTH)) ||
    (value.maxLength !== undefined &&
      (!isBoundedPositiveInteger(value.maxLength) ||
        value.maxLength > ASK_QUESTION_FREE_TEXT_MAX_LENGTH))
  ) {
    return false;
  }
  return value.allowed || (value.placeholder === undefined && value.maxLength === undefined);
}

export function isAskQuestionDisplay(value: unknown): value is AskQuestionDisplay {
  if (!isRecord(value)) return false;
  const exactShape =
    hasOnlyKeys(value, ['prompt', 'options', 'freeText']) ||
    hasOnlyKeys(value, ['prompt', 'options', 'freeText', 'minSelections']) ||
    hasOnlyKeys(value, ['prompt', 'options', 'freeText', 'maxSelections']) ||
    hasOnlyKeys(value, ['prompt', 'options', 'freeText', 'minSelections', 'maxSelections']);
  if (
    !exactShape ||
    !isSafeDisplayString(value.prompt, ASK_QUESTION_PROMPT_MAX_LENGTH) ||
    !Array.isArray(value.options) ||
    value.options.length > ASK_QUESTION_OPTION_CAP ||
    !value.options.every(isAskQuestionOption) ||
    !isAskQuestionFreeText(value.freeText)
  ) {
    return false;
  }
  const optionIds = value.options.map((option) => option.id);
  if (new Set(optionIds).size !== optionIds.length) return false;
  if (optionIds.length === 0 && !value.freeText.allowed) return false;
  if (
    value.minSelections !== undefined &&
    (!isBoundedPositiveInteger(value.minSelections) ||
      value.minSelections > ASK_QUESTION_SELECTION_CAP)
  ) {
    return false;
  }
  if (
    value.maxSelections !== undefined &&
    (!isBoundedPositiveInteger(value.maxSelections) ||
      value.maxSelections > ASK_QUESTION_SELECTION_CAP)
  ) {
    return false;
  }
  return (
    value.minSelections === undefined ||
    value.maxSelections === undefined ||
    value.minSelections <= value.maxSelections
  );
}

export function isAskQuestionAnswerCapability(
  value: unknown,
): value is AskQuestionAnswerCapability {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['scope', 'ticketRef', 'boundRevision', 'expiresAt']) &&
    value.scope === 'ask-question.answer' &&
    isOpaqueId(value.ticketRef) &&
    isPositiveInteger(value.boundRevision) &&
    isTimestamp(value.expiresAt)
  );
}

export function isAskQuestionRedaction(value: unknown): value is AskQuestionRedaction {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['applied', 'policyVersion', 'contentAvailability', 'redactedFields']) &&
    value.applied === true &&
    isPositiveInteger(value.policyVersion) &&
    typeof value.contentAvailability === 'string' &&
    ASK_QUESTION_CONTENT_AVAILABILITY_SET.has(
      value.contentAvailability as AskQuestionContentAvailability,
    ) &&
    Array.isArray(value.redactedFields) &&
    value.redactedFields.length <= ASK_QUESTION_REDACTED_FIELDS.length &&
    new Set(value.redactedFields).size === value.redactedFields.length &&
    value.redactedFields.every(
      (field) =>
        typeof field === 'string' &&
        ASK_QUESTION_REDACTED_FIELD_SET.has(field as AskQuestionRedactedField),
    )
  );
}

export function isAskQuestionPresentedEvent(value: unknown): value is AskQuestionPresentedEvent {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      'type',
      'sessionId',
      'questionId',
      'activityId',
      'revision',
      'display',
      'selectionMode',
      'answerCapability',
      'redaction',
      'requiresReadOnlyHint',
    ]) &&
    value.type === 'session.ask-question.presented' &&
    isOpaqueId(value.sessionId) &&
    isOpaqueId(value.questionId) &&
    isOpaqueId(value.activityId) &&
    isPositiveInteger(value.revision) &&
    isAskQuestionDisplay(value.display) &&
    typeof value.selectionMode === 'string' &&
    ASK_QUESTION_SELECTION_MODE_SET.has(value.selectionMode as AskQuestionSelectionMode) &&
    isAskQuestionAnswerCapability(value.answerCapability) &&
    value.answerCapability.boundRevision === value.revision &&
    isAskQuestionRedaction(value.redaction) &&
    value.redaction.contentAvailability !== 'unavailable' &&
    typeof value.requiresReadOnlyHint === 'boolean'
  );
}

export function isAskQuestionDisplayDto(value: unknown): value is AskQuestionDisplayDto {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      'type',
      'sessionId',
      'questionId',
      'activityId',
      'revision',
      'display',
      'selectionMode',
      'redaction',
      'requiresReadOnlyHint',
    ]) &&
    value.type === 'session.ask-question.display' &&
    isOpaqueId(value.sessionId) &&
    isOpaqueId(value.questionId) &&
    isOpaqueId(value.activityId) &&
    isPositiveInteger(value.revision) &&
    isAskQuestionDisplay(value.display) &&
    typeof value.selectionMode === 'string' &&
    ASK_QUESTION_SELECTION_MODE_SET.has(value.selectionMode as AskQuestionSelectionMode) &&
    isAskQuestionRedaction(value.redaction) &&
    value.redaction.contentAvailability !== 'unavailable' &&
    typeof value.requiresReadOnlyHint === 'boolean'
  );
}

export function isAskQuestionDisplayReadRequest(
  value: unknown,
): value is AskQuestionDisplayReadRequest {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['sessionId', 'questionId', 'revision']) &&
    isOpaqueId(value.sessionId) &&
    isOpaqueId(value.questionId) &&
    isPositiveInteger(value.revision)
  );
}

export function isAskQuestionTranscriptMeta(
  value: unknown,
): value is AskQuestionTranscriptMeta {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      'kind',
      'id',
      'revision',
      'seq',
      'occurredAt',
      'activityId',
      'questionId',
      'sessionId',
      'presentedRevision',
      'status',
    ]) &&
    value.kind === 'ask-question' &&
    isOpaqueId(value.id) &&
    isPositiveInteger(value.revision) &&
    isPositiveInteger(value.seq) &&
    isTimestamp(value.occurredAt) &&
    isOpaqueId(value.activityId) &&
    isOpaqueId(value.questionId) &&
    isOpaqueId(value.sessionId) &&
    isPositiveInteger(value.presentedRevision) &&
    typeof value.status === 'string' &&
    ASK_QUESTION_TRANSCRIPT_STATUS_SET.has(value.status as AskQuestionTranscriptStatus)
  );
}

export function isAskQuestionLifecycleEvent(value: unknown): value is AskQuestionLifecycleEvent {
  if (!isRecord(value)) return false;
  const exactShape =
    hasOnlyKeys(value, ['type', 'sessionId', 'questionId', 'revision']) ||
    hasOnlyKeys(value, ['type', 'sessionId', 'questionId', 'revision', 'reason']);
  return (
    exactShape &&
    (value.type === 'session.ask-question.withdrawn' ||
      value.type === 'session.ask-question.expired' ||
      value.type === 'session.ask-question.superseded') &&
    isOpaqueId(value.sessionId) &&
    isOpaqueId(value.questionId) &&
    isPositiveInteger(value.revision) &&
    (value.reason === undefined ||
      value.reason === 'host-cancelled' ||
      value.reason === 'revision-moved' ||
      value.reason === 'session-ended' ||
      value.reason === 'timeout')
  );
}

export function isAskQuestionAnswer(value: unknown): value is AskQuestionAnswer {
  const validText = (text: unknown): text is string =>
    typeof text === 'string' &&
    new TextEncoder().encode(text).byteLength <= ASK_QUESTION_FREE_TEXT_MAX_BYTES &&
    text.length <= ASK_QUESTION_FREE_TEXT_MAX_LENGTH &&
    // Free text rejects controls and bidi overrides before hashing or handoff.
    // eslint-disable-next-line no-control-regex
    !/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(text);
  return (
    isRecord(value) &&
    (hasOnlyKeys(value, ['optionIds']) || hasOnlyKeys(value, ['optionIds', 'freeText'])) &&
    Array.isArray(value.optionIds) &&
    value.optionIds.length <= ASK_QUESTION_ANSWER_OPTION_CAP &&
    value.optionIds.every(isOpaqueId) &&
    new Set(value.optionIds).size === value.optionIds.length &&
    (value.freeText === undefined || validText(value.freeText))
  );
}

export function isAskQuestionAnswerTicketRequest(
  value: unknown,
): value is AskQuestionAnswerTicketRequest {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      'type',
      'sessionId',
      'questionId',
      'expectedRevision',
      'answerDigest',
      'clientMutationId',
    ]) &&
    value.type === 'session.ask-question.answer-ticket' &&
    isOpaqueId(value.sessionId) &&
    isOpaqueId(value.questionId) &&
    isPositiveInteger(value.expectedRevision) &&
    typeof value.answerDigest === 'string' &&
    DIGEST_PATTERN.test(value.answerDigest) &&
    isOpaqueId(value.clientMutationId)
  );
}

export function isAskQuestionAnswerTicketResponse(
  value: unknown,
): value is AskQuestionAnswerTicketResponse {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['ticket', 'expiresAt']) &&
    isOpaqueToken(value.ticket) &&
    isTimestamp(value.expiresAt)
  );
}

export function isAskQuestionAnswerRequest(value: unknown): value is AskQuestionAnswerRequest {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      'type',
      'sessionId',
      'questionId',
      'expectedRevision',
      'ticket',
      'answer',
      'answerDigest',
      'clientMutationId',
    ]) &&
    value.type === 'session.ask-question.answer' &&
    isOpaqueId(value.sessionId) &&
    isOpaqueId(value.questionId) &&
    isPositiveInteger(value.expectedRevision) &&
    isOpaqueToken(value.ticket) &&
    isAskQuestionAnswer(value.answer) &&
    typeof value.answerDigest === 'string' &&
    DIGEST_PATTERN.test(value.answerDigest) &&
    isOpaqueId(value.clientMutationId)
  );
}

export function isAskQuestionAnswerResult(value: unknown): value is AskQuestionAnswerResult {
  if (!isRecord(value)) return false;
  const exactShape =
    hasOnlyKeys(value, [
      'type',
      'sessionId',
      'questionId',
      'revision',
      'clientMutationId',
      'status',
    ]) ||
    hasOnlyKeys(value, [
      'type',
      'sessionId',
      'questionId',
      'revision',
      'clientMutationId',
      'status',
      'reason',
    ]);
  if (
    !exactShape ||
    value.type !== 'session.ask-question.answer-result' ||
    !isOpaqueId(value.sessionId) ||
    !isOpaqueId(value.questionId) ||
    !isPositiveInteger(value.revision) ||
    !isOpaqueId(value.clientMutationId) ||
    (value.status !== 'accepted' && value.status !== 'rejected')
  ) {
    return false;
  }
  if (value.status === 'accepted') return value.reason === undefined;
  return typeof value.reason === 'string' && ASK_QUESTION_RESULT_REASON_SET.has(value.reason);
}

/** Narrow an unknown value to one authoritative transcript block. */
export function isTranscriptBlock(value: unknown): value is TranscriptBlock {
  if (isRecord(value) && value.kind === 'file_preview') {
    return isFilePreviewBlock(value);
  }
  if (isRecord(value) && value.kind === 'inbound_image') {
    return isInboundImageBlock(value);
  }
  if (isRecord(value) && value.kind === 'ask-question') {
    return isAskQuestionTranscriptMeta(value);
  }
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
      return hasAnyKey(value, ['callId', 'shellKind', 'lifecycle', 'terminalCheckpoint'])
        ? isRichToolCallBlock(value)
        : typeof value.toolName === 'string' && typeof value.inputSummary === 'string';
    case 'tool_result':
      return hasAnyKey(value, [
        'callId',
        'shellKind',
        'lifecycle',
        'terminalCheckpoint',
        'outputCompleteness',
      ])
        ? isRichToolResultBlock(value)
        : typeof value.toolName === 'string' &&
            typeof value.output === 'string' &&
            typeof value.isError === 'boolean';
    case 'text_artifact':
      return isTextArtifactBlock(value);
    case 'file_diff':
      return typeof value.summary === 'string' && typeof value.patch === 'string';
    case 'file_preview':
      return false;
    case 'attachment':
      return isRedactedAttachmentBlock(value);
    case 'inbound_image':
      return isInboundImageBlock(value);
    case 'ask-question':
      return isAskQuestionTranscriptMeta(value);
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

/** Validate the bounded provenance attached to redacted envelopes and blocks. */
export function isRedactionMetadata(value: unknown): value is RedactionMetadata {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['policyVersion', 'fieldsRedacted', 'reasons']) &&
    value.policyVersion === 1 &&
    isNonNegativeSafeInteger(value.fieldsRedacted) &&
    value.fieldsRedacted <= REDACTION_MAX_FIELDS &&
    Array.isArray(value.reasons) &&
    value.reasons.length <= REDACTION_MAX_REASONS &&
    new Set(value.reasons).size === value.reasons.length &&
    value.reasons.every(
      (reason) =>
        typeof reason === 'string' &&
        reason.length > 0 &&
        reason.length <= REDACTION_MAX_REASON_LENGTH &&
        /^[a-z][a-z0-9-]*$/u.test(reason),
    )
  );
}

/** Return whether a tool-call block has the complete rich projection contract. */
export function isRichToolCallBlock(value: unknown): value is RichToolCallBlock {
  return (
    isRecord(value) &&
    hasRequiredAndOptionalKeys(
      value,
      [
        'kind',
        'id',
        'revision',
        'seq',
        'occurredAt',
        'toolName',
        'inputSummary',
        'callId',
        'shellKind',
        'lifecycle',
        'terminalCheckpoint',
        'redaction',
      ],
      [],
    ) &&
    value.kind === 'tool_call' &&
    isTranscriptBase(value) &&
    isSafeTranscriptToolName(value.toolName) &&
    isBoundedString(value.inputSummary, RICH_INPUT_SUMMARY_MAX_LENGTH) &&
    isOpaqueId(value.callId) &&
    typeof value.shellKind === 'string' &&
    TRANSCRIPT_SHELL_KIND_SET.has(value.shellKind as TranscriptShellKind) &&
    typeof value.lifecycle === 'string' &&
    TRANSCRIPT_LIFECYCLE_SET.has(value.lifecycle as TranscriptLifecycle) &&
    typeof value.terminalCheckpoint === 'string' &&
    TRANSCRIPT_CHECKPOINT_SET.has(value.terminalCheckpoint as TranscriptTerminalCheckpoint) &&
    isRedactionMetadata(value.redaction)
  );
}

/** Return whether a tool-result block has the complete rich projection contract. */
export function isRichToolResultBlock(value: unknown): value is RichToolResultBlock {
  return (
    isRecord(value) &&
    hasRequiredAndOptionalKeys(
      value,
      [
        'kind',
        'id',
        'revision',
        'seq',
        'occurredAt',
        'toolName',
        'output',
        'isError',
        'callId',
        'shellKind',
        'lifecycle',
        'terminalCheckpoint',
        'outputCompleteness',
        'redaction',
      ],
      [],
    ) &&
    value.kind === 'tool_result' &&
    isTranscriptBase(value) &&
    isSafeTranscriptToolName(value.toolName) &&
    isBoundedString(value.output, RICH_OUTPUT_MAX_LENGTH) &&
    typeof value.isError === 'boolean' &&
    isOpaqueId(value.callId) &&
    typeof value.shellKind === 'string' &&
    TRANSCRIPT_SHELL_KIND_SET.has(value.shellKind as TranscriptShellKind) &&
    typeof value.lifecycle === 'string' &&
    TRANSCRIPT_LIFECYCLE_SET.has(value.lifecycle as TranscriptLifecycle) &&
    typeof value.terminalCheckpoint === 'string' &&
    TRANSCRIPT_CHECKPOINT_SET.has(value.terminalCheckpoint as TranscriptTerminalCheckpoint) &&
    typeof value.outputCompleteness === 'string' &&
    TRANSCRIPT_COMPLETENESS_SET.has(value.outputCompleteness as TranscriptOutputCompleteness) &&
    isRedactionMetadata(value.redaction)
  );
}

/** Return whether a text artifact is an explicit, relay-authored projection. */
export function isTextArtifactBlock(value: unknown): value is TextArtifactBlock {
  return (
    isRecord(value) &&
    hasRequiredAndOptionalKeys(
      value,
      ['kind', 'id', 'revision', 'seq', 'occurredAt', 'label', 'source', 'redaction'],
      [],
    ) &&
    value.kind === 'text_artifact' &&
    isTranscriptBase(value) &&
    typeof value.label === 'string' &&
    TEXT_ARTIFACT_LABEL_SET.has(value.label as TextArtifactLabel) &&
    isBoundedString(value.source, RICH_TEXT_ARTIFACT_SOURCE_MAX_LENGTH) &&
    isRedactionMetadata(value.redaction)
  );
}

/** Rich blocks are eligible only when every relay-authored field is present. */
export function isRichTranscriptBlock(
  value: unknown,
): value is RichToolCallBlock | RichToolResultBlock | TextArtifactBlock {
  return isRichToolCallBlock(value) || isRichToolResultBlock(value) || isTextArtifactBlock(value);
}

/** Narrow a relay-authored, exact-revision file preview descriptor. */
export function isFilePreviewDescriptor(value: unknown): value is FilePreviewDescriptor {
  if (
    !isRecord(value) ||
    !hasRequiredAndOptionalKeys(
      value,
      [
        'kind',
        'artifactId',
        'revision',
        'displayName',
        'renderer',
        'mimeType',
        'byteLength',
        'digest',
        'redaction',
        'completeness',
        'shareAllowed',
        'content',
      ],
      [
        'language',
        'pageCount',
        'altText',
        'textLayerSafe',
        'thumbnailRef',
        'availability',
        'id',
        'seq',
        'occurredAt',
      ],
    ) ||
    value.kind !== 'file_preview' ||
    !isOpaqueId(value.artifactId) ||
    !isArtifactRevision(value.revision) ||
    !isSafeFileDisplayName(value.displayName, FILE_PREVIEW_MAX_DISPLAY_NAME) ||
    typeof value.renderer !== 'string' ||
    !FILE_PREVIEW_RENDERER_SET.has(value.renderer as FilePreviewRenderer) ||
    !isSafeMimeType(value.mimeType) ||
    !isBoundedArtifactByteLength(value.byteLength) ||
    typeof value.digest !== 'string' ||
    !DIGEST_PATTERN.test(value.digest) ||
    typeof value.redaction !== 'string' ||
    !FILE_PREVIEW_REDACTION_SET.has(value.redaction as FilePreviewRedaction) ||
    typeof value.completeness !== 'string' ||
    !FILE_PREVIEW_COMPLETENESS_SET.has(value.completeness as FilePreviewCompleteness) ||
    typeof value.shareAllowed !== 'boolean' ||
    (value.language !== undefined && !isPathFreeToken(value.language, FILE_PREVIEW_MAX_LANGUAGE)) ||
    (value.pageCount !== undefined && !isBoundedPageCount(value.pageCount)) ||
    (value.altText !== undefined &&
      !isSafeDisplayString(value.altText, FILE_PREVIEW_MAX_ALT_TEXT)) ||
    (value.textLayerSafe !== undefined && typeof value.textLayerSafe !== 'boolean') ||
    (value.thumbnailRef !== undefined &&
      !isPathFreeToken(value.thumbnailRef, FILE_PREVIEW_MAX_THUMBNAIL_REF)) ||
    (value.availability !== undefined &&
      (typeof value.availability !== 'string' ||
        !FILE_PREVIEW_AVAILABILITY_SET.has(value.availability as FilePreviewAvailability)))
  ) {
    return false;
  }

  return (
    isFilePreviewContent(value.content) &&
    isValidFilePreviewCombination(value as unknown as FilePreviewDescriptor)
  );
}

/** Narrow a transcript-ordered file preview, including opaque block identity. */
export function isFilePreviewBlock(value: unknown): value is FilePreviewBlock {
  return (
    isRecord(value) &&
    isFilePreviewDescriptor(value) &&
    isOpaqueId(value.id) &&
    isArtifactRevision(value.revision) &&
    isPositiveInteger(value.seq) &&
    isTimestamp(value.occurredAt)
  );
}

function isFilePreviewContent(value: unknown): value is FilePreviewContent {
  if (
    !isRecord(value) ||
    (!hasOnlyKeys(value, ['kind', 'text', 'firstLine']) && value.kind === 'inline-text')
  ) {
    return false;
  }
  if (value.kind === 'none' || value.kind === 'artifact-ref') {
    return hasOnlyKeys(value, ['kind']);
  }
  return (
    value.kind === 'inline-text' &&
    hasRequiredAndOptionalKeys(value, ['kind', 'text'], ['firstLine']) &&
    isBoundedString(value.text, FILE_PREVIEW_MAX_INLINE_TEXT) &&
    (value.firstLine === undefined || isBoundedPositiveInteger(value.firstLine))
  );
}

function isValidFilePreviewCombination(value: FilePreviewDescriptor): boolean {
  const availability = value.availability ?? inferAvailability(value);
  if (!isMimeCompatibleWithRenderer(value.mimeType, value.renderer)) return false;
  if (value.renderer === 'unsupported' && availability !== 'unsupported') return false;
  if (value.renderer !== 'pdf' && value.pageCount !== undefined) return false;
  if (value.renderer !== 'pdf' && value.textLayerSafe !== undefined) return false;
  if (value.redaction === 'withheld' && availability === 'ready') return false;
  if (availability === 'ready') {
    if (value.content.kind === 'none' || value.renderer === 'unsupported') return false;
    if (
      value.content.kind === 'inline-text' &&
      !['text', 'code', 'diff'].includes(value.renderer)
    ) {
      return false;
    }
    return true;
  }
  return value.content.kind === 'none' && !value.shareAllowed;
}

function inferAvailability(value: FilePreviewDescriptor): FilePreviewAvailability {
  if (value.renderer === 'unsupported') return 'unsupported';
  if (value.content.kind !== 'none') return 'ready';
  return value.redaction === 'withheld' ? 'withheld' : 'missing';
}

function isArtifactRevision(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value !== 'latest' &&
    value !== '.' &&
    value !== '..' &&
    OPAQUE_ARTIFACT_REVISION_PATTERN.test(value)
  );
}

function isSafeFileDisplayName(value: unknown, maxLength: number): value is string {
  return (
    isSafeDisplayString(value, maxLength) &&
    value !== '.' &&
    value !== '..' &&
    !value.includes('/') &&
    !value.includes('\\')
  );
}

function isSafeMimeType(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 2 &&
    value.length <= FILE_PREVIEW_MAX_MIME_TYPE &&
    /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/u.test(value)
  );
}

function isMimeCompatibleWithRenderer(mimeType: string, renderer: FilePreviewRenderer): boolean {
  if (renderer === 'image') return mimeType.startsWith('image/');
  if (renderer === 'pdf') return mimeType === 'application/pdf';
  if (renderer === 'unsupported') return true;
  if (renderer === 'text' || renderer === 'code' || renderer === 'diff') {
    return (
      mimeType.startsWith('text/') ||
      mimeType === 'application/json' ||
      mimeType === 'application/javascript' ||
      mimeType === 'application/typescript' ||
      mimeType === 'application/x-diff'
    );
  }
  return false;
}

function isBoundedArtifactByteLength(value: unknown): value is number | null {
  return value === null || (isNonNegativeSafeInteger(value) && value <= FILE_PREVIEW_MAX_BYTES);
}

function isBoundedPageCount(value: unknown): value is number {
  return isPositiveInteger(value) && value <= 500;
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
  return (
    isRecord(value) &&
    hasRequiredAndOptionalKeys(value, ['expiresAt', 'mode'], ['capabilities']) &&
    value.mode === 'read-only' &&
    isTimestamp(value.expiresAt) &&
    (value.capabilities === undefined || isTodoProjectionCapabilityDto(value.capabilities))
  );
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

function hasAnyKey(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.some((key) => key in value);
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
    !Number.isNaN(Date.parse(value.occurredAt)) &&
    (value.redaction === undefined || isRedactionMetadata(value.redaction))
  );
}

function isSafeTranscriptToolName(value: unknown): value is string {
  return (
    isPathFreeToken(value, RICH_TOOL_NAME_MAX_LENGTH) &&
    (/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/u.test(value) || value === '[REDACTED_TOOL]') &&
    !/[\u202a-\u202e\u2066-\u2069]/u.test(value)
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

function isBase64(
  value: unknown,
  minimum: number,
  maximum: number,
  decodedMaximum = Number.POSITIVE_INFINITY,
): value is string {
  if (
    typeof value === 'string' &&
    value.length >= minimum &&
    value.length <= maximum &&
    value.length % 4 === 0 &&
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)
  ) {
    const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
    return value.length / 4 * 3 - padding <= decodedMaximum;
  }
  return false;
}

function normalizedImageByteLength(value: string): number {
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  return (value.length / 4) * 3 - padding;
}

function isSha256Digest(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
}

function isInboundSha256Digest(value: unknown): value is string {
  return isSha256Digest(value) || (typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value));
}

function isOpaqueInboundArtifactId(value: unknown): value is string {
  return (
    isOpaqueId(value) &&
    value.length >= INBOUND_IMAGE_ARTIFACT_ID_MIN_LENGTH &&
    !isInboundSha256Digest(value)
  );
}

function isOpaqueInboundRevision(value: unknown): value is string {
  return (
    isOpaqueToken(value) &&
    value !== 'latest' &&
    value !== '.' &&
    value !== '..' &&
    !isInboundSha256Digest(value)
  );
}

function isInboundIsoTimestamp(value: unknown): value is string {
  return (
    isTimestamp(value) &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(value)
  );
}

function isInboundSafeText(value: unknown, maxScalars: number, maxBytes: number): value is string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value !== value.normalize('NFC') ||
    Array.from(value).length > maxScalars ||
    new TextEncoder().encode(value).byteLength > maxBytes ||
    value.includes('/') ||
    value.includes('\\')
  ) {
    return false;
  }
  if (!isSafeDisplayString(value, maxScalars * 2)) return false;
  const compact = value.replace(/\s+/gu, '');
  return !(
    /\bocr\b/iu.test(value) ||
    (compact.length >= 16 &&
      compact.length % 4 === 0 &&
      /^(?:[A-Za-z0-9+/]+={0,2})$/u.test(compact) &&
      (compact.includes('=') || compact.startsWith('iVBOR') || compact.startsWith('JVBER'))) ||
    /(?:data|blob|javascript):|(?:^|[\s"'`])[^\s"'`]+\.(?:avif|bmp|gif|heic|heif|ico|jpe?g|pdf|png|raw|svg|tiff?|webp)(?:$|[\s"'`])/iu.test(
      value,
    )
  );
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isTodoTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/u.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
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
const SLASH_SUBMIT_ISSUE_CODE_SET = new Set<string>(SLASH_SUBMIT_ISSUE_CODES);

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
    hasRequiredAndOptionalKeys(
      value,
      [
        'sessionId',
        'revision',
        'model',
        'thinkingLevel',
        'availableThinkingLevels',
        'mode',
        'streaming',
        'updatedAt',
      ],
      ['plan'],
    ) &&
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
    isTimestamp(value.updatedAt) &&
    (value.plan === undefined || isPlanSnapshotDto(value.plan))
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
    hasRequiredAndOptionalKeys(value, ['sessionId', 'state', 'models'], ['media']) &&
    isOpaqueId(value.sessionId) &&
    isRuntimeStateDto(value.state) &&
    isRuntimeModelCatalogDto(value.models) &&
    (value.media === undefined || isRuntimeMediaCapabilityDto(value.media)) &&
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

/** Narrow an unknown value to a bounded, canonical command descriptor. */
export function isCommandDescriptorDto(value: unknown): value is CommandDescriptorDto {
  return (
    isRecord(value) &&
    hasRequiredAndOptionalKeys(
      value,
      ['name', 'description', 'source', 'enabled', 'disabledReason', 'requiresConfirmation'],
      ['aliases', 'argumentHint'],
    ) &&
    isCanonicalCommandName(value.name) &&
    (value.description === null || isSafeDisplayString(value.description, 2_000)) &&
    typeof value.source === 'string' &&
    COMMAND_SOURCES.has(value.source as CommandSource) &&
    typeof value.enabled === 'boolean' &&
    (value.disabledReason === null || isSafeDisplayString(value.disabledReason, 500)) &&
    typeof value.requiresConfirmation === 'boolean' &&
    (value.aliases === undefined ||
      (Array.isArray(value.aliases) &&
        value.aliases.length > 0 &&
        value.aliases.length <= 16 &&
        new Set(value.aliases).size === value.aliases.length &&
        value.aliases.every(isCanonicalCommandName))) &&
    (value.argumentHint === undefined ||
      value.argumentHint === null ||
      isSafeDisplayString(value.argumentHint, 500))
  );
}

/** Narrow an unknown value to a bounded, versioned command catalog. */
export function isCommandCatalogDto(value: unknown): value is CommandCatalogDto {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      'hostEpoch',
      'sessionId',
      'sessionRevision',
      'catalogRevision',
      'commands',
    ]) &&
    isOpaqueId(value.hostEpoch) &&
    isOpaqueId(value.sessionId) &&
    isNonNegativeSafeInteger(value.sessionRevision) &&
    isNonNegativeSafeInteger(value.catalogRevision) &&
    Array.isArray(value.commands) &&
    value.commands.length <= 500 &&
    value.commands.every(isCommandDescriptorDto)
  );
}

/** Narrow an unknown value to an exact slash submission binding. */
export function isCommandBindingDto(value: unknown): value is CommandBindingDto {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['hostEpoch', 'name', 'sessionRevision', 'catalogRevision']) &&
    isOpaqueId(value.hostEpoch) &&
    isCanonicalCommandName(value.name) &&
    isNonNegativeSafeInteger(value.sessionRevision) &&
    isNonNegativeSafeInteger(value.catalogRevision)
  );
}

/** Narrow one of the fixed slash submission issue codes. */
export function isSlashSubmitIssueCode(value: unknown): value is SlashSubmitIssueCode {
  return typeof value === 'string' && SLASH_SUBMIT_ISSUE_CODE_SET.has(value);
}

/** Narrow a browser-visible slash submission issue response. */
export function isSlashSubmitIssueResponse(value: unknown): value is SlashSubmitIssueResponse {
  return isRecord(value) && hasOnlyKeys(value, ['error']) && isSlashSubmitIssueCode(value.error);
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

// ── Plan mode and reviewed-plan execution control ────────────────────────────

const PLAN_VALIDITY_VALUE_SET = new Set<PlanValidityValue>(PLAN_VALIDITY_VALUES);
const PLAN_CONTROL_REASON_CODE_SET = new Set<PlanControlReasonCode>(PLAN_CONTROL_REASON_CODES);
const PLAN_TITLE_CAP = 500;
const PLAN_SUMMARY_CAP = 2_000;
const PLAN_STEP_CAP = 10_000;
const PLAN_APPROACH_CAP = 100;

/** Narrow an unknown value to one of the pinned plan validity values. */
export function isPlanValidityValue(value: unknown): value is PlanValidityValue {
  return typeof value === 'string' && PLAN_VALIDITY_VALUE_SET.has(value as PlanValidityValue);
}

/** Narrow an unknown value to one of the fixed plan control reason codes. */
export function isPlanControlReasonCode(value: unknown): value is PlanControlReasonCode {
  return (
    typeof value === 'string' && PLAN_CONTROL_REASON_CODE_SET.has(value as PlanControlReasonCode)
  );
}

/** Narrow an unknown value to the bounded, token-free plan artifact projection. */
export function isPlanArtifactDto(value: unknown): value is PlanArtifactDto {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      'planId',
      'planRevision',
      'title',
      'summary',
      'stepCount',
      'approachCount',
      'validity',
      'occurredAt',
    ]) &&
    isOpaqueId(value.planId) &&
    isNonNegativeSafeInteger(value.planRevision) &&
    isSafeDisplayString(value.title, PLAN_TITLE_CAP) &&
    isSafeDisplayString(value.summary, PLAN_SUMMARY_CAP) &&
    isBoundedNonNegativeInteger(value.stepCount, PLAN_STEP_CAP) &&
    isBoundedNonNegativeInteger(value.approachCount, PLAN_APPROACH_CAP) &&
    typeof value.validity === 'string' &&
    PLAN_VALIDITY_VALUE_SET.has(value.validity as PlanValidityValue) &&
    value.validity !== 'none' &&
    isTimestamp(value.occurredAt)
  );
}

/** Narrow an unknown value to a consistent relay plan snapshot projection. */
export function isPlanSnapshotDto(value: unknown): value is PlanSnapshotDto {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ['planId', 'planRevision', 'validity', 'artifact']) ||
    (value.planId !== null && !isOpaqueId(value.planId)) ||
    !isNonNegativeSafeInteger(value.planRevision) ||
    !isPlanValidityValue(value.validity) ||
    (value.artifact !== null && !isPlanArtifactDto(value.artifact))
  ) {
    return false;
  }
  if (value.artifact === null) {
    return value.planId === null;
  }
  return (
    value.planId !== null &&
    value.artifact.planId === value.planId &&
    value.artifact.planRevision === value.planRevision &&
    value.artifact.validity === value.validity
  );
}

const SET_MODE_KEYS = ['type', 'target', 'expectedRuntimeRevision', 'controlId', 'oneUseTicket'];

/** Narrow an unknown value to the exact host-confirmed mode switch request. */
export function isSetModeCommand(value: unknown): value is SetModeCommand {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, SET_MODE_KEYS) &&
    value.type === 'set_mode' &&
    (value.target === 'build' || value.target === 'plan') &&
    isNonNegativeSafeInteger(value.expectedRuntimeRevision) &&
    isOpaqueId(value.controlId) &&
    isOpaqueToken(value.oneUseTicket)
  );
}

const EXECUTE_PLAN_KEYS = [
  'type',
  'planId',
  'expectedPlanRevision',
  'planToken',
  'selectedApproachId',
  'expectedRuntimeRevision',
  'postRunMode',
  'controlId',
  'oneUseTicket',
];

/** Narrow an unknown value to the exact reviewed-plan execution request. */
export function isExecutePlanCommand(value: unknown): value is ExecutePlanCommand {
  return (
    isRecord(value) &&
    Object.keys(value).every((key) => EXECUTE_PLAN_KEYS.includes(key)) &&
    value.type === 'execute_plan' &&
    isOpaqueId(value.planId) &&
    isNonNegativeSafeInteger(value.expectedPlanRevision) &&
    isOpaqueToken(value.planToken) &&
    (value.selectedApproachId === undefined || isOpaqueId(value.selectedApproachId)) &&
    isNonNegativeSafeInteger(value.expectedRuntimeRevision) &&
    // Execution always returns to the reviewed, read-only plan contract.
    value.postRunMode === 'plan' &&
    isOpaqueId(value.controlId) &&
    isOpaqueToken(value.oneUseTicket)
  );
}

/** Narrow an unknown value to one of the two guarded plan control commands. */
export function isPlanControlCommand(value: unknown): value is PlanControlCommand {
  return isSetModeCommand(value) || isExecutePlanCommand(value);
}

/** Narrow an unknown value to a fail-closed plan control response. */
export function isPlanControlResponse(value: unknown): value is PlanControlResponse {
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
      PLAN_CONTROL_REASON_CODE_SET.has(value.outcome.reasonCode as PlanControlReasonCode) &&
      value.outcome.reasonCode !== 'unsupported_operation' &&
      value.outcome.reasonCode !== 'policy_blocked' &&
      value.outcome.reasonCode !== 'delivery_unknown' &&
      (value.outcome.issueCode === undefined || isRuntimeIssueCode(value.outcome.issueCode))
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

function isCanonicalCommandName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 200 &&
    // One canonical token: no leading slash, whitespace, path, control, or bidi characters.
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
    // Path-like identifiers reject control characters before use.
    // eslint-disable-next-line no-control-regex
    !/[\u0000-\u001f\u007f-\u009f]/u.test(value)
  );
}

function isSafeDisplayString(value: unknown, maxLength: number): value is string {
  return (
    isNonEmptyBoundedString(value, maxLength) &&
    // Display strings reject controls and bidi overrides before projection.
    // eslint-disable-next-line no-control-regex
    !/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(value) &&
    !/(?:https?|file):\/\/|(?:^|\s)\/(?:Users|home|private|tmp|var|etc|opt|usr|Volumes)\/|\b[A-Za-z]:\\|\b(?:api[_-]?key|authorization|cookie|password|secret|token)\s*[:=]|\bBearer\s+/iu.test(
      value,
    )
  );
}

function isBoundedPositiveInteger(value: unknown): value is number {
  return isPositiveInteger(value) && value <= 1_000_000_000;
}

function isBoundedNonNegativeInteger(value: unknown, maximum: number): value is number {
  return isNonNegativeSafeInteger(value) && value <= maximum;
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
