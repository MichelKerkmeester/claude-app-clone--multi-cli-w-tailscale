// ───────────────────────────────────────────────────────────────────
// MODULE: Immutable Relay Artifact Store
// ───────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';

import { isFilePreviewBlock, isOpaqueId, type FilePreviewBlock } from '@pi-remote/pi-rpc-protocol';
import type Database from 'better-sqlite3';

export const MAX_ARTIFACT_BYTES = 50 * 1024 * 1024;
export const DEFAULT_ARTIFACT_RETENTION_MS = 24 * 60 * 60 * 1_000;
export const MAX_ARTIFACT_RETENTION_MS = 7 * 24 * 60 * 60 * 1_000;

export interface ArtifactIdentity {
  readonly sessionId: string;
  readonly artifactId: string;
  readonly revision: string;
}

export interface PutArtifactInput extends ArtifactIdentity {
  readonly descriptor: FilePreviewBlock;
  readonly bytes: Uint8Array;
  readonly createdAt?: string;
  readonly expiresAt?: string;
  readonly retentionMs?: number;
}

export interface ArtifactRange {
  readonly start: number;
  readonly end: number;
}

export interface StoredArtifact extends ArtifactIdentity {
  readonly descriptor: FilePreviewBlock;
  readonly bytes: Buffer;
  readonly byteLength: number;
  readonly digest: string;
  readonly etag: string;
  readonly retentionUntil: string;
  readonly expiresAt: string;
  readonly revokedAt: string | null;
  readonly createdAt: string;
}

export interface ArtifactRead extends StoredArtifact {
  readonly rangeStart: number;
  readonly rangeEnd: number;
  readonly totalByteLength: number;
  readonly contentRange: string | null;
}

export type ArtifactLookup =
  | { readonly status: 'ready'; readonly artifact: StoredArtifact }
  | { readonly status: 'missing' | 'expired' | 'revoked' };

interface ArtifactRow {
  readonly sessionId: string;
  readonly artifactId: string;
  readonly revision: string;
  readonly descriptorJson: string;
  readonly artifactBytes: Buffer;
  readonly byteLength: number;
  readonly digest: string;
  readonly etag: string;
  readonly retentionUntil: string;
  readonly expiresAt: string;
  readonly revokedAt: string | null;
  readonly createdAt: string;
}

/** Persist only already-sanitized bytes under an immutable exact identity. */
export class ArtifactStore {
  private readonly now: () => number;
  private readonly maxBytes: number;

  public constructor(
    private readonly database: Database.Database,
    options: { readonly now?: () => number; readonly maxBytes?: number } = {},
  ) {
    this.now = options.now ?? Date.now;
    this.maxBytes = Math.min(Math.max(options.maxBytes ?? MAX_ARTIFACT_BYTES, 1), MAX_ARTIFACT_BYTES);
  }

  public putArtifact(input: PutArtifactInput): StoredArtifact {
    this.assertInput(input);
    const bytes = Buffer.from(input.bytes);
    const digest = digestBytes(bytes);
    const descriptorJson = stableJson(input.descriptor);
    const now = this.now();
    const createdAt = input.createdAt ?? new Date(now).toISOString();
    const expiresAt = input.expiresAt ?? new Date(now + DEFAULT_ARTIFACT_RETENTION_MS).toISOString();
    const retentionMs = boundedRetention(input.retentionMs);
    const retentionUntil = new Date(now + retentionMs).toISOString();
    const etag = `"${digest}"`;

    const transaction = this.database.transaction((): StoredArtifact => {
      const existing = this.findRow(input);
      if (existing !== undefined) {
        const existingBytes = toBuffer(existing.artifactBytes);
        if (
          existing.digest !== digest ||
          existing.byteLength !== bytes.byteLength ||
          Buffer.compare(existingBytes, bytes) !== 0 ||
          existing.descriptorJson !== descriptorJson
        ) {
          throw new Error('Artifact identity is immutable and cannot be reused with different bytes.');
        }
        return this.rowToArtifact(existing);
      }

      this.database
        .prepare(
          `
          INSERT INTO artifacts (
            session_id, artifact_id, revision, descriptor_json, artifact_bytes,
            byte_length, range_start, range_end, digest, etag, mime_type, renderer,
            retention_until, expires_at, revoked_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
        `,
        )
        .run(
          input.sessionId,
          input.artifactId,
          input.revision,
          descriptorJson,
          bytes,
          bytes.byteLength,
          bytes.byteLength - 1,
          digest,
          etag,
          input.descriptor.mimeType,
          input.descriptor.renderer,
          retentionUntil,
          expiresAt,
          createdAt,
        );
      const inserted = this.findRow(input);
      if (inserted === undefined) throw new Error('Artifact disappeared after insertion.');
      return this.rowToArtifact(inserted);
    });
    return transaction();
  }

  public lookupArtifact(identity: ArtifactIdentity, now = this.now()): ArtifactLookup {
    const row = this.findRow(identity);
    if (row === undefined) return { status: 'missing' };
    if (row.revokedAt !== null) return { status: 'revoked' };
    if (Date.parse(row.expiresAt) <= now) return { status: 'expired' };
    return { status: 'ready', artifact: this.rowToArtifact(row) };
  }

  public getArtifact(identity: ArtifactIdentity, now = this.now()): StoredArtifact | null {
    const lookup = this.lookupArtifact(identity, now);
    return lookup.status === 'ready' ? lookup.artifact : null;
  }

