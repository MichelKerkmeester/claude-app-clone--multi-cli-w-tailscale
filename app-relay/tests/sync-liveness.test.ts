// ───────────────────────────────────────────────────────────────────
// MODULE: Sync Socket Liveness Tests
// ───────────────────────────────────────────────────────────────────
// Foreground authority is only as current as the live-socket set, so a socket
// the peer has abandoned means a decision made on a connection that was once
// opened rather than one that is currently held.

import { generateKeyPairSync, sign, type KeyObject } from 'node:crypto';

import {
  enrollmentProof,
  sessionProof,
  type DevicePublicKeyJwk,
  type EnrollmentQr,
  type SessionChallengeResponse,
  type WebSocketTicketResponse,
} from '@pi-remote/pi-rpc-protocol';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';

import { ApprovalService } from '../src/approval/approval-service.js';
import { AuthService } from '../src/auth/auth-service.js';
import { startReadOnlyServer, type RunningReadOnlyServer } from '../src/http/server.js';
import { MutationPolicy } from '../src/policy/mutation-policy.js';
import { SyncHub } from '../src/replay/sync.js';
import { SessionCatalog } from '../src/sessions/catalog.js';
import { RelayStore } from '../src/store/relay-store.js';

const ORIGIN = 'https://pi-remote.example.ts.net';
const PRINCIPAL = 'operator@example.com';
const SERVE_SECRET = 'serve_0123456789abcdefghijklmnopqrstuvwxyz';
const SESSION_ID = 'session_local';
const EPOCH = 'epoch_route_authority';

interface Harness {
  readonly store: RelayStore;
  readonly server: RunningReadOnlyServer;
  readonly ingressUrl: string;
}

interface AuthorizedClient {
  readonly cookie: string;
  readonly deviceId: string;
  readonly socket: WebSocket | null;
}

const activeHarnesses: Harness[] = [];
const activeSockets: WebSocket[] = [];

afterEach(async () => {
  for (const socket of activeSockets.splice(0)) socket.close();
  await Promise.all(
    activeHarnesses.splice(0).map(async ({ server, store }) => {
      await server.stop();
      store.close();
    }),
  );
});

const DECISION_BODY = {
  type: 'approval.decide',
  approvalId: 'approval_route_authority_0001',
  decision: 'approve',
  idempotencyKey: 'idem_route_authority_0001',
  epoch: EPOCH,
  revision: 1,
  digest: 'a'.repeat(64),
};

const ACCEPT_EDITS_BODY = {
  sessionId: SESSION_ID,
  epoch: EPOCH,
  allowedTools: ['edit'],
  remainingActions: 1,
  ttlMs: 60_000,
};

describe('sync socket liveness', () => {
  it('reclaims a socket whose peer stopped answering', async () => {
    // The interval is injected rather than waited on: the point of the option
    // is that this assertion costs milliseconds instead of half a minute.
    const harness = await createHarness({ syncHeartbeatIntervalMs: 25 });
    const client = await authorize(harness);
    expect(client.socket).not.toBeNull();

    expect(harness.server.foregroundDeviceIds.size).toBe(1);

    // Silence the pong the ws client answers with automatically, which is what
    // a suspended phone or a dropped tailnet looks like from here.
    const socket = client.socket as WebSocket;
    socket.pong = () => undefined;

    await waitFor(() => harness.server.foregroundDeviceIds.size === 0, 3_000);
    expect(harness.server.foregroundDeviceIds.size).toBe(0);
  });

  it('keeps a socket whose peer still answers', async () => {
    const harness = await createHarness({ syncHeartbeatIntervalMs: 25 });
    await authorize(harness);

    await new Promise((resolve) => setTimeout(resolve, 300));

    // An answering peer must survive many heartbeat rounds, or the heartbeat
    // is just a slow disconnect.
    expect(harness.server.foregroundDeviceIds.size).toBe(1);
  });

  it('reclaims four silent sockets so the same device can connect again', async () => {
    const harness = await createHarness({ syncHeartbeatIntervalMs: 100 });
    const authorized = await authorize(harness, { foreground: false });

    const sockets = await Promise.all(
      Array.from({ length: 4 }, async () => {
        const ticket = await issueTicket(harness, authorized.cookie);
        const socket = await connectForeground(harness, ticket.ticket);
        await subscribeAndSilence(socket);
        return socket;
      }),
    );

    expect(sockets).toHaveLength(4);
    expect(harness.server.foregroundDeviceIds).toEqual(new Set([authorized.deviceId]));

    // This negative control must precede the heartbeat wait while all four
    // valid sockets still occupy the device allowance.
    const refusedTicket = await issueTicket(harness, authorized.cookie);
    const refusal = await rejectedWebSocketResponse(harness, refusedTicket.ticket);
    // Capacity is a 429; invalid or missing credentials would be a 401.
    expect(refusal).toEqual({ statusCode: 429, statusMessage: 'Too Many Requests' });
    expect(refusal.statusCode).not.toBe(401);
    expect(harness.server.foregroundDeviceIds).toEqual(new Set([authorized.deviceId]));

    await waitFor(() => harness.server.foregroundDeviceIds.size === 0, 3_000);
    expect(harness.server.foregroundDeviceIds).toEqual(new Set());

    const reclaimedTicket = await issueTicket(harness, authorized.cookie);
    const reclaimedSocket = await connectForeground(harness, reclaimedTicket.ticket);
    await subscribe(reclaimedSocket);
    expect(harness.server.foregroundDeviceIds).toEqual(new Set([authorized.deviceId]));
  });
});

