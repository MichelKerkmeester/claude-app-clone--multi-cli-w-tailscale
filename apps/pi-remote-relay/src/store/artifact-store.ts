// ───────────────────────────────────────────────────────────────────
// MODULE: Immutable Relay Artifact Store
// ───────────────────────────────────────────────────────────────────

import { createHash, randomBytes } from 'node:crypto';
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';

import {
  isFilePreviewBlock,
  isInboundImageArtifactVariant,
  isOpaqueId,
  type FilePreviewBlock,
  type InboundImageArtifact,
  type InboundImageArtifactVariant,
  type InboundImageArtifactMediaType,
  type InboundImageMediaClass,
  type InboundImageSource,
} from '@pi-remote/pi-rpc-protocol';
import type Database from 'better-sqlite3';

export const MAX_ARTIFACT_BYTES = 50 * 1024 * 1024;
export const DEFAULT_ARTIFACT_RETENTION_MS = 24 * 60 * 60 * 1_000;
export const MAX_ARTIFACT_RETENTION_MS = 7 * 24 * 60 * 60 * 1_000;
export const MAX_INBOUND_SOURCE_BYTES = 15 * 1024 * 1024;
export const MAX_INBOUND_BATCH_BYTES = 30 * 1024 * 1024;
export const MAX_INBOUND_IMAGES_PER_TURN = 4;
export const MAX_INBOUND_SESSION_BYTES = 50 * 1024 * 1024;
export const MAX_INBOUND_TURN_BYTES = 8 * 1024 * 1024;
export const INBOUND_ARTIFACT_RETENTION_MS = 24 * 60 * 60 * 1_000;
export const MAX_INBOUND_FULL_BYTES = 2 * 1024 * 1024;
export const MAX_INBOUND_THUMBNAIL_BYTES = 256 * 1024;

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

export interface InboundArtifactVariantInput {
  readonly mediaType: InboundImageArtifactMediaType;
  readonly width: number;
  readonly height: number;
  readonly bytes: Uint8Array;
  readonly digest?: string;
}

export interface PutInboundArtifactInput {
  readonly sessionId: string;
  readonly artifactId?: string;
  readonly revision?: string;
  readonly blockId: string;
  readonly blockRevision: number;
  readonly turnId?: string;
  readonly ownerPrincipal: string;
  readonly ownerDeviceId: string;
  readonly mediaClass: InboundImageMediaClass;
  readonly source: InboundImageSource;
  readonly full: InboundArtifactVariantInput;
  readonly thumbnail: InboundArtifactVariantInput;
  readonly createdAt?: string;
  readonly expiresAt?: string;
}

export interface RecordInboundWithheldInput {
  readonly sessionId: string;
  readonly artifactId?: string;
  readonly revision?: string;
  readonly blockId: string;
  readonly blockRevision: number;
  readonly ownerPrincipal: string;
  readonly ownerDeviceId: string;
  readonly mediaClass: InboundImageMediaClass;
  readonly createdAt?: string;
  readonly expiresAt?: string;
}

export type InboundArtifactVariant = InboundImageArtifactVariant;

export interface InboundStoredArtifact {
  readonly sessionId: string;
  readonly artifactId: string;
  readonly revision: string;
  readonly blockId: string;
  readonly blockRevision: number;
  readonly ownerPrincipal: string;
  readonly ownerDeviceId: string;
  readonly mediaClass: InboundImageMediaClass;
  readonly source: InboundImageSource;
  readonly full: InboundArtifactVariant;
  readonly thumbnail: InboundArtifactVariant;
  readonly expiresAt: string;
  readonly retentionUntil: string;
  readonly createdAt: string;
  readonly revokedAt: string | null;
}

export type InboundArtifactLookup =
  | { readonly status: 'ready'; readonly artifact: InboundStoredArtifact }
  | { readonly status: 'withheld' | 'missing' | 'expired' | 'revoked' };

interface ManagedInboundArtifact extends InboundStoredArtifact {
  readonly fullPath: string;
  readonly thumbnailPath: string;
  lifecycle: 'ready' | 'withheld' | 'expired' | 'revoked';
  readonly turnId?: string;
}

