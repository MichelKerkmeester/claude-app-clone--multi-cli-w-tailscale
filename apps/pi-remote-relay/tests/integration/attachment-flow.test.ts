// ───────────────────────────────────────────────────────────────────
// MODULE: Attachment Submission Integration
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
import { PromptService } from '../../src/prompt/prompt-service.js';
import { PromptRevisionCoordinator } from '../../src/prompt/prompt-revision-coordinator.js';
import { SyncHub } from '../../src/replay/sync.js';
import type { RpcSupervisor } from '../../src/rpc/supervisor.js';
import { RelayStore } from '../../src/store/relay-store.js';
import { TranscriptProjector } from '../../src/store/transcript-projector.js';

const EPOCH = 'epoch_attachment_integration';
const SESSION_ID = 'session_attachment_integration';
const now = Date.parse('2026-01-01T00:00:00.000Z');

const activeServices: Array<{ readonly service: AttachmentService; readonly root: string }> = [];

afterEach(async () => {
  await Promise.all(
    activeServices.splice(0).map(async ({ service, root }) => {
      await service.cleanupAll();
      await rm(root, { recursive: true, force: true });
    }),
  );
});

describe('attachment submission bridge integration', () => {
  it('reserves, uploads, normalizes, commits, and persists ordered redacted cards', async () => {
    const bytes = await fixturePng();
    const root = await mkdtemp(join(tmpdir(), 'pi-remote-attachment-flow-'));
    const service = new AttachmentService({
      quarantineRoot: root,
      currentEpoch: EPOCH,
      currentModelId: 'model_image_fixture',
      now: () => now,
    });
    activeServices.push({ service, root });

    const owner = makeOwner();
    const manifest = makeManifest(bytes);
    const reservation = await service.reserve(owner, manifest);
    const parts = service.getPartRecords(reservation.setId);
    expect(parts).toHaveLength(2);
    if (parts === null) throw new Error('The reservation did not expose its parts.');

    for (const part of parts) {
      await service.uploadPart({
        setId: reservation.setId,
        partId: part.partId,
        contentLength: part.item.byteLength,
        declaredMime: part.item.declaredType,
        digest: part.item.sha256,
        body: chunked(bytes),
      });
    }
    expect(service.status(reservation.setId, owner).status).toBe('ready');

    let forwarded: PiRpcCommand | null = null;
    const send = vi.fn(async (command: PiRpcCommand): Promise<PiRpcResponse> => {
      forwarded = command;
      return { id: command.id, type: 'response', command: command.type, success: true };
    });
    const revision = new PromptRevisionCoordinator(1);
    const bridge = new PiImageBridge({
      supervisor: { send },
      attachments: service,
      getRuntimeSnapshot: () => imageRuntimeSnapshot(),
      currentPromptRevision: () => revision.current(),
      planPolicy: () => true,
      now: () => new Date(now),
    });
    const store = new RelayStore();
    const prompts = new PromptService({
      store,
      syncHub: new SyncHub(store),
      supervisor: { send } as unknown as RpcSupervisor,
      projector: new TranscriptProjector(),
      hostId: 'host_local',
      workspaceRef: 'workspace_default',
      sessionId: SESSION_ID,
      epoch: EPOCH,
      now: () => new Date(now),
      imageBridge: bridge,
      revisionCoordinator: revision,
      getAttachmentOwner: (_deviceId, setId) => (setId === reservation.setId ? owner : null),
    });

    const block = await prompts.submit(
      {
        type: 'prompt.submit',
        submissionId: manifest.submissionId,
        sessionId: SESSION_ID,
        message: '',
        ticket: 'ticket_fixture_only',
        expectedPromptRevision: 1,
        attachmentSetId: reservation.setId,
        attachmentIds: parts.map((part) => part.attachmentId),
      },
      owner.deviceId,
    );

    expect(block).toMatchObject({ kind: 'text', role: 'user', text: '' });
    expect(send).toHaveBeenCalledTimes(1);
    expect(forwarded).toMatchObject({
      type: 'prompt',
      message: '',
      images: [
        { type: 'image', mimeType: expect.any(String), data: expect.any(String) },
        { type: 'image', mimeType: expect.any(String), data: expect.any(String) },
      ],
    });

    const syncPlan = store.createSyncPlan({
      hostId: 'host_local',
      workspaceRef: 'workspace_default',
      sessionId: SESSION_ID,
    });
    const envelopes = syncPlan.messages.flatMap((message) =>
      'envelopes' in message ? message.envelopes : [],
    );
    const cards = envelopes
      .map((envelope) => envelope.payload)
      .filter(
        (payload): payload is { readonly kind: 'attachment'; readonly ordinal: number } =>
          typeof payload === 'object' &&
          payload !== null &&
          'kind' in payload &&
          payload.kind === 'attachment',
      );
    expect(cards.map((card) => card.ordinal)).toEqual([1, 2]);
    expect(JSON.stringify(syncPlan)).not.toContain('attachmentSetId');
    expect(JSON.stringify(syncPlan)).not.toContain('normalizedPath');
    expect(await service.quarantineEntries()).toEqual([]);
    expect(
      await service.loadNormalizedDerivative(reservation.setId, parts[0]!.attachmentId),
    ).toBeNull();
    store.close();
  });
});

function makeOwner(): AttachmentOwner {
  return {
    sessionToken: 'session_token_attachment_integration',
    sessionId: SESSION_ID,
    sessionEpoch: EPOCH,
    deviceId: 'device_attachment_integration',
    principal: 'operator@example.test',
    origin: 'https://pi-remote.example.test',
  };
}

function makeManifest(bytes: Uint8Array): AttachmentSetManifest {
  const digest = createHash('sha256').update(bytes).digest('base64url');
  return {
    submissionId: 'submission_attachment_integration',
    sessionId: SESSION_ID,
    sessionEpoch: EPOCH,
    expectedPromptRevision: 1,
    items: [
      {
        clientId: 'client_first',
        ordinal: 1,
        declaredType: 'image/png',
        byteLength: bytes.byteLength,
        sha256: digest,
      },
      {
        clientId: 'client_second',
        ordinal: 2,
        declaredType: 'image/png',
        byteLength: bytes.byteLength,
        sha256: digest,
      },
    ],
  };
}

async function* chunked(bytes: Uint8Array): AsyncIterable<Uint8Array> {
  for (let offset = 0; offset < bytes.byteLength; offset += 31) {
    yield bytes.subarray(offset, Math.min(bytes.byteLength, offset + 31));
  }
}

async function fixturePng(): Promise<Uint8Array> {
  return new Uint8Array(
    await readFile(
      new URL(
        '../../../../docs/design-reference/mobile-chat-apps/screens/00-current-pi-remote.png',
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
      updatedAt: new Date(now).toISOString(),
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
