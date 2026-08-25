// ───────────────────────────────────────────────────────────────────
// MODULE: Quarantine Image Normalizer
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { MediaOutputMimeType } from '@pi-remote/pi-rpc-protocol';

import {
  IMAGE_DECODE_TIMEOUT_MS,
  MAX_NORMALIZED_BYTES_PER_IMAGE,
  MAX_NORMALIZED_EDGE,
} from './attachment-limits.js';
import {
  decodeImage,
  encodeImage,
  sniffImage,
  type DecodedImage,
  type SniffFailureCode,
} from './attachment-decoder.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface NormalizedImage {
  readonly bytes: Uint8Array;
  readonly mimeType: MediaOutputMimeType;
  readonly width: number;
  readonly height: number;
}

export type NormalizationFailureCode =
  SniffFailureCode | 'decode_timeout' | 'decode_failed' | 'output_too_large';

export type NormalizationResult =
  | { readonly ok: true; readonly image: NormalizedImage }
  | { readonly ok: false; readonly code: NormalizationFailureCode };

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/** Decode, orient, bound, and re-encode; source metadata is not retained. */
export async function normalizeImage(
  input: Uint8Array,
  declaredMime: string,
  batchDeadlineAt?: number,
): Promise<NormalizationResult> {
  const source = Uint8Array.from(input);
  let decoded: DecodedImage | null = null;
  let raster: Raster | null = null;
  let encoded: Uint8Array | null = null;
  let returnedOutput = false;
  try {
    const sniffed = sniffImage(source, declaredMime);
    if (!sniffed.ok) return sniffed;
    try {
      decoded = await decodeImage(source, sniffed.image, codecTimeoutMs(batchDeadlineAt));
    } catch (error: unknown) {
      return { ok: false, code: isTimeout(error) ? 'decode_timeout' : 'decode_failed' };
    }
    const oriented = applyOrientation(decoded);
    raster = downscale(oriented, MAX_NORMALIZED_EDGE);
    const hasAlpha = containsTransparency(raster.data);
    const mimeType: MediaOutputMimeType = hasAlpha ? 'image/png' : 'image/jpeg';
    const firstCandidate = await encodeCandidate(raster, mimeType, 88, batchDeadlineAt);
    if (!firstCandidate.ok) return firstCandidate;
    encoded = firstCandidate.bytes;

    if (encoded.byteLength > MAX_NORMALIZED_BYTES_PER_IMAGE) {
      if (mimeType === 'image/jpeg') {
        for (const quality of [82, 76, 70, 64, 58, 52, 46, 40]) {
          const next = await encodeCandidate(raster, mimeType, quality, batchDeadlineAt);
          if (!next.ok) return next;
          encoded.fill(0);
          encoded = next.bytes;
          if (encoded.byteLength <= MAX_NORMALIZED_BYTES_PER_IMAGE) break;
        }
      }
      let attempts = 0;
      while (
        encoded.byteLength > MAX_NORMALIZED_BYTES_PER_IMAGE &&
        (raster.width > 1 || raster.height > 1) &&
        attempts < 32
      ) {
        attempts += 1;
        const nextRaster = downscale(
          raster,
          Math.max(1, Math.floor(Math.max(raster.width, raster.height) * 0.85)),
        );
        if (nextRaster.data !== raster.data) raster.data.fill(0);
        raster = nextRaster;
        const next = await encodeCandidate(
          raster,
          mimeType,
          mimeType === 'image/jpeg' ? 70 : 88,
          batchDeadlineAt,
        );
        if (!next.ok) return next;
        encoded.fill(0);
        encoded = next.bytes;
      }
    }
    if (encoded.byteLength > MAX_NORMALIZED_BYTES_PER_IMAGE) {
      return { ok: false, code: 'output_too_large' };
    }
    returnedOutput = true;
    return {
      ok: true,
      image: {
        bytes: encoded,
        mimeType,
        width: raster.width,
        height: raster.height,
      },
    };
  } finally {
    source.fill(0);
    decoded?.data.fill(0);
    if (raster !== null && raster.data !== decoded?.data) raster.data.fill(0);
    if (!returnedOutput) encoded?.fill(0);
  }
}

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

interface Raster {
  readonly data: Uint8Array;
  readonly width: number;
  readonly height: number;
}

function applyOrientation(decoded: DecodedImage): Raster {
  const orientation = decoded.orientation;
  if (orientation === 1) {
    return { data: decoded.data, width: decoded.width, height: decoded.height };
  }
  const swapsAxes = orientation >= 5;
  const width = swapsAxes ? decoded.height : decoded.width;
  const height = swapsAxes ? decoded.width : decoded.height;
  const output = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const source = sourceCoordinate(orientation, x, y, decoded.width, decoded.height);
      const sourceOffset = (source.y * decoded.width + source.x) * 4;
      const targetOffset = (y * width + x) * 4;
      output.set(decoded.data.subarray(sourceOffset, sourceOffset + 4), targetOffset);
    }
  }
  return { data: output, width, height };
}

function sourceCoordinate(
  orientation: DecodedImage['orientation'],
  x: number,
  y: number,
  width: number,
  height: number,
): { readonly x: number; readonly y: number } {
  switch (orientation) {
    case 2:
      return { x: width - 1 - x, y };
    case 3:
      return { x: width - 1 - x, y: height - 1 - y };
    case 4:
      return { x, y: height - 1 - y };
    case 5:
      return { x: y, y: x };
    case 6:
      return { x: y, y: height - 1 - x };
    case 7:
      return { x: width - 1 - y, y: height - 1 - x };
    case 8:
      return { x: width - 1 - y, y: x };
    default:
      return { x, y };
  }
}

function downscale(raster: Raster, longestEdge: number): Raster {
  const currentLongest = Math.max(raster.width, raster.height);
  if (currentLongest <= longestEdge) return raster;
  const scale = longestEdge / currentLongest;
  const width = Math.max(1, Math.round(raster.width * scale));
  const height = Math.max(1, Math.round(raster.height * scale));
  const output = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(raster.height - 1, Math.floor((y * raster.height) / height));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(raster.width - 1, Math.floor((x * raster.width) / width));
      const sourceOffset = (sourceY * raster.width + sourceX) * 4;
      const targetOffset = (y * width + x) * 4;
      output.set(raster.data.subarray(sourceOffset, sourceOffset + 4), targetOffset);
    }
  }
  return { data: output, width, height };
}

function containsTransparency(data: Uint8Array): boolean {
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] !== 255) return true;
  }
  return false;
}

async function encodeCandidate(
  raster: Raster,
  mimeType: MediaOutputMimeType,
  quality: number,
  batchDeadlineAt?: number,
): Promise<
  | { readonly ok: true; readonly bytes: Uint8Array }
  | { readonly ok: false; readonly code: 'decode_timeout' | 'decode_failed' }
> {
  try {
    return {
      ok: true,
      bytes: await encodeImage(raster, mimeType, quality, codecTimeoutMs(batchDeadlineAt)),
    };
  } catch (error: unknown) {
    return { ok: false, code: isTimeout(error) ? 'decode_timeout' : 'decode_failed' };
  }
}

function codecTimeoutMs(batchDeadlineAt: number | undefined): number {
  if (batchDeadlineAt === undefined) return IMAGE_DECODE_TIMEOUT_MS;
  return Math.max(1, Math.min(IMAGE_DECODE_TIMEOUT_MS, batchDeadlineAt - Date.now()));
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && error.message === 'Image codec timeout.';
}
