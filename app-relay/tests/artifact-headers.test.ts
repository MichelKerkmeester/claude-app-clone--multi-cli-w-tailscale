// ───────────────────────────────────────────────────────────────────
// MODULE: Artifact Headers TESTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { createHash, generateKeyPairSync, sign, type KeyObject } from 'node:crypto';

import {
  enrollmentProof,
  sessionProof,
  type DevicePublicKeyJwk,
  type EnrollmentQr,
} from '@pi-remote/pi-rpc-protocol';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';

import { AuthService } from '../src/auth/auth-service.js';
import { startReadOnlyServer, type RunningReadOnlyServer } from '../src/http/server.js';
import { SyncHub } from '../src/replay/sync.js';
import { SessionCatalog } from '../src/sessions/catalog.js';
import { RelayStore } from '../src/store/relay-store.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const ORIGIN = 'https://pi-remote.example.test';
const PRINCIPAL = 'operator@example.test';
const SERVE_SECRET = 'serve_0123456789abcdefghijklmnopqrstuvwxyz';

interface Harness {
  readonly store: RelayStore;
  readonly server: RunningReadOnlyServer;
  readonly ingressUrl: string;
}

const harnesses: Harness[] = [];

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(async () => {
  await Promise.all(
    harnesses.splice(0).map(async ({ server, store }) => {
      await server.stop();
      store.close();
    }),
  );
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('inbound artifact read response integrity', () => {
  it('emits only the exact private immutable variant headers', async () => {
    const harness = await createHarness();
    const { cookie } = await authorizeForeground(harness);
    const identity = {
      sessionId: 'session_local',
      artifactId: 'artifact_headers_001',
      revision: 'revision_headers_001',
    } as const;
    const saved = stageArtifact(harness, identity, 'image/jpeg');

    for (const variant of ['thumbnail', 'full'] as const) {
      const response = await postRead(harness, cookie, { ...identity, variant });
      const bytes = Buffer.from(await response.arrayBuffer());
      const metadata = saved[variant];

      expect(response.status).toBe(200);
      expect(bytes.byteLength).toBe(metadata.byteLength);
      expect(response.headers.get('content-type')).toBe(metadata.mediaType);
      expect(response.headers.get('content-length')).toBe(String(metadata.byteLength));
      expect(response.headers.get('content-digest')).toBe(
        `sha-256=:${Buffer.from(metadata.digest, 'hex').toString('base64')}:`,
      );
      expect(response.headers.get('etag')).toBe(`"${metadata.digest}"`);
      expect(response.headers.get('etag')).not.toMatch(/^W\//u);
      expect(response.headers.get('content-disposition')).toBe(
        `attachment; filename="${metadata.mediaType === 'image/jpeg' ? 'pi-preview.jpg' : 'pi-preview.png'}"`,
      );
      expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('cross-origin-resource-policy')).toBe('same-origin');
      expect(response.headers.get('referrer-policy')).toBe('no-referrer');
      expect(response.headers.get('content-security-policy')).toBeNull();
      expect(response.headers.get('x-artifact-digest')).toBeNull();
      expect(response.headers.get('x-artifact-revision')).toBeNull();
      expect(response.headers.get('location')).toBeNull();
    }
  });

  it('detects a flipped served byte through the advertised SHA-256 digest', async () => {
    const harness = await createHarness();
    const { cookie } = await authorizeForeground(harness);
    const identity = {
      sessionId: 'session_local',
      artifactId: 'artifact_headers_002',
      revision: 'revision_headers_002',
    } as const;
    const saved = stageArtifact(harness, identity, 'image/png');
    const response = await postRead(harness, cookie, { ...identity, variant: 'full' });
    const served = Buffer.from(await response.arrayBuffer());
    const flipped = Buffer.from(served);
    flipped[0] = (flipped[0] ?? 0) ^ 0x01;
    const flippedDigest = createHash('sha256').update(flipped).digest('hex');

    expect(createHash('sha256').update(served).digest('hex')).toBe(saved.full.digest);
    expect(flippedDigest).not.toBe(saved.full.digest);
    expect(`sha-256=:${Buffer.from(flippedDigest, 'hex').toString('base64')}:`).not.toBe(
      response.headers.get('content-digest'),
    );
    expect(`"${flippedDigest}"`).not.toBe(response.headers.get('etag'));
  });
});

// ───────────────────────────────────────────────────────────────────
// 5. HELPERS
// ───────────────────────────────────────────────────────────────────

async function createHarness(): Promise<Harness> {
  const store = new RelayStore();
  const catalog = new SessionCatalog(store);
  catalog.register('session_local', 'idle', 0);
  const server = await startReadOnlyServer({
    store,
    catalog,
    syncHub: new SyncHub(store),
    hostId: 'host_local',
    workspaceRef: 'workspace_default',
    publicOrigin: ORIGIN,
    serveSecret: SERVE_SECRET,
    auth: new AuthService({
      origin: ORIGIN,
      hostId: 'host_local',
      sessionTtlMs: 60_000,
    }),
    port: 0,
  });
  const harness = {
    store,
    server,
    ingressUrl: `http://${server.host}:${server.port}/_serve/${SERVE_SECRET}`,
  };
  harnesses.push(harness);
  return harness;
}

async function authorizeForeground(
  harness: Harness,
): Promise<{ readonly cookie: string; readonly socket: WebSocket }> {
  const keys = deviceKeys();
  const enrollment = harness.server.auth.enrollment.createChallenge();
  const enrolled = harness.server.auth.enroll(enrollmentBody(enrollment, keys), ORIGIN, PRINCIPAL);
  if (enrolled === null) throw new Error('Artifact header enrollment failed.');
  const challenge = harness.server.auth.createSessionChallenge(
    enrolled.deviceId,
    ORIGIN,
    PRINCIPAL,
  );
  if (challenge === null) throw new Error('Artifact header challenge failed.');
  const session = harness.server.auth.createSession(
    enrolled.deviceId,
    challenge.challengeId,
    signStatement(keys.privateKey, sessionProof(ORIGIN, enrolled.deviceId, challenge)),
    ORIGIN,
    PRINCIPAL,
  );
  if (session === null) throw new Error('Artifact header session failed.');
  const ticket = harness.server.auth.issueTicket(session);
  const socket = await connectForeground(harness, ticket.ticket);
  return { cookie: `__Host-pi_remote_session=${session.token}`, socket };
}

async function connectForeground(harness: Harness, ticket: string): Promise<WebSocket> {
  const socket = new WebSocket(
    `${harness.ingressUrl}/api/sync?ticket=${encodeURIComponent(ticket)}`,
    { origin: ORIGIN, headers: { 'tailscale-user-login': PRINCIPAL } },
  );
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      socket.off('open', onOpen);
      reject(error);
    };
    const onOpen = () => {
      socket.off('error', onError);
      resolve();
    };
    socket.once('error', onError);
    socket.once('open', onOpen);
  });
  return socket;
}

