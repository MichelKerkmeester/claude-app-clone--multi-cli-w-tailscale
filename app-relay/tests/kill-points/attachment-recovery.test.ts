// ───────────────────────────────────────────────────────────────────
// MODULE: Attachment Lifecycle Kill-Point Tests
// ───────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  DEFAULT_MEDIA_POLICY,
  type AttachmentSetManifest,
  type PiRpcCommand,
  type PiRpcResponse,
  type RuntimeSnapshotDto,
} from '@pi-remote/pi-rpc-protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AttachmentOwner } from '../../src/attachments/attachment-types.js';
import { AttachmentService } from '../../src/attachments/attachment-service.js';
import { PiImageBridge } from '../../src/attachments/pi-image-bridge.js';

const EPOCH = 'epoch_attachment_recovery';
const SESSION_ID = 'session_attachment_recovery';
const activeServices: Array<{ readonly service: AttachmentService; readonly root: string }> = [];

afterEach(async () => {
  await Promise.all(
    activeServices.splice(0).map(async ({ service, root }) => {
      await service.cleanupAll();
      await rm(root, { recursive: true, force: true });
    }),
  );
});

describe('attachment recovery kill points', () => {
  it('cancels a shutdown during a streamed upload and prevents bridge commit', async () => {
    const bytes = await fixturePng();
    const { service } = await makeService();
    const owner = makeOwner();
    const reservation = await service.reserve(owner, makeManifest(bytes, 'shutdown'));
    const part = service.getPartRecords(reservation.setId)?.[0];
    if (part === undefined) throw new Error('Expected a reserved part.');

    let releaseBody!: () => void;
    const bodyReady = new Promise<void>((resolve) => {
      releaseBody = resolve;
    });
    const upload = service.uploadPart({
      setId: reservation.setId,
      partId: part.partId,
      contentLength: bytes.byteLength,
      declaredMime: 'image/png',
      digest: part.item.sha256,
      body: delayedBody(bytes, bodyReady),
    });
    await Promise.resolve();
    await service.cancel(reservation.setId, owner, 'shutdown');
    releaseBody();

    await expect(upload).rejects.toMatchObject({ code: 'cancelled' });
    expect(await service.quarantineEntries()).toEqual([]);
    expect(service.status(reservation.setId, owner).status).toBe('cancelled');

    const send = vi.fn(async (command: PiRpcCommand): Promise<PiRpcResponse> => ({
      id: command.id,
      type: 'response',
      command: command.type,
      success: true,
    }));
    const bridge = new PiImageBridge({
      supervisor: { send },
      attachments: service,
      getRuntimeSnapshot: () => imageRuntimeSnapshot(),
      currentPromptRevision: () => 1,
      planPolicy: () => true,
    });
    await expect(
      bridge.submit(
        {
          type: 'prompt.submit',
          submissionId: 'shutdown',
          sessionId: SESSION_ID,
          message: '',
          ticket: 'fixture',
          expectedPromptRevision: 1,
          attachmentSetId: reservation.setId,
          attachmentIds: [part.attachmentId],
        },
        owner,
      ),
    ).rejects.toMatchObject({ code: 'not-ready' });
    expect(send).not.toHaveBeenCalled();
  });

  it('invalidates an epoch while upload is suspended and leaves no derivative', async () => {
    const bytes = await fixturePng();
    const { service } = await makeService();
    const owner = makeOwner();
    const reservation = await service.reserve(owner, makeManifest(bytes, 'epoch'));
    const part = service.getPartRecords(reservation.setId)?.[0];
    if (part === undefined) throw new Error('Expected a reserved part.');

    let releaseBody!: () => void;
    const bodyReady = new Promise<void>((resolve) => {
      releaseBody = resolve;
    });
    const upload = service.uploadPart({
      setId: reservation.setId,
      partId: part.partId,
      contentLength: bytes.byteLength,
      declaredMime: 'image/png',
      digest: part.item.sha256,
      body: delayedBody(bytes, bodyReady),
    });
    await Promise.resolve();
    await service.cancelForEpoch(EPOCH);
    releaseBody();

    await expect(upload).rejects.toMatchObject({ code: 'expired' });
    expect(await service.quarantineEntries()).toEqual([]);
    expect(service.status(reservation.setId, owner).status).toBe('expired');
    expect(service.stats().relayBytes).toBe(0);
  });

  it('reaps process leftovers before accepting the next reservation', async () => {
    const { service, root } = await makeService();
    await service.initialize();
    const orphanPath = join(root, 'normalized_process_leftover');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(orphanPath, Buffer.from('transient'), { mode: 0o600 });
    expect(await service.quarantineEntries()).toEqual(['normalized_process_leftover']);

    await service.recoverStartup();
    expect(await service.quarantineEntries()).toEqual([]);
    const bytes = await fixturePng();
    const reservation = await service.reserve(makeOwner(), makeManifest(bytes, 'after-crash'));
    expect(reservation.setId).toMatch(/^set_/);
    expect(await service.quarantineEntries()).toEqual([]);
  });
});

async function makeService(): Promise<{
  readonly service: AttachmentService;
  readonly root: string;
}> {
  const root = await mkdtemp(join(tmpdir(), 'pi-remote-attachment-recovery-'));
  const service = new AttachmentService({ quarantineRoot: root, currentEpoch: EPOCH });
  activeServices.push({ service, root });
  return { service, root };
}

function makeOwner(): AttachmentOwner {
  return {
    sessionToken: 'session_token_attachment_recovery',
    sessionId: SESSION_ID,
    sessionEpoch: EPOCH,
    deviceId: 'device_attachment_recovery',
    principal: 'operator@example.test',
    origin: 'https://pi-remote.example.test',
  };
}

function makeManifest(bytes: Uint8Array, submissionId: string): AttachmentSetManifest {
  return {
    submissionId,
    sessionId: SESSION_ID,
    sessionEpoch: EPOCH,
    expectedPromptRevision: 1,
    items: [
      {
        clientId: `client_${submissionId}`,
        ordinal: 1,
        declaredType: 'image/png',
        byteLength: bytes.byteLength,
        sha256: createHash('sha256').update(bytes).digest('base64url'),
      },
    ],
  };
}

async function* delayedBody(bytes: Uint8Array, ready: Promise<void>): AsyncIterable<Uint8Array> {
  await ready;
  yield bytes;
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

function imageRuntimeSnapshot(): RuntimeSnapshotDto {
  return {
    sessionId: SESSION_ID,
    state: {
      sessionId: SESSION_ID,
      revision: 1,
      model: null,
      thinkingLevel: 'unknown',
      availableThinkingLevels: [],
      mode: 'build',
      streaming: false,
      updatedAt: new Date().toISOString(),
    },
    models: {
      sessionId: SESSION_ID,
      catalogRevision: 1,
      runtimeRevision: 1,
      currentModel: null,
      streaming: false,
      canSetModelWhileStreaming: false,
      models: [],
    },
    media: { enabled: true, imageIn: true, policy: DEFAULT_MEDIA_POLICY },
  };
}
