// ───────────────────────────────────────────────────────────────────
// MODULE: Memory-Isolated Image Decoder Adapter
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import type { MediaOutputMimeType } from '@pi-remote/pi-rpc-protocol';

import { IMAGE_DECODE_TIMEOUT_MS, MAX_DECODED_AREA, MAX_SOURCE_EDGE } from './attachment-limits.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const JPEG = 'image/jpeg' as const;
const PNG = 'image/png' as const;
const WEBP = 'image/webp' as const;
const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);
const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

// ───────────────────────────────────────────────────────────────────
// 3. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

type SupportedMime = typeof JPEG | typeof PNG | typeof WEBP;

export interface CodecImageData {
  readonly data: Uint8Array | Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

interface CodecState {
  readonly jpegDecode: (
    buffer: ArrayBuffer,
    options?: { preserveOrientation?: boolean },
  ) => Promise<CodecImageData>;
  readonly jpegEncode: (
    data: CodecImageData,
    options?: Record<string, number | boolean>,
  ) => Promise<ArrayBuffer>;
  readonly pngDecode: (buffer: ArrayBuffer, options?: { bitDepth?: 8 }) => Promise<CodecImageData>;
  readonly pngEncode: (data: CodecImageData, options?: { bitDepth?: 8 }) => Promise<ArrayBuffer>;
  readonly webpDecode: (buffer: ArrayBuffer) => Promise<CodecImageData>;
}

export interface SniffedImage {
  readonly mimeType: SupportedMime;
  readonly width: number;
  readonly height: number;
  readonly channels: number;
  readonly frames: number;
  readonly animated: boolean;
  readonly orientation: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
}

export type SniffFailureCode =
  | 'unsupported'
  | 'mime_mismatch'
  | 'invalid_image'
  | 'dimensions_exceeded'
  | 'channels_exceeded'
  | 'frames_exceeded'
  | 'animated';

export type ImageSniffResult =
  | { readonly ok: true; readonly image: SniffedImage }
  | { readonly ok: false; readonly code: SniffFailureCode };

export interface DecodedImage {
  readonly data: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly orientation: SniffedImage['orientation'];
}

let codecState: CodecState | null = null;
let codecInitialization: Promise<void> | null = null;

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/** Load each codec from a compiled on-disk module exactly once. */
export async function initializeAttachmentDecoder(): Promise<void> {
  if (codecState !== null) return;
  codecInitialization ??= loadCodecs();
  try {
    await codecInitialization;
  } catch (error: unknown) {
    codecInitialization = null;
    throw error;
  }
}

/** Parse only bounded image headers before any codec call can allocate pixels. */
export function sniffImage(bytes: Uint8Array, declaredMime: string): ImageSniffResult {
  if (declaredMime !== JPEG && declaredMime !== PNG && declaredMime !== WEBP) {
    return { ok: false, code: 'unsupported' };
  }
  const actualMime = sniffMagic(bytes);
  if (actualMime === null) return { ok: false, code: 'unsupported' };
  if (actualMime !== declaredMime) return { ok: false, code: 'mime_mismatch' };
  const parsed =
    actualMime === JPEG
      ? parseJpegHeader(bytes)
      : actualMime === PNG
        ? parsePngHeader(bytes)
        : parseWebpHeader(bytes);
  if (parsed === null) return { ok: false, code: 'invalid_image' };
  if (parsed.width <= 0 || parsed.height <= 0) {
    return { ok: false, code: 'invalid_image' };
  }
  if (parsed.animated) return { ok: false, code: 'animated' };
  if (parsed.frames > 1) return { ok: false, code: 'frames_exceeded' };
  if (parsed.channels > 4) return { ok: false, code: 'channels_exceeded' };
  if (
    parsed.width > MAX_SOURCE_EDGE ||
    parsed.height > MAX_SOURCE_EDGE ||
    parsed.width > Math.floor(MAX_DECODED_AREA / parsed.height)
  ) {
    return { ok: false, code: 'dimensions_exceeded' };
  }
  return { ok: true, image: parsed };
}

/** Decode only a header-accepted image inside the codec's WASM linear memory. */
export async function decodeImage(
  bytes: Uint8Array,
  sniffed: SniffedImage,
  timeoutMs = IMAGE_DECODE_TIMEOUT_MS,
): Promise<DecodedImage> {
  await initializeAttachmentDecoder();
  const state = codecState;
  if (state === null) throw new Error('Image decoder is not initialized.');
  const input = toArrayBuffer(bytes);
  const decoded = await withTimeout(
    sniffed.mimeType === JPEG
      ? state.jpegDecode(input, { preserveOrientation: false })
      : sniffed.mimeType === PNG
        ? state.pngDecode(input, { bitDepth: 8 })
        : state.webpDecode(input),
    timeoutMs,
  );
  if (
    !Number.isSafeInteger(decoded.width) ||
    !Number.isSafeInteger(decoded.height) ||
    decoded.width <= 0 ||
    decoded.height <= 0 ||
    decoded.width > MAX_SOURCE_EDGE ||
    decoded.height > MAX_SOURCE_EDGE ||
    decoded.width > Math.floor(MAX_DECODED_AREA / decoded.height) ||
    decoded.data.byteLength !== decoded.width * decoded.height * 4
  ) {
    throw new Error('Decoded raster exceeded the bounded RGBA shape.');
  }
  return {
    data: Uint8Array.from(decoded.data),
    width: decoded.width,
    height: decoded.height,
    orientation: sniffed.orientation,
  };
}

/** Re-encode pixels through the same isolated codec boundary. */
export async function encodeImage(
  image: CodecImageData,
  mimeType: MediaOutputMimeType,
  quality = 88,
  timeoutMs = IMAGE_DECODE_TIMEOUT_MS,
): Promise<Uint8Array> {
  await initializeAttachmentDecoder();
  const state = codecState;
  if (state === null) throw new Error('Image decoder is not initialized.');
  const encoded =
    mimeType === PNG
      ? await withTimeout(state.pngEncode(image, { bitDepth: 8 }), timeoutMs)
      : await withTimeout(
          state.jpegEncode(image, {
            quality,
            progressive: false,
            optimize_coding: true,
          }),
          timeoutMs,
        );
  return Uint8Array.from(new Uint8Array(encoded));
}

// ───────────────────────────────────────────────────────────────────
// 5. HELPERS
// ───────────────────────────────────────────────────────────────────

function sniffMagic(bytes: Uint8Array): SupportedMime | null {
  if (startsWith(bytes, PNG_SIGNATURE)) return PNG;
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return JPEG;
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') {
    return WEBP;
  }
  return null;
}

