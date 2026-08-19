// ───────────────────────────────────────────────────────────────────
// MODULE: Pinned Pi Image Persistence Probe
// ───────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { spawn as realSpawn, type ChildProcess } from 'node:child_process';

import { DEFAULT_MEDIA_POLICY, type PiRpcCommand, type PiRpcEvent } from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it } from 'vitest';

import type {
  AttachmentOwner,
  AttachmentStatusDto,
} from '../../src/attachments/attachment-types.js';
import {
  PiImageBridge,
  type PiImageAttachmentSource,
} from '../../src/attachments/pi-image-bridge.js';
import { RpcSupervisor } from '../../src/rpc/supervisor.js';
import { StrictJsonlDecoder } from '../../src/rpc/framing.js';

const SESSION_ID = 'session_pinned_pi_image';
const EPOCH = 'epoch_pinned_pi_image';
const NOW = Date.parse('2026-01-01T00:00:00.000Z');

describe('pinned Pi image bridge probe', () => {
  it('enforces the one MiB framed event-record cap', () => {
    const records: unknown[] = [];
    const errors: Error[] = [];
    const decoder = new StrictJsonlDecoder({
      onRecord: (record) => records.push(record),
      onError: (error) => errors.push(error),
    });
    decoder.push(`${JSON.stringify({ type: 'event', payload: 'x'.repeat(1_048_576) })}\n`);

    expect(records).toHaveLength(0);
    expect(errors.some((error) => error.message.includes('1048576'))).toBe(true);
  });

  it('probes the installed Pi build for image persistence and stdout echo', async ({ skip }) => {
    const beforeJsonl = workspaceJsonlSnapshot();
    const rawStdout: Buffer[] = [];
    const rawStdin: string[] = [];
    const events: PiRpcEvent[] = [];
    const supervisor = new RpcSupervisor({
      command: 'pi',
      args: ['--mode', 'rpc', '--no-session', '--no-tools', '--no-extensions'],
      requestTimeoutMs: 5_000,
      maxRestarts: 0,
      spawn: captureSpawn(rawStdout, rawStdin),
    });
    supervisor.onEvent((event) => events.push(event));

    try {
      await supervisor.start();
      const running = await waitForRunning(supervisor, 5_000);
      if (!running) {
        skip('pinned Pi 0.84.2 was unavailable or failed to start in RPC mode');
        return;
      }

      const bridge = new PiImageBridge({
        supervisor: { send: (command) => supervisor.send(command) },
        attachments: probeSource(),
        getRuntimeSnapshot: () => probeRuntimeSnapshot(),
        currentPromptRevision: () => 0,
        planPolicy: () => true,
        now: () => new Date(NOW),
      });
      let result: Awaited<ReturnType<PiImageBridge['submit']>>;
      try {
        result = await bridge.submit(probeCommand(), probeOwner());
      } catch {
        skip(
          'pinned Pi 0.84.2 rejected image input in RPC mode; the image lane remains disabled and this is not treated as a pass',
        );
        return;
      }
      if (result.status !== 'delivered') {
        skip(
          'pinned Pi 0.84.2 did not complete image delivery; persistence and echo assertions are not claimed',
        );
        return;
      }

      const requestImageData = findImageData(rawStdin);
      expect(requestImageData).toBeDefined();
      const stdout = Buffer.concat(rawStdout).toString('utf8');
      expect(requestImageData === undefined || stdout.includes(requestImageData)).toBe(false);
      expect(events.some(containsImagePayload)).toBe(false);

      const afterJsonl = workspaceJsonlSnapshot();
      expect(afterJsonl).toEqual(beforeJsonl);
      for (const [path, contents] of beforeJsonl) {
        expect(readFileSync(path, 'utf8')).toBe(contents);
      }
    } finally {
      await supervisor.stop();
    }
  });
});

function captureSpawn(rawStdout: Buffer[], rawStdin: string[]) {
  return ((command: string, args: readonly string[], options: object): ChildProcess => {
    const child = realSpawn(command, args, options as never);
    child.stdout?.on('data', (chunk: Buffer) => rawStdout.push(Buffer.from(chunk)));
    if (child.stdin !== null) {
      const writable = child.stdin as unknown as {
        write: (...args: unknown[]) => unknown;
      };
      const originalWrite = writable.write.bind(child.stdin);
      writable.write = (...args: unknown[]) => {
        const chunk = args[0];
        if (typeof chunk === 'string' || Buffer.isBuffer(chunk)) {
          rawStdin.push(Buffer.from(chunk).toString('utf8'));
        }
        return originalWrite(...args);
      };
    }
    return child;
  }) as unknown as typeof realSpawn;
}

