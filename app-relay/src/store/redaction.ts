// ───────────────────────────────────────────────────────────────────
// MODULE: Canonical Relay Redaction
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type {
  AskQuestionDisplayDto,
  AvailableModelDto,
  CommandCatalogDto,
  CommandDescriptorDto,
  CommandSource,
  Envelope,
  JsonObject,
  JsonValue,
  ModelPricingDto,
  PlanSnapshotDto,
  RedactionMetadata,
  RuntimeMode,
  RuntimeModelCatalogDto,
  RuntimeSnapshotDto,
  RuntimeStateDto,
  TodoProjectionDeltaV1,
  TodoProjectionV1,
  TodoTaskProjectionV1,
} from '@pi-remote/pi-rpc-protocol';
import {
  isAskQuestionPresentedEvent,
  isAskQuestionDisplayDto,
  MODEL_AVAILABILITIES,
  MODEL_AVAILABILITY_REASON_CODES,
  isCommandCatalogDto,
  isPlanSnapshotDto,
  isRuntimeModelCatalogDto,
  isRuntimeSnapshotDto,
  isRuntimeStateDto,
  isTodoProjectionDeltaV1,
  isTodoProjectionEnvelopeKind,
  isTodoProjectionV1,
  isTodoTaskProjectionV1,
} from '@pi-remote/pi-rpc-protocol';

import type { ParsedPlanArtifact } from '../runtime/plan-status.js';
import { allowlistRedactedAttachmentBlock } from '../attachments/attachment-transcript-projector.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const REDACTION_POLICY_VERSION = 1 as const;
const PATH_KEYS = new Set(['cwd', 'fulloutputpath', 'path', 'sessionfile', 'workspacepath']);
const SECRET_KEYS = new Set([
  'apikey',
  'authorization',
  'cookie',
  'password',
  'secret',
  'token',
  // Any spelling of the opaque plan binding key is a secret until proven otherwise.
  'plantoken',
]);
const PRIVATE_TEXT_KEYS = new Set(['prompt']);
const MEDIA_FORBIDDEN_KEYS = new Set([
  'base64',
  'pixels',
  'thumbnail',
  'filename',
  'hash',
  'url',
  'exif',
  'ocr',
  'generatedcaption',
  'providerpayload',
  'decodererror',
]);
const SECRET_ASSIGNMENT_PATTERN =
  /\b(api[_-]?key|authorization|cookie|password|secret|token)\s*[:=]\s*[^\s,;]+/gi;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi;
