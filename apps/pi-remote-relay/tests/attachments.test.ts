// ───────────────────────────────────────────────────────────────────
// MODULE: Attachment Lane Tests
// ───────────────────────────────────────────────────────────────────

import { createHash, generateKeyPairSync, sign, type KeyObject } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  enrollmentProof,
  sessionProof,
  type AttachmentManifestItem,
  type AttachmentSetManifest,
  type DevicePublicKeyJwk,
  type EnrollmentQr,
  type SessionChallengeResponse,
} from '@pi-remote/pi-rpc-protocol';
import { afterEach, describe, expect, it } from 'vitest';

import { AuthService, type ApplicationSession } from '../src/auth/auth-service.js';
import { AttachmentRateLimiter } from '../src/auth/rate-limit.js';
import {
  ATTACHMENT_BYTE_RATE_WINDOW_MS,
  ATTACHMENT_RATE_LIMIT_BYTES,
  ATTACHMENT_RATE_LIMIT_COUNT,
  ATTACHMENT_RATE_LIMIT_WINDOW_MS,
  MAX_NORMALIZED_BYTES_PER_IMAGE,
  MAX_NORMALIZED_EDGE,
  MAX_SOURCE_BYTES_PER_BATCH,
  MAX_SOURCE_BYTES_PER_IMAGE,
  UNCOMMITTED_TTL_MS,
} from '../src/attachments/attachment-limits.js';
import { AttachmentReaper } from '../src/attachments/attachment-reaper.js';
import { AttachmentService } from '../src/attachments/attachment-service.js';
import {
  AttachmentServiceError,
  type AttachmentOwner,
  type AttachmentTicketBinding,
} from '../src/attachments/attachment-types.js';

const ORIGIN = 'https://pi-remote.example.test';
const PRINCIPAL = 'operator@example.test';
const HOST_ID = 'host_test';
const EPOCH = 'epoch_test';
const SESSION_ID = 'session_local';

const activeServices: Array<{ readonly service: AttachmentService; readonly root: string }> = [];

afterEach(async () => {
  await Promise.all(
    activeServices.splice(0).map(async ({ service, root }) => {
      await service.cleanupAll();
      await rm(root, { recursive: true, force: true });
    }),
  );
});

