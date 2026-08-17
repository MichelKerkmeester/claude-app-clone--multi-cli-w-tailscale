// ───────────────────────────────────────────────────────────────────
// MODULE: Fail-closed Artifact Snapshot Sanitizer
// ───────────────────────────────────────────────────────────────────

import { createHash, randomBytes } from 'node:crypto';
import { chmodSync, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
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
import {
  decodeImage,
  encodeImage,
  sniffImage,
  type CodecImageData,
  type SniffedImage,
} from '../attachments/attachment-decoder.js';

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

export const INBOUND_MAX_SOURCE_BYTES = 15 * 1024 * 1024;
export const INBOUND_MAX_BATCH_BYTES = 30 * 1024 * 1024;
export const INBOUND_MAX_IMAGES_PER_TURN = 4;
export const INBOUND_MAX_DECODED_AREA = 60_000_000;
export const INBOUND_MAX_SOURCE_EDGE = 12_000;
export const INBOUND_MAX_CHANNELS = 4;
export const INBOUND_MAX_FRAMES = 1;
export const INBOUND_MAX_FULL_BYTES = 2 * 1024 * 1024;
export const INBOUND_MAX_THUMBNAIL_BYTES = 256 * 1024;
export const INBOUND_FULL_MAX_EDGE = 2_000;
export const INBOUND_THUMBNAIL_MAX_EDGE = 640;
export const INBOUND_IMAGE_DECODE_DEADLINE_MS = 5_000;
export const INBOUND_BATCH_DEADLINE_MS = 15_000;
export const INBOUND_MAX_WORKERS = 2;
const INBOUND_REDACTION_PADDING = 6;

export interface InboundExclusionMask {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface InboundScanImage {
  readonly data: Uint8Array;
  readonly pixels: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly signal?: AbortSignal;
}

export interface InboundScanMatch extends InboundExclusionMask {
  readonly status?: 'confirmed' | 'uncertain';
  readonly confirmed?: boolean;
}

export interface InboundSecretScanner {
  readonly scan: (image: InboundScanImage) => Promise<unknown> | unknown;
}

export type InboundScanStatus = 'clear' | 'confirmed' | 'uncertain' | 'unavailable';

export interface InboundScanResult {
  readonly status?: InboundScanStatus;
  readonly matches?: readonly InboundScanMatch[];
}

export type InboundBinarySource = Uint8Array | AsyncIterable<Uint8Array>;

export interface SanitizeInboundImageOptions {
  readonly declaredByteLength?: number;
  readonly expectedDigest?: string;
  readonly claimedMediaType?: string;
  readonly quarantineRoot?: string;
  readonly scanner?: InboundSecretScanner;
  readonly exclusionMasks?: readonly InboundExclusionMask[];
  readonly deadlineMs?: number;
}

export interface SanitizedInboundVariant {
  readonly mediaType: 'image/png' | 'image/jpeg';
  readonly width: number;
  readonly height: number;
  readonly bytes: Buffer;
  readonly digest: string;
}

export interface SanitizedInboundImage {
  readonly status: 'ready';
  readonly redaction: 'not-needed' | 'applied';
  readonly full: SanitizedInboundVariant;
  readonly thumbnail: SanitizedInboundVariant;
}

export interface WithheldInboundImage {
  readonly status: 'withheld';
  readonly reason:
    | 'unsupported-type'
    | 'too-large'
    | 'invalid-image'
    | 'redaction-unavailable'
    | 'policy';
}

export type InboundSanitizationResult = SanitizedInboundImage | WithheldInboundImage;

class InboundSanitizationFailure extends Error {
  public constructor(readonly reason: WithheldInboundImage['reason']) {
    super(reason);
  }
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

/** Publish only bounded, reconstructed pixels; every non-ready outcome is terminal. */
export async function sanitizeInboundImage(
  source: InboundBinarySource,
  options: SanitizeInboundImageOptions = {},
): Promise<InboundSanitizationResult> {
  let sourceBytes: Buffer | null = null;
  let workingPixels: Uint8Array | null = null;
  let masterPixels: Uint8Array | null = null;
  let thumbnailPixels: Uint8Array | null = null;
  let full: SanitizedInboundVariant | null = null;
  let thumbnail: SanitizedInboundVariant | null = null;
  let completed = false;
  try {
    sourceBytes = await readInboundSource(source, options);
    const sniffed = sniffInboundImage(sourceBytes);
    if (sniffed.mimeType === 'image/jpeg' && !jpegHasExactEnd(sourceBytes)) {
      throw new InboundSanitizationFailure('invalid-image');
    }
    const decoded = await withInboundDeadline(
      decodeImage(sourceBytes, sniffed, INBOUND_IMAGE_DECODE_DEADLINE_MS),
      options.deadlineMs ?? INBOUND_IMAGE_DECODE_DEADLINE_MS,
      INBOUND_IMAGE_DECODE_DEADLINE_MS,
    );
    if (
      decoded.width <= 0 ||
      decoded.height <= 0 ||
      decoded.width > INBOUND_MAX_SOURCE_EDGE ||
      decoded.height > INBOUND_MAX_SOURCE_EDGE ||
      decoded.width > Math.floor(INBOUND_MAX_DECODED_AREA / decoded.height) ||
      decoded.data.byteLength !== decoded.width * decoded.height * 4
    ) {
      throw new InboundSanitizationFailure('too-large');
    }
    workingPixels = applyImageOrientation(decoded.data, decoded.width, decoded.height, sniffed.orientation);
    decoded.data.fill(0);

    let redactionApplied = false;
    const orientedWidth = orientedWidthFor(sniffed.orientation, decoded.width, decoded.height);
    const orientedHeight = orientedHeightFor(sniffed.orientation, decoded.width, decoded.height);
    const exclusionMasks = options.exclusionMasks ?? [];
    if (exclusionMasks.length > 256) throw new InboundSanitizationFailure('policy');
    for (const mask of exclusionMasks) {
      validateInboundMask(mask, orientedWidth, orientedHeight);
      burnCarbonRectangle(workingPixels, orientedWidth, orientedHeight, mask);
      redactionApplied = true;
    }

    if (options.scanner === undefined) {
      throw new InboundSanitizationFailure('redaction-unavailable');
    }
    const scanResult = await withInboundDeadline(
      Promise.resolve(
        options.scanner.scan({
          data: workingPixels,
          pixels: workingPixels,
          width: orientedWidth,
          height: orientedHeight,
        }),
      ),
      options.deadlineMs ?? INBOUND_IMAGE_DECODE_DEADLINE_MS,
      INBOUND_IMAGE_DECODE_DEADLINE_MS,
    );
    const matches = normalizeInboundScanResult(scanResult);
    for (const match of matches) {
      validateInboundMask(match, orientedWidth, orientedHeight);
      burnCarbonRectangle(
        workingPixels,
        orientedWidth,
        orientedHeight,
        expandInboundMask(match, orientedWidth, orientedHeight, INBOUND_REDACTION_PADDING),
      );
      redactionApplied = true;
    }

    const master = resizeInboundRaster(
      workingPixels,
      orientedWidth,
      orientedHeight,
      INBOUND_FULL_MAX_EDGE,
    );
    masterPixels = master.data;
    full = await encodeInboundVariant(master, INBOUND_MAX_FULL_BYTES, INBOUND_FULL_MAX_EDGE, options.deadlineMs);
    const thumbnailRaster = resizeInboundRaster(
      master.data,
      master.width,
      master.height,
      INBOUND_THUMBNAIL_MAX_EDGE,
    );
    thumbnailPixels = thumbnailRaster.data;
    thumbnail = await encodeInboundVariant(
      thumbnailRaster,
      INBOUND_MAX_THUMBNAIL_BYTES,
      INBOUND_THUMBNAIL_MAX_EDGE,
      options.deadlineMs,
    );
    master.data.fill(0);
    thumbnailRaster.data.fill(0);
    completed = true;
    return {
      status: 'ready',
      redaction: redactionApplied ? 'applied' : 'not-needed',
      full,
      thumbnail,
    };
  } catch (error: unknown) {
    if (error instanceof InboundSanitizationFailure) {
      return { status: 'withheld', reason: error.reason };
    }
    return { status: 'withheld', reason: 'invalid-image' };
  } finally {
    sourceBytes?.fill(0);
    workingPixels?.fill(0);
    masterPixels?.fill(0);
    thumbnailPixels?.fill(0);
    if (!completed) {
      full?.bytes.fill(0);
      thumbnail?.bytes.fill(0);
    }
  }
}

/** Alias retained for callers that name the boundary after its capability. */
export const sanitizeInboundMedia = sanitizeInboundImage;

export async function sanitizeInboundBatch(
  inputs: readonly (
    | InboundBinarySource
    | { readonly source: InboundBinarySource; readonly options?: SanitizeInboundImageOptions }
  )[],
  options: SanitizeInboundImageOptions = {},
): Promise<InboundSanitizationResult[]> {
  if (inputs.length > INBOUND_MAX_IMAGES_PER_TURN) {
    return inputs.map(() => ({ status: 'withheld', reason: 'too-large' as const }));
  }
  const declaredTotal = inputs.reduce((total, input) => {
    const itemOptions = isInboundBatchItem(input) ? input.options : undefined;
    return total + (itemOptions?.declaredByteLength ?? options.declaredByteLength ?? 0);
  }, 0);
  if (declaredTotal > INBOUND_MAX_BATCH_BYTES) {
    return inputs.map(() => ({ status: 'withheld', reason: 'too-large' as const }));
  }

  let consumed = 0;
  const guarded = inputs.map((input) => {
    const itemSource = isInboundBatchItem(input) ? input.source : input;
    const itemOptions = isInboundBatchItem(input) ? { ...options, ...input.options } : options;
    return {
      source: guardBatchSource(itemSource, () => consumed, (value) => {
        consumed = value;
      }),
      options: itemOptions,
    };
  });
  const results: InboundSanitizationResult[] = Array.from(
    { length: inputs.length },
    () => ({ status: 'withheld', reason: 'policy' as const }),
  );
  let next = 0;
  const worker = async (): Promise<void> => {
    while (true) {
      const index = next;
      next += 1;
      if (index >= guarded.length) return;
      const item = guarded[index];
      if (item === undefined) return;
      results[index] = await sanitizeInboundImage(item.source, item.options);
    }
  };
  try {
    await withInboundDeadline(
      Promise.all(Array.from({ length: Math.min(INBOUND_MAX_WORKERS, guarded.length) }, () => worker())),
      options.deadlineMs ?? INBOUND_BATCH_DEADLINE_MS,
      INBOUND_BATCH_DEADLINE_MS,
    );
  } catch {
    return results.map(() => ({ status: 'withheld', reason: 'policy' as const }));
  }
  return results;
}

function isInboundBatchItem(
  value: InboundBinarySource | { readonly source: InboundBinarySource; readonly options?: SanitizeInboundImageOptions },
): value is { readonly source: InboundBinarySource; readonly options?: SanitizeInboundImageOptions } {
  return isRecord(value) && 'source' in value;
}

function guardBatchSource(
  source: InboundBinarySource,
  getConsumed: () => number,
  setConsumed: (value: number) => void,
): InboundBinarySource {
  if (source instanceof Uint8Array) {
    return guardBatchIterable([source], getConsumed, setConsumed);
  }
  return guardBatchIterable(source, getConsumed, setConsumed);
}

async function* guardBatchIterable(
  source: Iterable<Uint8Array> | AsyncIterable<Uint8Array>,
  getConsumed: () => number,
  setConsumed: (value: number) => void,
): AsyncIterable<Uint8Array> {
  for await (const chunk of source) {
    if (!(chunk instanceof Uint8Array)) throw new InboundSanitizationFailure('policy');
    const next = getConsumed() + chunk.byteLength;
    if (next > INBOUND_MAX_BATCH_BYTES) throw new InboundSanitizationFailure('too-large');
    setConsumed(next);
    yield chunk;
  }
}

async function readInboundSource(
  source: InboundBinarySource,
  options: SanitizeInboundImageOptions,
): Promise<Buffer> {
  const root = resolve(
    options.quarantineRoot ?? join(tmpdir(), `pi-remote-inbound-sanitize-${randomBytes(16).toString('hex')}`),
  );
  if (root === resolve(process.cwd()) || root.startsWith(`${resolve(process.cwd())}${sep}`)) {
    throw new InboundSanitizationFailure('policy');
  }
  try {
    if (lstatSync(root).isSymbolicLink()) throw new InboundSanitizationFailure('policy');
  } catch (error: unknown) {
    if (error instanceof InboundSanitizationFailure) throw error;
    if (!isMissingPath(error)) throw new InboundSanitizationFailure('policy');
  }
  mkdirSync(root, { recursive: true, mode: 0o700 });
  chmodSync(root, 0o700);
  const workDirectory = join(root, `work-${randomBytes(16).toString('hex')}`);
  const sourcePath = join(workDirectory, `source-${randomBytes(16).toString('hex')}`);
  mkdirSync(workDirectory, { mode: 0o700 });
  chmodSync(workDirectory, 0o700);
  let total = 0;
  try {
    const iterable: AsyncIterable<Uint8Array> =
      source instanceof Uint8Array ? singleChunk(source) : source;
    for await (const chunk of iterable) {
      if (!(chunk instanceof Uint8Array)) throw new InboundSanitizationFailure('policy');
      if (chunk.byteLength === 0) continue;
      total += chunk.byteLength;
      if (total > INBOUND_MAX_SOURCE_BYTES || total > (options.declaredByteLength ?? INBOUND_MAX_SOURCE_BYTES)) {
        throw new InboundSanitizationFailure('too-large');
      }
      writeFileSync(sourcePath, Buffer.from(chunk), { flag: 'a', mode: 0o600 });
      chmodSync(sourcePath, 0o600);
    }
    if (total === 0) throw new InboundSanitizationFailure('invalid-image');
    if (options.declaredByteLength !== undefined && total !== options.declaredByteLength) {
      throw new InboundSanitizationFailure('too-large');
    }
    const bytes = readFileSync(sourcePath);
    if (options.expectedDigest !== undefined && !matchesInboundDigest(bytes, options.expectedDigest)) {
      bytes.fill(0);
      throw new InboundSanitizationFailure('policy');
    }
    return bytes;
  } finally {
    rmSync(workDirectory, { recursive: true, force: true });
    if (options.quarantineRoot === undefined) rmSync(root, { recursive: true, force: true });
  }
}

function matchesInboundDigest(bytes: Uint8Array, expected: string): boolean {
  if (/^[a-f0-9]{64}$/u.test(expected)) return digestBytes(bytes) === expected;
  if (/^[A-Za-z0-9_-]{43}$/u.test(expected)) {
    return createHash('sha256').update(bytes).digest('base64url') === expected;
  }
  return false;
}

function isMissingPath(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { readonly code?: unknown }).code === 'ENOENT'
  );
}

async function* singleChunk(source: Uint8Array): AsyncIterable<Uint8Array> {
  yield source;
}

function sniffInboundImage(bytes: Uint8Array): SniffedImage {
  let sawBoundFailure = false;
  let sawInvalid = false;
  for (const mime of ['image/jpeg', 'image/png', 'image/webp'] as const) {
    const result = sniffImage(bytes, mime);
    if (result.ok) {
      if (result.image.animated || result.image.frames !== INBOUND_MAX_FRAMES) {
        throw new InboundSanitizationFailure('unsupported-type');
      }
      if (
        result.image.channels > INBOUND_MAX_CHANNELS ||
        result.image.width > INBOUND_MAX_SOURCE_EDGE ||
        result.image.height > INBOUND_MAX_SOURCE_EDGE ||
        result.image.width > Math.floor(INBOUND_MAX_DECODED_AREA / result.image.height)
      ) {
        throw new InboundSanitizationFailure('too-large');
      }
      return result.image;
    }
    sawBoundFailure ||= result.code === 'dimensions_exceeded' || result.code === 'channels_exceeded';
    sawInvalid ||= result.code === 'invalid_image' || result.code === 'frames_exceeded';
  }
  throw new InboundSanitizationFailure(sawBoundFailure ? 'too-large' : sawInvalid ? 'invalid-image' : 'unsupported-type');
}

function jpegHasExactEnd(bytes: Uint8Array): boolean {
  return bytes.byteLength >= 4 && bytes[bytes.byteLength - 2] === 0xff && bytes[bytes.byteLength - 1] === 0xd9;
}

function orientedWidthFor(orientation: SniffedImage['orientation'], width: number, height: number): number {
  return orientation >= 5 ? height : width;
}

function orientedHeightFor(orientation: SniffedImage['orientation'], width: number, height: number): number {
  return orientation >= 5 ? width : height;
}

function applyImageOrientation(
  source: Uint8Array,
  width: number,
  height: number,
  orientation: SniffedImage['orientation'],
): Uint8Array {
  const targetWidth = orientedWidthFor(orientation, width, height);
  const targetHeight = orientedHeightFor(orientation, width, height);
  const target = new Uint8Array(targetWidth * targetHeight * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let targetX = x;
      let targetY = y;
      if (orientation === 2) targetX = width - 1 - x;
      if (orientation === 3) {
        targetX = width - 1 - x;
        targetY = height - 1 - y;
      }
      if (orientation === 4) targetY = height - 1 - y;
      if (orientation === 5) {
        targetX = y;
        targetY = x;
      }
      if (orientation === 6) {
        targetX = height - 1 - y;
        targetY = x;
      }
      if (orientation === 7) {
        targetX = height - 1 - y;
        targetY = width - 1 - x;
      }
      if (orientation === 8) {
        targetX = y;
        targetY = width - 1 - x;
      }
      const sourceOffset = (y * width + x) * 4;
      const targetOffset = (targetY * targetWidth + targetX) * 4;
      target.set(source.subarray(sourceOffset, sourceOffset + 4), targetOffset);
    }
  }
  return target;
}