function parseJpegHeader(bytes: Uint8Array): SniffedImage | null {
  let offset = 2;
  let orientation: SniffedImage['orientation'] = 1;
  let image: SniffedImage | null = null;
  while (offset + 1 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === undefined) return null;
    if (marker === 0xd8 || marker === 0x01) continue;
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker >= 0xd0 && marker <= 0xd7) continue;
    if (offset + 2 > bytes.length) return null;
    const segmentLength = readUint16BE(bytes, offset);
    if (segmentLength === null || segmentLength < 2 || offset + segmentLength > bytes.length) {
      return null;
    }
    const dataStart = offset + 2;
    const dataEnd = offset + segmentLength;
    if (marker === 0xe1) {
      const parsedOrientation = parseExifOrientation(bytes.subarray(dataStart, dataEnd));
      if (parsedOrientation !== null) {
        orientation = parsedOrientation;
        image = withOrientation(image, orientation);
      }
    }
    if (JPEG_SOF_MARKERS.has(marker)) {
      if (image !== null || segmentLength < 8) return null;
      const height = readUint16BE(bytes, dataStart + 1);
      const width = readUint16BE(bytes, dataStart + 3);
      const channels = bytes[dataStart + 5];
      if (width === null || height === null || channels === undefined || channels === 0)
        return null;
      image = {
        mimeType: JPEG,
        width,
        height,
        channels,
        frames: 1,
        animated: false,
        orientation,
      };
    }
    offset = dataEnd;
  }
  return image;
}

function parsePngHeader(bytes: Uint8Array): SniffedImage | null {
  let offset = PNG_SIGNATURE.length;
  let image: SniffedImage | null = null;
  let sawIend = false;
  while (offset + 8 <= bytes.length) {
    const length = readUint32BE(bytes, offset);
    if (length === null || length > bytes.length - offset - 12) return null;
    const typeStart = offset + 4;
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const type = ascii(bytes, typeStart, typeStart + 4);
    if (type === 'IEND') {
      if (image === null || length !== 0) return null;
      offset = dataEnd + 4;
      sawIend = true;
      break;
    }
    if (type === 'IHDR') {
      if (image !== null || length !== 13) return null;
      const width = readUint32BE(bytes, dataStart);
      const height = readUint32BE(bytes, dataStart + 4);
      const colorType = bytes[dataStart + 9];
      const bitDepth = bytes[dataStart + 8];
      if (
        width === null ||
        height === null ||
        width === 0 ||
        height === 0 ||
        colorType === undefined ||
        bitDepth === undefined ||
        ![1, 2, 4, 8, 16].includes(bitDepth) ||
        ![0, 2, 3, 4, 6].includes(colorType)
      ) {
        return null;
      }
      const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 4 ? 2 : 4;
      image = {
        mimeType: PNG,
        width,
        height,
        channels,
        frames: 1,
        animated: false,
        orientation: 1,
      };
    } else if (type === 'acTL' || type === 'fcTL') {
      return image === null ? null : { ...image, frames: 2, animated: true };
    } else if (type === 'eXIf') {
      image = withOrientation(image, parseExifOrientation(bytes.subarray(dataStart, dataEnd)) ?? 1);
    }
    offset = dataEnd + 4;
  }
  return sawIend && offset === bytes.length ? image : null;
}

