// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Auth Flow Tests
// ───────────────────────────────────────────────────────────────────

import { randomBytes, generateKeyPairSync, sign, type KeyObject } from 'node:crypto';

import {
  enrollmentProof,
  sessionProof,
  type DevicePublicKeyJwk,
  type EnrollmentQr,
  type SessionChallengeResponse,
  type RuntimeControlCommand,
  type RuntimeModelTicketRequest,
  type RuntimeStateDto,
  type WebSocketTicketResponse,
  type Envelope,
} from '@pi-remote/pi-rpc-protocol';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';

import { AuthService } from '../src/auth/auth-service.js';
import { startReadOnlyServer, type RunningReadOnlyServer } from '../src/http/server.js';
import { SyncHub } from '../src/replay/sync.js';
import { SessionCatalog } from '../src/sessions/catalog.js';
import { RelayStore } from '../src/store/relay-store.js';
import { PushService, createAttentionPayload } from '../src/push/push-service.js';
import type { RuntimeService } from '../src/runtime/runtime-service.js';

const ORIGIN = 'https://pi-remote.example.ts.net';
const PRINCIPAL = 'operator@example.com';
const SERVE_SECRET = 'serve_0123456789abcdefghijklmnopqrstuvwxyz';

interface Harness {
  readonly store: RelayStore;
  readonly server: RunningReadOnlyServer;
  readonly baseUrl: string;
  readonly ingressUrl: string;
  readonly setNow: (value: number) => void;
  readonly push: PushService;
}

interface AuthorizedClient {
  readonly cookie: string;
  readonly deviceId: string;
  readonly enrollment: EnrollmentQr;
}

const activeHarnesses: Harness[] = [];

afterEach(async () => {
  await Promise.all(
    activeHarnesses.splice(0).map(async ({ server, store }) => {
      await server.stop();
      store.close();
    }),
  );
});