function validateInboundMask(mask: InboundExclusionMask, width: number, height: number): void {
  if (
    !Number.isSafeInteger(mask.x) ||
    !Number.isSafeInteger(mask.y) ||
    !Number.isSafeInteger(mask.width) ||
    !Number.isSafeInteger(mask.height) ||
    mask.width <= 0 ||
    mask.height <= 0 ||
    mask.x < 0 ||
    mask.y < 0 ||
    mask.x + mask.width > width ||
    mask.y + mask.height > height
  ) {
    throw new InboundSanitizationFailure('policy');
  }
}

function expandInboundMask(
  mask: InboundExclusionMask,
  width: number,
  height: number,
  padding: number,
): InboundExclusionMask {
  const x = Math.max(0, mask.x - padding);
  const y = Math.max(0, mask.y - padding);
  const right = Math.min(width, mask.x + mask.width + padding);
  const bottom = Math.min(height, mask.y + mask.height + padding);
  return { x, y, width: right - x, height: bottom - y };
}

function burnCarbonRectangle(
  pixels: Uint8Array,
  width: number,
  height: number,
  mask: InboundExclusionMask,
): void {
  const right = Math.min(width, mask.x + mask.width);
  const bottom = Math.min(height, mask.y + mask.height);
  for (let y = Math.max(0, mask.y); y < bottom; y += 1) {
    for (let x = Math.max(0, mask.x); x < right; x += 1) {
      const offset = (y * width + x) * 4;
      pixels[offset] = 36;
      pixels[offset + 1] = 34;
      pixels[offset + 2] = 31;
      pixels[offset + 3] = 255;
    }
  }
}

