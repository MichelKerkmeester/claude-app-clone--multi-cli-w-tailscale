// ───────────────────────────────────────────────────────────────────
// MODULE: Artifact Store TESTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { FilePreviewBlock } from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it } from 'vitest';

import { ArtifactStore } from '../src/store/artifact-store.js';
import { RelayStore } from '../src/store/relay-store.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const BYTES = Buffer.from('safe relay artifact\n', 'utf8');
const IDENTITY = {
  sessionId: 'session_local',
  artifactId: 'artifact_store_001',
  revision: 'rev_store_001',
} as const;

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

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

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

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

describe('inbound derivative artifact store', () => {
  it('uses opaque identities, restrictive permissions, immutable variants, and purge-on-revoke', () => {
    const relay = new RelayStore();
    const root = mkdtempSync(join(tmpdir(), 'pi-remote-inbound-store-'));
    const artifacts = new ArtifactStore(relay.databaseHandle(), { quarantineRoot: root });
    const full = Buffer.from('sanitized-full-pixels');
    const thumbnail = Buffer.from('sanitized-thumb-pixels');
    try {
      const saved = artifacts.putInboundArtifact({
        sessionId: 'session_local',
        blockId: 'block_inbound_store_001',
        blockRevision: 2,
        ownerPrincipal: 'principal_001',
        ownerDeviceId: 'device_001',
        mediaClass: 'raster',
        source: 'extension',
        full: { mediaType: 'image/png', width: 2, height: 2, bytes: full },
        thumbnail: { mediaType: 'image/png', width: 1, height: 1, bytes: thumbnail },
      });
      expect(saved.artifactId).toMatch(/^[A-Za-z0-9][A-Za-z0-9_-]{21,127}$/u);
      expect(saved.artifactId).not.toBe(saved.full.digest);
      expect(saved.full.digest).toBe(digest(full));
      expect(saved.thumbnail.digest).toBe(digest(thumbnail));
      const directories = readdirSync(root);
      expect(directories).toHaveLength(1);
      const directory = join(root, directories[0] ?? '');
      expect(statSync(directory).mode & 0o777).toBe(0o700);
      const files = readdirSync(directory);
      expect(files).toHaveLength(2);
      for (const file of files) expect(statSync(join(directory, file)).mode & 0o777).toBe(0o600);
      expect(
        artifacts.readInboundVariant(
          { sessionId: saved.sessionId, artifactId: saved.artifactId, revision: saved.revision },
          'full',
        )?.bytes.equals(full),
      ).toBe(true);
      expect(
        artifacts.revokeInboundArtifact({
          sessionId: saved.sessionId,
          artifactId: saved.artifactId,
          revision: saved.revision,
        }),
      ).toBe(true);
      expect(
        artifacts.readInboundVariant(
          { sessionId: saved.sessionId, artifactId: saved.artifactId, revision: saved.revision },
          'full',
        ),
      ).toBeNull();
      expect(readdirSync(root)).toEqual([]);
    } finally {
      artifacts.close();
      relay.close();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('enforces the session quota before creating a retrievable directory', () => {
    const relay = new RelayStore();
    const root = mkdtempSync(join(tmpdir(), 'pi-remote-inbound-quota-'));
    const artifacts = new ArtifactStore(relay.databaseHandle(), {
      quarantineRoot: root,
      sessionQuotaBytes: 10,
    });
    try {
      expect(() =>
        artifacts.putInboundArtifact({
          sessionId: 'session_local',
          blockId: 'block_inbound_quota_001',
          blockRevision: 1,
          ownerPrincipal: 'principal_001',
          ownerDeviceId: 'device_001',
          mediaClass: 'screenshot',
          source: 'extension',
          full: { mediaType: 'image/png', width: 1, height: 1, bytes: Buffer.from('123456') },
          thumbnail: { mediaType: 'image/png', width: 1, height: 1, bytes: Buffer.from('123456') },
        }),
      ).toThrow(/quota/iu);
      expect(readdirSync(root)).toEqual([]);
    } finally {
      artifacts.close();
      relay.close();
      rmSync(root, { recursive: true, force: true });
    }
  });
});
