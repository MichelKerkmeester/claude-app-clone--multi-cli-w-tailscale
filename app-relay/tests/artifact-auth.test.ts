import { generateKeyPairSync, sign, type KeyObject } from 'node:crypto';

import {
  enrollmentProof,
  sessionProof,
  type DevicePublicKeyJwk,
  type EnrollmentQr,
} from '@pi-remote/pi-rpc-protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';

import { AuthService, type ApplicationSession } from '../src/auth/auth-service.js';
import { authorizeAction } from '../src/auth/policy.js';
import { ArtifactReadRateLimiter } from '../src/auth/rate-limit.js';
import { startReadOnlyServer, type RunningReadOnlyServer } from '../src/http/server.js';
import { SyncHub } from '../src/replay/sync.js';
import { SessionCatalog } from '../src/sessions/catalog.js';
import { RelayStore } from '../src/store/relay-store.js';

const ORIGIN = 'https://pi-remote.example.test';
const PRINCIPAL = 'operator@example.test';
const OTHER_PRINCIPAL = 'other@example.test';
const SERVE_SECRET = 'serve_0123456789abcdefghijklmnopqrstuvwxyz';

interface Harness {
  readonly store: RelayStore;
  readonly server: RunningReadOnlyServer;
  readonly ingressUrl: string;
}