const TOKEN_PATTERN = /\b(?:github_pat|ghp|sk|xox[baprs])[-_][A-Za-z0-9_-]{8,}\b/g;
const URL_CREDENTIAL_PATTERN = /\bhttps?:\/\/[^/\s:@]+:[^@\s/]+@[^\s"'<>]+/gi;
const POSIX_PATH_PATTERN =
  /(?:~|\/(?:Users|home|private|tmp|var|etc|opt|usr|Volumes))\/[^\s"'<>]*/g;
const WINDOWS_PATH_PATTERN = /\b[A-Za-z]:\\(?:[^\\\s"'<>]+\\)*[^\\\s"'<>]*/g;
// Control and bidi characters are removed before any text reaches a DTO.
const CONTROL_OR_BIDI_PATTERN =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu;
const TOOL_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/u;
const REDACTION_MAX_FIELDS = 10_000;

// ───────────────────────────────────────────────────────────────────
// 3. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface RedactionState {
  fieldsRedacted: number;
  readonly reasons: Set<string>;
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/** Apply the only redaction policy allowed before persistence or broadcast. */
export function redactEnvelope<TPayload extends JsonValue>(envelope: Envelope<TPayload>): Envelope {
  if (isAskQuestionDisplayCarrier(envelope.payload)) {
    throw new TypeError('Ask-question display content requires the authenticated volatile read.');
  }
  const state: RedactionState = { fieldsRedacted: 0, reasons: new Set<string>() };
  let payload = redactPayloadForKind(envelope.payload, state, envelope.kind);
  const redaction: RedactionMetadata = {
    policyVersion: REDACTION_POLICY_VERSION,
    fieldsRedacted: state.fieldsRedacted,
    reasons: [...state.reasons].sort(),
  };
  payload = attachTranscriptRedaction(payload, redaction);

  return {
    ...envelope,
    payload,
    redaction,
  };
}

// ───────────────────────────────────────────────────────────────────
// 5. HELPERS
// ───────────────────────────────────────────────────────────────────

function isAskQuestionDisplayCarrier(value: JsonValue): boolean {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, JsonValue>;
  return (
    (record.type === 'session.ask-question.presented' || record.kind === 'ask-question') &&
    'display' in record
  );
}

/** Redact an arbitrary JSON value with the canonical relay policy. */
export function redactJson(value: JsonValue): JsonValue {
  const state: RedactionState = { fieldsRedacted: 0, reasons: new Set<string>() };
  return redactPayload(value, state);
}

/** Describe redaction in safe marker-only form for diagnostics and error text. */
export function redactionMarkerText(metadata: RedactionMetadata): string {
  const markers: Record<string, string> = {
    control: '[REDACTED_CONTROL]',
    'private-text': '[REDACTED_PRIVATE_TEXT]',
    path: '[REDACTED_PATH]',
    secret: '[REDACTED_SECRET]',
    'tool-name': '[REDACTED_TOOL]',
  };
  return metadata.reasons.map((reason) => markers[reason] ?? '[REDACTED]').join(' ');
}

function redactValue(value: JsonValue, state: RedactionState, key: string): JsonValue {
  const normalizedKey = key.replaceAll(/[^A-Za-z]/g, '').toLowerCase();
  if (isAttachmentPayload(value)) {
    const projected = allowlistRedactedAttachmentBlock(value);
    if (projected !== null) return projected;
    markRedaction(state, 'image-content');
    return null;
  }
  if (isImageContent(value)) {
    markRedaction(state, 'image-content');
    return null;
  }
  if (MEDIA_FORBIDDEN_KEYS.has(normalizedKey)) {
    markRedaction(state, 'image-content');
    return null;
  }
  if (PATH_KEYS.has(normalizedKey)) {
    markRedaction(state, 'path');
    return '[REDACTED_PATH]';
  }
  if (SECRET_KEYS.has(normalizedKey)) {
    markRedaction(state, 'secret');
    return '[REDACTED_SECRET]';
  }
  if (PRIVATE_TEXT_KEYS.has(normalizedKey)) {
    markRedaction(state, 'private-text');
    return '[REDACTED_PRIVATE_TEXT]';
  }
  if (normalizedKey === 'toolname' && typeof value === 'string') {
    if (TOOL_NAME_PATTERN.test(value) || value === '[REDACTED_TOOL]') return value;
    markRedaction(state, 'tool-name');
    return '[REDACTED_TOOL]';
  }
  if (typeof value === 'string') {
    return redactString(value, state);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, state, ''));
  }
  if (value !== null && typeof value === 'object') {
    const redacted: Record<string, JsonValue> = {};
    for (const [childKey, childValue] of Object.entries(value as JsonObject)) {
      if (childValue !== undefined) {
        redacted[childKey] = redactValue(childValue, state, childKey);
      }
    }
    return redacted;
  }
  return value;
}

function redactPayload(value: JsonValue, state: RedactionState): JsonValue {
  return redactPayloadForKind(value, state, null);
}

function redactPayloadForKind(
  value: JsonValue,
  state: RedactionState,
  kind: string | null,
): JsonValue {
  if (kind !== null && isTodoProjectionEnvelopeKind(kind)) {
    return redactTodoProjectionPayload(value, state, kind);
  }
  if (isAttachmentPayload(value)) {
    const projected = allowlistRedactedAttachmentBlock(value);
    if (projected !== null) return projected;
    markRedaction(state, 'image-content');
    return null;
  }
  return redactValue(value, state, '');
}

function redactTodoProjectionPayload(
  value: JsonValue,
  state: RedactionState,
  kind: 'todo.snapshot.v1' | 'todo.delta.v1',
): TodoProjectionV1 | TodoProjectionDeltaV1 {
  if (kind === 'todo.snapshot.v1') {
    if (!isPlainObject(value) || !hasExactKeys(value, ['planId', 'source', 'revision', 'updatedAt', 'tasks'])) {
      throw new TypeError('Relay refused a malformed todo snapshot projection.');
    }
    if (!Array.isArray(value.tasks)) {
      throw new TypeError('Relay refused a malformed todo snapshot projection.');
    }
    const projected = {
      planId: value.planId,
      source: value.source,
      revision: value.revision,
      updatedAt: value.updatedAt,
      tasks: value.tasks.map((task) => redactTodoTaskPayload(task as JsonValue, state)),
    } as unknown as TodoProjectionV1;
    if (!isTodoProjectionV1(projected)) {
      throw new TypeError('Relay refused a malformed todo snapshot projection.');
    }
    return projected;
  }

  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      'planId',
      'baseRevision',
      'revision',
      'upsertedTasks',
      'removedTaskIds',
      'updatedAt',
    ]) ||
    !Array.isArray(value.upsertedTasks) ||
    !Array.isArray(value.removedTaskIds)
  ) {
    throw new TypeError('Relay refused a malformed todo delta projection.');
  }
  const projected = {
    planId: value.planId,
    baseRevision: value.baseRevision,
    revision: value.revision,
    upsertedTasks: value.upsertedTasks.map((task) => redactTodoTaskPayload(task as JsonValue, state)),
    removedTaskIds: value.removedTaskIds,
    updatedAt: value.updatedAt,
  } as unknown as TodoProjectionDeltaV1;
  if (!isTodoProjectionDeltaV1(projected)) {
    throw new TypeError('Relay refused a malformed todo delta projection.');
  }
  return projected;
}

