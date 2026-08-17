// ───────────────────────────────────────────────────────────────────
// MODULE: Fail-closed Artifact Snapshot Sanitizer
// ───────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';

import {
  FILE_PREVIEW_AVAILABILITIES,
  FILE_PREVIEW_COMPLETENESS_STATES,
  FILE_PREVIEW_REDACTION_STATES,
  FILE_PREVIEW_RENDERERS,
  isOpaqueId,
  type FilePreviewAvailability,
  type FilePreviewCompleteness,
  type FilePreviewDescriptor,
  type FilePreviewRedaction,
  type FilePreviewRenderer,
} from '@pi-remote/pi-rpc-protocol';

import { redactJson } from './redaction.js';

const MAX_TEXT_BYTES = 2 * 1024 * 1024;
const MAX_INLINE_TEXT_BYTES = 256 * 1024;
const MAX_DISPLAY_NAME = 200;
const MAX_ALT_TEXT = 500;
const MAX_LANGUAGE = 64;
const MAX_THUMBNAIL_REF = 200;
const MAX_PAGE_COUNT = 500;
const MIME_PATTERN = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/u;
const OPAQUE_REVISION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

export interface SanitizedArtifactSnapshot {
  readonly descriptor: FilePreviewDescriptor;
  readonly bytes: Buffer | null;
  readonly retentionMs?: number;
  readonly expiresAt?: string;
}

/** Return only a snapshot carrying an explicit relay allowlist marker. */
export function getAllowlistedArtifactSnapshot(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const candidates = [value.artifactSnapshot, value.snapshot, value.result, value.details, value];
  for (const candidate of candidates) {
    if (!isRecord(candidate)) continue;
    const nestedCandidates = [candidate.artifactSnapshot, candidate.snapshot, candidate];
    for (const nested of nestedCandidates) {
      if (!isRecord(nested)) continue;
      if (
        nested.approved !== true &&
        nested.allowlisted !== true &&
        nested.source !== 'relay-allowlisted'
      ) {
        continue;
      }
      const snapshot = isRecord(nested.snapshot) ? nested.snapshot : nested;
      if (!isOpaqueId(snapshot.artifactId) || !isArtifactRevision(snapshot.revision)) continue;
      return snapshot;
    }
  }
  return null;
}

export function isAllowlistedArtifactSnapshot(value: unknown): boolean {
  return getAllowlistedArtifactSnapshot(value) !== null;
}

/** Project only bounded metadata and text from an explicitly approved snapshot. */
export function sanitizeArtifactSnapshot(value: unknown): SanitizedArtifactSnapshot | null {
  const snapshot = getAllowlistedArtifactSnapshot(value);
  if (snapshot === null) return null;

  const artifactId = snapshot.artifactId as string;
  const revision = snapshot.revision as string;
  const displayName = safeDisplayName(snapshot.displayName) ?? 'File preview';
  const requestedRenderer = enumValue(snapshot.renderer, FILE_PREVIEW_RENDERERS);
  const safeMime = safeMimeType(snapshot.mimeType);
  let renderer: FilePreviewRenderer = requestedRenderer ?? 'unsupported';
  let mimeType = safeMime ?? 'application/octet-stream';
  let availability: FilePreviewAvailability | undefined =
    enumValue(snapshot.availability, FILE_PREVIEW_AVAILABILITIES) ?? undefined;
  let redaction = enumValue(snapshot.redaction, FILE_PREVIEW_REDACTION_STATES) ?? 'applied';
  let completeness = enumValue(snapshot.completeness, FILE_PREVIEW_COMPLETENESS_STATES) ?? 'complete';
  let bytes: Buffer | null = null;
  let inlineText: string | null = null;

  if (requestedRenderer === null || safeMime === null || !mimeCompatible(mimeType, renderer)) {
    renderer = 'unsupported';
    availability = 'unsupported';
  }

  const rawText = textSource(snapshot);
  const binaryRenderer = renderer === 'image' || renderer === 'pdf';
  const textRenderer = renderer === 'text' || renderer === 'code' || renderer === 'diff';

  if (availability === undefined) {
    availability = rawText !== null && textRenderer ? 'ready' : renderer === 'unsupported' ? 'unsupported' : 'missing';
  }

  // Image and PDF bytes are not admitted until a sanitizer can attest to their format.
  if (binaryRenderer && (availability === 'ready' || availability === 'missing')) {
    availability = 'withheld';
  }
  if (renderer === 'unsupported') availability = 'unsupported';

  if (availability === 'ready' && textRenderer && rawText !== null) {
    const projected = redactJson(rawText);
    const sanitizedText = typeof projected === 'string' ? projected : '';
    if (sanitizedText !== rawText) redaction = 'applied';
    const bounded = boundText(sanitizedText);
    bytes = Buffer.from(bounded.text, 'utf8');
    if (bounded.truncated) completeness = 'excerpt';
    if (snapshot.inlineText === true && bytes.byteLength <= MAX_INLINE_TEXT_BYTES) {
      inlineText = bytes.toString('utf8');
    }
  } else if (availability === 'ready') {
    availability = rawText === null ? 'missing' : 'withheld';
  }

  if (availability !== 'ready') {
    bytes = null;
    inlineText = null;
    redaction = availability === 'missing' || availability === 'unsupported' ? redaction : 'withheld';
  }

  const safeLanguage = safeToken(snapshot.language, MAX_LANGUAGE);
  const safeAltText = safeDisplayString(snapshot.altText, MAX_ALT_TEXT);
  const safeThumbnailRef = safeToken(snapshot.thumbnailRef, MAX_THUMBNAIL_REF);
  const pageCount = boundedPageCount(snapshot.pageCount);
  const textLayerSafe = renderer === 'pdf' && typeof snapshot.textLayerSafe === 'boolean'
    ? snapshot.textLayerSafe
    : undefined;
  const digest = digestBytes(bytes ?? Buffer.alloc(0));
  const firstLine = boundedFirstLine(snapshot.firstLine);
  const descriptor: FilePreviewDescriptor = {
    kind: 'file_preview',
    artifactId,
    revision,
    displayName,
    renderer,
    mimeType,
    byteLength: bytes === null ? null : bytes.byteLength,
    digest,
    ...(safeLanguage === null ? {} : { language: safeLanguage }),
    ...(pageCount === null || renderer !== 'pdf' ? {} : { pageCount }),
    ...(safeAltText === null ? {} : { altText: safeAltText }),
    redaction,
    completeness,
    shareAllowed:
      availability === 'ready' && snapshot.shareAllowed === true && redaction !== 'withheld',
    ...(textLayerSafe === undefined ? {} : { textLayerSafe }),
    ...(safeThumbnailRef === null ? {} : { thumbnailRef: safeThumbnailRef }),
    availability,
    content:
      availability !== 'ready'
        ? { kind: 'none' }
        : inlineText === null
          ? { kind: 'artifact-ref' }
          : {
              kind: 'inline-text',
              text: inlineText,
              ...(firstLine === null ? {} : { firstLine }),
            },
  };

  const retentionMs = boundedRetention(snapshot.retentionMs);
  const expiresAt = safeExpiry(snapshot.expiresAt);
  return {
    descriptor,
    bytes,
    ...(retentionMs === null ? {} : { retentionMs }),
    ...(expiresAt === null ? {} : { expiresAt }),
  };
}