interface AuthorizedClient {
  readonly cookie: string;
  readonly session: ApplicationSession;
  readonly socket?: WebSocket;
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

describe('inbound artifact read authorization', () => {
  it('keeps artifact:read distinct, read-only, and allowed in plan mode', async () => {
    expect(authorizeAction('artifact:read')).toBe(true);
    expect(authorizeAction('artifact:read:mutate')).toBe(false);

    const harness = await createHarness();
    const client = await createClient(harness, false);
    expect(harness.server.auth.isAllowed('artifact:read')).toBe(true);
    expect(harness.server.auth.isAllowed('artifact:publish')).toBe(true);

    const ticket = harness.server.auth.issueTicket(client.session);
    const consumedBefore = harness.server.auth.metrics.ticketsConsumed;
    expect(
      harness.server.auth.consumeTicket(ticket.ticket, ORIGIN, PRINCIPAL, 'artifact:read'),
    ).toBeNull();
    expect(harness.server.auth.metrics.ticketsConsumed).toBe(consumedBefore);
  });

  it('requires trusted origin, principal, enrolled device, foreground membership, and owner identity', async () => {
    const harness = await createHarness();
    const client = await createClient(harness, true);
    const identity = {
      sessionId: 'session_local',
      artifactId: 'artifact_auth_001',
      revision: 'revision_auth_001',
    } as const;
    stageArtifact(harness, identity, PRINCIPAL);

    expect(
      (await postRead(harness, client.cookie, { ...identity, variant: 'thumbnail' })).status,
    ).toBe(200);
    expect(
      (
        await postRead(
          harness,
          client.cookie,
          { ...identity, variant: 'thumbnail' },
          { origin: 'https://other.example.test' },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await postRead(
          harness,
          client.cookie,
          { ...identity, variant: 'thumbnail' },
          { principal: OTHER_PRINCIPAL },
        )
      ).status,
    ).toBe(401);

    const background = await createClient(harness, false);
    expect(
      (await postRead(harness, background.cookie, { ...identity, variant: 'thumbnail' })).status,
    ).toBe(403);

    expect(
      (
        await postRead(harness, client.cookie, {
          ...identity,
          sessionId: 'session_not_in_catalog',
          variant: 'thumbnail',
        })
      ).status,
    ).toBe(404);

    const foreignIdentity = {
      sessionId: 'session_local',
      artifactId: 'artifact_auth_002',
      revision: 'revision_auth_002',
    } as const;
    stageArtifact(harness, foreignIdentity, OTHER_PRINCIPAL);
    expect(
      (await postRead(harness, client.cookie, { ...foreignIdentity, variant: 'thumbnail' })).status,
    ).toBe(404);
    expect(
      (
        await postRead(harness, client.cookie, {
          ...foreignIdentity,
          revision: 'revision_auth_missing_002',
          variant: 'thumbnail',
        })
      ).status,
    ).toBe(404);

    const foreignRevokedIdentity = {
      sessionId: 'session_local',
      artifactId: 'artifact_auth_003',
      revision: 'revision_auth_003',
    } as const;
    stageArtifact(harness, foreignRevokedIdentity, OTHER_PRINCIPAL);
    expect(harness.store.artifactStore.revokeInboundArtifact(foreignRevokedIdentity)).toBe(true);
    expect(
      (await postRead(harness, client.cookie, { ...foreignRevokedIdentity, variant: 'thumbnail' }))
        .status,
    ).toBe(404);

    expect(harness.server.auth.revokeDevice(client.session.deviceId)).toBe(true);
    expect(
      (await postRead(harness, client.cookie, { ...identity, variant: 'thumbnail' })).status,
    ).toBe(401);
  });

  it('does not mint tickets, invoke publish, or mutate relay state', async () => {
    const harness = await createHarness();
    const client = await createClient(harness, true);
    const identity = {
      sessionId: 'session_local',
      artifactId: 'artifact_auth_003',
      revision: 'revision_auth_003',
    } as const;
    stageArtifact(harness, identity, PRINCIPAL);
    const publishInboundImage = vi.spyOn(harness.store, 'publishInboundImage');
    const ticketsIssued = harness.server.auth.metrics.ticketsIssued;
    const ticketsConsumed = harness.server.auth.metrics.ticketsConsumed;
    const streamIdentity = {
      hostId: 'host_local',
      workspaceRef: 'workspace_default',
      sessionId: identity.sessionId,
    } as const;
    const before = harness.store.getTranscriptPage(streamIdentity, 0, 50);

    const response = await postRead(harness, client.cookie, { ...identity, variant: 'full' });

    expect(response.status).toBe(200);
    expect(publishInboundImage).not.toHaveBeenCalled();
    expect(harness.server.auth.metrics.ticketsIssued).toBe(ticketsIssued);
    expect(harness.server.auth.metrics.ticketsConsumed).toBe(ticketsConsumed);
    expect(harness.store.getTranscriptPage(streamIdentity, 0, 50)).toEqual(before);
  });

  it('enforces per-device/session read budgets and concurrent ceilings', () => {
    let now = 10_000;
    const limiter = new ArtifactReadRateLimiter(() => now);

    expect(limiter.tryAcquire('device_001', 'session_local', 'thumbnail').allowed).toBe(true);
    expect(limiter.tryAcquire('device_001', 'session_local', 'thumbnail').allowed).toBe(true);
    const thirdThumbnail = limiter.tryAcquire('device_001', 'session_local', 'thumbnail');
    expect(thirdThumbnail.allowed).toBe(false);
    expect(thirdThumbnail.retryAfterSeconds).toBe(1);
    limiter.release('device_001', 'session_local', 'thumbnail');
    expect(limiter.tryAcquire('device_001', 'session_local', 'thumbnail').allowed).toBe(true);

    expect(limiter.tryAcquire('device_001', 'session_local', 'full').allowed).toBe(true);
    const secondFull = limiter.tryAcquire('device_001', 'session_local', 'full');
    expect(secondFull.allowed).toBe(false);
    expect(secondFull.retryAfterSeconds).toBe(1);
    limiter.release('device_001', 'session_local', 'full');
    limiter.release('device_001', 'session_local', 'thumbnail');
    limiter.release('device_001', 'session_local', 'thumbnail');

    now += 5 * 60_000;
    expect(limiter.tryAcquire('device_001', 'session_local', 'thumbnail').allowed).toBe(true);
    expect(limiter.tryAcquire('device_001', 'session_local', 'full').allowed).toBe(true);
  });
});

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

async function createClient(harness: Harness, foreground: boolean): Promise<AuthorizedClient> {
  const keys = deviceKeys();
  const enrollment = harness.server.auth.enrollment.createChallenge();
  const enrolled = harness.server.auth.enroll(enrollmentBody(enrollment, keys), ORIGIN, PRINCIPAL);
  if (enrolled === null) throw new Error('Artifact auth enrollment failed.');
  const challenge = harness.server.auth.createSessionChallenge(
    enrolled.deviceId,
    ORIGIN,
    PRINCIPAL,
  );
  if (challenge === null) throw new Error('Artifact auth challenge failed.');
  const session = harness.server.auth.createSession(
    enrolled.deviceId,
    challenge.challengeId,
    signStatement(keys.privateKey, sessionProof(ORIGIN, enrolled.deviceId, challenge)),
    ORIGIN,
    PRINCIPAL,
  );
  if (session === null) throw new Error('Artifact auth session failed.');
  if (!foreground) return { cookie: `__Host-pi_remote_session=${session.token}`, session };
  const ticket = harness.server.auth.issueTicket(session);
  const socket = await connectForeground(harness, ticket.ticket);
  return { cookie: `__Host-pi_remote_session=${session.token}`, session, socket };
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

async function postRead(
  harness: Harness,
  cookie: string,
  body: unknown,
  overrides: { readonly origin?: string; readonly principal?: string } = {},
): Promise<Response> {
  return fetch(`${harness.ingressUrl}/api/artifacts/read`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      origin: overrides.origin ?? ORIGIN,
      'tailscale-user-login': overrides.principal ?? PRINCIPAL,
      'content-type': 'application/json',
      cookie,
    },
    body: JSON.stringify(body),
  });
}

function stageArtifact(
  harness: Harness,
  identity: { readonly sessionId: string; readonly artifactId: string; readonly revision: string },
  ownerPrincipal: string,
): void {
  harness.store.artifactStore.putInboundArtifact({
    ...identity,
    blockId: `block_${identity.artifactId}`,
    blockRevision: 1,
    ownerPrincipal,
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
    throw new Error('Artifact auth key export failed.');
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