async function waitForRunning(supervisor: RpcSupervisor, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (supervisor.health().state === 'running') return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return supervisor.health().state === 'running';
}

function findImageData(chunks: readonly string[]): string | undefined {
  for (const line of chunks.join('').split('\n')) {
    if (line.length === 0) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line) as unknown;
    } catch {
      continue;
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) continue;
    const images = (parsed as { readonly images?: unknown }).images;
    if (!Array.isArray(images)) continue;
    const first = images[0];
    if (first !== null && typeof first === 'object' && !Array.isArray(first)) {
      const data = (first as { readonly data?: unknown }).data;
      if (typeof data === 'string') return data;
    }
  }
  return undefined;
}

function containsImagePayload(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsImagePayload);
  const record = value as Record<string, unknown>;
  if (record.type === 'image') return true;
  return Object.values(record).some(containsImagePayload);
}

function workspaceJsonlSnapshot(): Map<string, string> {
  let listing = '';
  try {
    listing = execFileSync('rg', ['--files', '-g', '*.jsonl'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
  } catch {
    return new Map();
  }
  const snapshot = new Map<string, string>();
  for (const relative of listing.split('\n').filter((value) => value.length > 0)) {
    const path = `${process.cwd()}/${relative}`;
    snapshot.set(path, readFileSync(path, 'utf8'));
  }
  return snapshot;
}

function probeOwner(): AttachmentOwner {
  return {
    sessionToken: 'session_token_probe',
    sessionId: SESSION_ID,
    sessionEpoch: EPOCH,
    deviceId: 'device_probe',
    principal: 'probe@example.test',
    origin: 'https://pi-remote.example.test',
  };
}

function probeCommand(): Parameters<PiImageBridge['submit']>[0] {
  return {
    type: 'prompt.submit',
    submissionId: 'submission_pinned_pi_image',
    sessionId: SESSION_ID,
    message: '',
    ticket: 'ticket_pinned_pi_image',
    expectedPromptRevision: 0,
    attachmentSetId: 'set_pinned_pi_image',
    attachmentIds: ['attachment_pinned_pi_image'],
  };
}

function probeSource(): PiImageAttachmentSource {
  const owner = probeOwner();
  const expiresAt = NOW + 60_000;
  const part = {
    setId: 'set_pinned_pi_image',
    attachmentId: 'attachment_pinned_pi_image',
    partId: 'part_pinned_pi_image',
    item: {
      clientId: 'client_pinned_pi_image',
      ordinal: 1,
      declaredType: 'image/png' as const,
      byteLength: 67,
      sha256: 'd'.repeat(43),
    },
  };
  const reservation = {
    setId: part.setId,
    owner,
    binding: {
      sessionId: SESSION_ID,
      sessionEpoch: EPOCH,
      expectedPromptRevision: 0,
      submissionId: 'submission_pinned_pi_image',
    },
    manifest: {
      submissionId: 'submission_pinned_pi_image',
      sessionId: SESSION_ID,
      ticket: 'ticket_pinned_pi_image',
      expiresAt: new Date(expiresAt).toISOString(),
    },
    modelId: 'probe_model_label',
    policyVersion: 1,
    expiresAt,
  };
  const status: AttachmentStatusDto = {
    attachmentSetId: part.setId,
    revision: 0,
    status: 'ready',
    expiresAt: reservation.manifest.expiresAt,
    parts: [
      {
        attachmentSetId: part.setId,
        attachmentId: part.attachmentId,
        partId: part.partId,
        ordinal: 1,
        status: 'ready',
      },
    ],
  };
  return {
    getReservation: () => reservation,
    getPartRecords: () => [part],
    status: () => status,
    loadNormalizedDerivative: async () => ({
      bytes: new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0,
        1, 8, 4, 0, 0, 0, 181, 28, 12, 2, 0, 0, 0, 11, 73, 68, 65, 84, 120, 218, 99, 100,
        96, 0, 0, 0, 2, 0, 1, 226, 33, 188, 51, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96,
        130,
      ]),
      mimeType: 'image/png',
    }),
    acknowledgeDelivered: async () => undefined,
    markDeliveryUnknown: async () => undefined,
  };
}

function probeRuntimeSnapshot() {
  return {
    sessionId: SESSION_ID,
    state: {
      sessionId: SESSION_ID,
      revision: 0,
      model: null,
      thinkingLevel: 'unknown',
      availableThinkingLevels: [],
      mode: 'build' as const,
      streaming: false,
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    models: {
      sessionId: SESSION_ID,
      catalogRevision: 1,
      runtimeRevision: 0,
      currentModel: null,
      streaming: false,
      canSetModelWhileStreaming: false,
      models: [],
    },
    media: { enabled: true, imageIn: true, policy: DEFAULT_MEDIA_POLICY },
  };
}