/** Alias used by projection callers to make the publication boundary explicit. */
export const projectArtifactSnapshot = sanitizeArtifactSnapshot;

function textSource(snapshot: Record<string, unknown>): string | null {
  if (typeof snapshot.text === 'string') return snapshot.text;
  if (typeof snapshot.content === 'string') return snapshot.content;
  if (typeof snapshot.bytes === 'string') return snapshot.bytes;
  if (snapshot.bytes instanceof Uint8Array) return Buffer.from(snapshot.bytes).toString('utf8');
  return null;
}

function boundText(value: string): { readonly text: string; readonly truncated: boolean } {
  const source = Buffer.from(value, 'utf8');
  if (source.byteLength <= MAX_TEXT_BYTES) return { text: value, truncated: false };
  let text = source.subarray(0, MAX_TEXT_BYTES).toString('utf8');
  while (Buffer.byteLength(text, 'utf8') > MAX_TEXT_BYTES) text = text.slice(0, -1);
  return { text, truncated: true };
}

function safeDisplayName(value: unknown): string | null {
  return safeDisplayString(value, MAX_DISPLAY_NAME, true);
}

function safeDisplayString(value: unknown, maximum: number, basename = false): string | null {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > maximum ||
    /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(value) ||
    /(?:https?|file):\/\/|(?:^|\s)\/(?:Users|home|private|tmp|var|etc|opt|usr|Volumes)\/|\b[A-Za-z]:\\|\b(?:api[_-]?key|authorization|cookie|password|secret|token)\s*[:=]|\bBearer\s+/iu.test(
      value,
    )
  ) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || (basename && (trimmed.includes('/') || trimmed.includes('\\')))) {
    return null;
  }
  return trimmed;
}

function safeMimeType(value: unknown): string | null {
  return typeof value === 'string' && value.length <= 127 && MIME_PATTERN.test(value) ? value : null;
}

function safeToken(value: unknown, maximum: number): string | null {
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maximum &&
    value !== '.' &&
    value !== '..' &&
    !value.includes('/') &&
    !value.includes('\\') &&
    !/[\u0000-\u001f\u007f-\u009f]/u.test(value)
    ? value
    : null;
}

function boundedPageCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= MAX_PAGE_COUNT
    ? value
    : null;
}

function boundedFirstLine(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= 20_000
    ? value
    : null;
}

function boundedRetention(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? Math.min(value, 7 * 24 * 60 * 60 * 1_000)
    : null;
}

function safeExpiry(value: unknown): string | null {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null;
}

function enumValue<T extends string>(value: unknown, values: readonly T[]): T | null {
  return typeof value === 'string' && values.includes(value as T) ? (value as T) : null;
}

function mimeCompatible(mimeType: string, renderer: FilePreviewRenderer): boolean {
  if (renderer === 'image') return mimeType.startsWith('image/');
  if (renderer === 'pdf') return mimeType === 'application/pdf';
  if (renderer === 'unsupported') return true;
  return (
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/javascript' ||
    mimeType === 'application/typescript' ||
    mimeType === 'application/x-diff'
  );
}

function isArtifactRevision(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value !== 'latest' &&
    value !== '.' &&
    value !== '..' &&
    OPAQUE_REVISION_PATTERN.test(value)
  );
}

function digestBytes(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
