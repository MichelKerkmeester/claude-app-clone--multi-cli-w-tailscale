import { generateKeyPairSync, sign, type KeyObject } from 'node:crypto';

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

const ORIGIN = 'https://pi-remote.example.test';
const PRINCIPAL = 'operator@example.test';
const SERVE_SECRET = 'serve_0123456789abcdefghijklmnopqrstuvwxyz';

interface Harness {
  readonly store: RelayStore;
  readonly server: RunningReadOnlyServer;
  readonly ingressUrl: string;
  readonly now: () => number;
  readonly setNow: (value: number) => void;
}

const harnesses: Harness[] = [];

afterEach(async () => {
  await Promise.all(
    harnesses.splice(0).map(async ({ server, store }) => {
      await server.stop();
      store.close();
    }),
  );
});

describe('authenticated inbound artifact reads', () => {
  it('serves only the requested exact sanitized revision and variant', async () => {
    const harness = await createHarness();
    const { cookie } = await authorizeForeground(harness);
    const identity = {
      sessionId: 'session_local',
      artifactId: 'artifact_read_001',
      revision: 'revision_read_001',
    } as const;
    const saved = stageArtifact(harness, identity);

    const response = await postRead(harness, cookie, {
      ...identity,
      variant: 'thumbnail',
    });

    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(
      Buffer.from('thumbnail-artifact_read_001'),
    );
    expect(response.headers.get('etag')).toBe(`"${saved.thumbnail.digest}"`);
    expect(response.headers.get('location')).toBeNull();
  });

  it('rejects latest, paths, URLs, cross-session ids, unknown fields, and tickets', async () => {
    const harness = await createHarness();
    const { cookie } = await authorizeForeground(harness);
    const identity = {
      sessionId: 'session_local',
      artifactId: 'artifact_read_002',
      revision: 'revision_read_002',
    } as const;
    stageArtifact(harness, identity);

    const failures: Array<{ readonly body: Record<string, unknown>; readonly status: number }> = [
      { body: { ...identity, revision: 'latest', variant: 'thumbnail' }, status: 400 },
      {
        body: { ...identity, artifactId: '../../private.txt', variant: 'thumbnail' },
        status: 400,
      },
      {
        body: {
          ...identity,
          artifactId: 'https://private.example/image.png',
          variant: 'thumbnail',
        },
        status: 400,
      },
      {
        body: { ...identity, sessionId: 'session_other', variant: 'thumbnail' },
        status: 404,
      },
      {
        body: { ...identity, variant: 'thumbnail', digest: 'a'.repeat(64) },
        status: 400,
      },
      {
        body: { ...identity, variant: 'thumbnail', ticket: 'mutation_ticket_001' },
        status: 400,
      },
    ];

    for (const failure of failures) {
      const response = await postRead(harness, cookie, failure.body);
      expect(response.status).toBe(failure.status);
      expect(await response.text()).not.toContain('thumbnail-artifact_read_002');
    }
  });

  it('maps unknown, revision-conflict, expired, revoked, and rate-limited reads', async () => {
    const harness = await createHarness();
    const { cookie } = await authorizeForeground(harness);
    const identity = {
      sessionId: 'session_local',
      artifactId: 'artifact_read_003',
      revision: 'revision_read_003',
    } as const;
    stageArtifact(harness, identity);

    expect(
      (
        await postRead(harness, cookie, {
          ...identity,
          artifactId: 'artifact_unknown_003',
          variant: 'thumbnail',
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await postRead(harness, cookie, {
          ...identity,
          revision: 'revision_other_003',
          variant: 'thumbnail',
        })
      ).status,
    ).toBe(409);

    const expiringIdentity = {
      sessionId: 'session_local',
      artifactId: 'artifact_expiring_003',
      revision: 'revision_expiring_003',
    } as const;
    const expiry = harness.now() + 1_000;
    stageArtifact(harness, expiringIdentity, new Date(expiry).toISOString());
    harness.setNow(expiry + 1);
    expect(
      (await postRead(harness, cookie, { ...expiringIdentity, variant: 'thumbnail' })).status,
    ).toBe(410);

    harness.setNow(Date.now());
    const revokedIdentity = {
      sessionId: 'session_local',
      artifactId: 'artifact_revoked_003',
      revision: 'revision_revoked_003',
    } as const;
    stageArtifact(harness, revokedIdentity);
    expect(harness.store.artifactStore.revokeInboundArtifact(revokedIdentity)).toBe(true);
    expect(
      (await postRead(harness, cookie, { ...revokedIdentity, variant: 'thumbnail' })).status,
    ).toBe(410);

    const limitedIdentity = {
      sessionId: 'session_local',
      artifactId: 'artifact_limited_003',
      revision: 'revision_limited_003',
    } as const;
    stageArtifact(harness, limitedIdentity);
    const request = { ...limitedIdentity, variant: 'thumbnail' } as const;
    for (let index = 0; index < 60; index += 1) {
      expect((await postRead(harness, cookie, request)).status).toBe(200);
    }
    const limited = await postRead(harness, cookie, request);
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toMatch(/^\d+$/u);

    const fullRequest = { ...limitedIdentity, variant: 'full' } as const;
    for (let index = 0; index < 30; index += 1) {
      expect((await postRead(harness, cookie, fullRequest)).status).toBe(200);
    }
    const fullLimited = await postRead(harness, cookie, fullRequest);
    expect(fullLimited.status).toBe(429);
    expect(fullLimited.headers.get('retry-after')).toMatch(/^\d+$/u);
  });
});

async function createHarness(): Promise<Harness> {
  let now = Date.now();
  const store = new RelayStore();
  const catalog = new SessionCatalog(store);
  catalog.register('session_local', 'idle', 0, new Date(now).toISOString());
  const auth = new AuthService({
    origin: ORIGIN,
    hostId: 'host_local',
    now: () => now,
    enrollmentTtlMs: 1_000,
    sessionChallengeTtlMs: 1_000,
    sessionTtlMs: 60_000,
  });
  const server = await startReadOnlyServer({
    store,
    catalog,
    syncHub: new SyncHub(store),
    hostId: 'host_local',
    workspaceRef: 'workspace_default',
    publicOrigin: ORIGIN,
    serveSecret: SERVE_SECRET,
    auth,
    now: () => now,
    port: 0,
  });
  const harness: Harness = {
    store,
    server,
    ingressUrl: `http://${server.host}:${server.port}/_serve/${SERVE_SECRET}`,
    now: () => now,
    setNow: (value) => {
      now = value;
    },
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
  if (enrolled === null) throw new Error('Artifact read enrollment failed.');
  const challenge = harness.server.auth.createSessionChallenge(
    enrolled.deviceId,
    ORIGIN,
    PRINCIPAL,
  );
  if (challenge === null) throw new Error('Artifact read challenge failed.');
  const session = harness.server.auth.createSession(
    enrolled.deviceId,
    challenge.challengeId,
    signStatement(keys.privateKey, sessionProof(ORIGIN, enrolled.deviceId, challenge)),
    ORIGIN,
    PRINCIPAL,
  );
  if (session === null) throw new Error('Artifact read session failed.');
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

async function postRead(harness: Harness, cookie: string | null, body: unknown): Promise<Response> {
  return fetch(`${harness.ingressUrl}/api/artifacts/read`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      origin: ORIGIN,
      'tailscale-user-login': PRINCIPAL,
      'content-type': 'application/json',
      ...(cookie === null ? {} : { cookie }),
    },
    body: JSON.stringify(body),
  });
}

function stageArtifact(
  harness: Harness,
  identity: { readonly sessionId: string; readonly artifactId: string; readonly revision: string },
  expiresAt = new Date(Date.now() + 60 * 60_000).toISOString(),
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
      mediaType: 'image/png',
      width: 1,
      height: 1,
      bytes: Buffer.from(`thumbnail-${identity.artifactId}`),
    },
    expiresAt,
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
    throw new Error('Artifact read key export failed.');
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
