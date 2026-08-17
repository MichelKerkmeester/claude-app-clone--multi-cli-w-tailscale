import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  getAllowlistedArtifactSnapshot,
  sanitizeArtifactSnapshot,
} from '../src/store/artifact-sanitizer.js';

const SECRET = 'CANARY_ARTIFACT_SECRET_001';
const PATH = '/Users/operator/private/source.ts';

function digest(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

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