describe('attachment reservations and transient byte lifecycle', () => {
  it('reserves idempotently, normalizes a streamed part, and exposes only redacted status', async () => {
    const bytes = await fixturePng();
    const { service, root } = await makeService();
    const manifest = makeManifest(bytes);
    const owner = makeOwner();

    const first = await service.reserve(owner, manifest);
    const second = await service.reserve(owner, manifest);
    expect(second.setId).toBe(first.setId);
    const part = service.getPartRecords(first.setId)?.[0];
    expect(part).toBeDefined();
    if (part === undefined) throw new Error('Reservation did not create a part.');

    const result = await service.uploadPart({
      setId: first.setId,
      partId: part.partId,
      contentLength: bytes.byteLength,
      declaredMime: 'image/png',
      digest: manifest.items[0]?.sha256 ?? '',
      body: chunked(bytes),
    });
    expect(result.status).toBe('ready');
    expect(result.normalizedBytes).toBeLessThanOrEqual(MAX_NORMALIZED_BYTES_PER_IMAGE);
    expect(Math.max(result.width, result.height)).toBeLessThanOrEqual(MAX_NORMALIZED_EDGE);

    const status = service.status(first.setId, owner);
    expect(status.status).toBe('ready');
    expect(status.parts[0]?.status).toBe('ready');
    const serialized = JSON.stringify(status);
    expect(serialized).not.toContain(manifest.items[0]?.sha256 ?? '');
    expect(serialized).not.toContain('bytes');
    expect(serialized).not.toContain('sourcePath');

    const entries = await service.quarantineEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).not.toContain(part.partId);
    expect((await stat(root)).mode & 0o777).toBe(0o700);
    expect((await stat(join(root, entries[0] ?? ''))).mode & 0o777).toBe(0o600);
    expect(service.stats().sourceBytes).toBe(0);
    expect(service.stats().normalizedBytes).toBe(result.normalizedBytes);
  });

  it('deletes normalized bytes on cancellation, TTL expiry, and delivery ambiguity', async () => {
    let now = Date.parse('2026-01-01T00:00:00.000Z');
    const bytes = await fixturePng();
    const { service } = await makeService(() => now);
    const owner = makeOwner();
    const reservation = await service.reserve(owner, makeManifest(bytes));

    await service.cancel(reservation.setId, owner, 'user');
    expect(await service.quarantineEntries()).toEqual([]);
    expect(service.status(reservation.setId, owner).status).toBe('cancelled');

    const expired = await service.reserve(owner, makeManifest(bytes, 'submission_expired'));
    now += UNCOMMITTED_TTL_MS + 1;
    expect(await service.reapExpired(now)).toBe(1);
    expect(service.status(expired.setId, owner).status).toBe('expired');

    const ambiguous = await service.reserve(owner, makeManifest(bytes, 'submission_ambiguous'));
    await service.markDeliveryUnknown(ambiguous.setId);
    expect(await service.quarantineEntries()).toEqual([]);
    expect(service.status(ambiguous.setId, owner).status).toBe('delivery-unknown');
  });

  it('purges crash leftovers before accepting work and cleans on reaper shutdown', async () => {
    const { service, root } = await makeService();
    await service.initialize();
    const orphan = join(root, 'orphan_without_extension');
    await writeFile(orphan, Buffer.from('transient'), { mode: 0o600 });
    expect(await readdir(root)).toEqual(['orphan_without_extension']);

    const reaper = new AttachmentReaper({ service, intervalMs: 60_000 });
    await reaper.start();
    expect(await service.quarantineEntries()).toEqual([]);
    await reaper.shutdown();
    expect(await service.quarantineEntries()).toEqual([]);
  });

  it('rejects exact-length, digest, and MIME failures without retaining usable bytes', async () => {
    const bytes = await fixturePng();
    const owner = makeOwner();

    const wrongLength = await makeService();
    const lengthReservation = await wrongLength.service.reserve(
      owner,
      makeManifest(bytes, 'length'),
    );
    const lengthPart = requiredPart(wrongLength.service, lengthReservation.setId);
    await expect(
      wrongLength.service.uploadPart({
        setId: lengthReservation.setId,
        partId: lengthPart.partId,
        contentLength: bytes.byteLength + 1,
        declaredMime: 'image/png',
        digest: lengthReservation.manifest.items[0]?.sha256 ?? '',
        body: chunked(bytes),
      }),
    ).rejects.toMatchObject({ code: 'invalid_binding' });
    expect(await wrongLength.service.quarantineEntries()).toEqual([]);

    const wrongDigest = await makeService();
    const digestManifest = makeManifest(bytes, 'digest');
    const digestReservation = await wrongDigest.service.reserve(owner, digestManifest);
    const digestPart = requiredPart(wrongDigest.service, digestReservation.setId);
    const altered = Uint8Array.from(bytes);
    altered[altered.length - 1] = (altered[altered.length - 1] ?? 0) ^ 1;
    await expect(
      wrongDigest.service.uploadPart({
        setId: digestReservation.setId,
        partId: digestPart.partId,
        contentLength: altered.byteLength,
        declaredMime: 'image/png',
        digest: digestManifest.items[0]?.sha256 ?? '',
        body: chunked(altered),
      }),
    ).rejects.toMatchObject({ code: 'digest_mismatch' });
    expect(await wrongDigest.service.quarantineEntries()).toEqual([]);

    const wrongMime = await makeService();
    const mimeManifest = makeManifest(bytes, 'mime', 'image/jpeg');
    const mimeReservation = await wrongMime.service.reserve(owner, mimeManifest);
    const mimePart = requiredPart(wrongMime.service, mimeReservation.setId);
    await expect(
      wrongMime.service.uploadPart({
        setId: mimeReservation.setId,
        partId: mimePart.partId,
        contentLength: bytes.byteLength,
        declaredMime: 'image/jpeg',
        digest: mimeManifest.items[0]?.sha256 ?? '',
        body: chunked(bytes),
      }),
    ).rejects.toMatchObject({ code: 'mime_mismatch' });
    expect(await wrongMime.service.quarantineEntries()).toEqual([]);
  });

  it('aborts streamed overflow and rejects replayed parts', async () => {
    const bytes = await fixturePng();
    const { service } = await makeService();
    const owner = makeOwner();
    const reservation = await service.reserve(owner, makeManifest(bytes, 'overflow'));
    const part = requiredPart(service, reservation.setId);
    const overflow = new Uint8Array(bytes.byteLength + 1);
    overflow.set(bytes);
    overflow[overflow.length - 1] = 0;
    await expect(
      service.uploadPart({
        setId: reservation.setId,
        partId: part.partId,
        contentLength: bytes.byteLength,
        declaredMime: 'image/png',
        digest: reservation.manifest.items[0]?.sha256 ?? '',
        body: chunked(overflow),
      }),
    ).rejects.toMatchObject({ code: 'body_too_large' });
    expect(await service.quarantineEntries()).toEqual([]);

    const readyReservation = await service.reserve(owner, makeManifest(bytes, 'replay'));
    const readyPart = requiredPart(service, readyReservation.setId);
    const digest = readyReservation.manifest.items[0]?.sha256 ?? '';
    await service.uploadPart({
      setId: readyReservation.setId,
      partId: readyPart.partId,
      contentLength: bytes.byteLength,
      declaredMime: 'image/png',
      digest,
      body: chunked(bytes),
    });
    await expect(
      service.uploadPart({
        setId: readyReservation.setId,
        partId: readyPart.partId,
        contentLength: bytes.byteLength,
        declaredMime: 'image/png',
        digest,
        body: chunked(bytes),
      }),
    ).rejects.toMatchObject({ code: 'invalid_binding' });
  });
});

