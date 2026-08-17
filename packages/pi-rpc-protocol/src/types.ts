// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Protocol Types
// ───────────────────────────────────────────────────────────────────

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export interface ImageContent extends JsonObject {
  readonly type: 'image';
  readonly data: string;
  readonly mimeType: string;
}

interface PiRpcCommandBase extends JsonObject {
  readonly id?: string;
}

export interface PromptCommand extends PiRpcCommandBase {
  readonly type: 'prompt';
  readonly message: string;
  readonly images?: readonly ImageContent[];
  readonly streamingBehavior?: 'steer' | 'followUp';
}

export interface PromptSubmitCommand {
  readonly type: 'prompt.submit';
  readonly submissionId: string;
  readonly sessionId: string;
  readonly message: string;
  readonly ticket: string;
  /** Absent for an idle send; 'steer' interrupts, 'followUp' queues behind the turn. */
  readonly streamingBehavior?: 'steer' | 'followUp';
  /**
   * Present only for an explicit slash submission. The relay revalidates the
   * bound name and host/session/catalog revisions against the live catalog
   * before forwarding; a bound submission is never steered or queued.
   */
  readonly command?: CommandBindingDto;
}

export interface SteerCommand extends PiRpcCommandBase {
  readonly type: 'steer';
  readonly message: string;
  readonly images?: readonly ImageContent[];
}

export interface FollowUpCommand extends PiRpcCommandBase {
  readonly type: 'follow_up';
  readonly message: string;
  readonly images?: readonly ImageContent[];
}

export interface AbortCommand extends PiRpcCommandBase {
  readonly type: 'abort';
}

export interface ReadStateCommand extends PiRpcCommandBase {
  readonly type:
    'get_state' | 'get_messages' | 'get_session_stats' | 'get_tree' | 'get_last_assistant_text';
}

export interface GetEntriesCommand extends PiRpcCommandBase {
  readonly type: 'get_entries';
  readonly since?: string;
}

export type PiRpcCommand =
  | PromptCommand
  | SteerCommand
  | FollowUpCommand
  | AbortCommand
  | ReadStateCommand
  | GetEntriesCommand
  | RuntimeReadCommand
  | SetModelCommand
  | SetThinkingLevelCommand;

export interface PiRpcResponse extends JsonObject {
  readonly id?: string;
  readonly type: 'response';
  readonly command: string;
  readonly success: boolean;
  readonly data?: JsonValue;
  readonly error?: string;
}

export type PiRpcEventType =
  | 'agent_start'
  | 'agent_end'
  | 'agent_settled'
  | 'turn_start'
  | 'turn_end'
  | 'message_start'
  | 'message_update'
  | 'message_end'
  | 'bash_execution_update'
  | 'tool_execution_start'
  | 'tool_execution_update'
  | 'tool_execution_end'
  | 'queue_update'
  | 'compaction_start'
  | 'compaction_end'
  | 'auto_retry_start'
  | 'auto_retry_end'
  | 'summarization_retry_scheduled'
  | 'summarization_retry_attempt_start'
  | 'summarization_retry_finished'
  | 'extension_error'
  | 'extension_ui_request';

export type PiRpcEvent = JsonObject & {
  readonly type: PiRpcEventType;
};

export interface RedactionMetadata {
  readonly policyVersion: number;
  readonly fieldsRedacted: number;
  readonly reasons: readonly string[];
}

export interface ReplayMetadata {
  readonly eligible: boolean;
  readonly snapshotEligible: boolean;
}

export interface Envelope<TPayload extends JsonValue = JsonValue> {
  readonly v: 1;
  readonly eventId: string;
  readonly kind: string;
  readonly hostId: string;
  readonly workspaceRef: string;
  readonly sessionId: string;
  readonly epoch: string;
  readonly seq: number;
  readonly occurredAt: string;
  readonly causedBy: string | null;
  readonly payload: TPayload;
  readonly redaction: RedactionMetadata;
  readonly replay: ReplayMetadata;
}

export interface SyncCursor {
  readonly epoch: string;
  readonly seq: number;
}

export interface SyncDelta {
  readonly kind: 'sync.delta';
  readonly sessionId: string;
  readonly epoch: string;
  readonly coversThrough: number;
  readonly envelopes: readonly Envelope[];
}

