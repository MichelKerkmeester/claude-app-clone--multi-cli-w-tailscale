import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { readdirSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  createInboundMediaHostAdapter,
  publishApprovedImage,
} from '../../extensions/pi-remote-inbound-media/src/index.js';
import { RelayStore, type InboundPublishInput } from '../src/store/relay-store.js';
import { SyncHub } from '../src/replay/sync.js';

function pngFixture(width = 16, height = 16): Buffer {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = y * (width * 4 + 1) + 1 + x * 4;
      raw[offset] = 220;
      raw[offset + 1] = 180;
      raw[offset + 2] = 150;
      raw[offset + 3] = 255;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.byteLength);
  chunk.writeUInt32BE(data.byteLength, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.byteLength);
  return chunk;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function baseInput(body: Buffer, overrides: Partial<InboundPublishInput> = {}): InboundPublishInput {
  return {
    identity: { hostId: 'host_inbound_001', workspaceRef: 'workspace_inbound_001', sessionId: 'session_inbound_001' },
    epoch: 'epoch_inbound_001',
    expectedTranscriptRevision: 0,
    blockId: 'block_inbound_publish_001',
    submissionId: 'submission_inbound_001',
    runId: 'run_inbound_001',
    turnId: 'turn_inbound_001',
    mediaClass: 'raster',
    source: 'extension',
    ownerPrincipal: 'principal_inbound_001',
    ownerDeviceId: 'device_inbound_001',
    declaredByteLength: body.byteLength,
    expectedDigest: createHash('sha256').update(body).digest('hex'),
    body,
    scanner: { scan: () => ({ status: 'clear', matches: [] }) },
    ...overrides,
  };
}