describe('authenticated tailnet boundary', () => {
  it('rejects unauthenticated, wrong or missing Origin, and direct spoofed access', async () => {
    const harness = await createHarness();
    const headers = trustedHeaders();

    expect((await post(harness.ingressUrl, '/api/sessions', { headers })).status).toBe(401);
    expect(
      (
        await post(harness.ingressUrl, '/api/auth/challenge', {
          headers: { 'tailscale-user-login': PRINCIPAL },
          body: { deviceId: 'device_missing' },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await post(harness.ingressUrl, '/api/auth/challenge', {
          headers: trustedHeaders('https://wrong.example.ts.net'),
          body: { deviceId: 'device_missing' },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await post(harness.baseUrl, '/api/sessions', {
          headers: {
            ...headers,
            'tailscale-user-name': 'Spoofed Operator',
            'tailscale-app-capabilities': '{"read":true}',
          },
        })
      ).status,
    ).toBe(403);
  });

  it('enrolls one signed device and authorizes only the read-only session family', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);
    const response = await post(harness.ingressUrl, '/api/sessions', {
      headers: authorizedHeaders(authorized.cookie),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      sessions: [
        {
          id: 'session_local',
          status: 'idle',
          updatedAt: '2026-01-01T00:00:00.000Z',
          messageCount: 0,
        },
      ],
    });
    expect(
      (
        await post(harness.ingressUrl, '/api/prompt', {
          headers: authorizedHeaders(authorized.cookie),
          body: { message: 'mutate' },
        })
      ).status,
    ).toBe(401);
    expect(harness.server.auth.metrics.policyDenied).toBeGreaterThan(0);
  });

  it('rejects reused and expired enrollment challenges', async () => {
    const harness = await createHarness();
    const keys = deviceKeys();
    const enrollment = harness.server.auth.enrollment.createChallenge();
    const body = enrollmentBody(enrollment, keys);

    expect(
      (
        await post(harness.ingressUrl, '/api/auth/enroll', {
          headers: trustedHeaders(),
          body,
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await post(harness.ingressUrl, '/api/auth/enroll', {
          headers: trustedHeaders(),
          body,
        })
      ).status,
    ).toBe(401);

    const expired = harness.server.auth.enrollment.createChallenge();
    harness.setNow(Date.parse(expired.expiresAt) + 1);
    expect(
      (
        await post(harness.ingressUrl, '/api/auth/enroll', {
          headers: trustedHeaders(),
          body: enrollmentBody(expired, keys),
        })
      ).status,
    ).toBe(401);
  });

  it('consumes each WebSocket ticket once and rejects expiry and replay', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);
    const ticket = await issueTicket(harness, authorized.cookie);
    const socket = await connectWebSocket(harness, ticket.ticket);
    socket.send(JSON.stringify({ type: 'subscribe', sessionId: 'session_local' }));
    const message = await nextMessage(socket);
    expect(JSON.parse(message)).toMatchObject({
      kind: 'sync.gap',
      sessionId: 'session_local',
      reason: 'unknown-session',
    });

    expect(await rejectedWebSocketStatus(harness, ticket.ticket)).toBe(401);
    const expired = await issueTicket(harness, authorized.cookie);
    harness.setNow(Date.parse(expired.expiresAt) + 1);
    expect(await rejectedWebSocketStatus(harness, expired.ticket)).toBe(401);
    socket.close();
  });

  it('requires foreground and consumes an exact bound runtime ticket before control', async () => {
    const state: RuntimeStateDto = {
      sessionId: 'session_local',
      revision: 2,
      model: { provider: 'openai', id: 'gpt-4o', label: 'GPT-4o' },
      thinkingLevel: 'high',
      availableThinkingLevels: ['high'],
      mode: 'plan',
      streaming: false,
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    let controls = 0;
    const runtime = {
      getState: () => state,
      getModelCatalog: () => ({
        sessionId: 'session_local',
        catalogRevision: 3,
        runtimeRevision: 2,
        currentModel: state.model,
        streaming: false,
        canSetModelWhileStreaming: false,
        models: [
          state.model,
          { provider: 'openai', id: 'gpt-5', label: 'GPT-5', availability: 'available' },
        ],
      }),
      validateModelTicketRequest: (request: RuntimeModelTicketRequest) => {
        if (request.expectedRevision !== 2) return 'stale_revision';
        if (request.expectedCatalogRevision !== 3) return 'stale_catalog';
        return request.operation.provider === 'openai' && request.operation.modelId === 'gpt-5'
          ? null
          : 'model_unavailable';
      },
      validateFreshModelTicketRequest: async (request: RuntimeModelTicketRequest) => {
        if (request.expectedRevision !== 2) return 'stale_revision';
        if (request.expectedCatalogRevision !== 3) return 'stale_catalog';
        return request.operation.provider === 'openai' && request.operation.modelId === 'gpt-5'
          ? null
          : 'model_unavailable';
      },
      control: async (_command: RuntimeControlCommand) => {
        controls += 1;
        return { outcome: { status: 'accepted', state } } as const;
      },
    } as unknown as RuntimeService;
    const harness = await createHarness(runtime);
    const authorized = await authorize(harness);
    const binding = {
      sessionId: 'session_local',
      expectedRevision: 2,
      expectedCatalogRevision: 3,
      operation: { type: 'set_model', provider: 'openai', modelId: 'gpt-5' },
    } as const;
    expect(
      (
        await post(harness.ingressUrl, '/api/runtime/ticket', {
          headers: authorizedHeaders(authorized.cookie),
          body: binding,
        })
      ).status,
    ).toBe(403);

    const socket = await connectWebSocket(
      harness,
      (await issueTicket(harness, authorized.cookie)).ticket,
    );
    const ticketResponse = await post(harness.ingressUrl, '/api/runtime/ticket', {
      headers: authorizedHeaders(authorized.cookie),
      body: binding,
    });
    expect(ticketResponse.status).toBe(201);
    const ticket = (await ticketResponse.json()) as { ticket: string };
    const substituted = {
      type: 'runtime.control',
      controlId: 'control_substitution',
      ...binding,
      operation: { ...binding.operation, modelId: 'gpt-4o' },
      ticket: ticket.ticket,
    } as const;
    expect(
      (
        await post(harness.ingressUrl, '/api/runtime/control', {
          headers: authorizedHeaders(authorized.cookie),
          body: substituted,
        })
      ).status,
    ).toBe(401);
    expect(controls).toBe(0);

    const exactTicketResponse = await post(harness.ingressUrl, '/api/runtime/ticket', {
      headers: authorizedHeaders(authorized.cookie),
      body: binding,
    });
    const exactTicket = (await exactTicketResponse.json()) as { ticket: string };
    const exact = {
      type: 'runtime.control',
      controlId: 'control_exact',
      ...binding,
      ticket: exactTicket.ticket,
    } as const;
    expect(
      (
        await post(harness.ingressUrl, '/api/runtime/control', {
          headers: authorizedHeaders(authorized.cookie),
          body: exact,
        })
      ).status,
    ).toBe(202);
    expect(controls).toBe(1);
    expect(
      (
        await post(harness.ingressUrl, '/api/runtime/control', {
          headers: authorizedHeaders(authorized.cookie),
          body: exact,
        })
      ).status,
    ).toBe(401);
    expect(controls).toBe(1);

    expect(
      (
        await post(harness.ingressUrl, '/api/runtime/ticket', {
          headers: authorizedHeaders(authorized.cookie),
          body: { ...binding, expectedCatalogRevision: 2 },
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await post(harness.ingressUrl, '/api/runtime/ticket', {
          headers: authorizedHeaders(authorized.cookie),
          body: { ...binding, operation: { ...binding.operation, modelId: 'unknown' } },
        })
      ).status,
    ).toBe(422);
    const closed = nextClose(socket);
    socket.close();
    await closed;
    expect(
      (
        await post(harness.ingressUrl, '/api/runtime/ticket', {
          headers: authorizedHeaders(authorized.cookie),
          body: binding,
        })
      ).status,
    ).toBe(403);
  });

  it('rejects missing and wrong WebSocket Origin without consuming the ticket', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);
    const ticket = await issueTicket(harness, authorized.cookie);

    expect(await rejectedWebSocketStatus(harness, ticket.ticket, null)).toBe(403);
    expect(
      await rejectedWebSocketStatus(harness, ticket.ticket, 'https://wrong.example.ts.net'),
    ).toBe(403);
    const socket = await connectWebSocket(harness, ticket.ticket);
    socket.close();
  });

  it('rejects expired application sessions', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);
    harness.setNow(Date.parse('2026-01-01T00:00:05.001Z'));

    expect(
      (
        await post(harness.ingressUrl, '/api/sessions', {
          headers: authorizedHeaders(authorized.cookie),
        })
      ).status,
    ).toBe(401);
  });

  it('revokes the session, invalidates its tickets, and disconnects its socket', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);
    const ticket = await issueTicket(harness, authorized.cookie);
    const unusedTicket = await issueTicket(harness, authorized.cookie);
    const socket = await connectWebSocket(harness, ticket.ticket);
    const closed = nextClose(socket);
    harness.push.subscribe(authorized.deviceId, testPushSubscription());

    expect(
      (
        await post(harness.ingressUrl, '/api/auth/logout', {
          headers: authorizedHeaders(authorized.cookie),
        })
      ).status,
    ).toBe(204);
    expect(await closed).toBe(4003);
    expect(
      (
        await post(harness.ingressUrl, '/api/sessions', {
          headers: authorizedHeaders(authorized.cookie),
        })
      ).status,
    ).toBe(401);
    expect(await rejectedWebSocketStatus(harness, unusedTicket.ticket)).toBe(401);
    expect(pushSubscriptionCount(harness.store)).toBe(0);
  });

  it('revoking a device invalidates future signed sessions', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);
    harness.push.subscribe(authorized.deviceId, testPushSubscription());

    expect(
      (
        await post(harness.ingressUrl, '/api/auth/revoke-device', {
          headers: authorizedHeaders(authorized.cookie),
        })
      ).status,
    ).toBe(204);
    expect(
      (
        await post(harness.ingressUrl, '/api/auth/challenge', {
          headers: trustedHeaders(),
          body: { deviceId: authorized.deviceId },
        })
      ).status,
    ).toBe(401);
    expect(pushSubscriptionCount(harness.store)).toBe(0);
  });

  it('requires fresh authentication and current epoch before resolving a hint', async () => {
    const harness = await createHarness();
    const envelope: Envelope = {
      v: 1,
      eventId: 'event_attention_gate',
      kind: 'attention.changed',
      hostId: 'host_local',
      workspaceRef: 'workspace_default',
      sessionId: 'session_local',
      epoch: 'epoch_attention',
      seq: 1,
      occurredAt: '2026-01-01T00:00:00.000Z',
      causedBy: null,
      payload: createAttentionPayload('needs_input', 1),
      redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
      replay: { eligible: true, snapshotEligible: true },
    };
    new SyncHub(harness.store).publish(envelope);
    await harness.push.publish(envelope, { committed: true });
    const lookupId = (envelope.payload as { lookupId: string }).lookupId;

    expect(
      (
        await post(harness.ingressUrl, '/api/attention/open', {
          headers: trustedHeaders(),
          body: { lookupId },
        })
      ).status,
    ).toBe(401);
    const authorized = await authorize(harness);
    expect(
      (
        await post(harness.ingressUrl, '/api/attention/open', {
          headers: authorizedHeaders(authorized.cookie),
          body: { lookupId },
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await post(harness.ingressUrl, '/api/auth/revoke-device', {
          headers: authorizedHeaders(authorized.cookie),
        })
      ).status,
    ).toBe(204);
    expect(
      (
        await post(harness.ingressUrl, '/api/attention/open', {
          headers: authorizedHeaders(authorized.cookie),
          body: { lookupId },
        })
      ).status,
    ).toBe(401);
  });

  it('rejects malformed, repeated, and oversized WebSocket actions', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);
    const malformed = await connectWebSocket(
      harness,
      (await issueTicket(harness, authorized.cookie)).ticket,
    );
    const malformedClose = nextClose(malformed);
    malformed.send('{');
    expect(await malformedClose).toBe(1008);

    const repeated = await connectWebSocket(
      harness,
      (await issueTicket(harness, authorized.cookie)).ticket,
    );
    repeated.send(JSON.stringify({ type: 'subscribe', sessionId: 'session_local' }));
    await nextMessage(repeated);
    const repeatedClose = nextClose(repeated);
    repeated.send(JSON.stringify({ type: 'prompt', message: 'mutate' }));
    expect(await repeatedClose).toBe(1008);

    const oversized = await connectWebSocket(
      harness,
      (await issueTicket(harness, authorized.cookie)).ticket,
    );
    const oversizedClose = nextClose(oversized);
    oversized.send('x'.repeat(65_537));
    expect(await oversizedClose).toBe(1009);
  });

  it('bounds HTTP body size and repeated ingress attempts', async () => {
    const bodyHarness = await createHarness();
    expect(
      (
        await post(bodyHarness.ingressUrl, '/api/auth/enroll', {
          headers: trustedHeaders(),
          body: { padding: 'x'.repeat(16_385) },
        })
      ).status,
    ).toBe(400);

    const rateHarness = await createHarness();
    const attempts = await Promise.all(
      Array.from({ length: 121 }, () =>
        post(rateHarness.ingressUrl, '/api/sessions', { headers: trustedHeaders() }),
      ),
    );
    expect(attempts.filter((response) => response.status === 401)).toHaveLength(120);
    expect(attempts.filter((response) => response.status === 429)).toHaveLength(1);
    expect(rateHarness.server.auth.metrics.rateLimited).toBe(1);
  });
});