function redactTodoTaskPayload(value: JsonValue, state: RedactionState): TodoTaskProjectionV1 {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, ['id', 'title', 'state', 'group', 'order', 'revision', 'updatedAt'])
  ) {
    throw new TypeError('Relay refused a malformed todo task projection.');
  }
  const projected = {
    id: value.id,
    title: redactValue(value.title as JsonValue, state, 'title'),
    state: value.state,
    group: value.group === null ? null : redactValue(value.group as JsonValue, state, 'group'),
    order: value.order,
    revision: value.revision,
    updatedAt: value.updatedAt,
  } as unknown as TodoTaskProjectionV1;
  if (!isTodoTaskProjectionV1(projected)) {
    throw new TypeError('Relay refused a malformed todo task projection.');
  }
  return projected;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));
}

function isAttachmentPayload(value: JsonValue): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (value as JsonObject).kind === 'attachment'
  );
}

function isImageContent(value: JsonValue): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (value as JsonObject).type === 'image'
  );
}

function redactString(value: string, state: RedactionState): string {
  return replaceSensitive(value, SECRET_ASSIGNMENT_PATTERN, '[REDACTED_SECRET]', 'secret', state)
    .replace(BEARER_PATTERN, () => replacement(state, 'secret', '[REDACTED_SECRET]'))
    .replace(TOKEN_PATTERN, () => replacement(state, 'secret', '[REDACTED_SECRET]'))
    .replace(URL_CREDENTIAL_PATTERN, () => replacement(state, 'secret', '[REDACTED_SECRET]'))
    .replace(POSIX_PATH_PATTERN, () => replacement(state, 'path', '[REDACTED_PATH]'))
    .replace(WINDOWS_PATH_PATTERN, () => replacement(state, 'path', '[REDACTED_PATH]'))
    .replace(CONTROL_OR_BIDI_PATTERN, () => replacement(state, 'control', '[REDACTED_CONTROL]'));
}

