// ───────────────────────────────────────────────────────────────────
// MODULE: Epoch Rotation Consumer Tests
// ───────────────────────────────────────────────────────────────────

import { EventEmitter } from 'node:events';
import { createHash, randomBytes } from 'node:crypto';
import { PassThrough } from 'node:stream';
import type { ChildProcessWithoutNullStreams, spawn as nodeSpawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  type AttachmentManifestItem,
  type AttachmentOwner,
  type AttachmentSetManifest,
  type PiRpcCommand,
  type PiRpcEvent,
  type PiRpcResponse,
} from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it, vi } from 'vitest';

import { AttachmentService } from '../src/attachments/attachment-service.js';
import { matchesAuthorityAction } from '../src/http/server.js';
import { publishPiEvent } from '../src/index.js';
import { PromptService } from '../src/prompt/prompt-service.js';
import { SyncHub } from '../src/replay/sync.js';
import { RpcSupervisor } from '../src/rpc/supervisor.js';
import { RelayStore } from '../src/store/relay-store.js';
import { TranscriptProjector } from '../src/store/transcript-projector.js';

const HOST_ID = 'host_local';
const WORKSPACE_REF = 'workspace_default';
const SESSION_ID = 'session_local';
const ENDED_EPOCH = 'epoch_ended';
const CURRENT_EPOCH = 'epoch_current';
const PRINCIPAL = 'operator@example.test';
const ORIGIN = 'https://pi-remote.example.test';