async function createHarness(runtime?: RuntimeService): Promise<Harness> {
  let now = Date.parse('2026-01-01T00:00:00.000Z');
  const store = new RelayStore();
  const catalog = new SessionCatalog(store);
  catalog.register('session_local', 'idle', 0, new Date(now).toISOString());
  const auth = new AuthService({
    origin: ORIGIN,
    hostId: 'host_local',
    now: () => now,
    enrollmentTtlMs: 1_000,
    sessionChallengeTtlMs: 1_000,
    sessionTtlMs: 5_000,
    ticketTtlMs: 500,
  });
  const syncHub = new SyncHub(store);
  const push = new PushService({
    store,
    encryptionKey: randomBytes(32),
    sender: { sendNotification: async () => undefined },
    now: () => now,
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
    ...(runtime === undefined ? {} : { runtime }),
    push,
    now: () => now,
    port: 0,
  });
  const baseUrl = `http://${server.host}:${server.port}`;
  const harness = {
    store,
    server,
    baseUrl,
    ingressUrl: `${baseUrl}/_serve/${SERVE_SECRET}`,
    setNow: (value: number) => {
      now = value;
    },
    push,
  };
  activeHarnesses.push(harness);
  return harness;
}

async function authorize(harness: Harness): Promise<AuthorizedClient> {
  const keys = deviceKeys();
  const enrollment = harness.server.auth.enrollment.createChallenge();
  const enrolled = await post(harness.ingressUrl, '/api/auth/enroll', {
    headers: trustedHeaders(),
    body: enrollmentBody(enrollment, keys),
  });
  expect(enrolled.status).toBe(201);
  const enrollmentResponse = (await enrolled.json()) as { deviceId: string };
  const challengeResponse = await post(harness.ingressUrl, '/api/auth/challenge', {
    headers: trustedHeaders(),
    body: { deviceId: enrollmentResponse.deviceId },
  });
  expect(challengeResponse.status).toBe(200);
  const challenge = (await challengeResponse.json()) as SessionChallengeResponse;
  const sessionResponse = await post(harness.ingressUrl, '/api/auth/session', {
    headers: trustedHeaders(),
    body: {
      deviceId: enrollmentResponse.deviceId,
      challengeId: challenge.challengeId,
      signature: signStatement(
        keys.privateKey,
        sessionProof(ORIGIN, enrollmentResponse.deviceId, challenge),
      ),
    },
  });
  expect(sessionResponse.status).toBe(201);
  const cookie = sessionResponse.headers.get('set-cookie')?.split(';')[0];
  expect(cookie).toMatch(/^__Host-pi_remote_session=session_/);
  return {
    cookie: cookie ?? '',
    deviceId: enrollmentResponse.deviceId,
    enrollment,
  };
}

