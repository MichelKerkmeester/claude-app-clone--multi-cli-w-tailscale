// ───────────────────────────────────────────────────────────────────
// MODULE: Ephemeral Attachment Service
// ───────────────────────────────────────────────────────────────────

import { createHash, randomBytes } from 'node:crypto';
import { open } from 'node:fs/promises';
import { chmod, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';

import {
  isAttachmentSetManifest,
  type AttachmentManifestItem,
  type AttachmentSetManifest,
} from '@pi-remote/pi-rpc-protocol';

import { AttachmentRateLimiter } from '../auth/rate-limit.js';
import {
  ATTACHMENT_BYTE_RATE_WINDOW_MS,
  ATTACHMENT_RATE_LIMIT_BYTES,
  ATTACHMENT_RATE_LIMIT_COUNT,
  ATTACHMENT_RATE_LIMIT_WINDOW_MS,
  IMAGE_BATCH_TIMEOUT_MS,
  MAX_ATTACHMENTS_PER_SET,
  MAX_NORMALIZED_BYTES_PER_SET,
  MAX_NORMALIZED_BYTES_PER_IMAGE,
  MAX_PARALLEL_UPLOADS,
  MAX_QUARANTINE_BYTES_PER_DEVICE,
  MAX_QUARANTINE_BYTES_RELAY_WIDE,
  MAX_SOURCE_BYTES_PER_IMAGE,
  MAX_SOURCE_BYTES_PER_BATCH,
  UNCOMMITTED_TTL_MS,
} from './attachment-limits.js';
import { initializeAttachmentDecoder } from './attachment-decoder.js';
import { normalizeImage } from './attachment-normalizer.js';
import {
  AttachmentServiceError,
  type AttachmentOwner,
  type AttachmentPartRecord,
  type AttachmentReservationRecord,
  type AttachmentSetBinding,
  type AttachmentSetState,
  type AttachmentStatusDto,
  type AttachmentTicketBinding,
} from './attachment-types.js';

const DEFAULT_QUARANTINE_ROOT = join(tmpdir(), 'pi-remote-attachments');

interface ManagedPart extends AttachmentPartRecord {
  status: 'reserved' | 'uploading' | 'checking' | 'ready' | 'rejected' | 'cancelled' | 'expired';
  sourcePath: string | null;
  normalizedPath: string | null;
  normalizedBytes: number;
}

interface ManagedSet extends AttachmentReservationRecord {
  state: AttachmentSetState;
  readonly parts: ManagedPart[];
  quotaBytes: number;
  activeUploads: number;
  normalizedBytes: number;
  cancelRequested: boolean;
  batchDeadlineAt: number;
}

interface SubmissionRecord {
  readonly manifestFingerprint: string;
  readonly setId: string;
}

export interface AttachmentServiceOptions {
  readonly now?: () => number;
  readonly quarantineRoot?: string;
  readonly currentEpoch?: string;
  readonly currentModelId?: string;
  readonly policyVersion?: number;
  readonly rateLimiter?: AttachmentRateLimiter;
}

export interface AttachmentUploadInput {
  readonly setId: string;
  readonly partId: string;
  readonly contentLength: number;
  readonly declaredMime: string;
  readonly digest: string;
  readonly body: AsyncIterable<Uint8Array | Buffer | string>;
}

export interface AttachmentUploadResult {
  readonly setId: string;
  readonly partId: string;
  readonly status: 'ready';
  readonly normalizedMime: 'image/jpeg' | 'image/png';
  readonly normalizedBytes: number;
  readonly width: number;
  readonly height: number;
}

export interface AttachmentServiceStats {
  readonly setCount: number;
  readonly sourceBytes: number;
  readonly normalizedBytes: number;
  readonly relayBytes: number;
}

/** Keep all byte-bearing state in an ephemeral, permission-locked quarantine. */
export class AttachmentService {
  private readonly now: () => number;
  private readonly root: string;
  private readonly currentEpoch: string | undefined;
  private readonly currentModelId: string;
  private readonly policyVersion: number;
  private readonly rateLimiter: AttachmentRateLimiter;
  private readonly sets = new Map<string, ManagedSet>();
  private readonly submissions = new Map<string, SubmissionRecord>();
  private readonly deviceReservedBytes = new Map<string, number>();
  private relayReservedBytes = 0;
  private initialized: Promise<void> | null = null;

  public constructor(options: AttachmentServiceOptions = {}) {
    this.now = options.now ?? Date.now;
    this.root = resolve(options.quarantineRoot ?? DEFAULT_QUARANTINE_ROOT);
    this.currentEpoch = options.currentEpoch;
    this.currentModelId = options.currentModelId ?? 'model_unbound';
    this.policyVersion = options.policyVersion ?? 1;
    this.rateLimiter =
      options.rateLimiter ??
      new AttachmentRateLimiter(
        ATTACHMENT_RATE_LIMIT_COUNT,
        ATTACHMENT_RATE_LIMIT_WINDOW_MS,
        ATTACHMENT_RATE_LIMIT_BYTES,
        ATTACHMENT_BYTE_RATE_WINDOW_MS,
        this.now,
      );
    assertQuarantineOutsideWorkspace(this.root);
  }

  public get quarantineRoot(): string {
    return this.root;
  }

  public async initialize(): Promise<void> {
    this.initialized ??= this.ensureRoot();
    await this.initialized;
    await initializeAttachmentDecoder();
  }

  /** Remove bytes left by a terminated process before accepting new work. */
  public async recoverStartup(): Promise<void> {
    this.initialized ??= this.ensureRoot();
    await this.initialized;
    for (const entry of await readdir(this.root, { withFileTypes: true })) {
      await rm(join(this.root, entry.name), { recursive: true, force: true });
    }
    await initializeAttachmentDecoder();
  }

  public async reserve(
    owner: AttachmentOwner,
    manifest: AttachmentSetManifest,
    ticketBinding?: AttachmentTicketBinding,
  ): Promise<AttachmentReservationRecord> {
    await this.initialize();
    if (!isAttachmentSetManifest(manifest) || !this.validManifest(manifest)) {
      throw new AttachmentServiceError('invalid_manifest');
    }
    if (
      owner.sessionId !== manifest.sessionId ||
      owner.sessionEpoch !== manifest.sessionEpoch ||
      (this.currentEpoch !== undefined && this.currentEpoch !== manifest.sessionEpoch) ||
      (ticketBinding !== undefined && !this.reserveBindingMatches(ticketBinding, manifest))
    ) {
      throw new AttachmentServiceError('invalid_binding');
    }
    const submissionKey = `${owner.deviceId}\0${owner.sessionToken}\0${manifest.submissionId}`;
    const fingerprint = JSON.stringify(manifest);
    const prior = this.submissions.get(submissionKey);
    if (prior !== undefined) {
      if (prior.manifestFingerprint !== fingerprint) {
        throw new AttachmentServiceError('invalid_binding');
      }
      const existing = this.sets.get(prior.setId);
      if (existing !== undefined) return toReservationRecord(existing);
      this.submissions.delete(submissionKey);
    }
    const sourceBytes = manifest.items.reduce((total, item) => total + item.byteLength, 0);
    if (!this.rateLimiter.consume(owner.deviceId, manifest.items.length, sourceBytes)) {
      throw new AttachmentServiceError('rate_limited');
    }
    this.reserveQuarantineBytes(owner.deviceId, sourceBytes);
    const setId = opaqueId('set');
    const parts = manifest.items.map((item) => managedPart(setId, item));
    const set: ManagedSet = {
      setId,
      owner,
      binding: {
        sessionId: manifest.sessionId,
        sessionEpoch: manifest.sessionEpoch,
        expectedPromptRevision: manifest.expectedPromptRevision,
        submissionId: manifest.submissionId,
      },
      manifest,
      modelId: this.currentModelId,
      policyVersion: this.policyVersion,
      expiresAt: this.now() + UNCOMMITTED_TTL_MS,
      state: 'reserved',
      parts,
      quotaBytes: sourceBytes,
      activeUploads: 0,
      normalizedBytes: 0,
      cancelRequested: false,
      batchDeadlineAt: this.now() + IMAGE_BATCH_TIMEOUT_MS,
    };
    this.sets.set(setId, set);
    this.submissions.set(submissionKey, { manifestFingerprint: fingerprint, setId });
    return toReservationRecord(set);
  }

  public getReservation(setId: string): AttachmentReservationRecord | null {
    const set = this.sets.get(setId);
    return set === undefined ? null : toReservationRecord(set);
  }

  public getPartRecords(setId: string): readonly AttachmentPartRecord[] | null {
    const set = this.sets.get(setId);
    return set === undefined
      ? null
      : set.parts.map((part) => ({
          setId: part.setId,
          attachmentId: part.attachmentId,
          partId: part.partId,
          item: part.item,
        }));
  }

  public canIssueTicket(owner: AttachmentOwner, binding: AttachmentTicketBinding): boolean {
    if (binding.operation === 'reserve') {
      return (
        binding.sessionId === owner.sessionId &&
        binding.sessionEpoch === owner.sessionEpoch &&
        binding.submissionId.length > 0
      );
    }
    const set = this.sets.get(binding.setId);
    return (
      set !== undefined &&
      set.expiresAt > this.now() &&
      !isCancelledState(set.state) &&
      set.state !== 'rejected' &&
      set.state !== 'delivery-unknown' &&
      this.owns(set, owner) &&
      this.bindingMatches(set.binding, binding) &&
      (binding.operation !== 'upload' || this.partMatches(set, binding))
    );
  }

  public async uploadPart(input: AttachmentUploadInput): Promise<AttachmentUploadResult> {
    await this.initialize();
    const set = this.sets.get(input.setId);
    if (set === undefined) throw new AttachmentServiceError('not_found');
    const part = set.parts.find((candidate) => candidate.partId === input.partId);
    if (part === undefined) throw new AttachmentServiceError('not_found');
    if (set.expiresAt <= this.now()) {
      await this.cancelManagedSet(set, 'expired');
      throw new AttachmentServiceError('expired');
    }
    if (isCancelledState(set.state) || set.cancelRequested) {
      throw new AttachmentServiceError(cancellationCode(set.state));
    }
    if (
      input.contentLength !== part.item.byteLength ||
      input.declaredMime !== part.item.declaredType ||
      input.digest !== part.item.sha256
    ) {
      throw new AttachmentServiceError('invalid_binding');
    }
    if (part.status !== 'reserved') throw new AttachmentServiceError('invalid_binding');
    if (set.activeUploads >= MAX_PARALLEL_UPLOADS) {
      throw new AttachmentServiceError('concurrency_limited');
    }
    set.activeUploads += 1;
    set.state = 'uploading';
    part.status = 'uploading';
    const sourcePath = this.generatedPath('source');
    part.sourcePath = sourcePath;
    let sourceHandle: Awaited<ReturnType<typeof open>> | null = null;
    let sourceBytes: Uint8Array | null = null;
    let normalizedBytes: Uint8Array | null = null;
    let normalizedReservationBytes = 0;
    try {
      sourceHandle = await open(sourcePath, 'wx', 0o600);
      await sourceHandle.chmod(0o600);
      const digest = createHash('sha256');
      let total = 0;
      for await (const chunk of input.body) {
        if (isCancellationRequested(set)) {
          throw new AttachmentServiceError(cancellationCode(set.state));
        }
        const bytes = toBytes(chunk);
        total += bytes.byteLength;
        if (total > MAX_SOURCE_BYTES_PER_IMAGE || total > part.item.byteLength) {
          throw new AttachmentServiceError('body_too_large');
        }
        await sourceHandle.write(bytes);
        digest.update(bytes);
      }
      if (total !== part.item.byteLength || total > MAX_SOURCE_BYTES_PER_BATCH) {
        throw new AttachmentServiceError('invalid_content_length');
      }
      if (digest.digest('base64url') !== part.item.sha256) {
        throw new AttachmentServiceError('digest_mismatch');
      }
      await sourceHandle.sync();
      await sourceHandle.close();
      sourceHandle = null;
      set.state = 'checking';
      sourceBytes = await readQuarantineFile(sourcePath);
      const normalized = await normalizeImage(
        sourceBytes,
        part.item.declaredType,
        set.batchDeadlineAt,
      );
      sourceBytes.fill(0);
      sourceBytes = null;
      if (!normalized.ok) throw new AttachmentServiceError(normalized.code);
      if (isCancellationRequested(set)) {
        throw new AttachmentServiceError(cancellationCode(set.state));
      }
      if (
        normalized.image.bytes.byteLength > MAX_NORMALIZED_BYTES_PER_IMAGE ||
        set.normalizedBytes + normalized.image.bytes.byteLength > MAX_NORMALIZED_BYTES_PER_SET
      ) {
        normalized.image.bytes.fill(0);
        throw new AttachmentServiceError('output_too_large');
      }
      normalizedBytes = normalized.image.bytes;
      normalizedReservationBytes = normalizedBytes.byteLength;
      set.normalizedBytes += normalizedReservationBytes;
      const normalizedPath = this.generatedPath('normalized');
      part.normalizedPath = normalizedPath;
      this.replaceQuarantineBytes(set, part.item.byteLength, normalizedBytes.byteLength);
      await this.commitQuarantineFile(normalizedPath, normalizedBytes);
      if (isCancellationRequested(set)) {
        throw new AttachmentServiceError(cancellationCode(set.state));
      }
      normalizedBytes.fill(0);
      normalizedBytes = null;
      await unlinkIfPresent(sourcePath);
      if (isCancellationRequested(set)) {
        throw new AttachmentServiceError(cancellationCode(set.state));
      }
      part.sourcePath = null;
      part.normalizedBytes = normalizedReservationBytes;
      normalizedReservationBytes = 0;
      part.status = 'ready';
      if (set.parts.every((candidate) => candidate.status === 'ready')) set.state = 'ready';
      return {
        setId: set.setId,
        partId: part.partId,
        status: 'ready',
        normalizedMime: normalized.image.mimeType,
        normalizedBytes: part.normalizedBytes,
        width: normalized.image.width,
        height: normalized.image.height,
      };
    } catch (error: unknown) {
      if (sourceBytes !== null) sourceBytes.fill(0);
      if (normalizedBytes !== null) normalizedBytes.fill(0);
      const wasCancelled = set.cancelRequested || isCancelledState(set.state);
      if (!wasCancelled) {
        set.cancelRequested = true;
        set.state = 'rejected';
        for (const candidate of set.parts) candidate.status = 'rejected';
      }
      await this.removeBytes(set);
      part.status = wasCancelled ? 'cancelled' : 'rejected';
      throw normalizeServiceError(error);
    } finally {
      if (sourceHandle !== null) await sourceHandle.close().catch(() => undefined);
      set.activeUploads -= 1;
    }
  }

  public status(setId: string, owner: AttachmentOwner): AttachmentStatusDto {
    const set = this.sets.get(setId);
    if (set === undefined) throw new AttachmentServiceError('not_found');
    if (!this.owns(set, owner)) throw new AttachmentServiceError('ownership');
    return {
      attachmentSetId: set.setId,
      revision: set.binding.expectedPromptRevision,
      status: set.state,
      expiresAt: new Date(set.expiresAt).toISOString(),
      parts: set.parts.map((part) => ({
        attachmentSetId: set.setId,
        attachmentId: part.attachmentId,
        partId: part.partId,
        ordinal: part.item.ordinal,
        status: part.status,
      })),
    };
  }

  public async cancel(
    setId: string,
    owner: AttachmentOwner,
    reason: 'user' | 'stale' | 'expired' | 'revoked' | 'shutdown',
  ): Promise<void> {
    const set = this.sets.get(setId);
    if (set === undefined) throw new AttachmentServiceError('not_found');
    if (!this.owns(set, owner)) throw new AttachmentServiceError('ownership');
    await this.cancelManagedSet(set, reason === 'expired' ? 'expired' : 'cancelled');
  }

  public async cancelForSession(
    sessionToken: string,
    reason: 'revoked' | 'shutdown' | 'stale' = 'revoked',
  ): Promise<void> {
    await Promise.all(
      [...this.sets.values()]
        .filter((set) => set.owner.sessionToken === sessionToken)
        .map((set) => this.cancelManagedSet(set, reason === 'stale' ? 'expired' : 'cancelled')),
    );
  }

  public async cancelForDevice(
    deviceId: string,
    reason: 'revoked' | 'shutdown' = 'revoked',
  ): Promise<void> {
    await Promise.all(
      [...this.sets.values()]
        .filter((set) => set.owner.deviceId === deviceId)
        .map((set) =>
          this.cancelManagedSet(set, reason === 'shutdown' ? 'cancelled' : 'cancelled'),
        ),
    );
  }

  public async cancelForEpoch(epoch: string): Promise<void> {
    await Promise.all(
      [...this.sets.values()]
        .filter((set) => set.binding.sessionEpoch === epoch)
        .map((set) => this.cancelManagedSet(set, 'expired')),
    );
  }

  public async markDeliveryUnknown(setId: string): Promise<void> {
    const set = this.sets.get(setId);
    if (set === undefined) return;
    set.cancelRequested = true;
    set.state = 'delivery-unknown';
    await this.removeBytes(set);
  }

  public async reapExpired(now = this.now()): Promise<number> {
    let reaped = 0;
    for (const set of [...this.sets.values()]) {
      if (
        set.state === 'delivery-unknown' ||
        (!isCancelledState(set.state) && set.state !== 'rejected' && set.expiresAt <= now)
      ) {
        await this.cancelManagedSet(set, set.expiresAt <= now ? 'expired' : 'cancelled');
        reaped += 1;
      }
    }
    return reaped;
  }

  public async cleanupAll(): Promise<void> {
    await Promise.all(
      [...this.sets.values()].map((set) => this.cancelManagedSet(set, 'cancelled')),
    );
  }

  public stats(): AttachmentServiceStats {
    let sourceBytes = 0;
    let normalizedBytes = 0;
    for (const set of this.sets.values()) {
      for (const part of set.parts) {
        if (part.sourcePath !== null) sourceBytes += part.item.byteLength;
        normalizedBytes += part.normalizedBytes;
      }
    }
    return {
      setCount: this.sets.size,
      sourceBytes,
      normalizedBytes,
      relayBytes: sourceBytes + normalizedBytes,
    };
  }

  public async quarantineEntries(): Promise<readonly string[]> {
    await this.initialize();
    return (await readdir(this.root)).sort();
  }

  private async cancelManagedSet(set: ManagedSet, state: 'cancelled' | 'expired'): Promise<void> {
    set.cancelRequested = true;
    set.state = state;
    for (const part of set.parts) {
      part.status = state;
    }
    await this.removeBytes(set);
  }

  private async removeBytes(set: ManagedSet): Promise<void> {
    for (const part of set.parts) {
      await unlinkIfPresent(part.sourcePath);
      await unlinkIfPresent(part.normalizedPath);
      part.sourcePath = null;
      part.normalizedPath = null;
      part.normalizedBytes = 0;
    }
    set.normalizedBytes = 0;
    if (set.quotaBytes > 0) {
      this.releaseQuarantineBytes(set.owner.deviceId, set.quotaBytes);
      set.quotaBytes = 0;
    }
  }

  private reserveQuarantineBytes(deviceId: string, bytes: number): void {
    const deviceBytes = this.deviceReservedBytes.get(deviceId) ?? 0;
    if (
      deviceBytes + bytes > MAX_QUARANTINE_BYTES_PER_DEVICE ||
      this.relayReservedBytes + bytes > MAX_QUARANTINE_BYTES_RELAY_WIDE
    ) {
      throw new AttachmentServiceError('quarantine_full');
    }
    this.deviceReservedBytes.set(deviceId, deviceBytes + bytes);
    this.relayReservedBytes += bytes;
  }

  private replaceQuarantineBytes(
    set: ManagedSet,
    sourceBytes: number,
    normalizedBytes: number,
  ): void {
    const deviceBytes = this.deviceReservedBytes.get(set.owner.deviceId) ?? 0;
    const nextDeviceBytes = deviceBytes - sourceBytes + normalizedBytes;
    const nextRelayBytes = this.relayReservedBytes - sourceBytes + normalizedBytes;
    if (
      nextDeviceBytes > MAX_QUARANTINE_BYTES_PER_DEVICE ||
      nextRelayBytes > MAX_QUARANTINE_BYTES_RELAY_WIDE
    ) {
      throw new AttachmentServiceError('quarantine_full');
    }
    this.deviceReservedBytes.set(set.owner.deviceId, Math.max(0, nextDeviceBytes));
    this.relayReservedBytes = Math.max(0, nextRelayBytes);
    set.quotaBytes = set.quotaBytes - sourceBytes + normalizedBytes;
  }

  private releaseQuarantineBytes(deviceId: string, bytes: number): void {
    const next = Math.max(0, (this.deviceReservedBytes.get(deviceId) ?? 0) - bytes);
    if (next === 0) this.deviceReservedBytes.delete(deviceId);
    else this.deviceReservedBytes.set(deviceId, next);
    this.relayReservedBytes = Math.max(0, this.relayReservedBytes - bytes);
  }

  private validManifest(manifest: AttachmentSetManifest): boolean {
    if (manifest.items.length === 0 || manifest.items.length > MAX_ATTACHMENTS_PER_SET)
      return false;
    const bytes = manifest.items.reduce((total, item) => total + item.byteLength, 0);
    return bytes <= MAX_SOURCE_BYTES_PER_BATCH && manifest.items.every(validManifestItem);
  }

  private reserveBindingMatches(
    binding: AttachmentTicketBinding,
    manifest: AttachmentSetManifest,
  ): boolean {
    return (
      binding.operation === 'reserve' &&
      binding.sessionId === manifest.sessionId &&
      binding.sessionEpoch === manifest.sessionEpoch &&
      binding.expectedPromptRevision === manifest.expectedPromptRevision &&
      binding.submissionId === manifest.submissionId
    );
  }

  private bindingMatches(
    setBinding: AttachmentSetBinding,
    binding: AttachmentTicketBinding,
  ): boolean {
    return (
      binding.sessionId === setBinding.sessionId &&
      binding.sessionEpoch === setBinding.sessionEpoch &&
      binding.expectedPromptRevision === setBinding.expectedPromptRevision &&
      binding.submissionId === setBinding.submissionId
    );
  }

  private partMatches(
    set: ManagedSet,
    binding: Extract<AttachmentTicketBinding, { operation: 'upload' }>,
  ): boolean {
    const part = set.parts.find((candidate) => candidate.partId === binding.partId);
    return (
      part !== undefined &&
      binding.setId === set.setId &&
      binding.attachmentId === part.attachmentId &&
      binding.ordinal === part.item.ordinal &&
      binding.byteLength === part.item.byteLength &&
      binding.sha256 === part.item.sha256 &&
      binding.declaredType === part.item.declaredType
    );
  }

  private owns(set: ManagedSet, owner: AttachmentOwner): boolean {
    return (
      set.owner.sessionToken === owner.sessionToken &&
      set.owner.sessionId === owner.sessionId &&
      set.owner.sessionEpoch === owner.sessionEpoch &&
      set.owner.deviceId === owner.deviceId &&
      set.owner.principal === owner.principal &&
      set.owner.origin === owner.origin
    );
  }

  private generatedPath(kind: 'source' | 'normalized'): string {
    return join(this.root, `${kind}_${randomBytes(32).toString('base64url')}`);
  }

  private async ensureRoot(): Promise<void> {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    await chmod(this.root, 0o700);
  }

  private async commitQuarantineFile(path: string, bytes: Uint8Array): Promise<void> {
    const temporaryPath = this.generatedPath('normalized');
    try {
      await writeFile(temporaryPath, bytes, { flag: 'wx', mode: 0o600 });
      await chmod(temporaryPath, 0o600);
      await rename(temporaryPath, path);
      await chmod(path, 0o600);
    } catch (error: unknown) {
      await unlinkIfPresent(temporaryPath);
      await unlinkIfPresent(path);
      throw error;
    }
  }
}

function toReservationRecord(set: ManagedSet): AttachmentReservationRecord {
  return {
    setId: set.setId,
    owner: set.owner,
    binding: set.binding,
    manifest: set.manifest,
    modelId: set.modelId,
    policyVersion: set.policyVersion,
    expiresAt: set.expiresAt,
  };
}

function managedPart(setId: string, item: AttachmentManifestItem): ManagedPart {
  return {
    setId,
    attachmentId: opaqueId('attachment'),
    partId: opaqueId('part'),
    item,
    status: 'reserved',
    sourcePath: null,
    normalizedPath: null,
    normalizedBytes: 0,
  };
}

function validManifestItem(item: AttachmentManifestItem): boolean {
  return item.byteLength > 0 && item.byteLength <= MAX_SOURCE_BYTES_PER_IMAGE;
}

function toBytes(chunk: Uint8Array | Buffer | string): Uint8Array {
  if (typeof chunk === 'string') return Buffer.from(chunk);
  return chunk instanceof Uint8Array ? chunk : Uint8Array.from(chunk);
}

async function readQuarantineFile(path: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(path));
}