export interface SyncSnapshot {
  readonly kind: 'sync.snapshot';
  readonly sessionId: string;
  readonly epoch: string;
  readonly coversThrough: number;
  readonly envelopes: readonly Envelope[];
}

export interface SyncGap {
  readonly kind: 'sync.gap';
  readonly sessionId: string;
  readonly epoch: string;
  readonly coversThrough: number;
  readonly reason: 'retention' | 'epoch' | 'ahead' | 'unknown-session';
}

export type SyncMessage = SyncDelta | SyncSnapshot | SyncGap;

export interface SessionCardDto {
  readonly id: string;
  readonly status: 'idle' | 'running' | 'interrupted' | 'unknown';
  readonly updatedAt: string;
  readonly messageCount: number;
}

interface TranscriptBlockBase extends JsonObject {
  readonly id: string;
  readonly revision: number;
  readonly seq: number;
  readonly occurredAt: string;
}

export interface TextBlock extends TranscriptBlockBase {
  readonly kind: 'text';
  readonly text: string;
  readonly role?: 'assistant' | 'user';
}

export interface ThinkingBlock extends TranscriptBlockBase {
  readonly kind: 'thinking';
  readonly summary: string;
}

export interface PlanItem extends JsonObject {
  readonly text: string;
  readonly done: boolean;
}

export interface PlanBlock extends TranscriptBlockBase {
  readonly kind: 'plan';
  readonly items: readonly PlanItem[];
}

export interface ToolCallBlock extends TranscriptBlockBase {
  readonly kind: 'tool_call';
  readonly toolName: string;
  readonly inputSummary: string;
}

export interface ToolResultBlock extends TranscriptBlockBase {
  readonly kind: 'tool_result';
  readonly toolName: string;
  readonly output: string;
  readonly isError: boolean;
}

export interface FileDiffBlock extends TranscriptBlockBase {
  readonly kind: 'file_diff';
  readonly summary: string;
  readonly patch: string;
}

export const FILE_PREVIEW_RENDERERS = [
  'image',
  'pdf',
  'text',
  'code',
  'diff',
  'unsupported',
] as const;
export type FilePreviewRenderer = (typeof FILE_PREVIEW_RENDERERS)[number];

export const FILE_PREVIEW_REDACTION_STATES = ['not-needed', 'applied', 'withheld'] as const;
export type FilePreviewRedaction = (typeof FILE_PREVIEW_REDACTION_STATES)[number];

export const FILE_PREVIEW_COMPLETENESS_STATES = ['complete', 'excerpt'] as const;
export type FilePreviewCompleteness = (typeof FILE_PREVIEW_COMPLETENESS_STATES)[number];

export const FILE_PREVIEW_AVAILABILITIES = [
  'ready',
  'withheld',
  'missing',
  'denied',
  'unsupported',
] as const;
export type FilePreviewAvailability = (typeof FILE_PREVIEW_AVAILABILITIES)[number];

export interface FilePreviewInlineText extends JsonObject {
  readonly kind: 'inline-text';
  readonly text: string;
  readonly firstLine?: number;
}

export interface FilePreviewArtifactReference extends JsonObject {
  readonly kind: 'artifact-ref';
}

export interface FilePreviewNoContent extends JsonObject {
  readonly kind: 'none';
}

export type FilePreviewContent =
  | FilePreviewInlineText
  | FilePreviewArtifactReference
  | FilePreviewNoContent;

/** Relay-authored metadata before transcript ordering fields are attached. */
export interface FilePreviewDescriptor extends JsonObject {
  readonly kind: 'file_preview';
  readonly artifactId: string;
  /** This is the artifact revision. It is intentionally not a numeric block revision. */
  readonly revision: string;
  readonly displayName: string;
  readonly renderer: FilePreviewRenderer;
  readonly mimeType: string;
  readonly byteLength: number | null;
  readonly digest: string;
  readonly language?: string;
  readonly pageCount?: number;
  readonly altText?: string;
  readonly redaction: FilePreviewRedaction;
  readonly completeness: FilePreviewCompleteness;
  readonly shareAllowed: boolean;
  readonly textLayerSafe?: boolean;
  readonly thumbnailRef?: string;
  /** Optional for wire compatibility with the original descriptor shape. */
  readonly availability?: FilePreviewAvailability;
  readonly content: FilePreviewContent;
}