async function issueTicket(harness: Harness, cookie: string): Promise<WebSocketTicketResponse> {
  const response = await post(harness.ingressUrl, '/api/auth/ticket', {
    headers: authorizedHeaders(cookie),
  });
  expect(response.status).toBe(201);
  return response.json() as Promise<WebSocketTicketResponse>;
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
  keys: { publicKey: DevicePublicKeyJwk; privateKey: KeyObject },
): object {
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

function testPushSubscription() {
  return {
    endpoint: 'https://push.example.test/device',
    expirationTime: null,
    keys: { p256dh: 'p'.repeat(65), auth: 'a'.repeat(22) },
  };
}

function pushSubscriptionCount(store: RelayStore): number {
  return (
    store.databaseHandle().prepare('SELECT COUNT(*) AS count FROM push_subscriptions').get() as {
      count: number;
    }
  ).count;
}

function trustedHeaders(origin = ORIGIN): Record<string, string> {
  return { origin, 'tailscale-user-login': PRINCIPAL };
}

function authorizedHeaders(cookie: string): Record<string, string> {
  return { ...trustedHeaders(), cookie };
}

async function post(
  baseUrl: string,
  path: string,
  options: {
    readonly headers?: Readonly<Record<string, string>>;
    readonly body?: unknown;
  } = {},
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...options.headers,
    },
    body: options.body === undefined ? null : JSON.stringify(options.body),
  });
}