describe('inbound media publication', () => {
  it('runs a deterministic pre-stdout host seam through processing, exact read, revocation, and expiry', async () => {
    const relay = new RelayStore();
    const sync = new SyncHub(relay);
    const body = pngFixture();
    const publishedKinds: string[] = [];
    let seamHandler: ((output: unknown) => void) | undefined;
    let publication: ReturnType<RelayStore['publishInboundImage']> | undefined;
    const adapter = createInboundMediaHostAdapter({
      interception: {
        available: true,
        subscribe: (handler) => {
          seamHandler = handler;
          return () => {
            seamHandler = undefined;
          };
        },
      },
      runtimeSnapshot: { media: { enabled: true, imageIn: true } },
      onApprovedImage: (output) => {
        publication = publishApprovedImage(output, {
          publish: (payload) =>
            relay.publishInboundImage(
              baseInput(Buffer.from(payload.bytes ?? body), {
                source: payload.source,
                mediaClass: payload.mediaClass,
                publish: (candidate) => {
                  publishedKinds.push(candidate.kind);
                  return sync.publish(candidate);
                },
              }),
            ),
        });
      },
    });

    try {
      adapter.start();
      seamHandler?.({
        source: 'extension',
        mediaClass: 'screenshot',
        capabilityHandle: 'opaque_host_fixture_handle_001',
        bytes: body,
      });
      if (publication === undefined) throw new Error('expected host publication');
      const result = await publication;
      expect(adapter.capability).toEqual({ enabled: true, imageIn: true });
      expect(publishedKinds).toEqual(['transcript.block', 'transcript.block']);
      expect(result.status).toBe('ready');
      if (result.status !== 'ready') throw new Error('expected ready publication');

      const identity = {
        sessionId: result.artifact.sessionId,
        artifactId: result.artifact.artifactId,
        revision: result.artifact.revision,
      } as const;
      const exactRead = relay.artifactStore.readInboundVariant({ ...identity, variant: 'full' });
      expect(exactRead.status).toBe('ready');
      if (exactRead.status !== 'ready') throw new Error('expected exact read');
      expect(exactRead.byteLength).toBeGreaterThan(0);

      expect(relay.artifactStore.revokeInboundArtifact(identity)).toBe(true);
      expect(relay.artifactStore.readInboundVariant({ ...identity, variant: 'full' })).toEqual({
        status: 'revoked',
      });

      const expiresAt = new Date(Date.now() + 1_000).toISOString();
      const expiring = relay.artifactStore.putInboundArtifact({
        sessionId: 'session_inbound_expiry_001',
        blockId: 'block_inbound_expiry_001',
        blockRevision: 1,
        ownerPrincipal: 'principal_inbound_001',
        ownerDeviceId: 'device_inbound_001',
        mediaClass: 'screenshot',
        source: 'extension',
        full: {
          mediaType: exactRead.mediaType,
          width: exactRead.metadata.width,
          height: exactRead.metadata.height,
          bytes: exactRead.bytes,
        },
        thumbnail: {
          mediaType: exactRead.mediaType,
          width: exactRead.metadata.width,
          height: exactRead.metadata.height,
          bytes: exactRead.bytes,
        },
        expiresAt,
      });
      expect(
        relay.artifactStore.readInboundVariant(
          { sessionId: expiring.sessionId, artifactId: expiring.artifactId, revision: expiring.revision, variant: 'full' },
          Date.parse(expiresAt) + 1,
        ),
      ).toEqual({ status: 'expired' });
    } finally {
      adapter.stop();
      relay.close();
    }
  });

  it('routes the same host seam to withheld when scanner processing is unavailable', async () => {
    const relay = new RelayStore();
    const body = pngFixture();
    const publishedKinds: string[] = [];
    let seamHandler: ((output: unknown) => void) | undefined;
    let publication: ReturnType<RelayStore['publishInboundImage']> | undefined;
    const adapter = createInboundMediaHostAdapter({
      interception: {
        available: true,
        subscribe: (handler) => {
          seamHandler = handler;
          return () => {
            seamHandler = undefined;
          };
        },
      },
      runtimeSnapshot: { media: { enabled: true, imageIn: true } },
      onApprovedImage: (output) => {
        publication = publishApprovedImage(output, {
          publish: (payload) => {
            const input = baseInput(Buffer.from(payload.bytes ?? body), {
              source: payload.source,
              mediaClass: payload.mediaClass,
              publish: (candidate) => {
                publishedKinds.push(candidate.kind);
                return relay.appendEnvelope(candidate).envelope;
              },
            });
            const { scanner: unavailableScanner, ...withoutScanner } = input;
            void unavailableScanner;
            return relay.publishInboundImage(withoutScanner);
          },
        });
      },
    });

    try {
      adapter.start();
      seamHandler?.({
        source: 'extension',
        mediaClass: 'screenshot',
        capabilityHandle: 'opaque_host_withheld_handle_001',
        bytes: body,
      });
      if (publication === undefined) throw new Error('expected host publication');
      const result = await publication;
      expect(publishedKinds).toEqual(['transcript.block', 'transcript.block']);
      expect(result.status).toBe('withheld');
      expect(
        relay.getTranscriptPage({
          hostId: 'host_inbound_001',
          workspaceRef: 'workspace_inbound_001',
          sessionId: 'session_inbound_001',
        }).items,
      ).toMatchObject([{ availability: 'withheld' }]);
      expect(readdirSync(relay.artifactStore.quarantineRoot)).toEqual([]);
    } finally {
      adapter.stop();
      relay.close();
    }
  });

  it('commits processing then one ready revision and stores only retrievable derivatives', async () => {
    const relay = new RelayStore();
    const sync = new SyncHub(relay);
    const body = pngFixture();
    try {
      const result = await relay.publishInboundImage(
        baseInput(body, {
          scanner: {
            scan: () => ({ status: 'confirmed', matches: [{ x: 1, y: 1, width: 2, height: 2 }] }),
          },
          publish: (candidate) => sync.publish(candidate),
        }),
      );
      expect(result.status).toBe('ready');
      if (result.status !== 'ready') throw new Error('expected ready publication');
      expect(result.block.kind).toBe('inbound_image');
      expect(result.block.availability).toBe('ready');
      expect(result.block.id).toBe('block_inbound_publish_001');
      expect(result.block.revision).toBe(2);
      expect(result.artifact.full.digest).toMatch(/^[a-f0-9]{64}$/u);
      expect(result.artifact.thumbnail.digest).toMatch(/^[a-f0-9]{64}$/u);
      const page = relay.getTranscriptPage({
        hostId: 'host_inbound_001',
        workspaceRef: 'workspace_inbound_001',
        sessionId: 'session_inbound_001',
      });
      expect(page.items).toHaveLength(1);
      expect(page.items[0]).toMatchObject({ id: result.block.id, revision: 2, availability: 'ready' });
      const syncJson = JSON.stringify(syncPlan(relay));
      expect(syncJson).not.toContain(body.toString('hex'));
      expect(readdirSync(relay.artifactStore.quarantineRoot)).toHaveLength(1);
    } finally {
      relay.close();
    }
  });

  it('publishes withheld metadata and no artifact when the scanner is absent', async () => {
    const relay = new RelayStore();
    const body = pngFixture();
    try {
      const { scanner: unusedScanner, ...withoutScanner } = baseInput(body, {
        blockId: 'block_inbound_withheld_001',
        submissionId: 'submission_inbound_withheld_001',
      });
      void unusedScanner;
      const result = await relay.publishInboundImage(
        withoutScanner,
      );
      expect(result.status).toBe('withheld');
      if (result.status !== 'withheld') throw new Error('expected withheld publication');
      expect(result.block).toMatchObject({ availability: 'withheld', reason: 'redaction-unavailable' });
      expect(JSON.stringify(result)).not.toContain(body.toString('hex'));
      expect(readdirSync(relay.artifactStore.quarantineRoot)).toEqual([]);
      expect(relay.getTranscriptPage({ hostId: 'host_inbound_001', workspaceRef: 'workspace_inbound_001', sessionId: 'session_inbound_001' }).items).toHaveLength(1);
    } finally {
      relay.close();
    }
  });

  it('rejects a stale settlement and leaves no staged directory after CAS loss', () => {
    const relay = new RelayStore();
    try {
      const input = baseInput(pngFixture(), { blockId: 'block_inbound_cas_001', submissionId: 'submission_inbound_cas_001' });
      const processing = relay.createInboundProcessingEnvelope(input);
      expect(relay.appendEnvelope(processing).inserted).toBe(true);
      const withheld = relay.createInboundSettlementEnvelope(processing, { status: 'withheld', reason: 'policy' });
      expect(withheld).not.toBeNull();
      if (withheld === null) throw new Error('expected settlement');
      expect(relay.appendEnvelope(withheld).inserted).toBe(true);
      expect(relay.createInboundSettlementEnvelope(processing, { status: 'withheld', reason: 'policy' })).toBeNull();
      expect(readdirSync(relay.artifactStore.quarantineRoot)).toEqual([]);
    } finally {
      relay.close();
    }
  });

  it('finalizes an abandoned processing block as withheld after its deadline', async () => {
    const relay = new RelayStore();
    const now = Date.parse('2026-01-01T00:00:00.000Z');
    try {
      const processing = relay.createInboundProcessingEnvelope(
        baseInput(pngFixture(), {
          now,
          blockId: 'block_inbound_abandoned_001',
          submissionId: 'submission_inbound_abandoned_001',
        }),
      );
      expect(relay.appendEnvelope(processing).inserted).toBe(true);
      expect(await relay.finalizeAbandonedInboundProcessing(undefined, now + 60_001)).toBe(1);
      expect(
        relay.getTranscriptPage({
          hostId: 'host_inbound_001',
          workspaceRef: 'workspace_inbound_001',
          sessionId: 'session_inbound_001',
        }).items,
      ).toMatchObject([{ id: 'block_inbound_abandoned_001', availability: 'withheld', reason: 'retention' }]);
    } finally {
      relay.close();
    }
  });
});

function syncPlan(relay: RelayStore) {
  return relay.createSyncPlan({
    hostId: 'host_inbound_001',
    workspaceRef: 'workspace_inbound_001',
    sessionId: 'session_inbound_001',
  });
}
