// ───────────────────────────────────────────────────────────────────
// MODULE: Canonical Relay Redaction
// ───────────────────────────────────────────────────────────────────

import type {
  AvailableModelDto,
  CommandCatalogDto,
  CommandDescriptorDto,
  CommandSource,
  Envelope,
  JsonObject,
  JsonValue,
  ModelPricingDto,
  RuntimeMode,
  RuntimeModelCatalogDto,
  RuntimeStateDto,
} from '@pi-remote/pi-rpc-protocol';
import {
  MODEL_AVAILABILITIES,
  MODEL_AVAILABILITY_REASON_CODES,
  isCommandCatalogDto,
  isRuntimeModelCatalogDto,
  isRuntimeStateDto,
} from '@pi-remote/pi-rpc-protocol';

const REDACTION_POLICY_VERSION = 1 as const;
const PATH_KEYS = new Set(['cwd', 'fulloutputpath', 'path', 'sessionfile', 'workspacepath']);
const SECRET_KEYS = new Set(['apikey', 'authorization', 'cookie', 'password', 'secret', 'token']);
const PRIVATE_TEXT_KEYS = new Set(['prompt']);
const SECRET_ASSIGNMENT_PATTERN =
  /\b(api[_-]?key|authorization|cookie|password|secret|token)\s*[:=]\s*[^\s,;]+/gi;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi;
const TOKEN_PATTERN = /\b(?:github_pat|ghp|sk|xox[baprs])[-_][A-Za-z0-9_-]{8,}\b/g;
const POSIX_PATH_PATTERN =
  /(?:~|\/(?:Users|home|private|tmp|var|etc|opt|usr|Volumes))\/[^\s"'<>]*/g;
const WINDOWS_PATH_PATTERN = /\b[A-Za-z]:\\(?:[^\\\s"'<>]+\\)*[^\\\s"'<>]*/g;

interface RedactionState {
  fieldsRedacted: number;
  readonly reasons: Set<string>;
}

/** Apply the only redaction policy allowed before persistence or broadcast. */
export function redactEnvelope<TPayload extends JsonValue>(envelope: Envelope<TPayload>): Envelope {
  const state: RedactionState = { fieldsRedacted: 0, reasons: new Set<string>() };
  const payload = redactValue(envelope.payload, state, '') as JsonValue;

  return {
    ...envelope,
    payload,
    redaction: {
      policyVersion: REDACTION_POLICY_VERSION,
      fieldsRedacted: state.fieldsRedacted,
      reasons: [...state.reasons].sort(),
    },
  };
}

/** Redact an arbitrary JSON value with the canonical relay policy. */
export function redactJson(value: JsonValue): JsonValue {
  const state: RedactionState = { fieldsRedacted: 0, reasons: new Set<string>() };
  return redactValue(value, state, '');
}

function redactValue(value: JsonValue, state: RedactionState, key: string): JsonValue {
  const normalizedKey = key.replaceAll(/[^A-Za-z]/g, '').toLowerCase();
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

function redactString(value: string, state: RedactionState): string {
  return replaceSensitive(value, SECRET_ASSIGNMENT_PATTERN, '[REDACTED_SECRET]', 'secret', state)
    .replace(BEARER_PATTERN, () => replacement(state, 'secret', '[REDACTED_SECRET]'))
    .replace(TOKEN_PATTERN, () => replacement(state, 'secret', '[REDACTED_SECRET]'))
    .replace(POSIX_PATH_PATTERN, () => replacement(state, 'path', '[REDACTED_PATH]'))
    .replace(WINDOWS_PATH_PATTERN, () => replacement(state, 'path', '[REDACTED_PATH]'));
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
  state.fieldsRedacted += 1;
  state.reasons.add(reason);
}

// ── Explicit safe projectors ──────────────────────────────────────────────────
// Raw pi model/command/state responses must never reach a browser DTO through the
// generic string-scanning redaction above, because unknown nested shapes could slip
// a secret or path past it. These projectors are an allowlist: they emit only the
// exact bounded fields the browser contracts declare and drop everything else, so a
// leak is structurally impossible rather than pattern-dependent.

const MODEL_CATALOG_CAP = 200;
const COMMAND_CATALOG_CAP = 500;

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

/** Project a raw pi command list into the bounded, path-free browser catalog. */
export function projectCommandCatalog(
  rawData: unknown,
  sessionId: string,
  revision: number,
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
  const dto = { sessionId, revision, commands };
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
    thinkingLevel: boundedToken(rawState.thinkingLevel, 64) ?? 'unknown',
    availableThinkingLevels: options.availableThinkingLevels
      .filter((level): level is string => boundedToken(level, 64) !== null)
      .slice(0, 32),
    mode: options.mode,
    streaming: rawState.streaming === true,
    updatedAt: options.updatedAt,
  };
  return isRuntimeStateDto(dto) ? dto : null;
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
  const name = pathFreeToken(row.name, 200);
  if (name === null) {
    return null;
  }
  const source: CommandSource =
    row.source === 'extension' || row.source === 'skill' ? row.source : 'prompt';
  return {
    name,
    description: boundedString(row.description, 2_000),
    source,
    enabled: row.enabled !== false,
    disabledReason: boundedString(row.disabledReason, 500),
    requiresConfirmation: row.requiresConfirmation === true,
  };
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

function boundedString(value: unknown, max: number): string | null {
  return typeof value === 'string' && value.length <= max ? value : null;
}

function pathFreeToken(value: unknown, max: number): string | null {
  const token = boundedToken(value, max);
  if (
    token === null ||
    token === '.' ||
    token === '..' ||
    token.includes('/') ||
    token.includes('\\') ||
    /[\u0000-\u001f\u007f-\u009f]/u.test(token)
  ) {
    return null;
  }
  return token;
}

function safeDisplayString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const sanitized = value
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
