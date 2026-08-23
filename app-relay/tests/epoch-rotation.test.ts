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
  type Envelope,
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
const SEQUENCE_EPOCH_A = 'epoch_sequence_a';
const SEQUENCE_EPOCH_B = 'epoch_sequence_b';
const RETAINED_ENDED_EPOCHS = 10;
const STORE_IDENTITY = {
  hostId: HOST_ID,
  workspaceRef: WORKSPACE_REF,
  sessionId: SESSION_ID,
} as const;

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

  it('starts a rotated epoch at one and refuses reuse of the retired epoch', () => {
    const store = new RelayStore();
    try {
      for (const sequence of [1, 2, 3]) {
        expect(store.nextSequence(STORE_IDENTITY, SEQUENCE_EPOCH_A)).toBe(sequence);
        store.appendEnvelope(makeEpochEnvelope(SEQUENCE_EPOCH_A, sequence));
      }

      const firstSequenceInB = store.nextSequence(STORE_IDENTITY, SEQUENCE_EPOCH_B);
      expect(firstSequenceInB).toBe(1);
      expect(
        store.appendEnvelope(makeEpochEnvelope(SEQUENCE_EPOCH_B, firstSequenceInB)).inserted,
      ).toBe(true);

      let reuseError: unknown;
      try {
        store.appendEnvelope(makeEpochEnvelope(SEQUENCE_EPOCH_A, 4));
      } catch (error) {
        reuseError = error;
      }
      expect(reuseError).toBeInstanceOf(Error);
      expect((reuseError as Error).message).toBe(
        `Relay rejected reused or stale epoch '${SEQUENCE_EPOCH_A}'.`,
      );
    } finally {
      store.close();
    }
  });

  it('collects envelopes beyond the ten newest ended epochs but preserves tombstones', () => {
    const store = new RelayStore();
    try {
      for (let index = 0; index <= RETAINED_ENDED_EPOCHS; index += 1) {
        const epoch = collectionEpoch(index);
        store.appendEnvelope(makeEpochEnvelope(epoch, 1, collectionTimestamp(index, 1)));
        store.appendEnvelope(makeEpochEnvelope(epoch, 2, collectionTimestamp(index, 2)));
      }

      const beforeCollectionEnvelopeCount = countRows(store, 'envelopes');
      const beforeCollectionEndedEpochCount = countEndedEpochs(store);
      expect(beforeCollectionEnvelopeCount).toBe(22);
      expect(beforeCollectionEndedEpochCount).toBe(RETAINED_ENDED_EPOCHS);

      const oldestCollectedEpoch = collectionEpoch(0);
      const currentEpochIndex = RETAINED_ENDED_EPOCHS + 1;
      const currentEpoch = collectionEpoch(currentEpochIndex);
      store.appendEnvelope(
        makeEpochEnvelope(currentEpoch, 1, collectionTimestamp(currentEpochIndex, 1)),
      );

      const afterCollectionEnvelopeCount = countRows(store, 'envelopes');
      expect(afterCollectionEnvelopeCount).toBe(21);
      expect(countEndedEpochs(store)).toBe(RETAINED_ENDED_EPOCHS + 1);
      expect(countRows(store, 'envelopes', oldestCollectedEpoch)).toBe(0);
      for (let index = 1; index <= RETAINED_ENDED_EPOCHS; index += 1) {
        expect(countRows(store, 'envelopes', collectionEpoch(index))).toBe(2);
      }
      expect(countRows(store, 'envelopes', currentEpoch)).toBe(1);
      expect(countRows(store, 'stream_epochs', oldestCollectedEpoch)).toBe(1);

      const tombstone = store
        .databaseHandle()
        .prepare(
          `SELECT status FROM stream_epochs
           WHERE host_id = ? AND workspace_ref = ? AND session_id = ? AND epoch = ?`,
        )
        .get(HOST_ID, WORKSPACE_REF, SESSION_ID, oldestCollectedEpoch) as
        | { readonly status: string }
        | undefined;
      expect(tombstone).toEqual({ status: 'ended' });

      let reuseError: unknown;
      try {
        store.appendEnvelope(
          makeEpochEnvelope(oldestCollectedEpoch, 1, collectionTimestamp(currentEpochIndex + 1, 1)),
        );
      } catch (error) {
        reuseError = error;
      }
      expect(reuseError).toBeInstanceOf(Error);
      expect((reuseError as Error).message).toBe(
        `Relay rejected reused or stale epoch '${oldestCollectedEpoch}'.`,
      );
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

function makeEpochEnvelope(
  epoch: string,
  seq: number,
  occurredAt = '2026-01-01T00:00:00.000Z',
): Envelope {
  return {
    v: 1,
    eventId: `event_${epoch}_${seq}`,
    kind: 'pi.message_update',
    hostId: HOST_ID,
    workspaceRef: WORKSPACE_REF,
    sessionId: SESSION_ID,
    epoch,
    seq,
    occurredAt,
    causedBy: null,
    payload: { value: seq },
    redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
    replay: { eligible: true, snapshotEligible: true },
  };
}

function collectionEpoch(index: number): string {
  return `epoch_collection_${String(index).padStart(2, '0')}`;
}

function collectionTimestamp(index: number, seq: number): string {
  return `2026-01-${String(index + 1).padStart(2, '0')}T00:00:0${seq}.000Z`;
}

function countRows(
  store: RelayStore,
  table: 'envelopes' | 'stream_epochs',
  epoch?: string,
): number {
  const database = store.databaseHandle();
  const row =
    epoch === undefined
      ? database
          .prepare(
            `SELECT COUNT(*) AS count FROM ${table}
             WHERE host_id = ? AND workspace_ref = ? AND session_id = ?`,
          )
          .get(HOST_ID, WORKSPACE_REF, SESSION_ID)
      : database
          .prepare(
            `SELECT COUNT(*) AS count FROM ${table}
             WHERE host_id = ? AND workspace_ref = ? AND session_id = ? AND epoch = ?`,
          )
          .get(HOST_ID, WORKSPACE_REF, SESSION_ID, epoch);
  return Number((row as { readonly count: number }).count);
}

function countEndedEpochs(store: RelayStore): number {
  const row = store
    .databaseHandle()
    .prepare(
      `SELECT COUNT(*) AS count FROM stream_epochs
       WHERE host_id = ? AND workspace_ref = ? AND session_id = ? AND status = 'ended'`,
    )
    .get(HOST_ID, WORKSPACE_REF, SESSION_ID) as { readonly count: number };
  return Number(row.count);
}
