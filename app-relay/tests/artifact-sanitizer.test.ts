// ───────────────────────────────────────────────────────────────────
// MODULE: Artifact Sanitizer TESTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  getAllowlistedArtifactSnapshot,
  INBOUND_MAX_SOURCE_BYTES,
  sanitizeArtifactSnapshot,
  sanitizeInboundBatch,
  sanitizeInboundImage,
} from '../src/store/artifact-sanitizer.js';
import { decodeImage, encodeImage, sniffImage } from '../src/attachments/attachment-decoder.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const SECRET = 'CANARY_ARTIFACT_SECRET_001';
const PATH = '/Users/operator/private/source.ts';
const STATIC_WEBP = Buffer.from(
  'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAgA0JaQAA3AA/vv9UAA=',
  'base64',
);

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function digest(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function pngFixture(width = 16, height = 16, transparentCorner = false): Buffer {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = row + 1 + x * 4;
      raw[offset] = 240;
      raw[offset + 1] = 220;
      raw[offset + 2] = 200;
      raw[offset + 3] = transparentCorner && x === 0 && y === 0 ? 0 : 255;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.byteLength);
  chunk.writeUInt32BE(data.byteLength, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.byteLength);
  return chunk;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function quarantine(): string {
  return mkdtempSync(join(tmpdir(), 'pi-remote-inbound-test-'));
}

function expectEmpty(root: string): void {
  expect(readdirSync(root)).toEqual([]);
}

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('inbound image sanitizer', () => {
  it('reuses the bounded decoder path and burns a confirmed mask before both encodes', async () => {
    const root = quarantine();
    const source = pngFixture(16, 16, true);
    try {
      const result = await sanitizeInboundImage(source, {
        declaredByteLength: source.byteLength,
        quarantineRoot: root,
        scanner: {
          scan: ({ width, height }) => ({
            status: 'confirmed',
            matches: [{ x: 1, y: 1, width: Math.min(2, width), height: Math.min(2, height), status: 'confirmed' }],
          }),
        },
      });
      expect(result.status).toBe('ready');
      if (result.status !== 'ready') throw new Error('expected ready fixture');
      expect(result.redaction).toBe('applied');
      expect(result.full.mediaType === 'image/png' || result.full.mediaType === 'image/jpeg').toBe(true);
      expect(result.thumbnail.mediaType === 'image/png' || result.thumbnail.mediaType === 'image/jpeg').toBe(true);
      expect(result.full.bytes.byteLength).toBeLessThanOrEqual(2 * 1024 * 1024);
      expect(result.thumbnail.bytes.byteLength).toBeLessThanOrEqual(256 * 1024);
      expect(result.full.digest).toMatch(/^[a-f0-9]{64}$/u);
      expect(result.thumbnail.digest).toMatch(/^[a-f0-9]{64}$/u);
      const fullSniff = sniffImage(result.full.bytes, result.full.mediaType);
      const thumbnailSniff = sniffImage(result.thumbnail.bytes, result.thumbnail.mediaType);
      expect(fullSniff.ok).toBe(true);
      expect(thumbnailSniff.ok).toBe(true);
      if (fullSniff.ok && thumbnailSniff.ok) {
        const fullPixels = await decodeImage(result.full.bytes, fullSniff.image);
        const thumbnailPixels = await decodeImage(result.thumbnail.bytes, thumbnailSniff.image);
        expect(fullPixels.data[3]).toBe(255);
        expect(thumbnailPixels.data[3]).toBe(255);
        expect(Math.abs((fullPixels.data[0] ?? 0) - 36)).toBeLessThanOrEqual(8);
        expect(Math.abs((fullPixels.data[1] ?? 0) - 34)).toBeLessThanOrEqual(8);
        expect(Math.abs((fullPixels.data[2] ?? 0) - 31)).toBeLessThanOrEqual(8);
        expect(Math.abs((thumbnailPixels.data[0] ?? 0) - 36)).toBeLessThanOrEqual(8);
        expect(Math.abs((thumbnailPixels.data[1] ?? 0) - 34)).toBeLessThanOrEqual(8);
        expect(Math.abs((thumbnailPixels.data[2] ?? 0) - 31)).toBeLessThanOrEqual(8);
        fullPixels.data.fill(0);
        thumbnailPixels.data.fill(0);
      }
      result.full.bytes.fill(0);
      result.thumbnail.bytes.fill(0);
      expectEmpty(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('accepts JPEG, PNG, and static WebP sources but emits only bounded JPEG or PNG variants', async () => {
    const rgba = Uint8Array.from([240, 220, 200, 255]);
    const jpeg = Buffer.from(await encodeImage({ data: rgba, width: 1, height: 1 }, 'image/jpeg'));
    for (const source of [jpeg, pngFixture(), STATIC_WEBP]) {
      const root = quarantine();
      try {
        const result = await sanitizeInboundImage(source, {
          declaredByteLength: source.byteLength,
          quarantineRoot: root,
          scanner: { scan: () => ({ status: 'clear', matches: [] }) },
        });
        expect(result.status).toBe('ready');
        if (result.status === 'ready') {
          expect(['image/jpeg', 'image/png']).toContain(result.full.mediaType);
          expect(['image/jpeg', 'image/png']).toContain(result.thumbnail.mediaType);
        }
        expectEmpty(root);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('withholds when scanning is unavailable and leaves no quarantine residue', async () => {
    const root = quarantine();
    try {
      const result = await sanitizeInboundImage(pngFixture(), { quarantineRoot: root });
      expect(result).toEqual({ status: 'withheld', reason: 'redaction-unavailable' });
      expectEmpty(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('withholds unsupported, truncated, and over-bound inputs without trusting a claimed MIME', async () => {
    const cases = [
      Buffer.from('<svg><script>secret</script></svg>', 'utf8'),
      pngFixture().subarray(0, 12),
      Buffer.alloc(INBOUND_MAX_SOURCE_BYTES + 1),
    ];
    for (const source of cases) {
      const root = quarantine();
      try {
        const result = await sanitizeInboundImage(source, {
          claimedMediaType: 'image/png',
          declaredByteLength: source.byteLength,
          quarantineRoot: root,
          scanner: { scan: () => ({ status: 'clear', matches: [] }) },
        });
        expect(result.status).toBe('withheld');
        expectEmpty(root);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('withholds uncertain scanner output and invalid approved masks', async () => {
    const source = pngFixture();
    for (const options of [
      { scanner: { scan: () => ({ status: 'uncertain', matches: [] }) } },
      {
        scanner: { scan: () => ({ status: 'clear', matches: [] }) },
        exclusionMasks: [{ x: 15, y: 15, width: 2, height: 2 }],
      },
    ]) {
      const root = quarantine();
      try {
        const result = await sanitizeInboundImage(source, {
          ...options,
          declaredByteLength: source.byteLength,
          quarantineRoot: root,
        });
        expect(result.status).toBe('withheld');
        expectEmpty(root);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('bounds a batch to four images and thirty MiB before worker fan-out', async () => {
    const source = pngFixture();
    const tooMany = await sanitizeInboundBatch([source, source, source, source, source]);
    expect(tooMany).toHaveLength(5);
    expect(tooMany.every((item) => item.status === 'withheld' && item.reason === 'too-large')).toBe(true);
    const tooLarge = await sanitizeInboundBatch(
      [
        { source, options: { declaredByteLength: 16 * 1024 * 1024 } },
        { source, options: { declaredByteLength: 16 * 1024 * 1024 } },
      ],
    );
    expect(tooLarge.every((item) => item.status === 'withheld' && item.reason === 'too-large')).toBe(true);
  });
});

describe('artifact sanitizer', () => {
  it('projects only an explicitly allowlisted, bounded text snapshot', () => {
    const sanitized = sanitizeArtifactSnapshot({
      artifactSnapshot: {
        approved: true,
        artifactId: 'artifact_sanitizer_001',
        revision: 'rev_sanitizer_001',
        displayName: PATH,
        renderer: 'code',
        mimeType: 'text/typescript',
        text: `const value = "token=${SECRET}";\nread ${PATH}\n`,
        language: 'typescript',
        redaction: 'not-needed',
        completeness: 'complete',
        shareAllowed: true,
        inlineText: true,
      },
    });
    expect(sanitized).not.toBeNull();
    if (sanitized === null) throw new Error('sanitizer rejected the approved text fixture');
    expect(sanitized.descriptor.displayName).toBe('File preview');
    expect(sanitized.descriptor.availability).toBe('ready');
    expect(sanitized.descriptor.content.kind).toBe('inline-text');
    expect(sanitized.bytes).not.toBeNull();
    const serialized = JSON.stringify(sanitized);
    expect(serialized).not.toContain(SECRET);
    expect(serialized).not.toContain('/Users/operator');
    expect(sanitized.descriptor.digest).toBe(digest(sanitized.bytes ?? new Uint8Array()));
    expect(sanitized.descriptor.shareAllowed).toBe(true);
  });

  it('requires the explicit approval marker and drops unsafe binary bytes', () => {
    expect(getAllowlistedArtifactSnapshot({ artifactId: 'artifact_001', revision: 'rev_001' })).toBe(
      null,
    );
    const binaryCanary = Buffer.from('BINARY_CANARY_BYTES', 'utf8');
    const sanitized = sanitizeArtifactSnapshot({
      artifactSnapshot: {
        approved: true,
        artifactId: 'artifact_binary_001',
        revision: 'rev_binary_001',
        displayName: 'report.pdf',
        renderer: 'pdf',
        mimeType: 'application/pdf',
        bytes: binaryCanary,
        redaction: 'not-needed',
        completeness: 'complete',
        shareAllowed: true,
      },
    });
    expect(sanitized?.descriptor.availability).toBe('withheld');
    expect(sanitized?.descriptor.content).toEqual({ kind: 'none' });
    expect(sanitized?.bytes).toBeNull();
    expect(JSON.stringify(sanitized)).not.toContain('BINARY_CANARY_BYTES');
    expect(sanitized?.descriptor.shareAllowed).toBe(false);
  });

  it('preserves explicit unavailable states as safe metadata-only descriptors', () => {
    for (const availability of ['withheld', 'missing', 'denied', 'unsupported'] as const) {
      const sanitized = sanitizeArtifactSnapshot({
        approved: true,
        artifactId: `artifact_${availability}_001`,
        revision: `rev_${availability}_001`,
        displayName: 'safe.txt',
        renderer: availability === 'unsupported' ? 'unsupported' : 'text',
        mimeType: availability === 'unsupported' ? 'application/octet-stream' : 'text/plain',
        availability,
        redaction: availability === 'denied' ? 'withheld' : 'applied',
        completeness: 'complete',
        shareAllowed: true,
      });
      expect(sanitized?.descriptor.availability).toBe(availability);
      expect(sanitized?.descriptor.content).toEqual({ kind: 'none' });
      expect(sanitized?.bytes).toBeNull();
      expect(sanitized?.descriptor.shareAllowed).toBe(false);
    }
  });
});