function parseWebpHeader(bytes: Uint8Array): SniffedImage | null {
  const riffSize = readUint32LE(bytes, 4);
  if (riffSize === null || riffSize !== bytes.length - 8) return null;
  let offset = 12;
  let image: SniffedImage | null = null;
  let orientation: SniffedImage['orientation'] = 1;
  while (offset + 8 <= bytes.length) {
    const type = ascii(bytes, offset, offset + 4);
    const length = readUint32LE(bytes, offset + 4);
    if (length === null || length > bytes.length - offset - 8) return null;
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (type === 'ANIM') {
      return image === null ? null : { ...image, frames: 2, animated: true };
    }
    if (type === 'VP8X') {
      if (length < 10) return null;
      const flags = bytes[dataStart];
      const width = 1 + readUint24LE(bytes, dataStart + 4);
      const height = 1 + readUint24LE(bytes, dataStart + 7);
      if (flags === undefined || width <= 0 || height <= 0) return null;
      if ((flags & 0x02) !== 0) {
        return {
          ...webpImage(width, height, (flags & 0x10) !== 0),
          frames: 2,
          animated: true,
        };
      }
      image = withOrientation(webpImage(width, height, (flags & 0x10) !== 0), orientation);
    } else if (type === 'VP8 ' && image === null) {
      if (
        length < 10 ||
        bytes[dataStart + 3] !== 0x9d ||
        bytes[dataStart + 4] !== 0x01 ||
        bytes[dataStart + 5] !== 0x2a
      )
        return null;
      const widthValue = readUint16LE(bytes, dataStart + 6);
      const heightValue = readUint16LE(bytes, dataStart + 8);
      if (widthValue === null || heightValue === null) return null;
      image = withOrientation(
        webpImage(widthValue & 0x3fff, heightValue & 0x3fff, false),
        orientation,
      );
    } else if (type === 'VP8L' && image === null) {
      if (length < 5 || bytes[dataStart] !== 0x2f) return null;
      const bits =
        (bytes[dataStart + 1] ?? 0) |
        ((bytes[dataStart + 2] ?? 0) << 8) |
        ((bytes[dataStart + 3] ?? 0) << 16) |
        ((bytes[dataStart + 4] ?? 0) << 24);
      const width = 1 + (bits & 0x3fff);
      const height = 1 + ((bits >>> 14) & 0x3fff);
      image = withOrientation(webpImage(width, height, ((bits >>> 28) & 1) !== 0), orientation);
    } else if (type === 'EXIF') {
      orientation = parseExifOrientation(bytes.subarray(dataStart, dataEnd)) ?? orientation;
      image = withOrientation(image, orientation);
    }
    offset = dataEnd + (length % 2);
  }
  return offset === bytes.length ? image : null;
}

function webpImage(width: number, height: number, alpha: boolean): SniffedImage {
  return {
    mimeType: WEBP,
    width,
    height,
    channels: alpha ? 4 : 3,
    frames: 1,
    animated: false,
    orientation: 1,
  };
}

function withOrientation(
  image: SniffedImage | null,
  orientation: SniffedImage['orientation'],
): SniffedImage | null {
  if (image === null) return null;
  return {
    mimeType: image.mimeType,
    width: image.width,
    height: image.height,
    channels: image.channels,
    frames: image.frames,
    animated: image.animated,
    orientation,
  };
}

