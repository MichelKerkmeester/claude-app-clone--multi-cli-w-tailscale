import { createHash } from 'node:crypto';

import type { FilePreviewBlock } from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it } from 'vitest';

import { ArtifactStore } from '../src/store/artifact-store.js';
import { RelayStore } from '../src/store/relay-store.js';

const BYTES = Buffer.from('safe relay artifact\n', 'utf8');
const IDENTITY = {
  sessionId: 'session_local',
  artifactId: 'artifact_store_001',
  revision: 'rev_store_001',
} as const;

function descriptor(bytes = BYTES, overrides: Partial<FilePreviewBlock> = {}): FilePreviewBlock {
  return {
    id: 'block_artifact_store_001',
    revision: IDENTITY.revision,
    seq: 1,
    occurredAt: '2026-01-01T00:00:00.000Z',
    kind: 'file_preview',
    artifactId: IDENTITY.artifactId,
    displayName: 'safe.txt',
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

function digest(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

describe('immutable artifact store', () => {
  it('stores sanitized bytes once and rejects identity reuse with different bytes', () => {
    const store = new RelayStore();
    try {
      const artifacts = new ArtifactStore(store.databaseHandle(), {
        now: () => Date.parse('2026-01-01T00:00:00.000Z'),
      });
      const first = artifacts.putArtifact({
        ...IDENTITY,
        descriptor: descriptor(),
        bytes: BYTES,
        expiresAt: '2026-01-02T00:00:00.000Z',
      });
      const duplicate = artifacts.putArtifact({
        ...IDENTITY,
        descriptor: descriptor(),
        bytes: BYTES,
        expiresAt: '2026-01-02T00:00:00.000Z',
      });
      expect(duplicate.digest).toBe(first.digest);
      expect(duplicate.bytes.equals(BYTES)).toBe(true);

      const changed = Buffer.from('substituted bytes\n', 'utf8');
      expect(() =>
        artifacts.putArtifact({
          ...IDENTITY,
          descriptor: descriptor(changed),
          bytes: changed,
          expiresAt: '2026-01-02T00:00:00.000Z',
        }),
      ).toThrow(/immutable/);
    } finally {
      store.close();
    }
  });

  it('returns exact bounded ranges with one digest and ETag across every range', () => {
    const store = new RelayStore();
    try {
      const artifacts = new ArtifactStore(store.databaseHandle(), {
        now: () => Date.parse('2026-01-01T00:00:00.000Z'),
      });
      const saved = artifacts.putArtifact({
        ...IDENTITY,
        descriptor: descriptor(),
        bytes: BYTES,
        expiresAt: '2026-01-02T00:00:00.000Z',
      });
      const range = artifacts.readArtifact(IDENTITY, { start: 0, end: 3 });
      expect(range?.bytes.toString('utf8')).toBe('safe');
      expect(range?.contentRange).toBe(`bytes 0-3/${BYTES.byteLength}`);
      expect(range?.etag).toBe(saved.etag);
      expect(range?.revision).toBe(IDENTITY.revision);
      expect(artifacts.readArtifact({ ...IDENTITY, revision: 'latest' })).toBeNull();
    } finally {
      store.close();
    }
  });

  it('fails closed on expiry and revocation, then purges the retained row', () => {
    let now = Date.parse('2026-01-01T00:00:00.000Z');
    const store = new RelayStore();
    try {
      const artifacts = new ArtifactStore(store.databaseHandle(), { now: () => now });
      artifacts.putArtifact({
        ...IDENTITY,
        descriptor: descriptor(),
        bytes: BYTES,
        expiresAt: '2026-01-01T00:00:01.000Z',
        retentionMs: 2_000,
      });
      now += 2_000;
      expect(artifacts.lookupArtifact(IDENTITY).status).toBe('expired');
      expect(artifacts.readArtifact(IDENTITY)).toBeNull();
      expect(artifacts.purgeExpired()).toBe(1);

      artifacts.putArtifact({
        ...IDENTITY,
        descriptor: descriptor(),
        bytes: BYTES,
        expiresAt: '2026-01-02T00:00:00.000Z',
      });
      expect(artifacts.revokeArtifact(IDENTITY)).toBe(true);
      expect(artifacts.lookupArtifact(IDENTITY).status).toBe('revoked');
      expect(artifacts.readArtifact(IDENTITY)).toBeNull();
      expect(artifacts.purgeExpired()).toBe(1);
    } finally {
      store.close();
    }
  });
});