describe('attachment ticket binding and quota controls', () => {
  it('keeps attachment tickets operation-specific and one-use', () => {
    const auth = makeAuth();
    const session = createSession(auth);
    const binding = reserveBinding();
    const ticket = auth.issueAttachmentTicket(session, binding);

    expect(
      auth.consumeAttachmentTicket(ticket.ticket, ORIGIN, PRINCIPAL, 'attachment:upload'),
    ).toBeNull();
    expect(
      auth.consumeAttachmentTicket(ticket.ticket, ORIGIN, PRINCIPAL, 'attachment:reserve'),
    ).toMatchObject({ binding });
    expect(
      auth.consumeAttachmentTicket(ticket.ticket, ORIGIN, PRINCIPAL, 'attachment:reserve'),
    ).toBeNull();
  });

  it('binds tickets to origin, principal, device session, revision, and digest', () => {
    const auth = makeAuth();
    const session = createSession(auth);
    const upload: AttachmentTicketBinding = {
      ...reserveBinding(),
      operation: 'upload',
      setId: 'set_test',
      attachmentId: 'attachment_test',
      partId: 'part_test',
      ordinal: 1,
      byteLength: 10,
      sha256: 'a'.repeat(43),
      declaredType: 'image/jpeg',
    };
    const ticket = auth.issueAttachmentTicket(session, upload);
    expect(
      auth.consumeAttachmentTicket(
        ticket.ticket,
        'https://wrong.example.test',
        PRINCIPAL,
        'attachment:upload',
      ),
    ).toBeNull();
    expect(
      auth.consumeAttachmentTicket(
        ticket.ticket,
        ORIGIN,
        'spoofed@example.test',
        'attachment:upload',
      ),
    ).toBeNull();
    expect(
      auth.consumeAttachmentTicket(ticket.ticket, ORIGIN, PRINCIPAL, 'attachment:upload', {
        ...upload,
        sha256: 'b'.repeat(43),
      }),
    ).toBeNull();
    expect(
      auth.consumeAttachmentTicket(ticket.ticket, ORIGIN, PRINCIPAL, 'attachment:upload'),
    ).toBeNull();

    const revoked = auth.issueAttachmentTicket(session, upload);
    expect(auth.revokeSession(session.token)).toBe(true);
    expect(
      auth.consumeAttachmentTicket(revoked.ticket, ORIGIN, PRINCIPAL, 'attachment:upload'),
    ).toBeNull();
  });

  it('enforces the count and byte windows atomically', () => {
    let now = 0;
    const limiter = new AttachmentRateLimiter(
      ATTACHMENT_RATE_LIMIT_COUNT,
      ATTACHMENT_RATE_LIMIT_WINDOW_MS,
      ATTACHMENT_RATE_LIMIT_BYTES,
      ATTACHMENT_BYTE_RATE_WINDOW_MS,
      () => now,
    );
    for (let index = 0; index < ATTACHMENT_RATE_LIMIT_COUNT; index += 1) {
      expect(limiter.consume('device_test', 1, 1)).toBe(true);
    }
    expect(limiter.consume('device_test', 1, 1)).toBe(false);
    now = ATTACHMENT_RATE_LIMIT_WINDOW_MS + 1;
    expect(limiter.consume('device_test', 1, ATTACHMENT_RATE_LIMIT_BYTES)).toBe(false);
    now = ATTACHMENT_BYTE_RATE_WINDOW_MS + 1;
    expect(limiter.consume('device_test', 1, 1)).toBe(true);
  });
});

