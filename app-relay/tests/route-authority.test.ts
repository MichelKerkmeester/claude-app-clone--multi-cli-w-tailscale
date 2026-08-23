// ───────────────────────────────────────────────────────────────────
// MODULE: Route Authority Tests
// ───────────────────────────────────────────────────────────────────
// The two mutation routes covered here had no route-level test of any kind,
// which is how they kept exercising mutation authority without proving
// foreground while twelve siblings proved it. Both directions are asserted on
// each: a background device refused, a foreground device unaffected.

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

describe('mutation route authority', () => {
  it('refuses a background device on approval-decide and accept-edits', async () => {
    const harness = await createHarness();
    const background = await authorize(harness, { foreground: false });

    for (const [path, body] of [
      ['/api/approval/decide', DECISION_BODY],
      ['/api/accept-edits', ACCEPT_EDITS_BODY],
    ] as const) {
      const response = await post(harness.ingressUrl, path, {
        headers: authorizedHeaders(background.cookie),
        body,
      });
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: 'foreground_required' });
    }
  });

  it('does not refuse a foreground device on either route', async () => {
    const harness = await createHarness();
    const foreground = await authorize(harness);

    for (const [path, body] of [
      ['/api/approval/decide', DECISION_BODY],
      ['/api/accept-edits', ACCEPT_EDITS_BODY],
    ] as const) {
      const response = await post(harness.ingressUrl, path, {
        headers: authorizedHeaders(foreground.cookie),
        body,
      });
      // The outcome depends on approval and policy state this test does not set
      // up, and accept-edits legitimately answers 403 grant_denied. What matters
      // is that foreground authority never rejects a device holding a socket.
      expect(await response.json()).not.toEqual({ error: 'foreground_required' });
    }
  });

  it('keeps the approval listing answering a background device', async () => {
    const harness = await createHarness();
    const background = await authorize(harness, { foreground: false });

    // Listing is a read. Gating it would refuse a phone whose socket has not
    // re-opened yet, which is a regression bought for no invariant.
    const response = await post(harness.ingressUrl, '/api/approvals', {
      headers: authorizedHeaders(background.cookie),
      body: { sessionId: SESSION_ID },
    });

    expect(await response.json()).not.toEqual({ error: 'foreground_required' });
  });
});

async function createHarness(): Promise<Harness> {
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
): Promise<{ readonly cookie: string }> {
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
  if (!foreground) return { cookie };

  const ticketResponse = await post(harness.ingressUrl, '/api/auth/ticket', {
    headers: authorizedHeaders(cookie),
  });
  const ticket = (await ticketResponse.json()) as WebSocketTicketResponse;
  await connectForeground(harness, ticket.ticket);
  return { cookie };
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
