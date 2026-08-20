import { createHash } from 'node:crypto';

import type { FilePreviewBlock } from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it } from 'vitest';

import { sanitizeArtifactSnapshot } from '../src/store/artifact-sanitizer.js';
import { ArtifactStore } from '../src/store/artifact-store.js';
import { RelayStore } from '../src/store/relay-store.js';

const SESSION_ID = 'session_phase3_fixtures';
const ARTIFACT_ID = 'artifact_phase3_fixtures';
const REVISION = 'rev_phase3_fixture_001';

function digest(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function sanitizeText(text: string, overrides: Record<string, unknown> = {}) {
  return sanitizeArtifactSnapshot({
    artifactSnapshot: {
      approved: true,
      artifactId: ARTIFACT_ID,
      revision: REVISION,
      displayName: 'fixture.txt',
      renderer: 'text',
      mimeType: 'text/plain',
      text,
      inlineText: true,
      redaction: 'not-needed',
      completeness: 'complete',
      shareAllowed: true,
      ...overrides,
    },
  });
}

function storedDescriptor(
  bytes: Uint8Array,
  overrides: Partial<FilePreviewBlock> = {},
): FilePreviewBlock {
  return {
    id: 'block_phase3_fixture_001',
    revision: REVISION,
    seq: 1,
    occurredAt: '2026-08-17T10:00:00.000Z',
    kind: 'file_preview',
    artifactId: ARTIFACT_ID,
    displayName: 'fixture.txt',
    renderer: 'text',
    mimeType: 'text/plain',
    byteLength: bytes.byteLength,
    digest: digest(bytes),
    redaction: 'applied',
    completeness: 'complete',
    shareAllowed: false,
    availability: 'ready',
    content: { kind: 'artifact-ref' },
    ...overrides,
  };
}

describe('artifact response fixtures', () => {
  it('projects an empty exact response without inventing body bytes', () => {
    const result = sanitizeText('');
    expect(result?.descriptor.availability).toBe('ready');
    expect(result?.descriptor.byteLength).toBe(0);
    expect(result?.descriptor.digest).toBe(digest(new Uint8Array()));
    expect(result?.bytes?.byteLength).toBe(0);
    expect(result?.descriptor.content).toMatchObject({ kind: 'inline-text', text: '' });
  });

  it('preserves a whitespace-only exact response as displayed text', () => {
    const whitespace = ' \n\t  \n';
    const result = sanitizeText(whitespace);
    expect(result?.descriptor.availability).toBe('ready');
    expect(result?.descriptor.completeness).toBe('complete');
    expect(result?.bytes?.toString('utf8')).toBe(whitespace);
    expect(result?.descriptor.digest).toBe(digest(Buffer.from(whitespace, 'utf8')));
  });

  it('bounds an excerpt response and marks it truncated before persistence', () => {
    const result = sanitizeText('x'.repeat(2 * 1024 * 1024 + 17), { inlineText: false });
    expect(result?.descriptor.availability).toBe('ready');
    expect(result?.descriptor.completeness).toBe('excerpt');
    expect(result?.descriptor.content).toEqual({ kind: 'artifact-ref' });
    expect(result?.bytes?.byteLength).toBe(2 * 1024 * 1024);
    expect(result?.descriptor.digest).toBe(digest(result?.bytes ?? new Uint8Array()));
  });

  it('redacts sensitive text while retaining only the sanitized partial view', () => {
    const secret = 'fixture-secret-value-001';
    const source = `token=${secret}\npath=/Users/operator/private/file.txt`;
    const result = sanitizeText(source);
    const displayed = result?.bytes?.toString('utf8') ?? '';
    expect(result?.descriptor.redaction).toBe('applied');
    expect(displayed).not.toContain(secret);
    expect(displayed).not.toContain('/Users/operator');
    expect(displayed).toContain('[REDACTED_SECRET]');
    expect(displayed).toContain('[REDACTED_PATH]');
  });

  it('rejects a digest-mismatch response before the artifact is stored', () => {
    const store = new RelayStore();
    try {
      const artifacts = new ArtifactStore(store.databaseHandle());
      const bytes = Buffer.from('verified bytes', 'utf8');
      expect(() =>
        artifacts.putArtifact({
          sessionId: SESSION_ID,
          artifactId: ARTIFACT_ID,
          revision: REVISION,
          descriptor: storedDescriptor(bytes, { digest: '0'.repeat(64) }),
          bytes,
        }),
      ).toThrow(/digest/iu);
      expect(
        artifacts.lookupArtifact({
          sessionId: SESSION_ID,
          artifactId: ARTIFACT_ID,
          revision: REVISION,
        }),
      ).toEqual({ status: 'missing' });
    } finally {
      store.close();
    }
  });

  it('returns a stale exact-revision response as missing without falling back to latest', () => {
    const store = new RelayStore();
    try {
      const artifacts = new ArtifactStore(store.databaseHandle());
      const bytes = Buffer.from('old exact revision', 'utf8');
      const oldIdentity = { sessionId: SESSION_ID, artifactId: ARTIFACT_ID, revision: REVISION };
      artifacts.putArtifact({
        ...oldIdentity,
        descriptor: storedDescriptor(bytes),
        bytes,
      });
      const newIdentity = { ...oldIdentity, revision: 'rev_phase3_fixture_002' };
      expect(artifacts.lookupArtifact(oldIdentity).status).toBe('ready');
      expect(artifacts.lookupArtifact(newIdentity)).toEqual({ status: 'missing' });
      expect(artifacts.readArtifact(newIdentity)).toBeNull();
      expect(artifacts.readArtifact({ ...oldIdentity, revision: 'latest' })).toBeNull();
      expect(artifacts.readArtifact(oldIdentity)?.bytes.toString('utf8')).toBe(
        'old exact revision',
      );
    } finally {
      store.close();
    }
  });
});