async function loadCodecs(): Promise<void> {
  const require = createRequire(import.meta.url);
  const pkgDir = (name: string): string => dirname(require.resolve(`${name}/package.json`));
  const mod = async (path: string): Promise<WebAssembly.Module> =>
    WebAssembly.compile(await readFile(path));
  const png = pkgDir('@jsquash/png');
  const jpeg = pkgDir('@jsquash/jpeg');
  const webp = pkgDir('@jsquash/webp');
  const [pngDec, pngEnc, jpgDec, jpgEnc, wpDec, wpEnc] = await Promise.all([
    import('@jsquash/png/decode.js'),
    import('@jsquash/png/encode.js'),
    import('@jsquash/jpeg/decode.js'),
    import('@jsquash/jpeg/encode.js'),
    import('@jsquash/webp/decode.js'),
    import('@jsquash/webp/encode.js'),
  ]);
  const [pngWasm, jpgDecWasm, jpgEncWasm, wpDecWasm, wpEncWasm] = await Promise.all([
    mod(join(png, 'codec/pkg/squoosh_png_bg.wasm')),
    mod(join(jpeg, 'codec/dec/mozjpeg_dec.wasm')),
    mod(join(jpeg, 'codec/enc/mozjpeg_enc.wasm')),
    mod(join(webp, 'codec/dec/webp_dec.wasm')),
    mod(join(webp, 'codec/enc/webp_enc.wasm')),
  ]);
  assertLinearMemory(pngWasm, 'png');
  assertLinearMemory(jpgDecWasm, 'jpeg-decode');
  assertLinearMemory(jpgEncWasm, 'jpeg-encode');
  assertLinearMemory(wpDecWasm, 'webp-decode');
  assertLinearMemory(wpEncWasm, 'webp-encode');
  await pngDec.init(pngWasm);
  await pngEnc.init(pngWasm);
  await jpgDec.init(jpgDecWasm);
  await jpgEnc.init(jpgEncWasm);
  await wpDec.init(wpDecWasm);
  await wpEnc.init(wpEncWasm);
  codecState = {
    jpegDecode: jpgDec.default,
    jpegEncode: (data, options) => jpgEnc.default(data as unknown as ImageData, options),
    pngDecode: (buffer, options) => pngDec.default(buffer, options),
    pngEncode: (data, options) => pngEnc.default(data as unknown as ImageData, options),
    webpDecode: wpDec.default,
  };
}

function assertLinearMemory(module: WebAssembly.Module, codec: string): void {
  if (!WebAssembly.Module.exports(module).some((entry) => entry.kind === 'memory')) {
    throw new Error(`WASM codec ${codec} did not expose isolated linear memory.`);
  }
}

function parseExifOrientation(bytes: Uint8Array): SniffedImage['orientation'] | null {
  let start = 0;
  if (bytes.length >= 6 && ascii(bytes, 0, 6) === 'Exif\0\0') start = 6;
  if (bytes.length - start < 8) return null;
  const littleEndian = ascii(bytes, start, start + 2) === 'II';
  if (!littleEndian && ascii(bytes, start, start + 2) !== 'MM') return null;
  const read16 = (offset: number): number | null =>
    littleEndian ? readUint16LE(bytes, offset) : readUint16BE(bytes, offset);
  const read32 = (offset: number): number | null =>
    littleEndian ? readUint32LE(bytes, offset) : readUint32BE(bytes, offset);
  const magic = read16(start + 2);
  const directoryOffset = read32(start + 4);
  if (magic !== 42 || directoryOffset === null || directoryOffset > bytes.length - start - 2)
    return null;
  const directory = start + directoryOffset;
  const entries = read16(directory);
  if (entries === null || entries > 512 || directory + 2 + entries * 12 > bytes.length) return null;
  for (let index = 0; index < entries; index += 1) {
    const entry = directory + 2 + index * 12;
    const tag = read16(entry);
    const type = read16(entry + 2);
    const count = read32(entry + 4);
    if (tag === 0x0112 && type === 3 && count === 1) {
      const value = read16(entry + 8);
      return isOrientation(value) ? value : null;
    }
  }
  return null;
}

function isOrientation(value: number | null): value is SniffedImage['orientation'] {
  return value !== null && value >= 1 && value <= 8;
}

function startsWith(bytes: Uint8Array, prefix: Uint8Array): boolean {
  return bytes.length >= prefix.length && prefix.every((byte, index) => bytes[index] === byte);
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end));
}

function readUint16BE(bytes: Uint8Array, offset: number): number | null {
  if (offset < 0 || offset + 2 > bytes.length) return null;
  return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
}

function readUint16LE(bytes: Uint8Array, offset: number): number | null {
  if (offset < 0 || offset + 2 > bytes.length) return null;
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8);
}

function readUint32BE(bytes: Uint8Array, offset: number): number | null {
  if (offset < 0 || offset + 4 > bytes.length) return null;
  return (
    (bytes[offset] ?? 0) * 0x1000000 +
    ((bytes[offset + 1] ?? 0) << 16) +
    ((bytes[offset + 2] ?? 0) << 8) +
    (bytes[offset + 3] ?? 0)
  );
}

function readUint32LE(bytes: Uint8Array, offset: number): number | null {
  if (offset < 0 || offset + 4 > bytes.length) return null;
  return (
    (bytes[offset] ?? 0) +
    ((bytes[offset + 1] ?? 0) << 8) +
    ((bytes[offset + 2] ?? 0) << 16) +
    (bytes[offset + 3] ?? 0) * 0x1000000
  );
}

function readUint24LE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0) + ((bytes[offset + 1] ?? 0) << 8) + ((bytes[offset + 2] ?? 0) << 16);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Image codec timeout.')), timeoutMs);
    timer.unref?.();
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