function normalizeInboundScanResult(value: unknown): InboundScanMatch[] {
  if (Array.isArray(value)) return normalizeInboundMatches(value, 'confirmed');
  if (!isRecord(value)) throw new InboundSanitizationFailure('redaction-unavailable');
  const status = value.status;
  if (status === 'unavailable' || status === 'uncertain' || status === 'timeout') {
    throw new InboundSanitizationFailure('redaction-unavailable');
  }
  const rawMatches = value.matches;
  if (rawMatches === undefined) {
    if (status === 'clear' || status === 'confirmed') return [];
    throw new InboundSanitizationFailure('redaction-unavailable');
  }
  if (!Array.isArray(rawMatches)) throw new InboundSanitizationFailure('redaction-unavailable');
  return normalizeInboundMatches(rawMatches, status === 'confirmed' ? 'confirmed' : undefined);
}

function normalizeInboundMatches(value: unknown[], defaultStatus: 'confirmed' | undefined): InboundScanMatch[] {
  if (value.length > 1_000) throw new InboundSanitizationFailure('policy');
  return value.map((candidate) => {
    if (!isRecord(candidate)) throw new InboundSanitizationFailure('policy');
    const match = {
      x: candidate.x,
      y: candidate.y,
      width: candidate.width,
      height: candidate.height,
      status: candidate.status,
      confirmed: candidate.confirmed,
    } as InboundScanMatch;
    if (
      match.status === 'uncertain' ||
      match.confirmed === false ||
      (match.status === undefined && match.confirmed === undefined && defaultStatus === undefined)
    ) {
      throw new InboundSanitizationFailure('redaction-unavailable');
    }
    if (match.status !== undefined && match.status !== 'confirmed') {
      throw new InboundSanitizationFailure('redaction-unavailable');
    }
    return match;
  });
}

