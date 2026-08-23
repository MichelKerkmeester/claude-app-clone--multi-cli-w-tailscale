// ───────────────────────────────────────────────────────────────────
// MODULE: Attachment Service Retention Bound Tests
// ───────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { AttachmentManifestItem, AttachmentSetManifest } from '@pi-remote/pi-rpc-protocol';
import { afterEach, describe, expect, it } from 'vitest';

import {
  ATTACHMENT_BYTE_RATE_WINDOW_MS,
  ATTACHMENT_RATE_LIMIT_WINDOW_MS,
} from '../src/attachments/attachment-limits.js';
import { AttachmentService } from '../src/attachments/attachment-service.js';
import {
  AttachmentServiceError,
  type AttachmentOwner,
} from '../src/attachments/attachment-types.js';

const EPOCH = 'epoch_test';
const SESSION_ID = 'session_local';
const BYTES = Buffer.from('retention-bound-fixture', 'utf8');
const RESERVATIONS = 300;

const services: Array<{ readonly service: AttachmentService; readonly root: string }> = [];

afterEach(async () => {
  await Promise.all(
    services.splice(0).map(async ({ service, root }) => {
      await service.cleanupAll();
      await rm(root, { recursive: true, force: true });
    }),
  );
});

function owner(): AttachmentOwner {
  return {
    sessionToken: 'session_token_test',
    sessionId: SESSION_ID,
    sessionEpoch: EPOCH,
    deviceId: 'device_test',
    principal: 'operator@example.test',
    origin: 'https://pi-remote.example.test',
  };
}

function manifest(submissionId: string): AttachmentSetManifest {
  const item: AttachmentManifestItem = {
    clientId: 'client_test',
    ordinal: 1,
    declaredType: 'image/png',
    byteLength: BYTES.byteLength,
    sha256: createHash('sha256').update(BYTES).digest('base64url'),
  };
  return {
    submissionId,
    sessionId: SESSION_ID,
    sessionEpoch: EPOCH,
    expectedPromptRevision: 1,
    items: [item],
  };
}

describe('attachment service retention bound', () => {
  it('stops retaining released reservations once the ceiling is passed', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pi-remote-retention-bound-'));
    // Reservations are rate limited per window, so step the clock past a window
    // each time; the bound under test is a count, not a rate.
    const step = Math.max(ATTACHMENT_RATE_LIMIT_WINDOW_MS, ATTACHMENT_BYTE_RATE_WINDOW_MS) + 1;
    let now = Date.now();
    const service = new AttachmentService({
      quarantineRoot: root,
      currentEpoch: EPOCH,
      now: () => now,
    });
    services.push({ service, root });

    const setIds: string[] = [];
    for (let index = 0; index < RESERVATIONS; index += 1) {
      now += step;
      const reservation = await service.reserve(
        owner(),
        manifest(`submission_bound_${String(index).padStart(4, '0')}`),
      );
      // Cancelling releases the quota, which is what makes the record droppable;
      // a set still holding bytes must survive the prune.
      await service.cancel(reservation.setId, owner(), 'user');
      setIds.push(reservation.setId);
    }

    // The bound is worth nothing unless it actually fires: the oldest released
    // reservation must be gone, and the newest must still be answerable.
    const oldest = setIds[0] as string;
    const newest = setIds[setIds.length - 1] as string;

    expect(() => service.status(oldest, owner())).toThrow(AttachmentServiceError);
    expect(service.status(newest, owner()).status).toBe('cancelled');
  });
});