/** A transcript-ordered relay artifact descriptor with a string artifact revision. */
export interface FilePreviewBlock extends FilePreviewDescriptor {
  readonly id: string;
  readonly revision: string;
  readonly seq: number;
  readonly occurredAt: string;
}

export interface UsageBlock extends TranscriptBlockBase {
  readonly kind: 'usage';
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cost: number;
}

export type TranscriptBlock =
  | TextBlock
  | ThinkingBlock
  | PlanBlock
  | ToolCallBlock
  | ToolResultBlock
  | FileDiffBlock
  | FilePreviewBlock
  | UsageBlock;

export interface TranscriptPageDto {
  readonly sessionId: string;
  readonly items: readonly TranscriptBlock[];
  readonly nextSeq: number | null;
  readonly coversThrough: number;
}

export interface EnrollmentQr {
  readonly v: 1;
  readonly origin: string;
  readonly pairingId: string;
  readonly hostFingerprint: string;
  readonly challenge: string;
  readonly expiresAt: string;
}

export interface DevicePublicKeyJwk {
  readonly kty: 'EC';
  readonly crv: 'P-256';
  readonly x: string;
  readonly y: string;
}

export interface EnrollmentRequest {
  readonly enrollment: EnrollmentQr;
  readonly publicKey: DevicePublicKeyJwk;
  readonly signature: string;
}

export interface EnrollmentResponse {
  readonly deviceId: string;
  readonly hostFingerprint: string;
}

export interface SessionChallengeResponse {
  readonly challengeId: string;
  readonly challenge: string;
  readonly expiresAt: string;
}

export interface ApplicationSessionResponse {
  readonly expiresAt: string;
  readonly mode: 'read-only';
}

export interface WebSocketTicketResponse {
  readonly ticket: string;
  readonly expiresAt: string;
}

export interface PromptSubmitResponse {
  readonly accepted: true;
  readonly block: TextBlock;
}

export interface ApprovalAction {
  readonly principal: string;
  readonly sessionId: string;
  readonly epoch: string;
  readonly tool: string;
  readonly arguments: JsonValue;
  readonly policyVersion: number;
}

export type ApprovalDecision = 'approve' | 'deny';

export interface ApprovalDecisionCommand {
  readonly type: 'approval.decide';
  readonly approvalId: string;
  readonly decision: ApprovalDecision;
  readonly idempotencyKey: string;
  readonly epoch: string;
  readonly revision: number;
  readonly digest: string;
}

export type ApprovalResultStatus =
  | 'approved'
  | 'denied'
  | 'expired'
  | 'revoked'
  | 'raced'
  | 'stale'
  | 'duplicate'
  | 'restart-invalidated'
  | 'consumed'
  | 'failed';

export interface ApprovalRequestedPayload extends JsonObject {
  readonly approvalId: string;
  readonly sessionId: string;
  readonly epoch: string;
  readonly tool: string;
  readonly canonicalArguments: string;
  readonly digest: string;
  readonly policyVersion: number;
  readonly revision: number;
  readonly requestedAt: string;
  readonly expiresAt: string;
  readonly source: 'explicit' | 'accept-edits';
}

export interface ApprovalResultPayload extends JsonObject {
  readonly approvalId: string;
  readonly sessionId: string;
  readonly epoch: string;
  readonly digest: string;
  readonly revision: number;
  readonly status: ApprovalResultStatus;
  readonly reason: string;
  readonly settledAt: string;
}

export interface ApprovalCardDto extends ApprovalRequestedPayload {
  readonly status: 'pending' | ApprovalResultStatus;
  readonly reason: string | null;
}

export interface ApprovalDecisionResponse {
  readonly accepted: boolean;
  readonly result: ApprovalResultPayload;
}

export interface ApprovalAuthorityRequest {
  readonly action: ApprovalAction;
  readonly digest: string;
}

export interface ApprovalAuthorityConsumeRequest extends ApprovalAuthorityRequest {
  readonly approvalId: string;
}

export type ApprovalAuthorityRequestResponse =
  | { readonly requested: true; readonly approval: ApprovalCardDto }
  | { readonly requested: false; readonly reason: string };

export type ApprovalAuthorityConsumeResponse =
  { readonly allowed: true } | { readonly allowed: false; readonly reason: string };