function replaceSensitive(
  value: string,
  pattern: RegExp,
  redacted: string,
  reason: string,
  state: RedactionState,
): string {
  return value.replace(pattern, () => replacement(state, reason, redacted));
}

function replacement(state: RedactionState, reason: string, value: string): string {
  markRedaction(state, reason);
  return value;
}

function markRedaction(state: RedactionState, reason: string): void {
  state.fieldsRedacted = Math.min(state.fieldsRedacted + 1, REDACTION_MAX_FIELDS);
  state.reasons.add(reason);
}

function attachTranscriptRedaction(value: JsonValue, redaction: JsonValue): JsonValue {
  if (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    ((value as JsonObject).kind === 'tool_call' ||
      (value as JsonObject).kind === 'tool_result' ||
      (value as JsonObject).kind === 'text_artifact')
  ) {
    return { ...(value as JsonObject), redaction };
  }
  return value;
}

// ── Explicit safe projectors ──────────────────────────────────────────────────
// Pi responses need allowlist projectors—generic redaction cannot block unknown nested leaks.

const MODEL_CATALOG_CAP = 200;
const COMMAND_CATALOG_CAP = 500;
const COMMAND_ALIAS_CAP = 16;
// Legacy projector callers use placeholder host epoch; command service passes live epoch.
const DEFAULT_COMMAND_HOST_EPOCH = 'epoch_host_local';

/** Project only the bounded display fields for the authenticated volatile read. */
export function projectAskQuestionDisplay(rawData: unknown): AskQuestionDisplayDto | null {
  if (!isAskQuestionPresentedEvent(rawData)) return null;
  const display = rawData.display;
  const projectedDisplay = {
    prompt: display.prompt,
    options: display.options.map((option) => ({
      id: option.id,
      label: option.label,
      ...(option.description === undefined ? {} : { description: option.description }),
    })),
    freeText: {
      allowed: display.freeText.allowed,
      required: display.freeText.required,
      ...(display.freeText.placeholder === undefined
        ? {}
        : { placeholder: display.freeText.placeholder }),
      ...(display.freeText.maxLength === undefined
        ? {}
        : { maxLength: display.freeText.maxLength }),
    },
    ...(display.minSelections === undefined ? {} : { minSelections: display.minSelections }),
    ...(display.maxSelections === undefined ? {} : { maxSelections: display.maxSelections }),
  };
  const projected: AskQuestionDisplayDto = {
    type: 'session.ask-question.display',
    sessionId: rawData.sessionId,
    questionId: rawData.questionId,
    activityId: rawData.activityId,
    revision: rawData.revision,
    display: projectedDisplay,
    selectionMode: rawData.selectionMode,
    redaction: {
      applied: true,
      policyVersion: rawData.redaction.policyVersion,
      contentAvailability: rawData.redaction.contentAvailability,
      redactedFields: [...rawData.redaction.redactedFields],
    },
    requiresReadOnlyHint: rawData.requiresReadOnlyHint,
  };
  return isAskQuestionDisplayDto(projected) ? projected : null;
}

/** Project a raw pi model list into the bounded, path-free browser catalog. */
export function projectRuntimeModelCatalog(
  rawData: unknown,
  options: {
    readonly sessionId: string;
    readonly catalogRevision: number;
    readonly runtimeRevision: number;
    readonly currentModel: AvailableModelDto | null;
    readonly streaming: boolean;
  },
): RuntimeModelCatalogDto | null {
  const rows = extractRows(rawData, 'models');
  if (rows === null) {
    return null;
  }
  const models: AvailableModelDto[] = [];
  for (const row of rows) {
    if (models.length >= MODEL_CATALOG_CAP) {
      break;
    }
    const model = projectAvailableModel(row);
    if (model !== null) {
      models.push(model);
    }
  }
  const dto = {
    sessionId: options.sessionId,
    catalogRevision: options.catalogRevision,
    runtimeRevision: options.runtimeRevision,
    currentModel: options.currentModel,
    streaming: options.streaming,
    canSetModelWhileStreaming: isPlainObject(rawData) && rawData.canSetModelWhileStreaming === true,
    models,
  };
  return isRuntimeModelCatalogDto(dto) ? dto : null;
}