interface InboundRaster {
  readonly data: Uint8Array;
  readonly width: number;
  readonly height: number;
}

function resizeInboundRaster(data: Uint8Array, width: number, height: number, maxEdge: number): InboundRaster {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const target = new Uint8Array(targetWidth * targetHeight * 4);
  for (let y = 0; y < targetHeight; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = Math.min(width - 1, Math.floor((x * width) / targetWidth));
      const sourceY = Math.min(height - 1, Math.floor((y * height) / targetHeight));
      const sourceOffset = (sourceY * width + sourceX) * 4;
      const targetOffset = (y * targetWidth + x) * 4;
      target.set(data.subarray(sourceOffset, sourceOffset + 4), targetOffset);
    }
  }
  return { data: target, width: targetWidth, height: targetHeight };
}

async function encodeInboundVariant(
  raster: InboundRaster,
  maxBytes: number,
  maxEdge: number,
  deadlineMs: number | undefined,
): Promise<SanitizedInboundVariant> {
  let current = raster;
  const alpha = hasInboundAlpha(current.data);
  try {
    if (alpha) {
      const png = await encodeInbound(current, 'image/png', 88, deadlineMs);
      if (png.bytes.byteLength <= maxBytes) {
        const result = { ...png, digest: digestBytes(png.bytes) };
        if (current !== raster) current.data.fill(0);
        return result;
      }
      png.bytes.fill(0);
    }
    let quality = 88;
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const jpegRaster = alpha ? flattenInboundRaster(current) : current;
      let jpeg: Awaited<ReturnType<typeof encodeInbound>> | null = null;
      try {
        jpeg = await encodeInbound(jpegRaster, 'image/jpeg', quality, deadlineMs);
      } finally {
        if (jpegRaster !== current) jpegRaster.data.fill(0);
      }
      if (jpeg.bytes.byteLength <= maxBytes) {
        const result = { ...jpeg, digest: digestBytes(jpeg.bytes) };
        if (current !== raster) current.data.fill(0);
        return result;
      }
      jpeg.bytes.fill(0);
      quality = Math.max(24, quality - 8);
      if (attempt % 4 === 3 || quality === 24) {
        if (current.width <= 1 && current.height <= 1) break;
        const next = resizeInboundRaster(
          current.data,
          current.width,
          current.height,
          Math.max(1, Math.floor(maxEdge * 0.9 ** (Math.floor(attempt / 4) + 1))),
        );
        if (current !== raster) current.data.fill(0);
        current = next;
        quality = 88;
      }
    }
    throw new InboundSanitizationFailure('too-large');
  } finally {
    if (current !== raster) current.data.fill(0);
  }
}