export interface AcceptEditsGrantDto {
  readonly grantId: string;
  readonly sessionId: string;
  readonly epoch: string;
  readonly allowedTools: readonly string[];
  readonly remainingActions: number;
  readonly expiresAt: string;
  readonly status: 'active' | 'expired' | 'revoked' | 'restart-invalidated' | 'exhausted';
}

export type AttentionClass = 'needs_input' | 'finished' | 'error';

export interface AttentionChangedPayload extends JsonObject {
  readonly lookupId: string;
  readonly attentionClass: AttentionClass;
  readonly generation: number;
  readonly nonce: string;
}

export interface PushHintPayload extends JsonObject {
  readonly lookupId: string;
  readonly attentionClass: AttentionClass;
}

export interface AttentionItemDto {
  readonly lookupId: string;
  readonly attentionClass: AttentionClass;
  readonly generation: number;
  readonly nonce: string;
  readonly occurredAt: string;
}

export interface AttentionResolutionDto {
  readonly item: AttentionItemDto;
  readonly sessionId: string;
  readonly epoch: string;
  readonly target: 'session' | 'review';
  readonly focusId: string | null;
}

export interface PushPreferences {
  readonly needs_input: boolean;
  readonly finished: boolean;
  readonly error: boolean;
}

export interface PushSubscriptionKeys {
  readonly p256dh: string;
  readonly auth: string;
}

export interface PushSubscriptionInput {
  readonly endpoint: string;
  readonly expirationTime: number | null;
  readonly keys: PushSubscriptionKeys;
}

// ── Runtime control (model, thinking level, plan mode) ────────────────────────

export interface RuntimeReadCommand extends PiRpcCommandBase {
  readonly type: 'get_available_models' | 'get_available_thinking_levels' | 'get_commands';
}

export interface SetModelCommand extends PiRpcCommandBase {
  readonly type: 'set_model';
  readonly provider: string;
  readonly modelId: string;
}

export interface SetThinkingLevelCommand extends PiRpcCommandBase {
  readonly type: 'set_thinking_level';
  readonly level: string;
}

export const RUNTIME_MODES = ['build', 'plan', 'executing-plan', 'unknown'] as const;
export type RuntimeMode = (typeof RUNTIME_MODES)[number];

export const MODEL_INPUT_KINDS = ['text', 'image'] as const;
export type ModelInputKind = (typeof MODEL_INPUT_KINDS)[number];

export const MODEL_AVAILABILITIES = ['available', 'tier_locked', 'policy_blocked'] as const;
export type ModelAvailability = (typeof MODEL_AVAILABILITIES)[number];

export const MODEL_AVAILABILITY_REASON_CODES = [
  'tier_locked',
  'policy_blocked',
  'unavailable',
] as const;
export type ModelAvailabilityReasonCode = (typeof MODEL_AVAILABILITY_REASON_CODES)[number];

export interface ModelPricingDto {
  readonly currency: string;
  readonly inputPerMillion?: number;
  readonly outputPerMillion?: number;
}

export interface AvailableModelDto {
  readonly provider: string;
  readonly id: string;
  readonly label: string;
  readonly reasoning?: boolean;
  readonly input?: readonly ModelInputKind[];
  readonly contextWindow?: number;
  readonly maxTokens?: number;
  readonly tools?: boolean;
  readonly availability?: ModelAvailability;
  readonly availabilityReasonCode?: ModelAvailabilityReasonCode;
  readonly pricing?: ModelPricingDto;
}

export interface RuntimeStateDto {
  readonly sessionId: string;
  readonly revision: number;
  readonly model: AvailableModelDto | null;
  readonly thinkingLevel: string;
  readonly availableThinkingLevels: readonly string[];
  readonly mode: RuntimeMode;
  readonly streaming: boolean;
  readonly updatedAt: string;
  /** Relay-side plan projection; absent means the host has not published one. */
  readonly plan?: PlanSnapshotDto;
}

export type RuntimeOperation =
  | { readonly type: 'set_model'; readonly provider: string; readonly modelId: string }
  | { readonly type: 'set_thinking_level'; readonly level: string }
  | { readonly type: 'set_mode'; readonly mode: 'build' | 'plan' };