/** Project pi command list into bounded catalog; legacy callers use placeholder host epoch. */
export function projectCommandCatalog(
  rawData: unknown,
  sessionId: string,
  revision: number,
  options: { readonly hostEpoch?: string; readonly sessionRevision?: number } = {},
): CommandCatalogDto | null {
  const rows = extractRows(rawData, 'commands');
  if (rows === null) {
    return null;
  }
  const commands: CommandDescriptorDto[] = [];
  for (const row of rows) {
    if (commands.length >= COMMAND_CATALOG_CAP) {
      break;
    }
    const descriptor = projectCommandDescriptor(row);
    if (descriptor !== null) {
      commands.push(descriptor);
    }
  }
  const dto: CommandCatalogDto = {
    hostEpoch: options.hostEpoch ?? DEFAULT_COMMAND_HOST_EPOCH,
    sessionId,
    sessionRevision: options.sessionRevision ?? 0,
    catalogRevision: revision,
    commands,
  };
  return isCommandCatalogDto(dto) ? dto : null;
}

/** Project raw pi `get_state` data into the bounded browser runtime state. */
export function projectRuntimeState(
  rawState: unknown,
  options: {
    readonly sessionId: string;
    readonly revision: number;
    readonly mode: RuntimeMode;
    readonly availableThinkingLevels: readonly string[];
    readonly updatedAt: string;
    readonly plan?: PlanSnapshotDto;
  },
): RuntimeStateDto | null {
  if (!isPlainObject(rawState)) {
    return null;
  }
  const model = projectAvailableModel(rawState.model);
  const dto: RuntimeStateDto = {
    sessionId: options.sessionId,
    revision: options.revision,
    model,
    thinkingLevel: runtimeLevelToken(rawState.thinkingLevel) ?? 'unknown',
    availableThinkingLevels: options.availableThinkingLevels
      .filter((level): level is string => runtimeLevelToken(level) !== null)
      .slice(0, 32),
    mode: options.mode,
    streaming: rawState.streaming === true,
    updatedAt: options.updatedAt,
    ...(options.plan === undefined ? {} : { plan: options.plan }),
  };
  return isRuntimeStateDto(dto) ? dto : null;
}

/** Project Pi's advertised thinking-level order without inventing client levels. */
export function projectRuntimeThinkingLevels(rawData: unknown): readonly string[] | null {
  const rows = extractRows(rawData, 'levels');
  if (rows === null) return null;
  return rows.filter((level): level is string => runtimeLevelToken(level) !== null).slice(0, 32);
}

/** Project the three Pi reads into one session-bound, browser-safe snapshot. */
export function projectRuntimeSnapshot(
  rawState: unknown,
  rawLevels: unknown,
  rawModels: unknown,
  options: {
    readonly sessionId: string;
    readonly revision: number;
    readonly catalogRevision: number;
    readonly mode: RuntimeMode;
    readonly updatedAt: string;
    readonly plan?: PlanSnapshotDto;
  },
): RuntimeSnapshotDto | null {
  const availableThinkingLevels = projectRuntimeThinkingLevels(rawLevels);
  if (availableThinkingLevels === null) return null;
  const state = projectRuntimeState(rawState, {
    sessionId: options.sessionId,
    revision: options.revision,
    mode: options.mode,
    availableThinkingLevels,
    updatedAt: options.updatedAt,
    ...(options.plan === undefined ? {} : { plan: options.plan }),
  });
  if (state === null) return null;
  const models = projectRuntimeModelCatalog(rawModels, {
    sessionId: options.sessionId,
    catalogRevision: options.catalogRevision,
    runtimeRevision: options.revision,
    currentModel: state.model,
    streaming: state.streaming,
  });
  if (models === null) return null;
  const snapshot = { sessionId: options.sessionId, state, models };
  return isRuntimeSnapshotDto(snapshot) ? snapshot : null;
}

