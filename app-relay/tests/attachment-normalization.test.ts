// ───────────────────────────────────────────────────────────────────
// MODULE: Attachment Decoder and Normalization Tests
// ───────────────────────────────────────────────────────────────────

import { readFile } from 'node:fs/promises';

import { beforeAll, describe, expect, it } from 'vitest';

import {
  decodeImage,
  initializeAttachmentDecoder,
  sniffImage,
} from '../src/attachments/attachment-decoder.js';
import { normalizeImage } from '../src/attachments/attachment-normalizer.js';
import {
  MAX_DECODED_AREA,
  MAX_NORMALIZED_EDGE,
  MAX_NORMALIZED_BYTES_PER_IMAGE,
  MAX_SOURCE_EDGE,
} from '../src/attachments/attachment-limits.js';

beforeAll(async () => {
  await initializeAttachmentDecoder();
});

describe('header-only image safety gate', () => {
  it('rejects HEIC/HEIF and MIME mismatches as unsupported or mismatch', () => {
    expect(sniffImage(new TextEncoder().encode('ftypheic'), 'image/heic')).toEqual({
      ok: false,
      code: 'unsupported',
    });
    expect(sniffImage(new TextEncoder().encode('ftypmif1'), 'image/heif')).toEqual({
      ok: false,
      code: 'unsupported',
    });
    expect(sniffImage(jpegHeader(10, 10, 3), 'image/png')).toEqual({
      ok: false,
      code: 'mime_mismatch',
    });
  });

  it('rejects a borderline decompression bomb before decode allocation', () => {
    const oversizedEdge = sniffImage(pngHeader(MAX_SOURCE_EDGE + 1, 1), 'image/png');
    expect(oversizedEdge).toEqual({ ok: false, code: 'dimensions_exceeded' });

    const oversizedArea = sniffImage(
      pngHeader(MAX_SOURCE_EDGE, Math.floor(MAX_DECODED_AREA / MAX_SOURCE_EDGE) + 1),
      'image/png',
    );
    expect(oversizedArea).toEqual({ ok: false, code: 'dimensions_exceeded' });

    const tooManyChannels = sniffImage(jpegHeader(10, 10, 5), 'image/jpeg');
    expect(tooManyChannels).toEqual({ ok: false, code: 'channels_exceeded' });
  });

  it('rejects animated PNG and animated WebP from container headers', () => {
    expect(sniffImage(animatedPngHeader(), 'image/png')).toEqual({
      ok: false,
      code: 'animated',
    });
    expect(sniffImage(animatedWebpHeader(), 'image/webp')).toEqual({
      ok: false,
      code: 'animated',
    });
  });
});

describe('quarantine normalization round trips', () => {
  it('normalizes JPEG, PNG, and WebP to bounded JPEG or PNG derivatives', async () => {
    const png = await fixture(
      'docs/design-reference/mobile-chat-apps/screens/00-current-pi-remote.png',
    );
    const jpeg = await fixture(
      'specs/context/remote-for-opencode-master/website/public/demos/diff.jpg',
    );
    const webp = base64('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAgA0JaQAA3AA/vv9UAA=');
    for (const [bytes, mime] of [
      [jpeg, 'image/jpeg'],
      [png, 'image/png'],
      [webp, 'image/webp'],
    ] as const) {
      const result = await normalizeImage(bytes, mime);
      expect(result.ok, `${mime}: ${result.ok ? 'ok' : result.code}`).toBe(true);
      if (!result.ok) throw new Error(`Normalization failed: ${result.code}`);
      expect(['image/jpeg', 'image/png']).toContain(result.image.mimeType);
      expect(result.image.bytes.byteLength).toBeLessThanOrEqual(MAX_NORMALIZED_BYTES_PER_IMAGE);
      expect(Math.max(result.image.width, result.image.height)).toBeLessThanOrEqual(
        MAX_NORMALIZED_EDGE,
      );
      expect(sniffImage(result.image.bytes, result.image.mimeType).ok).toBe(true);
    }
  });

  it('honors EXIF orientation and strips the EXIF segment from output', async () => {
    const original = await fixture(
      'specs/context/remote-for-opencode-master/website/public/demos/diff.jpg',
    );
    const oriented = withExifOrientation(original, 6);
    const sourceHeader = sniffImage(oriented, 'image/jpeg');
    expect(sourceHeader).toMatchObject({ ok: true, image: { orientation: 6 } });
    if (!sourceHeader.ok) throw new Error('EXIF fixture did not parse.');

    const result = await normalizeImage(oriented, 'image/jpeg');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(`Normalization failed: ${result.code}`);
    expect(result.image.width).toBe(sourceHeader.image.height);
    expect(result.image.height).toBe(sourceHeader.image.width);
    expect(ascii(result.image.bytes)).not.toContain('Exif');
    expect(ascii(result.image.bytes)).not.toContain('ICC_PROFILE');
  });

  it('rejects malformed codec input without returning usable output bytes', async () => {
    const malformed = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const result = await normalizeImage(malformed, 'image/jpeg');
    expect(result).toEqual({ ok: false, code: 'invalid_image' });
  });

  it('keeps decode output bounded even when the source header is accepted', async () => {
    const png = await fixture(
      'docs/design-reference/mobile-chat-apps/screens/00-current-pi-remote.png',
    );
    const sniffed = sniffImage(png, 'image/png');
    expect(sniffed.ok).toBe(true);
    if (!sniffed.ok) throw new Error('PNG fixture did not parse.');
    const decoded = await decodeImage(png, sniffed.image);
    expect(decoded.data.byteLength).toBe(decoded.width * decoded.height * 4);
    expect(decoded.width * decoded.height).toBeLessThanOrEqual(MAX_DECODED_AREA);
    decoded.data.fill(0);
  });
});