interface RuntimeControlCommandBase {
  readonly type: 'runtime.control';
  readonly controlId: string;
  readonly sessionId: string;
  readonly expectedRevision: number;
  readonly ticket: string;
}

export type RuntimeControlCommand =
  | (RuntimeControlCommandBase & {
      readonly expectedCatalogRevision: number;
      readonly operation: Extract<RuntimeOperation, { readonly type: 'set_model' }>;
    })
  | (RuntimeControlCommandBase & {
      readonly operation: Exclude<RuntimeOperation, { readonly type: 'set_model' }>;
      readonly expectedCatalogRevision?: never;
    });

export interface RuntimeModelTicketRequest {
  readonly sessionId: string;
  readonly expectedRevision: number;
  readonly expectedCatalogRevision: number;
  readonly operation: Extract<RuntimeOperation, { readonly type: 'set_model' }>;
}

export interface RuntimeModelTicketResponse {
  readonly ticket: string;
  readonly expiresAt: string;
}

export interface RuntimeModelCatalogDto {
  readonly sessionId: string;
  readonly catalogRevision: number;
  readonly runtimeRevision: number;
  readonly currentModel: AvailableModelDto | null;
  readonly streaming: boolean;
  readonly canSetModelWhileStreaming: boolean;
  readonly models: readonly AvailableModelDto[];
}

export interface RuntimeSnapshotDto {
  readonly sessionId: string;
  readonly state: RuntimeStateDto;
  readonly models: RuntimeModelCatalogDto;
}

export const RUNTIME_ISSUE_CODES = [
  'unsupported',
  'host-unavailable',
  'foreground-required',
  'rate-limited',
  'delivery-unknown',
  'invalid-response',
  'offline',
] as const;
export type RuntimeIssueCode = (typeof RUNTIME_ISSUE_CODES)[number];

export interface RuntimeIssueResponse {
  readonly error: RuntimeIssueCode;
}

export interface RuntimeIssueDto {
  readonly issueCode: RuntimeIssueCode;
}

export type CommandSource = 'extension' | 'prompt' | 'skill';

export interface CommandDescriptorDto {
  /** Canonical command identity; never a path, label, or free-form token. */
  readonly name: string;
  readonly description: string | null;
  readonly source: CommandSource;
  readonly enabled: boolean;
  readonly disabledReason: string | null;
  readonly requiresConfirmation: boolean;
  /**
   * Opt-in authoritative metadata. Absent unless the relay's allowlisted
   * projection lets host data through; never inferred from descriptions.
   */
  readonly aliases?: readonly string[];
  readonly argumentHint?: string | null;
}

/** One complete, relay-filtered command snapshot bound to host and session identity. */
export interface CommandCatalogDto {
  readonly hostEpoch: string;
  readonly sessionId: string;
  readonly sessionRevision: number;
  readonly catalogRevision: number;
  readonly commands: readonly CommandDescriptorDto[];
}

/** The explicit binding a slash submission carries for fail-closed revalidation. */
export interface CommandBindingDto {
  readonly hostEpoch: string;
  readonly name: string;
  readonly sessionRevision: number;
  readonly catalogRevision: number;
}

export const SLASH_SUBMIT_ISSUE_CODES = ['stale_catalog', 'command_denied'] as const;
export type SlashSubmitIssueCode = (typeof SLASH_SUBMIT_ISSUE_CODES)[number];

export interface SlashSubmitIssueResponse {
  readonly error: SlashSubmitIssueCode;
}

export const RUNTIME_CONTROL_REASON_CODES = [
  'stale_revision',
  'stale_catalog',
  'unsupported_operation',
  'runtime_unavailable',
  'model_unavailable',
  'tier_locked',
  'policy_blocked',
  'streaming_active',
  'host_rejected',
  'delivery_unknown',
] as const;
export type RuntimeControlReasonCode = (typeof RUNTIME_CONTROL_REASON_CODES)[number];

export type RuntimeControlOutcome =
  | { readonly status: 'accepted'; readonly state: RuntimeStateDto }
  | { readonly status: 'stale'; readonly state: RuntimeStateDto }
  | {
      readonly status: 'unsupported';
      readonly reasonCode: 'unsupported_operation';
      readonly issueCode?: 'unsupported';
    }
  | {
      readonly status: 'unavailable';
      readonly reasonCode: Exclude<
        RuntimeControlReasonCode,
        'unsupported_operation' | 'policy_blocked' | 'delivery_unknown'
      >;
      readonly issueCode?: RuntimeIssueCode;
    }
  | {
      readonly status: 'policy_blocked';
      readonly reasonCode: 'policy_blocked';
      readonly issueCode?: 'unsupported';
    }
  | {
      readonly status: 'delivery-unknown';
      readonly reasonCode: 'delivery_unknown';
      readonly issueCode?: 'delivery-unknown';
    };