/** Token-free plan snapshot; opaque binding never crosses this projector. */
export function projectPlanSnapshot(
  parsed: ParsedPlanArtifact | null,
  occurredAt: string,
): PlanSnapshotDto {
  if (parsed === null) {
    return { planId: null, planRevision: 0, validity: 'none', artifact: null };
  }
  const snapshot: PlanSnapshotDto = {
    planId: parsed.planId,
    planRevision: parsed.planRevision,
    validity: parsed.validity,
    artifact: {
      planId: parsed.planId,
      planRevision: parsed.planRevision,
      title: parsed.title,
      summary: parsed.summary,
      stepCount: parsed.stepCount,
      approachCount: parsed.approachCount,
      validity: parsed.validity,
      occurredAt,
    },
  };
  return isPlanSnapshotDto(snapshot)
    ? snapshot
    : { planId: null, planRevision: 0, validity: 'none', artifact: null };
}

/** Control-plane plan projection residue; suppressed before persistence or broadcast. */
export function isControlPlaneProjection(payload: unknown): boolean {
  if (
    !isPlainObject(payload) ||
    payload.kind !== 'plan' ||
    !Array.isArray(payload.items) ||
    payload.items.length !== 1 ||
    !isPlainObject(payload.items[0]) ||
    payload.items[0].done !== false
  ) {
    return false;
  }
  const text = payload.items[0].text;
  return typeof text === 'string' && /^Extension requested (?:setStatus|setPlan)$/.test(text);
}

/** Project a model label bounded to the session card's 128-char cap. */
export function projectSessionCardModelLabel(model: AvailableModelDto): string | null {
  return safeDisplayString(model.label, 128);
}

export function projectAvailableModel(row: unknown): AvailableModelDto | null {
  if (!isPlainObject(row)) {
    return null;
  }
  const provider = pathFreeToken(row.provider, 200);
  const id = pathFreeToken(row.id, 200);
  if (provider === null || id === null) {
    return null;
  }
  const label = safeDisplayString(row.label, 200) ?? id;
  const availability = enumValue(row.availability, MODEL_AVAILABILITIES);
  const availabilityReasonCode = enumValue(
    row.availabilityReasonCode,
    MODEL_AVAILABILITY_REASON_CODES,
  );
  const rawInput = Array.isArray(row.input) ? row.input : undefined;
  const input = rawInput
    ? [...new Set(rawInput.filter((kind) => kind === 'text' || kind === 'image'))].slice(0, 2)
    : undefined;
  const pricing = projectPricing(row.pricing);
  const contextWindow = boundedPositiveInteger(row.contextWindow);
  const maxTokens = boundedPositiveInteger(row.maxTokens);
  return {
    provider,
    id,
    label,
    ...(typeof row.reasoning === 'boolean' ? { reasoning: row.reasoning } : {}),
    ...(input !== undefined && input.length === rawInput?.length ? { input } : {}),
    ...(contextWindow === null ? {} : { contextWindow }),
    ...(maxTokens === null ? {} : { maxTokens }),
    ...(typeof row.tools === 'boolean' ? { tools: row.tools } : {}),
    ...(availability === null ? {} : { availability }),
    ...(availabilityReasonCode === null ? {} : { availabilityReasonCode }),
    ...(pricing === null ? {} : { pricing }),
  };
}