async function waitFor(condition: () => boolean, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function createHarness(
  overrides: { readonly syncHeartbeatIntervalMs?: number } = {},
): Promise<Harness> {
  const now = Date.parse('2026-01-01T00:00:00.000Z');
  const store = new RelayStore();
  const catalog = new SessionCatalog(store);
  catalog.register(SESSION_ID, 'idle', 0, new Date(now).toISOString());
  const auth = new AuthService({ origin: ORIGIN, hostId: 'host_local', now: () => now });
  const syncHub = new SyncHub(store);
  const approvals = new ApprovalService({
    store,
    syncHub,
    policy: new MutationPolicy(),
    identity: { hostId: 'host_local', workspaceRef: 'workspace_default' },
  });
  const server = await startReadOnlyServer({
    store,
    catalog,
    syncHub,
    hostId: 'host_local',
    workspaceRef: 'workspace_default',
    publicOrigin: ORIGIN,
    serveSecret: SERVE_SECRET,
    auth,
    approvals,
    now: () => now,
    port: 0,
    ...overrides,
  });
  const harness = {
    store,
    server,
    ingressUrl: `http://${server.host}:${server.port}/_serve/${SERVE_SECRET}`,
  };
  activeHarnesses.push(harness);
  return harness;
}

async function authorize(
  harness: Harness,
  { foreground = true }: { readonly foreground?: boolean } = {},
): Promise<AuthorizedClient> {
  const keys = deviceKeys();
  const enrollment = harness.server.auth.enrollment.createChallenge();
  const enrolled = await post(harness.ingressUrl, '/api/auth/enroll', {
    headers: trustedHeaders(),
    body: enrollmentBody(enrollment, keys),
  });
  const { deviceId } = (await enrolled.json()) as { deviceId: string };
  const challengeResponse = await post(harness.ingressUrl, '/api/auth/challenge', {
    headers: trustedHeaders(),
    body: { deviceId },
  });
  const challenge = (await challengeResponse.json()) as SessionChallengeResponse;
  const sessionResponse = await post(harness.ingressUrl, '/api/auth/session', {
    headers: trustedHeaders(),
    body: {
      deviceId,
      challengeId: challenge.challengeId,
      signature: signStatement(keys.privateKey, sessionProof(ORIGIN, deviceId, challenge)),
    },
  });
  const cookie = sessionResponse.headers.get('set-cookie')?.split(';')[0];
  if (cookie === undefined) throw new Error('Test session omitted its cookie.');
  if (!foreground) return { cookie, deviceId, socket: null };

  const ticket = await issueTicket(harness, cookie);
  return { cookie, deviceId, socket: await connectForeground(harness, ticket.ticket) };
}

async function issueTicket(harness: Harness, cookie: string): Promise<WebSocketTicketResponse> {
  const ticketResponse = await post(harness.ingressUrl, '/api/auth/ticket', {
    headers: authorizedHeaders(cookie),
  });
  return (await ticketResponse.json()) as WebSocketTicketResponse;
}

/** Foreground is an open sync socket, which is what the real client holds. */
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
  activeSockets.push(socket);
  return socket;
}

async function subscribe(socket: WebSocket): Promise<void> {
  const message = nextMessage(socket);
  socket.send(JSON.stringify({ type: 'subscribe', sessionId: SESSION_ID }));
  expect(JSON.parse(await message)).toMatchObject({
    kind: 'sync.gap',
    sessionId: SESSION_ID,
  });
}

async function subscribeAndSilence(socket: WebSocket): Promise<void> {
  socket.pong = () => undefined;
  await subscribe(socket);
}

function rejectedWebSocketResponse(
  harness: Harness,
  ticket: string,
): Promise<{ readonly statusCode: number; readonly statusMessage: string }> {
  return new Promise((resolve, reject) => {
    const url = harness.ingressUrl.replace('http:', 'ws:');
    const socket = new WebSocket(`${url}/api/sync?ticket=${encodeURIComponent(ticket)}`, {
      origin: ORIGIN,
      headers: { 'tailscale-user-login': PRINCIPAL },
    });
    socket.once('unexpected-response', (_request, response) => {
      response.resume();
      resolve({
        statusCode: response.statusCode ?? 0,
        statusMessage: response.statusMessage ?? '',
      });
    });
    socket.once('open', () => {
      socket.close();
      reject(new Error('WebSocket unexpectedly opened.'));
    });
    socket.once('error', () => undefined);
  });
}

function deviceKeys(): { publicKey: DevicePublicKeyJwk; privateKey: KeyObject } {
  const keys = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const publicKey = keys.publicKey.export({ format: 'jwk' });
  if (
    publicKey.kty !== 'EC' ||
    publicKey.crv !== 'P-256' ||
    publicKey.x === undefined ||
    publicKey.y === undefined
  ) {
    throw new Error('Test key export failed.');
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

function trustedHeaders(origin = ORIGIN): Record<string, string> {
  return { origin, 'tailscale-user-login': PRINCIPAL };
}

function authorizedHeaders(cookie: string, origin = ORIGIN): Record<string, string> {
  return { ...trustedHeaders(origin), cookie };
}

function nextMessage(socket: WebSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    socket.once('message', (data) => resolve(data.toString()));
    socket.once('error', reject);
  });
}

function post(
  baseUrl: string,
  path: string,
  options: {
    readonly headers?: Readonly<Record<string, string>>;
    readonly body?: unknown;
  } = {},
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...options.headers,
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
}
