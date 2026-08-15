// ───────────────────────────────────────────────────────────────────
// MODULE: Canonical Relay Redaction
// ───────────────────────────────────────────────────────────────────

import type { Envelope, JsonObject, JsonValue } from '@pi-remote/pi-rpc-protocol';

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