describe('epoch rotation consumers', () => {
  it('uses the current epoch for prompt and transcript envelopes after a restart', async () => {
    const store = new RelayStore();
    const syncHub = new SyncHub(store);
    let epoch = ENDED_EPOCH;
    const send = vi.fn(async (command: PiRpcCommand): Promise<PiRpcResponse> => ({
      id: command.id ?? 'response_epoch_rotation',
      type: 'response',
      command: command.type,
      success: true,
    }));
    const prompts = new PromptService({
      store,
      syncHub,
      supervisor: { send } as unknown as RpcSupervisor,
      projector: new TranscriptProjector(),
      hostId: HOST_ID,
      workspaceRef: WORKSPACE_REF,
      sessionId: SESSION_ID,
      epoch: () => epoch,
    });

    try {
      publishPiEvent(
        store,
        syncHub,
        new TranscriptProjector(),
        { type: 'agent_start' } as PiRpcEvent,
        epoch,
      );
      epoch = CURRENT_EPOCH;
      publishPiEvent(
        store,
        syncHub,
        new TranscriptProjector(),
        { type: 'agent_start' } as PiRpcEvent,
        epoch,
      );
      await prompts.submit(
        {
          type: 'prompt.submit',
          submissionId: 'prompt_after_restart',
          sessionId: SESSION_ID,
          message: 'after restart',
          ticket: 'ticket_after_restart',
        },
        'device_epoch',
      );

      const envelopes = store
        .createSyncPlan({ hostId: HOST_ID, workspaceRef: WORKSPACE_REF, sessionId: SESSION_ID })
        .messages.flatMap((message) => ('envelopes' in message ? message.envelopes : []));
      const promptEnvelope = envelopes.find(
        (envelope) =>
          envelope.kind === 'transcript.block' &&
          JSON.stringify(envelope.payload).includes('after restart'),
      );
      const transcriptEnvelope = envelopes.find(
        (envelope) =>
          envelope.kind === 'transcript.block' &&
          envelope.epoch === CURRENT_EPOCH &&
          JSON.stringify(envelope.payload).includes('Agent started.'),
      );

      expect(promptEnvelope).toBeDefined();
      expect(transcriptEnvelope).toBeDefined();
      expect(promptEnvelope?.epoch).toBe(CURRENT_EPOCH);
      expect(promptEnvelope?.epoch).toBe(transcriptEnvelope?.epoch);
    } finally {
      store.close();
    }
  });

  it('accepts a new-epoch attachment manifest and rejects the ended epoch', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pi-remote-epoch-attachment-'));
    let epoch = ENDED_EPOCH;
    const service = new AttachmentService({
      quarantineRoot: root,
      currentEpoch: () => epoch,
    });
    try {
      epoch = CURRENT_EPOCH;
      const currentOwner = attachmentOwner(CURRENT_EPOCH);
      const currentManifest = attachmentManifest(CURRENT_EPOCH, 'submission_current');
      await expect(service.reserve(currentOwner, currentManifest)).resolves.toMatchObject({
        binding: { sessionEpoch: CURRENT_EPOCH },
      });

      await expect(
        service.reserve(
          attachmentOwner(ENDED_EPOCH),
          attachmentManifest(ENDED_EPOCH, 'submission_ended'),
        ),
      ).rejects.toMatchObject({ code: 'invalid_binding' });
    } finally {
      await service.cleanupAll();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('accepts a current authority action and refuses one carrying the ended epoch', async () => {
    let epoch = ENDED_EPOCH;
    const authority = {
      secret: randomBytes(32).toString('base64url'),
      principal: PRINCIPAL,
      sessionId: SESSION_ID,
      epoch: () => epoch,
      policyVersion: 1,
    };

    epoch = CURRENT_EPOCH;
    const currentAction = authorityAction(CURRENT_EPOCH);
    expect(matchesAuthorityAction(currentAction, authority)).toBe(true);

    const endedAction = authorityAction(ENDED_EPOCH);
    expect(matchesAuthorityAction(endedAction, authority)).toBe(false);
  });

  it('resolves the child environment at each spawn', async () => {
    let epoch = ENDED_EPOCH;
    const children: ChildProcessWithoutNullStreams[] = [];
    const spawnMock = vi.fn(() => {
      const child = mockChild();
      children.push(child);
      return child;
    });
    const supervisor = new RpcSupervisor({
      spawn: spawnMock as unknown as typeof nodeSpawn,
      env: () => ({ PI_REMOTE_APPROVAL_EPOCH: epoch }),
    });

    try {
      const firstStart = supervisor.start();
      children[0]?.emit('spawn');
      await firstStart;
      const firstOptions = spawnMock.mock.calls[0]?.[2] as { readonly env?: unknown } | undefined;
      expect(firstOptions?.env).toEqual({ PI_REMOTE_APPROVAL_EPOCH: ENDED_EPOCH });

      await supervisor.stop();
      epoch = CURRENT_EPOCH;
      const secondStart = supervisor.start();
      children[1]?.emit('spawn');
      await secondStart;
      const secondOptions = spawnMock.mock.calls[1]?.[2] as { readonly env?: unknown } | undefined;
      expect(secondOptions?.env).toEqual({ PI_REMOTE_APPROVAL_EPOCH: CURRENT_EPOCH });
    } finally {
      await supervisor.stop();
    }
  });
});

function attachmentOwner(sessionEpoch: string): AttachmentOwner {
  return {
    sessionToken: `token_${sessionEpoch}`,
    sessionId: SESSION_ID,
    sessionEpoch,
    deviceId: 'device_epoch',
    principal: PRINCIPAL,
    origin: ORIGIN,
  };
}

function attachmentManifest(sessionEpoch: string, submissionId: string): AttachmentSetManifest {
  const bytes = Buffer.from(`attachment-${sessionEpoch}`);
  const item: AttachmentManifestItem = {
    clientId: `client_${sessionEpoch}`,
    ordinal: 1,
    declaredType: 'image/png',
    byteLength: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('base64url'),
  };
  return {
    submissionId,
    sessionId: SESSION_ID,
    sessionEpoch,
    expectedPromptRevision: 1,
    items: [item],
  };
}

function authorityAction(epoch: string) {
  return {
    principal: PRINCIPAL,
    sessionId: SESSION_ID,
    epoch,
    tool: 'edit',
    arguments: { path: 'safe.txt', content: 'hello' },
    policyVersion: 1,
  } as const;
}

function mockChild(): ChildProcessWithoutNullStreams {
  const child = Object.assign(new EventEmitter(), {
    stdin: new PassThrough(),
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    exitCode: null as number | null,
    kill: vi.fn(() => {
      child.exitCode = 0;
      child.emit('close', 0, null);
      return true;
    }),
  });
  return child as unknown as ChildProcessWithoutNullStreams;
}
