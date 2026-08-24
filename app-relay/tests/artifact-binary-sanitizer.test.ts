// ───────────────────────────────────────────────────────────────────
// MODULE: Artifact Binary Sanitizer TESTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { sanitizeArtifactSnapshot } from '../src/store/artifact-sanitizer.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const PNG_WITH_METADATA = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
const PDF_WITHOUT_ACTIVE_CONTENT = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Page /Contents 2 0 R >>\nendobj\n2 0 obj\n<< /Length 0 >>\nstream\n\nendstream\nendobj\n%%EOF\n',
  'latin1',
);

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function digest(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function chunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, 'ascii');
  const output = Buffer.alloc(12 + data.byteLength);
  output.writeUInt32BE(data.byteLength, 0);
  typeBytes.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.byteLength);
  return output;
}

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngWithTextCanary(): Buffer {
  const metadata = Buffer.from('Comment\0IMAGE_METADATA_CANARY', 'latin1');
  const ihdrEnd = 8 + 4 + 4 + 13 + 4;
  return Buffer.concat([
    PNG_WITH_METADATA.subarray(0, ihdrEnd),
    chunk('tEXt', metadata),
    PNG_WITH_METADATA.subarray(ihdrEnd),
  ]);
}

function approved(
  renderer: 'image' | 'pdf',
  mimeType: string,
  bytes: Buffer,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    approved: true,
    artifactId: `artifact_${renderer}_binary_001`,
    revision: `rev_${renderer}_binary_001`,
    displayName: renderer === 'image' ? 'photo.png' : 'report.pdf',
    renderer,
    mimeType,
    bytes,
    redaction: 'not-needed',
    completeness: 'complete',
    shareAllowed: true,
    ...extra,
  };
}

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('binary artifact sanitizer', () => {
  it('decodes and re-encodes PNG bytes without metadata or profile chunks', () => {
    const sanitized = sanitizeArtifactSnapshot({
      artifactSnapshot: approved('image', 'image/png', pngWithTextCanary()),
    });
    expect(sanitized?.descriptor.availability).toBe('ready');
    expect(sanitized?.descriptor.byteLength).toBeGreaterThan(0);
    expect(sanitized?.descriptor.digest).toBe(digest(sanitized?.bytes ?? Buffer.alloc(0)));
    expect(sanitized?.descriptor.thumbnailRef).toMatch(/^thumb_[a-f0-9]{32}$/);
    expect(sanitized?.bytes?.toString('latin1')).not.toContain('IMAGE_METADATA_CANARY');
    expect(sanitized?.bytes?.toString('latin1')).not.toContain('tEXt');
  });

  it('admits a verified inert PDF and only then enables text selection metadata', () => {
    const sanitized = sanitizeArtifactSnapshot({
      artifactSnapshot: approved('pdf', 'application/pdf', PDF_WITHOUT_ACTIVE_CONTENT),
    });
    expect(sanitized?.descriptor.availability).toBe('ready');
    expect(sanitized?.descriptor.textLayerSafe).toBe(true);
    expect(sanitized?.descriptor.pageCount).toBe(1);
    expect(sanitized?.descriptor.digest).toBe(digest(sanitized?.bytes ?? Buffer.alloc(0)));
  });

  it.each([
    '/OpenAction 4 0 R',
    '/JavaScript (app.alert)',
    '/Annots [4 0 R]',
    '/Filter /FlateDecode',
    '/Metadata 4 0 R',
    '/PieceInfo << /Secret (metadata) >>',
  ])('withholds PDFs that cannot be attested inert: %s', (unsafeName) => {
    const unsafePdf = Buffer.from(
      `%PDF-1.4\n1 0 obj\n<< /Type /Page ${unsafeName} >>\nendobj\n%%EOF\n`,
      'latin1',
    );
    const sanitized = sanitizeArtifactSnapshot({
      artifactSnapshot: approved('pdf', 'application/pdf', unsafePdf),
    });
    expect(sanitized?.descriptor.availability).toBe('withheld');
    expect(sanitized?.descriptor.content).toEqual({ kind: 'none' });
    expect(sanitized?.descriptor.textLayerSafe).toBeUndefined();
    expect(sanitized?.bytes).toBeNull();
    expect(sanitized?.descriptor.shareAllowed).toBe(false);
  });

  it('fails closed for non-PNG raster payloads instead of admitting unsanitized bytes', () => {
    const sanitized = sanitizeArtifactSnapshot({
      artifactSnapshot: approved('image', 'image/svg+xml', Buffer.from('<svg><script>alert(1)</script></svg>')),
    });
    expect(sanitized?.descriptor.availability).toBe('unsupported');
    expect(sanitized?.descriptor.content).toEqual({ kind: 'none' });
    expect(sanitized?.bytes).toBeNull();
  });
});