async function unlinkIfPresent(path: string | null): Promise<void> {
  if (path === null) return;
  await rm(path, { force: true }).catch(() => undefined);
}

function normalizeServiceError(error: unknown): AttachmentServiceError {
  if (error instanceof AttachmentServiceError) return error;
  return new AttachmentServiceError('internal');
}

function isCancelledState(state: AttachmentSetState): state is 'cancelled' | 'expired' {
  return state === 'cancelled' || state === 'expired';
}

function isCancellationRequested(set: ManagedSet): boolean {
  return set.cancelRequested || isCancelledState(set.state) || set.state === 'delivery-unknown';
}

function cancellationCode(state: AttachmentSetState): 'cancelled' | 'expired' {
  return state === 'expired' ? 'expired' : 'cancelled';
}

function opaqueId(prefix: string): string {
  return `${prefix}_${randomBytes(24).toString('base64url')}`;
}

function assertQuarantineOutsideWorkspace(root: string): void {
  if (!isAbsolute(root)) throw new Error('Attachment quarantine must be absolute.');
  const workspace = `${resolve(process.cwd())}${sep}`;
  if (root === resolve(process.cwd()) || root.startsWith(workspace)) {
    throw new Error('Attachment quarantine must be outside the workspace.');
  }
  if (dirname(root) === root) throw new Error('Attachment quarantine path is too broad.');
}