async function postRead(harness: Harness, cookie: string, body: unknown): Promise<Response> {
  return fetch(`${harness.ingressUrl}/api/artifacts/read`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      origin: ORIGIN,
      'tailscale-user-login': PRINCIPAL,
      'content-type': 'application/json',
      cookie,
    },
    body: JSON.stringify(body),
  });
}

function stageArtifact(
  harness: Harness,
  identity: { readonly sessionId: string; readonly artifactId: string; readonly revision: string },
  thumbnailMediaType: 'image/png' | 'image/jpeg',
) {
  return harness.store.artifactStore.putInboundArtifact({
    ...identity,
    blockId: `block_${identity.artifactId}`,
    blockRevision: 1,
    ownerPrincipal: PRINCIPAL,
    ownerDeviceId: 'extension_device_001',
    mediaClass: 'screenshot',
    source: 'extension',
    full: {
      mediaType: 'image/png',
      width: 2,
      height: 2,
      bytes: Buffer.from(`full-${identity.artifactId}`),
    },
    thumbnail: {
      mediaType: thumbnailMediaType,
      width: 1,
      height: 1,
      bytes: Buffer.from(`thumbnail-${identity.artifactId}`),
    },
    expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
  });
}

function deviceKeys(): { readonly publicKey: DevicePublicKeyJwk; readonly privateKey: KeyObject } {
  const keys = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const publicKey = keys.publicKey.export({ format: 'jwk' });
  if (
    publicKey.kty !== 'EC' ||
    publicKey.crv !== 'P-256' ||
    publicKey.x === undefined ||
    publicKey.y === undefined
  ) {
    throw new Error('Artifact header key export failed.');
  }
  return {
    publicKey: { kty: 'EC', crv: 'P-256', x: publicKey.x, y: publicKey.y },
    privateKey: keys.privateKey,
  };
}

function enrollmentBody(
  enrollment: EnrollmentQr,
  keys: { readonly publicKey: DevicePublicKeyJwk; readonly privateKey: KeyObject },
) {
  return {
    enrollment,
    publicKey: keys.publicKey,
    signature: signStatement(keys.privateKey, enrollmentProof(enrollment, keys.publicKey)),
  };
}

function signStatement(privateKey: KeyObject, statement: string): string {
  return sign('sha256', Buffer.from(statement), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  }).toString('base64url');
}