async function fixture(relativePath: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(new URL(`../../${relativePath}`, import.meta.url)));
}

function base64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, 'base64'));
}

function pngHeader(width: number, height: number, colorType = 2): Uint8Array {
  const bytes = new Uint8Array(45);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  writeUint32BE(bytes, 8, 13);
  bytes.set([73, 72, 68, 82], 12);
  writeUint32BE(bytes, 16, width);
  writeUint32BE(bytes, 20, height);
  bytes[24] = 8;
  bytes[25] = colorType;
  bytes.set([73, 69, 78, 68], 37);
  return bytes;
}

function animatedPngHeader(): Uint8Array {
  const bytes = new Uint8Array(53);
  bytes.set(pngHeader(1, 1).subarray(0, 33), 0);
  writeUint32BE(bytes, 33, 8);
  bytes.set([97, 99, 84, 76], 37);
  return bytes;
}

function animatedWebpHeader(): Uint8Array {
  const bytes = new Uint8Array(30);
  bytes.set([82, 73, 70, 70, 22, 0, 0, 0, 87, 69, 66, 80], 0);
  bytes.set([86, 80, 56, 88, 10, 0, 0, 0], 12);
  bytes[20] = 0x02;
  bytes.set([0, 0, 0, 0, 0, 0, 0, 0, 0], 21);
  return bytes;
}

function jpegHeader(width: number, height: number, channels: number): Uint8Array {
  return Uint8Array.from([
    0xff,
    0xd8,
    0xff,
    0xc0,
    0x00,
    0x08,
    0x08,
    (height >>> 8) & 0xff,
    height & 0xff,
    (width >>> 8) & 0xff,
    width & 0xff,
    channels,
  ]);
}

function withExifOrientation(jpeg: Uint8Array, orientation: number): Uint8Array {
  const payload = Uint8Array.from([
    69,
    120,
    105,
    102,
    0,
    0,
    73,
    73,
    42,
    0,
    8,
    0,
    0,
    0,
    1,
    0,
    18,
    1,
    3,
    0,
    1,
    0,
    0,
    0,
    orientation,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  ]);
  const segment = new Uint8Array(4 + payload.byteLength);
  segment.set([0xff, 0xe1, 0, payload.byteLength + 2], 0);
  segment.set(payload, 4);
  const output = new Uint8Array(jpeg.byteLength + segment.byteLength);
  output.set(jpeg.subarray(0, 2), 0);
  output.set(segment, 2);
  output.set(jpeg.subarray(2), 2 + segment.byteLength);
  return output;
}

function writeUint32BE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

function ascii(bytes: Uint8Array): string {
  return String.fromCharCode(...bytes);
}
