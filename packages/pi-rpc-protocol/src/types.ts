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
  | GetEntriesCommand;

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