  public readArtifact(
    identity: ArtifactIdentity,
    range: ArtifactRange | null = null,
    now = this.now(),
  ): ArtifactRead | null {
    const artifact = this.getArtifact(identity, now);
    if (artifact === null) return null;
    const totalByteLength = artifact.byteLength;
    if (range === null) {
      return {
        ...artifact,
        rangeStart: 0,
        rangeEnd: Math.max(totalByteLength - 1, 0),
        totalByteLength,
        contentRange: null,
      };
    }
    if (
      !Number.isSafeInteger(range.start) ||
      !Number.isSafeInteger(range.end) ||
      range.start < 0 ||
      range.end < range.start ||
      range.start >= totalByteLength
    ) {
      return null;
    }
    const end = Math.min(range.end, totalByteLength - 1);
    return {
      ...artifact,
      bytes: artifact.bytes.subarray(range.start, end + 1),
      rangeStart: range.start,
      rangeEnd: end,
      totalByteLength,
      contentRange: `bytes ${range.start}-${end}/${totalByteLength}`,
    };
  }

  public revokeArtifact(identity: ArtifactIdentity, revokedAt = new Date(this.now()).toISOString()): boolean {
    return (
      this.database
        .prepare(
          `
          UPDATE artifacts SET revoked_at = ?
          WHERE session_id = ? AND artifact_id = ? AND revision = ? AND revoked_at IS NULL
        `,
        )
        .run(revokedAt, identity.sessionId, identity.artifactId, identity.revision).changes > 0
    );
  }

  public revokeSessionArtifacts(sessionId: string, revokedAt = new Date(this.now()).toISOString()): number {
    return this.database
      .prepare('UPDATE artifacts SET revoked_at = ? WHERE session_id = ? AND revoked_at IS NULL')
      .run(revokedAt, sessionId).changes;
  }

  public purgeExpired(now = this.now()): number {
    return this.database
      .prepare(
        `
        DELETE FROM artifacts
        WHERE revoked_at IS NOT NULL OR expires_at <= ? OR retention_until <= ?
      `,
      )
      .run(new Date(now).toISOString(), new Date(now).toISOString()).changes;
  }

  public purge(identity: ArtifactIdentity): boolean {
    return (
      this.database
        .prepare('DELETE FROM artifacts WHERE session_id = ? AND artifact_id = ? AND revision = ?')
        .run(identity.sessionId, identity.artifactId, identity.revision).changes > 0
    );
  }

  private assertInput(input: PutArtifactInput): void {
    if (
      !isOpaqueId(input.sessionId) ||
      !isOpaqueId(input.artifactId) ||
      !isArtifactRevision(input.revision) ||
      input.descriptor.artifactId !== input.artifactId ||
      input.descriptor.revision !== input.revision ||
      input.descriptor.availability !== undefined && input.descriptor.availability !== 'ready' ||
      input.descriptor.content.kind === 'none' ||
      !isFilePreviewBlock(input.descriptor)
    ) {
      throw new TypeError('Relay refused an invalid or unavailable artifact snapshot.');
    }
    const bytes = Buffer.from(input.bytes);
    if (bytes.byteLength > this.maxBytes || input.descriptor.byteLength !== bytes.byteLength) {
      throw new RangeError('Artifact bytes exceed the configured bound.');
    }
    if (input.descriptor.digest !== digestBytes(bytes)) {
      throw new TypeError('Artifact descriptor digest does not match sanitized bytes.');
    }
  }

  private findRow(identity: ArtifactIdentity): ArtifactRow | undefined {
    return this.database
      .prepare(
        `
        SELECT
          session_id AS sessionId,
          artifact_id AS artifactId,
          revision,
          descriptor_json AS descriptorJson,
          artifact_bytes AS artifactBytes,
          byte_length AS byteLength,
          digest,
          etag,
          retention_until AS retentionUntil,
          expires_at AS expiresAt,
          revoked_at AS revokedAt,
          created_at AS createdAt
        FROM artifacts
        WHERE session_id = ? AND artifact_id = ? AND revision = ?
      `,
      )
      .get(identity.sessionId, identity.artifactId, identity.revision) as ArtifactRow | undefined;
  }

  private rowToArtifact(row: ArtifactRow): StoredArtifact {
    const parsed = JSON.parse(row.descriptorJson) as unknown;
    if (!isFilePreviewBlock(parsed)) throw new Error('Relay database contained an invalid artifact.');
    return {
      sessionId: row.sessionId,
      artifactId: row.artifactId,
      revision: row.revision,
      descriptor: parsed,
      bytes: toBuffer(row.artifactBytes),
      byteLength: row.byteLength,
      digest: row.digest,
      etag: row.etag,
      retentionUntil: row.retentionUntil,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
      createdAt: row.createdAt,
    };
  }
}

function digestBytes(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function toBuffer(value: Buffer | Uint8Array): Buffer {
  return Buffer.isBuffer(value) ? value : Buffer.from(value);
}

function boundedRetention(value: number | undefined): number {
  if (value === undefined) return DEFAULT_ARTIFACT_RETENTION_MS;
  if (!Number.isSafeInteger(value) || value <= 0) throw new RangeError('Artifact retention is invalid.');
  return Math.min(value, MAX_ARTIFACT_RETENTION_MS);
}

function isArtifactRevision(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value !== 'latest' &&
    value !== '.' &&
    value !== '..' &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)
  );
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, child]) => child !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`).join(',')}}`;
}
