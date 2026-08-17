// ───────────────────────────────────────────────────────────────────
// MODULE: Fail-closed Artifact Snapshot Sanitizer
// ───────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';
import { deflateSync, inflateSync } from 'node:zlib';

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
const MAX_BINARY_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 8_192;
const MAX_IMAGE_PIXELS = 16_000_000;
const MAX_THUMBNAIL_DIMENSION = 512;
const MIME_PATTERN = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/u;
const OPAQUE_REVISION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const PDF_ACTIVE_NAME_PATTERN =
  /\/(?:AA|AcroForm|EmbeddedFile|EmbeddedFiles|Filespec|GoToR|ImportData|JavaScript|JS|Launch|Movie|Named|OpenAction|RichMedia|Sound|SubmitForm|URI|XFA)\b/iu;
const PDF_UNSAFE_ANNOTATION_PATTERN = /\/(?:Annots|Annot|Link|Widget|3D)\b/iu;
const PDF_METADATA_NAME_PATTERN = /\/(?:Metadata|PieceInfo)\b/iu;

interface SanitizedRaster {
  readonly bytes: Buffer;
  readonly thumbnailRef: string;
}

interface SanitizedPdf {
  readonly bytes: Buffer;
  readonly pageCount: number | null;
  readonly textLayerSafe: boolean;
}

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
  let thumbnailRef: string | null = null;
  let verifiedTextLayerSafe: boolean | undefined;

  if (requestedRenderer === null || safeMime === null || !mimeCompatible(mimeType, renderer)) {
    renderer = 'unsupported';
    availability = 'unsupported';
  }
  if (renderer === 'image' && mimeType !== 'image/png') {
    renderer = 'unsupported';
    availability = 'unsupported';
  }

  const rawText = textSource(snapshot);
  const binaryRenderer = renderer === 'image' || renderer === 'pdf';
  const textRenderer = renderer === 'text' || renderer === 'code' || renderer === 'diff';

  if (availability === undefined) {
    availability = rawText !== null && textRenderer ? 'ready' : renderer === 'unsupported' ? 'unsupported' : 'missing';
  }

  if (binaryRenderer && (availability === 'ready' || availability === 'missing')) {
    const binary = binarySource(snapshot);
    if (binary === null) {
      availability = 'withheld';
    } else if (renderer === 'image') {
      const sanitizedImage = sanitizeRasterImage(binary, mimeType);
      if (sanitizedImage === null) {
        availability = 'withheld';
      } else {
        bytes = sanitizedImage.bytes;
        availability = 'ready';
        redaction = 'applied';
        completeness = 'complete';
        thumbnailRef = sanitizedImage.thumbnailRef;
      }
    } else {
      const sanitizedPdf = sanitizePdf(binary);
      if (sanitizedPdf === null) {
        availability = 'withheld';
      } else {
        bytes = sanitizedPdf.bytes;
        availability = 'ready';
        redaction = 'applied';
        completeness = 'complete';
        verifiedTextLayerSafe = sanitizedPdf.textLayerSafe;
      }
    }
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
  } else if (availability === 'ready' && !binaryRenderer) {
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
  const pageCount =
    renderer === 'pdf'
      ? boundedPageCount(snapshot.pageCount) ?? (bytes === null ? null : pdfPageCount(bytes))
      : null;
  const textLayerSafe =
    renderer === 'pdf' && verifiedTextLayerSafe !== undefined
      ? verifiedTextLayerSafe
      : undefined;
  const finalThumbnailRef = thumbnailRef ?? safeThumbnailRef;
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
    ...(finalThumbnailRef === null ? {} : { thumbnailRef: finalThumbnailRef }),
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

function binarySource(snapshot: Record<string, unknown>): Buffer | null {
  const candidates = [snapshot.bytes, snapshot.binary, snapshot.data];
  for (const candidate of candidates) {
    if (candidate instanceof Uint8Array) {
      if (candidate.byteLength === 0 || candidate.byteLength > MAX_BINARY_BYTES) return null;
      return Buffer.from(candidate);
    }
  }
  const encoded = snapshot.base64;
  if (
    typeof encoded !== 'string' ||
    encoded.length === 0 ||
    encoded.length > Math.ceil((MAX_BINARY_BYTES * 4) / 3) + 4 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(encoded)
  ) {
    return null;
  }
  const decoded = Buffer.from(encoded, 'base64');
  return decoded.byteLength === 0 || decoded.byteLength > MAX_BINARY_BYTES ? null : decoded;
}

function sanitizeRasterImage(bytes: Buffer, mimeType: string): SanitizedRaster | null {
  if (mimeType !== 'image/png' || !hasPrefix(bytes, PNG_SIGNATURE)) return null;
  const decoded = decodePng(bytes);
  if (decoded === null) return null;
  const sanitizedBytes = encodePng(decoded.rgba, decoded.width, decoded.height);
  const thumbnail = encodeThumbnail(decoded.rgba, decoded.width, decoded.height);
  return {
    bytes: sanitizedBytes,
    thumbnailRef: `thumb_${digestBytes(thumbnail).slice(0, 32)}`,
  };
}

function sanitizePdf(bytes: Buffer): SanitizedPdf | null {
  if (
    bytes.byteLength === 0 ||
    bytes.byteLength > MAX_BINARY_BYTES ||
    !/^%PDF-[12]\.[0-7]\r?\n/u.test(bytes.toString('latin1')) ||
    !/%%EOF\s*$/u.test(bytes.toString('latin1'))
  ) {
    return null;
  }
  const source = bytes.toString('latin1');
  if (
    /\/(?:Encrypt|Filter\s*\/Crypt)\b/iu.test(source) ||
    PDF_ACTIVE_NAME_PATTERN.test(source) ||
    PDF_UNSAFE_ANNOTATION_PATTERN.test(source) ||
    PDF_METADATA_NAME_PATTERN.test(source)
  ) {
    return null;
  }
  const sanitized = Buffer.from(bytes);
  const verified = sanitized.toString('latin1');
  if (
    PDF_ACTIVE_NAME_PATTERN.test(verified) ||
    PDF_UNSAFE_ANNOTATION_PATTERN.test(verified) ||
    !/%%EOF\s*$/u.test(verified)
  ) {
    return null;
  }
  const textLayerSafe = isSafePdfTextLayer(sanitized);
  if (!textLayerSafe) return null;
  return {
    bytes: sanitized,
    pageCount: pdfPageCount(sanitized),
    textLayerSafe,
  };
}

function isSafePdfTextLayer(bytes: Buffer): boolean {
  const source = bytes.toString('latin1');
  return (
    !PDF_ACTIVE_NAME_PATTERN.test(source) &&
    !PDF_UNSAFE_ANNOTATION_PATTERN.test(source) &&
    !/\/(?:Encrypt|Filter|Metadata)\b/iu.test(source) &&
    /\/Type\s*\/Page\b/iu.test(source)
  );
}

function pdfPageCount(bytes: Buffer): number | null {
  const matches = bytes.toString('latin1').match(/\/Type\s*\/Page(?!s)\b/giu);
  if (matches === null || matches.length === 0 || matches.length > MAX_PAGE_COUNT) return null;
  return matches.length;
}

interface DecodedPng {
  readonly width: number;
  readonly height: number;
  readonly rgba: Uint8Array;
}

function decodePng(bytes: Buffer): DecodedPng | null {
  let offset = PNG_SIGNATURE.byteLength;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  let sawIhdr = false;
  let sawIend = false;
  while (offset + 12 <= bytes.byteLength) {
    const length = bytes.readUInt32BE(offset);
    const typeStart = offset + 4;
    const dataStart = offset + 8;
    const end = dataStart + length;
    if (end + 4 > bytes.byteLength) return null;
    const type = bytes.toString('ascii', typeStart, typeStart + 4);
    const data = bytes.subarray(dataStart, end);
    const expectedCrc = bytes.readUInt32BE(end);
    if (pngCrc(Buffer.from(type, 'ascii'), data) !== expectedCrc) return null;
    if (type === 'IHDR') {
      if (sawIhdr || length !== 13) return null;
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data[8];
      colorType = data[9] ?? -1;
      if (
        width === 0 ||
        height === 0 ||
        width > MAX_IMAGE_DIMENSION ||
        height > MAX_IMAGE_DIMENSION ||
        width * height > MAX_IMAGE_PIXELS ||
        bitDepth !== 8 ||
        ![0, 2, 4, 6].includes(colorType) ||
        data[10] !== 0 ||
        data[11] !== 0 ||
        data[12] !== 0
      ) {
        return null;
      }
      sawIhdr = true;
    } else if (type === 'IDAT') {
      if (!sawIhdr || sawIend) return null;
      idat.push(data);
    } else if (type === 'IEND') {
      if (length !== 0 || !sawIhdr || idat.length === 0) return null;
      sawIend = true;
      break;
    } else if (isCriticalPngChunk(type)) {
      return null;
    }
    offset = end + 4;
  }
  if (!sawIhdr || !sawIend || idat.length === 0) return null;
  const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 4 ? 2 : 4;
  const rowBytes = width * channels;
  const expectedLength = (rowBytes + 1) * height;
  let inflated: Buffer;
  try {
    inflated = inflateSync(Buffer.concat(idat), { maxOutputLength: expectedLength });
  } catch {
    return null;
  }
  if (inflated.byteLength !== expectedLength) return null;
  const rgba = new Uint8Array(width * height * 4);
  const previous = new Uint8Array(rowBytes);
  const current = new Uint8Array(rowBytes);
  let sourceOffset = 0;
  let targetOffset = 0;
  for (let row = 0; row < height; row += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    current.set(inflated.subarray(sourceOffset, sourceOffset + rowBytes));
    sourceOffset += rowBytes;
    if (!unfilterPngRow(current, previous, filter ?? 255, channels)) return null;
    for (let column = 0; column < width; column += 1) {
      const source = column * channels;
      rgba[targetOffset++] = current[source] ?? 0;
      rgba[targetOffset++] = colorType === 0 || colorType === 4 ? current[source] ?? 0 : current[source + 1] ?? 0;
      rgba[targetOffset++] =
        colorType === 0 || colorType === 4 ? current[source] ?? 0 : current[source + 2] ?? 0;
      rgba[targetOffset++] =
        colorType === 4
          ? current[source + 1] ?? 0
          : colorType === 6
            ? current[source + 3] ?? 255
            : 255;
    }
    previous.set(current);
  }
  return { width, height, rgba };
}

function unfilterPngRow(
  row: Uint8Array,
  previous: Uint8Array,
  filter: number,
  bytesPerPixel: number,
): boolean {
  if (filter === 0) return true;
  for (let index = 0; index < row.length; index += 1) {
    const left = index >= bytesPerPixel ? row[index - bytesPerPixel] ?? 0 : 0;
    const above = previous[index] ?? 0;
    const upperLeft = index >= bytesPerPixel ? previous[index - bytesPerPixel] ?? 0 : 0;
    const prediction =
      filter === 1
        ? left
        : filter === 2
          ? above
          : filter === 3
            ? Math.floor((left + above) / 2)
            : filter === 4
              ? paeth(left, above, upperLeft)
              : -1;
    if (prediction < 0) return false;
    row[index] = ((row[index] ?? 0) + prediction) & 0xff;
  }
  return true;
}

function paeth(left: number, above: number, upperLeft: number): number {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  return leftDistance <= aboveDistance && leftDistance <= upperLeftDistance
    ? left
    : aboveDistance <= upperLeftDistance
      ? above
      : upperLeft;
}

function encodePng(rgba: Uint8Array, width: number, height: number): Buffer {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let sourceOffset = 0;
  let targetOffset = 0;
  for (let row = 0; row < height; row += 1) {
    raw[targetOffset++] = 0;
    const rowEnd = sourceOffset + width * 4;
    raw.set(rgba.subarray(sourceOffset, rowEnd), targetOffset);
    sourceOffset = rowEnd;
    targetOffset += width * 4;
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const chunks = [PNG_SIGNATURE, pngChunk('IHDR', header), pngChunk('IDAT', deflateSync(raw)), pngChunk('IEND', Buffer.alloc(0))];
  return Buffer.concat(chunks);
}

function encodeThumbnail(rgba: Uint8Array, width: number, height: number): Buffer {
  const scale = Math.min(1, MAX_THUMBNAIL_DIMENSION / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const thumbnail = new Uint8Array(targetWidth * targetHeight * 4);
  for (let y = 0; y < targetHeight; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = Math.min(width - 1, Math.floor((x * width) / targetWidth));
      const sourceY = Math.min(height - 1, Math.floor((y * height) / targetHeight));
      const sourceOffset = (sourceY * width + sourceX) * 4;
      const targetOffset = (y * targetWidth + x) * 4;
      thumbnail.set(rgba.subarray(sourceOffset, sourceOffset + 4), targetOffset);
    }
  }
  return encodePng(thumbnail, targetWidth, targetHeight);
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.byteLength);
  chunk.writeUInt32BE(data.byteLength, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(pngCrc(typeBytes, data), 8 + data.byteLength);
  return chunk;
}

function pngCrc(type: Buffer, data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of Buffer.concat([type, Buffer.from(data)])) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function isCriticalPngChunk(type: string): boolean {
  const first = type.charCodeAt(0);
  return first >= 65 && first <= 90 && type !== 'IHDR' && type !== 'IDAT' && type !== 'IEND';
}

function hasPrefix(value: Uint8Array, prefix: Uint8Array): boolean {
  return value.byteLength >= prefix.byteLength && prefix.every((byte, index) => value[index] === byte);
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