function projectCommandDescriptor(row: unknown): CommandDescriptorDto | null {
  if (!isPlainObject(row)) {
    return null;
  }
  const name = canonicalCommandName(row.name);
  if (name === null) {
    return null;
  }
  const source: CommandSource =
    row.source === 'extension' || row.source === 'skill' ? row.source : 'prompt';
  const aliases = projectAliases(row.aliases);
  const argumentHint =
    row.argumentHint === undefined ? undefined : safeDisplayString(row.argumentHint, 500);
  return {
    name,
    description: safeDisplayString(row.description, 2_000),
    source,
    enabled: row.enabled !== false,
    disabledReason: safeDisplayString(row.disabledReason, 500),
    requiresConfirmation: row.requiresConfirmation === true,
    ...(aliases === null ? {} : { aliases }),
    ...(argumentHint === null || argumentHint === undefined ? {} : { argumentHint }),
  };
}

/** Keep only canonical, unique aliases; drop the field when none survive. */
function projectAliases(value: unknown): readonly string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const aliases: string[] = [];
  for (const alias of value) {
    if (aliases.length >= COMMAND_ALIAS_CAP) {
      break;
    }
    const name = canonicalCommandName(alias);
    if (name !== null && !aliases.includes(name)) {
      aliases.push(name);
    }
  }
  return aliases.length === 0 ? null : aliases;
}

/** One canonical command token: no leading slash, whitespace, path, or control/bidi characters. */
function canonicalCommandName(value: unknown): string | null {
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 200 &&
    /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/u.test(value)
    ? value
    : null;
}

function extractRows(data: unknown, key: string): unknown[] | null {
  if (Array.isArray(data)) {
    return data;
  }
  if (isPlainObject(data) && Array.isArray(data[key])) {
    return data[key] as unknown[];
  }
  return null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedToken(value: unknown, max: number): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= max ? value : null;
}

function runtimeLevelToken(value: unknown): string | null {
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 64 &&
    /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/u.test(value)
    ? value
    : null;
}

function pathFreeToken(value: unknown, max: number): string | null {
  const token = boundedToken(value, max);
  if (
    token === null ||
    token === '.' ||
    token === '..' ||
    token.includes('/') ||
    token.includes('\\') ||
    // eslint-disable-next-line no-control-regex
    /[\u0000-\u001f\u007f-\u009f]/u.test(token)
  ) {
    return null;
  }
  return token;
}

function safeDisplayString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const sanitized = value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu, '')
    .trim();
  if (
    sanitized.length === 0 ||
    sanitized.length > max ||
    /(?:https?|file):\/\/|(?:^|\s)\/(?:Users|home|private|tmp|var|etc|opt|usr|Volumes)\/|\b[A-Za-z]:\\|\b(?:api[_-]?key|authorization|cookie|password|secret|token)\s*[:=]|\bBearer\s+/iu.test(
      sanitized,
    )
  ) {
    return null;
  }
  return sanitized;
}

function boundedPositiveInteger(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= 1_000_000_000
    ? value
    : null;
}

function boundedNonNegativeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1_000_000_000
    ? value
    : null;
}

function enumValue<T extends string>(value: unknown, values: readonly T[]): T | null {
  return typeof value === 'string' && values.includes(value as T) ? (value as T) : null;
}

function projectPricing(value: unknown): ModelPricingDto | null {
  if (!isPlainObject(value)) return null;
  const currency = pathFreeToken(value.currency, 12);
  if (currency === null || !/^[A-Z]{3}$/.test(currency)) return null;
  const inputPerMillion = boundedNonNegativeNumber(value.inputPerMillion);
  const outputPerMillion = boundedNonNegativeNumber(value.outputPerMillion);
  return {
    currency,
    ...(inputPerMillion === null ? {} : { inputPerMillion }),
    ...(outputPerMillion === null ? {} : { outputPerMillion }),
  };
}