async function makeService(now: () => number = Date.now): Promise<{
  readonly service: AttachmentService;
  readonly root: string;
}> {
  const root = await mkdtemp(join(tmpdir(), 'pi-remote-attachment-test-'));
  const service = new AttachmentService({ quarantineRoot: root, currentEpoch: EPOCH, now });
  activeServices.push({ service, root });
  return { service, root };
}

function makeOwner(): AttachmentOwner {
  return {
    sessionToken: 'session_token_test',
    sessionId: SESSION_ID,
    sessionEpoch: EPOCH,
    deviceId: 'device_test',
    principal: PRINCIPAL,
    origin: ORIGIN,
  };
}

function makeManifest(
  bytes: Uint8Array,
  submissionId = 'submission_test',
  declaredType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/png',
): AttachmentSetManifest {
  const item: AttachmentManifestItem = {
    clientId: 'client_test',
    ordinal: 1,
    declaredType,
    byteLength: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('base64url'),
  };
  return {
    submissionId,
    sessionId: SESSION_ID,
    sessionEpoch: EPOCH,
    expectedPromptRevision: 1,
    items: [item],
  };
}

function requiredPart(service: AttachmentService, setId: string) {
  const part = service.getPartRecords(setId)?.[0];
  if (part === undefined) throw new Error('Expected a reserved attachment part.');
  return part;
}

async function* chunked(bytes: Uint8Array): AsyncIterable<Uint8Array> {
  for (let offset = 0; offset < bytes.byteLength; offset += 17) {
    yield bytes.subarray(offset, Math.min(bytes.byteLength, offset + 17));
  }
}

async function fixturePng(): Promise<Uint8Array> {
  return new Uint8Array(
    await readFile(
      new URL(
        '../../../docs/design-reference/mobile-chat-apps/screens/00-current-pi-remote.png',
        import.meta.url,
      ),
    ),
  );
}

function reserveBinding(): Extract<AttachmentTicketBinding, { operation: 'reserve' }> {
  return {
    operation: 'reserve',
    sessionId: SESSION_ID,
    sessionEpoch: EPOCH,
    expectedPromptRevision: 1,
    submissionId: 'submission_ticket_test',
  };
}

function makeAuth(): AuthService {
  return new AuthService({ origin: ORIGIN, hostId: HOST_ID });
}

function createSession(auth: AuthService): ApplicationSession {
  const keys = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const exported = keys.publicKey.export({ format: 'jwk' });
  if (
    exported.kty !== 'EC' ||
    exported.crv !== 'P-256' ||
    exported.x === undefined ||
    exported.y === undefined
  ) {
    throw new Error('Test key export failed.');
  }
  const publicKey: DevicePublicKeyJwk = {
    kty: 'EC',
    crv: 'P-256',
    x: exported.x,
    y: exported.y,
  };
  const enrollment = auth.enrollment.createChallenge();
  const enrolled = auth.enroll(
    {
      enrollment,
      publicKey,
      signature: signStatement(keys.privateKey, enrollmentProof(enrollment, publicKey)),
    },
    ORIGIN,
    PRINCIPAL,
  );
  if (enrolled === null) throw new Error('Test enrollment failed.');
  const challenge = auth.createSessionChallenge(enrolled.deviceId, ORIGIN, PRINCIPAL);
  if (challenge === null) throw new Error('Test session challenge failed.');
  const session = auth.createSession(
    enrolled.deviceId,
    challenge.challengeId,
    signStatement(keys.privateKey, sessionProof(ORIGIN, enrolled.deviceId, challenge)),
    ORIGIN,
    PRINCIPAL,
  );
  if (session === null) throw new Error('Test session creation failed.');
  return session;
}

function signStatement(privateKey: KeyObject, statement: string): string {
  return sign('sha256', Buffer.from(statement), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  }).toString('base64url');
}