interface WithheldInboundRecord {
  readonly sessionId: string;
  readonly artifactId: string;
  readonly revision: string;
  readonly expiresAt: string;
}

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
  private readonly inboundRoot: string;
  private readonly ownsInboundRoot: boolean;
  private readonly inboundSessionQuota: number;
  private readonly inboundArtifacts = new Map<string, ManagedInboundArtifact>();
  private readonly withheldInboundArtifacts = new Map<string, WithheldInboundRecord>();

  public constructor(
    private readonly database: Database.Database,
    options: {
      readonly now?: () => number;
      readonly maxBytes?: number;
      readonly quarantineRoot?: string;
      readonly sessionQuotaBytes?: number;
    } = {},
  ) {
    this.now = options.now ?? Date.now;
    this.maxBytes = Math.min(Math.max(options.maxBytes ?? MAX_ARTIFACT_BYTES, 1), MAX_ARTIFACT_BYTES);
    this.inboundSessionQuota = Math.min(
      Math.max(options.sessionQuotaBytes ?? MAX_INBOUND_SESSION_BYTES, 1),
      MAX_INBOUND_SESSION_BYTES,
    );
    this.ownsInboundRoot = options.quarantineRoot === undefined;
    this.inboundRoot = resolve(
      options.quarantineRoot ?? join(tmpdir(), `pi-remote-inbound-${randomBytes(18).toString('hex')}`),
    );
    assertInboundRoot(this.inboundRoot);
    mkdirSync(this.inboundRoot, { recursive: true, mode: 0o700 });
    chmodSync(this.inboundRoot, 0o700);
  }

  public get quarantineRoot(): string {
    return this.inboundRoot;
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
      // Copy the bounded response so a range cannot retain the full artifact backing buffer.
      bytes: Buffer.from(artifact.bytes.subarray(range.start, end + 1)),
      rangeStart: range.start,
      rangeEnd: end,
      totalByteLength,
      contentRange: `bytes ${range.start}-${end}/${totalByteLength}`,
    };
  }

  /** Store only final inbound derivatives under random filesystem names. */
  public putInboundArtifact(input: PutInboundArtifactInput): InboundStoredArtifact {
    this.assertInboundInput(input);
    const artifactId = input.artifactId ?? opaqueInboundId('artifact');
    const revision = input.revision ?? opaqueInboundId('revision');
    if (!isOpaqueId(artifactId) || !isOpaqueId(revision)) {
      throw new TypeError('Inbound artifact identity is invalid.');
    }
    const identityKey = inboundKey(input.sessionId, artifactId, revision);
    const existing = this.inboundArtifacts.get(identityKey);
    if (existing !== undefined) {
      if (
        existing.full.digest !== digestBytes(input.full.bytes) ||
        existing.thumbnail.digest !== digestBytes(input.thumbnail.bytes)
      ) {
        throw new Error('Inbound artifact identity is immutable and cannot be reused.');
      }
      return publicInboundArtifact(existing);
    }
    if (
      this.inboundSessionBytes(input.sessionId) + input.full.bytes.byteLength + input.thumbnail.bytes.byteLength > this.inboundSessionQuota ||
      input.turnId !== undefined &&
        this.inboundTurnBytes(input.sessionId, input.turnId) + input.full.bytes.byteLength > MAX_INBOUND_TURN_BYTES
    ) {
      throw new RangeError('Inbound session artifact quota exceeded.');
    }
    const now = this.now();
    const createdAt = input.createdAt ?? new Date(now).toISOString();
    const expiresAt = input.expiresAt ?? new Date(now + INBOUND_ARTIFACT_RETENTION_MS).toISOString();
    if (Date.parse(expiresAt) <= now) throw new RangeError('Inbound artifact expiry is invalid.');
    const retentionUntil = new Date(
      Math.min(Date.parse(expiresAt), now + INBOUND_ARTIFACT_RETENTION_MS),
    ).toISOString();
    const artifactDirectory = join(this.inboundRoot, randomFileName('dir'));
    const fullPath = join(artifactDirectory, randomFileName('full'));
    const thumbnailPath = join(artifactDirectory, randomFileName('thumbnail'));
    try {
      mkdirSync(artifactDirectory, { mode: 0o700 });
      chmodSync(artifactDirectory, 0o700);
      writeAtomicInboundFile(fullPath, input.full.bytes);
      writeAtomicInboundFile(thumbnailPath, input.thumbnail.bytes);
      const full = inboundVariant(input.full);
      const thumbnail = inboundVariant(input.thumbnail);
      this.database
        .prepare(
          `
          INSERT INTO inbound_artifacts (
            session_id, artifact_id, revision, block_id, block_revision,
            owner_principal, owner_device_id, media_class, lifecycle,
            full_digest, full_media_type, full_width, full_height, full_byte_length,
            thumbnail_digest, thumbnail_media_type, thumbnail_width, thumbnail_height,
            thumbnail_byte_length, expires_at, retention_until, created_at, settled_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        )
        .run(
          input.sessionId,
          artifactId,
          revision,
          input.blockId,
          input.blockRevision,
          input.ownerPrincipal,
          input.ownerDeviceId,
          input.mediaClass,
          full.digest,
          full.mediaType,
          full.width,
          full.height,
          full.byteLength,
          thumbnail.digest,
          thumbnail.mediaType,
          thumbnail.width,
          thumbnail.height,
          thumbnail.byteLength,
          expiresAt,
          retentionUntil,
          createdAt,
          createdAt,
        );
      const managed: ManagedInboundArtifact = {
        sessionId: input.sessionId,
        artifactId,
        revision,
        blockId: input.blockId,
        blockRevision: input.blockRevision,
        ...(input.turnId === undefined ? {} : { turnId: input.turnId }),
        ownerPrincipal: input.ownerPrincipal,
        ownerDeviceId: input.ownerDeviceId,
        mediaClass: input.mediaClass,
        source: input.source,
        full,
        thumbnail,
        expiresAt,
        retentionUntil,
        createdAt,
        revokedAt: null,
        fullPath,
        thumbnailPath,
        lifecycle: 'ready',
      };
      this.inboundArtifacts.set(identityKey, managed);
      return publicInboundArtifact(managed);
    } catch (error: unknown) {
      rmSync(artifactDirectory, { recursive: true, force: true });
      throw error;
    }
  }

  public recordInboundWithheld(input: RecordInboundWithheldInput): ArtifactIdentity {
    assertInboundLifecycleInput(input);
    const artifactId = input.artifactId ?? opaqueInboundId('artifact');
    const revision = input.revision ?? opaqueInboundId('revision');
    const key = inboundKey(input.sessionId, artifactId, revision);
    if (this.inboundArtifacts.has(key) || this.withheldInboundArtifacts.has(key)) {
      return { sessionId: input.sessionId, artifactId, revision };
    }
    const now = this.now();
    const createdAt = input.createdAt ?? new Date(now).toISOString();
    const expiresAt = input.expiresAt ?? new Date(now + INBOUND_ARTIFACT_RETENTION_MS).toISOString();
    if (Date.parse(expiresAt) <= now) throw new RangeError('Inbound artifact expiry is invalid.');
    this.database
      .prepare(
        `INSERT INTO inbound_artifacts (
          session_id, artifact_id, revision, block_id, block_revision,
          owner_principal, owner_device_id, media_class, lifecycle,
          expires_at, retention_until, created_at, settled_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'withheld', ?, ?, ?, ?)`
      )
      .run(
        input.sessionId,
        artifactId,
        revision,
        input.blockId,
        input.blockRevision,
        input.ownerPrincipal,
        input.ownerDeviceId,
        input.mediaClass,
        expiresAt,
        expiresAt,
        createdAt,
        createdAt,
    );
    this.withheldInboundArtifacts.set(key, { sessionId: input.sessionId, artifactId, revision, expiresAt });
    return { sessionId: input.sessionId, artifactId, revision };
  }

  public lookupInboundArtifact(
    identity: ArtifactIdentity,
    now = this.now(),
  ): InboundArtifactLookup {
    const key = inboundKey(identity.sessionId, identity.artifactId, identity.revision);
    const artifact = this.inboundArtifacts.get(key);
    if (artifact === undefined) {
      const withheld = this.withheldInboundArtifacts.get(key);
      if (withheld === undefined) {
        const durable = this.database
          .prepare(
            `SELECT lifecycle, expires_at AS expiresAt FROM inbound_artifacts
             WHERE session_id = ? AND artifact_id = ? AND revision = ?`,
          )
          .get(identity.sessionId, identity.artifactId, identity.revision) as
          | { readonly lifecycle: string; readonly expiresAt: string }
          | undefined;
        if (durable === undefined) return { status: 'missing' };
        if (durable.lifecycle === 'revoked') return { status: 'revoked' };
        if (durable.lifecycle === 'withheld') {
          return Date.parse(durable.expiresAt) <= now ? { status: 'expired' } : { status: 'withheld' };
        }
        return Date.parse(durable.expiresAt) <= now ? { status: 'expired' } : { status: 'missing' };
      }
      if (Date.parse(withheld.expiresAt) <= now) {
        this.withheldInboundArtifacts.delete(key);
        return { status: 'expired' };
      }
      return { status: 'withheld' };
    }
    if (artifact.lifecycle === 'revoked') return { status: 'revoked' };
    if (artifact.lifecycle === 'withheld') return { status: 'withheld' };
    if (Date.parse(artifact.expiresAt) <= now || Date.parse(artifact.retentionUntil) <= now) {
      artifact.lifecycle = 'expired';
      removeInboundFiles(artifact);
      return { status: 'expired' };
    }
    return { status: 'ready', artifact: publicInboundArtifact(artifact) };
  }

  public getInboundArtifact(identity: ArtifactIdentity, now = this.now()): InboundStoredArtifact | null {
    const lookup = this.lookupInboundArtifact(identity, now);
    return lookup.status === 'ready' ? lookup.artifact : null;
  }

  /** Read a final variant by exact identity; no latest or digest lookup is supported. */
  public readInboundVariant(
    identity: ArtifactIdentity,
    variant: 'full' | 'thumbnail',
    now = this.now(),
  ): { readonly bytes: Buffer; readonly metadata: InboundArtifactVariant } | null {
    const lookup = this.lookupInboundArtifact(identity, now);
    if (lookup.status !== 'ready') return null;
    const artifact = this.inboundArtifacts.get(inboundKey(identity.sessionId, identity.artifactId, identity.revision));
    if (artifact === undefined) return null;
    const metadata = artifact[variant];
    try {
      const bytes = readFileSync(variant === 'full' ? artifact.fullPath : artifact.thumbnailPath);
      if (bytes.byteLength !== metadata.byteLength || digestBytes(bytes) !== metadata.digest) {
        bytes.fill(0);
        return null;
      }
      return { bytes, metadata };
    } catch {
      return null;
    }
  }

  public inboundArtifactDescriptor(identity: ArtifactIdentity): InboundImageArtifact | null {
    const artifact = this.getInboundArtifact(identity);
    if (artifact === null) return null;
    return {
      id: artifact.artifactId,
      revision: artifact.revision,
      expiresAt: artifact.expiresAt,
      full: artifact.full,
      thumbnail: artifact.thumbnail,
    };
  }

  public inboundSessionBytes(sessionId: string): number {
    return [...this.inboundArtifacts.values()]
      .filter((artifact) => artifact.sessionId === sessionId && artifact.lifecycle === 'ready')
      .reduce((total, artifact) => total + artifact.full.byteLength + artifact.thumbnail.byteLength, 0);
  }

  public inboundTurnBytes(sessionId: string, turnId: string): number {
    return [...this.inboundArtifacts.values()]
      .filter((artifact) => artifact.sessionId === sessionId && artifact.turnId === turnId && artifact.lifecycle === 'ready')
      .reduce((total, artifact) => total + artifact.full.byteLength, 0);
  }

  public revokeInboundArtifact(identity: ArtifactIdentity, revokedAt = new Date(this.now()).toISOString()): boolean {
    const artifact = this.inboundArtifacts.get(inboundKey(identity.sessionId, identity.artifactId, identity.revision));
    if (artifact === undefined || artifact.lifecycle === 'revoked') return false;
    artifact.lifecycle = 'revoked';
    removeInboundFiles(artifact);
    this.database
      .prepare(
        `UPDATE inbound_artifacts SET lifecycle = 'revoked', revoked_at = ?, settled_at = ?
         WHERE session_id = ? AND artifact_id = ? AND revision = ?`,
      )
      .run(revokedAt, revokedAt, identity.sessionId, identity.artifactId, identity.revision);
    return true;
  }

  public revokeInboundSessionArtifacts(sessionId: string): number {
    let count = 0;
    for (const artifact of this.inboundArtifacts.values()) {
      if (artifact.sessionId === sessionId && artifact.lifecycle === 'ready') {
        this.revokeInboundArtifact(artifact);
        count += 1;
      }
    }
    return count;
  }

  public purgeInboundArtifact(identity: ArtifactIdentity): boolean {
    const key = inboundKey(identity.sessionId, identity.artifactId, identity.revision);
    const artifact = this.inboundArtifacts.get(key);
    if (artifact === undefined) {
      if (!this.withheldInboundArtifacts.delete(key)) return false;
      this.database
        .prepare('DELETE FROM inbound_artifacts WHERE session_id = ? AND artifact_id = ? AND revision = ?')
        .run(identity.sessionId, identity.artifactId, identity.revision);
      return true;
    }
    removeInboundFiles(artifact);
    this.inboundArtifacts.delete(key);
    this.database
      .prepare('DELETE FROM inbound_artifacts WHERE session_id = ? AND artifact_id = ? AND revision = ?')
      .run(identity.sessionId, identity.artifactId, identity.revision);
    return true;
  }

  public purgeInboundExpired(now = this.now()): number {
    let purged = 0;
    for (const artifact of [...this.inboundArtifacts.values()]) {
      if (Date.parse(artifact.expiresAt) <= now || Date.parse(artifact.retentionUntil) <= now || artifact.lifecycle === 'revoked') {
        if (this.purgeInboundArtifact(artifact)) purged += 1;
      }
    }
    for (const withheld of [...this.withheldInboundArtifacts.values()]) {
      if (Date.parse(withheld.expiresAt) <= now && this.purgeInboundArtifact(withheld)) purged += 1;
    }
    purged += this.database
      .prepare(
        `DELETE FROM inbound_artifacts
         WHERE lifecycle IN ('withheld', 'expired', 'revoked')
           AND (expires_at <= ? OR retention_until <= ? OR lifecycle = 'revoked')`,
      )
      .run(new Date(now).toISOString(), new Date(now).toISOString()).changes;
    return purged;
  }

  /** Remove all source/intermediate/variant files while leaving a reusable empty root. */
  public cleanupInboundFiles(): void {
    for (const artifact of this.inboundArtifacts.values()) removeInboundFiles(artifact);
    for (const entry of safeDirectoryEntries(this.inboundRoot)) {
      rmSync(join(this.inboundRoot, entry), { recursive: true, force: true });
    }
    this.withheldInboundArtifacts.clear();
  }

  public close(): void {
    this.cleanupInboundFiles();
    if (this.ownsInboundRoot) rmSync(this.inboundRoot, { recursive: true, force: true });
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

  private assertInboundInput(input: PutInboundArtifactInput): void {
    if (
      !isOpaqueId(input.sessionId) ||
      !isOpaqueId(input.blockId) ||
      (input.turnId !== undefined && !isOpaqueId(input.turnId)) ||
      !isSafeInboundOwner(input.ownerPrincipal) ||
      !isSafeInboundOwner(input.ownerDeviceId) ||
      !isInboundMediaClass(input.mediaClass) ||
      !isInboundSource(input.source) ||
      !Number.isSafeInteger(input.blockRevision) ||
      input.blockRevision < 1
    ) {
      throw new TypeError('Inbound artifact ownership or lifecycle metadata is invalid.');
    }
    validateInboundVariant(input.full, MAX_INBOUND_FULL_BYTES, 2_000);
    validateInboundVariant(input.thumbnail, MAX_INBOUND_THUMBNAIL_BYTES, 640);
    if (input.full.bytes.byteLength > MAX_INBOUND_FULL_BYTES || input.thumbnail.bytes.byteLength > MAX_INBOUND_THUMBNAIL_BYTES) {
      throw new RangeError('Inbound artifact derivative exceeds its bound.');
    }
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
      input.descriptor.renderer === 'pdf' && input.descriptor.textLayerSafe !== true ||
      input.descriptor.renderer === 'image' && input.descriptor.mimeType !== 'image/png' ||
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

function assertInboundRoot(root: string): void {
  const workspaceRoot = resolve(process.cwd());
  if (root === workspaceRoot || root.startsWith(`${workspaceRoot}${sep}`)) {
    throw new Error('Inbound quarantine must be outside the relay workspace.');
  }
  try {
    if (lstatSync(root).isSymbolicLink()) {
      throw new Error('Inbound quarantine cannot be a symbolic link.');
    }
  } catch (error: unknown) {
    if (isNodeError(error, 'ENOENT')) return;
    throw error;
  }
}

function isNodeError(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === code;
}

function opaqueInboundId(prefix: string): string {
  return `${prefix}-${randomBytes(16).toString('hex')}`;
}

function randomFileName(kind: string): string {
  return `${kind}-${randomBytes(18).toString('hex')}`;
}

function inboundKey(sessionId: string, artifactId: string, revision: string): string {
  return `${sessionId}\u0000${artifactId}\u0000${revision}`;
}

function isSafeInboundOwner(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(value);
}

function isInboundMediaClass(value: unknown): value is InboundImageMediaClass {
  return value === 'screenshot' || value === 'raster' || value === 'generated';
}

function isInboundSource(value: unknown): value is InboundImageSource {
  return value === 'tool_result' || value === 'assistant_output' || value === 'extension';
}

function validateInboundVariant(
  variant: InboundArtifactVariantInput,
  maxBytes: number,
  maxEdge: number,
): void {
  if (
    !isInboundImageArtifactVariant({
      digest: digestBytes(variant.bytes),
      mediaType: variant.mediaType,
      width: variant.width,
      height: variant.height,
      byteLength: variant.bytes.byteLength,
    }, maxEdge, maxBytes)
  ) {
    throw new TypeError('Inbound artifact derivative metadata is invalid.');
  }
  if (variant.digest !== undefined && variant.digest !== digestBytes(variant.bytes)) {
    throw new TypeError('Inbound artifact derivative digest does not match bytes.');
  }
}

function assertInboundLifecycleInput(input: RecordInboundWithheldInput): void {
  if (
    !isOpaqueId(input.sessionId) ||
    (input.artifactId !== undefined && !isOpaqueId(input.artifactId)) ||
    (input.revision !== undefined && !isOpaqueId(input.revision)) ||
    !isOpaqueId(input.blockId) ||
    !isSafeInboundOwner(input.ownerPrincipal) ||
    !isSafeInboundOwner(input.ownerDeviceId) ||
    !isInboundMediaClass(input.mediaClass) ||
    !Number.isSafeInteger(input.blockRevision) ||
    input.blockRevision < 1
  ) {
    throw new TypeError('Inbound lifecycle metadata is invalid.');
  }
}

function inboundVariant(input: InboundArtifactVariantInput): InboundArtifactVariant {
  const digest = digestBytes(input.bytes);
  return {
    mediaType: input.mediaType,
    width: input.width,
    height: input.height,
    digest,
    byteLength: input.bytes.byteLength,
  };
}

function publicInboundArtifact(artifact: ManagedInboundArtifact): InboundStoredArtifact {
  return {
    sessionId: artifact.sessionId,
    artifactId: artifact.artifactId,
    revision: artifact.revision,
    blockId: artifact.blockId,
    blockRevision: artifact.blockRevision,
    ownerPrincipal: artifact.ownerPrincipal,
    ownerDeviceId: artifact.ownerDeviceId,
    mediaClass: artifact.mediaClass,
    source: artifact.source,
    full: { ...artifact.full },
    thumbnail: { ...artifact.thumbnail },
    expiresAt: artifact.expiresAt,
    retentionUntil: artifact.retentionUntil,
    createdAt: artifact.createdAt,
    revokedAt: artifact.revokedAt,
  };
}

function writeAtomicInboundFile(path: string, bytes: Uint8Array): void {
  const temporaryPath = `${path}.tmp-${randomBytes(16).toString('hex')}`;
  try {
    writeFileSync(temporaryPath, Buffer.from(bytes), { mode: 0o600, flag: 'wx' });
    chmodSync(temporaryPath, 0o600);
    renameSync(temporaryPath, path);
    chmodSync(path, 0o600);
  } catch (error: unknown) {
    rmSync(temporaryPath, { force: true });
    throw error;
  }
}

function removeInboundFiles(artifact: ManagedInboundArtifact): void {
  const directory = resolve(artifact.fullPath, '..');
  rmSync(artifact.fullPath, { force: true });
  rmSync(artifact.thumbnailPath, { force: true });
  rmSync(directory, { recursive: true, force: true });
}

function safeDirectoryEntries(root: string): string[] {
  try {
    return readdirSync(root).filter((entry) => entry !== '.' && entry !== '..');
  } catch (error: unknown) {
    if (isNodeError(error, 'ENOENT')) return [];
    throw error;
  }
}