function connectWebSocket(harness: Harness, ticket: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const url = harness.ingressUrl.replace('http:', 'ws:');
    const socket = new WebSocket(`${url}/api/sync?ticket=${encodeURIComponent(ticket)}`, {
      origin: ORIGIN,
      headers: { 'tailscale-user-login': PRINCIPAL },
    });
    socket.once('open', () => resolve(socket));
    socket.once('error', reject);
  });
}

function rejectedWebSocketStatus(
  harness: Harness,
  ticket: string,
  origin: string | null = ORIGIN,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = harness.ingressUrl.replace('http:', 'ws:');
    const socket = new WebSocket(`${url}/api/sync?ticket=${encodeURIComponent(ticket)}`, {
      ...(origin === null ? {} : { origin }),
      headers: { 'tailscale-user-login': PRINCIPAL },
    });
    socket.once('unexpected-response', (_request, response) => {
      response.resume();
      resolve(response.statusCode ?? 0);
    });
    socket.once('open', () => {
      socket.close();
      reject(new Error('WebSocket unexpectedly opened.'));
    });
    socket.once('error', () => undefined);
  });
}

function nextMessage(socket: WebSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    socket.once('message', (data) => resolve(data.toString()));
    socket.once('error', reject);
  });
}

function nextClose(socket: WebSocket): Promise<number> {
  return new Promise((resolve) => socket.once('close', (code) => resolve(code)));
}