export interface RuntimeControlResponse {
  readonly outcome: RuntimeControlOutcome;
}

// ── Plan mode and reviewed-plan execution control ────────────────────────────

export const PLAN_VALIDITY_VALUES = ['none', 'valid', 'superseded', 'invalid'] as const;
export type PlanValidityValue = (typeof PLAN_VALIDITY_VALUES)[number];

/**
 * Bounded, redacted plan artifact projection. The raw host artifact is never a
 * DTO: only these allowlisted fields cross the relay, and the opaque plan token
 * is bound by value only inside guarded control requests.
 */
export interface PlanArtifactDto extends JsonObject {
  readonly planId: string;
  readonly planRevision: number;
  readonly title: string;
  readonly summary: string;
  readonly stepCount: number;
  readonly approachCount: number;
  readonly validity: Exclude<PlanValidityValue, 'none'>;
  readonly occurredAt: string;
}

/** The relay's authoritative plan projection attached to runtime state. */
export interface PlanSnapshotDto extends JsonObject {
  readonly planId: string | null;
  readonly planRevision: number;
  readonly validity: PlanValidityValue;
  readonly artifact: PlanArtifactDto | null;
}

/** Host-confirmed mode switch request; never a prompt-channel message. */
export interface SetModeCommand extends JsonObject {
  readonly type: 'set_mode';
  readonly target: 'build' | 'plan';
  readonly expectedRuntimeRevision: number;
  readonly controlId: string;
  readonly oneUseTicket: string;
}

/**
 * Reviewed-plan execution request. The token is an opaque host-issued binding
 * echoed by the phone; the exact plan binding, runtime revision and
 * postRunMode contract are all guarded before any host dispatch.
 */
export interface ExecutePlanCommand extends JsonObject {
  readonly type: 'execute_plan';
  readonly planId: string;
  readonly expectedPlanRevision: number;
  readonly planToken: string;
  readonly selectedApproachId?: string;
  readonly expectedRuntimeRevision: number;
  readonly postRunMode: 'plan';
  readonly controlId: string;
  readonly oneUseTicket: string;
}

export type PlanControlCommand = SetModeCommand | ExecutePlanCommand;

export const PLAN_CONTROL_REASON_CODES = [
  'stale_revision',
  'stale_plan',
  'unsupported_operation',
  'runtime_unavailable',
  'host_rejected',
  'policy_blocked',
  'delivery_unknown',
] as const;
export type PlanControlReasonCode = (typeof PLAN_CONTROL_REASON_CODES)[number];

export type PlanControlOutcome =
  | { readonly status: 'accepted'; readonly state: RuntimeStateDto }
  | { readonly status: 'stale'; readonly state: RuntimeStateDto }
  | {
      readonly status: 'unsupported';
      readonly reasonCode: 'unsupported_operation';
      readonly issueCode?: 'unsupported';
    }
  | {
      readonly status: 'unavailable';
      readonly reasonCode: Exclude<
        PlanControlReasonCode,
        'unsupported_operation' | 'policy_blocked' | 'delivery_unknown'
      >;
      readonly issueCode?: RuntimeIssueCode;
    }
  | {
      readonly status: 'policy_blocked';
      readonly reasonCode: 'policy_blocked';
      readonly issueCode?: 'unsupported';
    }
  | {
      readonly status: 'delivery-unknown';
      readonly reasonCode: 'delivery_unknown';
      readonly issueCode?: 'delivery-unknown';
    };

export interface PlanControlResponse {
  readonly outcome: PlanControlOutcome;
}

export type PromptAbortOutcome =
  | { readonly status: 'aborted' }
  | { readonly status: 'unavailable'; readonly reason: string }
  | { readonly status: 'delivery-unknown'; readonly reason: string };

export interface PromptAbortResponse {
  readonly outcome: PromptAbortOutcome;
}