async function encodeInbound(
  raster: InboundRaster,
  mediaType: 'image/png' | 'image/jpeg',
  quality: number,
  deadlineMs: number | undefined,
): Promise<{ readonly mediaType: 'image/png' | 'image/jpeg'; readonly width: number; readonly height: number; readonly bytes: Buffer }> {
  const data: CodecImageData = { data: raster.data, width: raster.width, height: raster.height };
  const encoded = await withInboundDeadline(
    encodeImage(data, mediaType, quality, INBOUND_IMAGE_DECODE_DEADLINE_MS),
    deadlineMs ?? INBOUND_IMAGE_DECODE_DEADLINE_MS,
    INBOUND_IMAGE_DECODE_DEADLINE_MS,
  );
  return {
    mediaType,
    width: raster.width,
    height: raster.height,
    bytes: Buffer.from(encoded),
  };
}

function flattenInboundRaster(raster: InboundRaster): InboundRaster {
  const data = Uint8Array.from(raster.data);
  for (let offset = 0; offset < data.length; offset += 4) {
    const alpha = data[offset + 3] ?? 255;
    data[offset] = Math.round(((data[offset] ?? 0) * alpha + 248 * (255 - alpha)) / 255);
    data[offset + 1] = Math.round(((data[offset + 1] ?? 0) * alpha + 248 * (255 - alpha)) / 255);
    data[offset + 2] = Math.round(((data[offset + 2] ?? 0) * alpha + 248 * (255 - alpha)) / 255);
    data[offset + 3] = 255;
  }
  return { data, width: raster.width, height: raster.height };
}

function hasInboundAlpha(data: Uint8Array): boolean {
  for (let offset = 3; offset < data.length; offset += 4) {
    if (data[offset] !== 255) return true;
  }
  return false;
}

async function withInboundDeadline<T>(
  promise: Promise<T>,
  timeoutMs: number,
  maximum: number,
): Promise<T> {
  const requested = Number.isSafeInteger(timeoutMs) && timeoutMs > 0 ? timeoutMs : maximum;
  const boundedTimeout = Math.min(requested, maximum);
  return new Promise<T>((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => rejectPromise(new InboundSanitizationFailure('redaction-unavailable')), boundedTimeout);
    timer.unref?.();
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolvePromise(value);
      },
      () => {
        clearTimeout(timer);
        rejectPromise(new InboundSanitizationFailure('invalid-image'));
      },
    );
  });
}
