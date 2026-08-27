// ───────────────────────────────────────────────────────────────────
// MODULE: Session Card Enrichment Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { randomBytes, generateKeyPairSync, sign, type KeyObject } from 'node:crypto';

import {
  enrollmentProof,
  sessionProof,
  isSessionCardDto,
  type DevicePublicKeyJwk,
  type EnrollmentQr,
  type RuntimeStateDto,
} from '@pi-remote/pi-rpc-protocol';
import { afterEach, describe, expect, it } from 'vitest';

import { AuthService } from '../src/auth/auth-service.js';
import { startReadOnlyServer, type RunningReadOnlyServer } from '../src/http/server.js';
import { PushService } from '../src/push/push-service.js';
import { SyncHub } from '../src/replay/sync.js';
import { SessionCatalog } from '../src/sessions/catalog.js';
import { RelayStore } from '../src/store/relay-store.js';
import type { RuntimeService } from '../src/runtime/runtime-service.js';

const ORIGIN = 'https://pi-remote.example.ts.net';
const PRINCIPAL = 'operator@example.com';
const SERVE_SECRET = 'serve_0123456789abcdefghijklmnopqrstuvwxyz';

interface Harness {
  readonly store: RelayStore;
  readonly server: RunningReadOnlyServer;
  readonly ingressUrl: string;
  readonly setNow: (value: number) => void;
  readonly push: PushService;
  readonly catalog: SessionCatalog;
}

interface AuthorizedClient {
  readonly cookie: string;
  readonly deviceId: string;
}

interface DeviceKeys {
  readonly publicKey: DevicePublicKeyJwk;
  readonly privateKey: KeyObject;
}

const activeHarnesses: Harness[] = [];

function deviceKeys(): DeviceKeys {
  const keyPair = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const publicKey = keyPair.publicKey.export({ format: 'jwk' });
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
    privateKey: keyPair.privateKey,
  };
}

function signStatement(privateKey: KeyObject, statement: string): string {
  return sign('sha256', Buffer.from(statement), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  }).toString('base64url');
}

afterEach(async () => {
  await Promise.all(
    activeHarnesses.splice(0).map(async ({ server, store }) => {
      await server.stop();
      store.close();
    }),
  );
});

// ───────────────────────────────────────────────────────────────────
// 2. TEST HELPERS
// ───────────────────────────────────────────────────────────────────

function stateWithModel(modelLabel: string | null): RuntimeStateDto {
  return {
    sessionId: 'session_local',
    revision: 1,
    model:
      modelLabel === null
        ? null
        : { provider: 'openai', id: 'gpt-4o', label: modelLabel },
    thinkingLevel: 'high',
    availableThinkingLevels: ['high'],
    mode: 'idle',
    streaming: false,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function createRuntimeStub(state: RuntimeStateDto): RuntimeService {
  return {
    getState: () => state,
  } as unknown as RuntimeService;
}

function insertAttention(
  harness: Harness,
  sessionId: string,
  attentionClass: string,
  occurredAt: string,
): void {
  harness.store
    .databaseHandle()
    .prepare(
      `INSERT OR IGNORE INTO attention_items
       (lookup_id, attention_class, generation, nonce, session_id, epoch, target, focus_id, occurred_at)
       VALUES (?, ?, ?, ?, ?, ?, 'session', NULL, ?)`,
    )
    .run(
      `hint_test_${randomBytes(8).toString('hex')}`,
      attentionClass,
      1,
      `nonce_test_${randomBytes(8).toString('hex')}`,
      sessionId,
      'epoch_test',
      occurredAt,
    );
}

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
  const ingressUrl = `http://${server.host}:${server.port}/_serve/${SERVE_SECRET}`;
  const harness: Harness = {
    store,
    server,
    ingressUrl,
    setNow: (value: number) => {
      now = value;
    },
    push,
    catalog,
  };
  activeHarnesses.push(harness);
  return harness;
}

async function authorize(harness: Harness): Promise<AuthorizedClient> {
  const keys = deviceKeys();
  const enrollment = harness.server.auth.enrollment.createChallenge();
  const enrolled = await fetch(`${harness.ingressUrl}/api/auth/enroll`, {
    method: 'POST',
    headers: { origin: ORIGIN, 'tailscale-user-login': PRINCIPAL, 'content-type': 'application/json' },
    body: JSON.stringify({
      enrollment,
      publicKey: keys.publicKey,
      signature: signStatement(keys.privateKey, enrollmentProof(enrollment, keys.publicKey)),
    }),
  });
  expect(enrolled.status).toBe(201);
  const enrollmentResponse = (await enrolled.json()) as { deviceId: string };

  const challengeResponse = await fetch(`${harness.ingressUrl}/api/auth/challenge`, {
    method: 'POST',
    headers: { origin: ORIGIN, 'tailscale-user-login': PRINCIPAL, 'content-type': 'application/json' },
    body: JSON.stringify({ deviceId: enrollmentResponse.deviceId }),
  });
  expect(challengeResponse.status).toBe(200);
  const challenge = (await challengeResponse.json()) as { challengeId: string };

  const sessionResponse = await fetch(`${harness.ingressUrl}/api/auth/session`, {
    method: 'POST',
    headers: {
      origin: ORIGIN,
      'tailscale-user-login': PRINCIPAL,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      deviceId: enrollmentResponse.deviceId,
      challengeId: challenge.challengeId,
      signature: signStatement(
        keys.privateKey,
        sessionProof(ORIGIN, enrollmentResponse.deviceId, challenge),
      ),
    }),
  });
  expect(sessionResponse.status).toBe(201);
  const cookie = sessionResponse.headers.get('set-cookie')?.split(';')[0];
  expect(cookie).toMatch(/^__Host-pi_remote_session=session_/);
  return { cookie: cookie ?? '', deviceId: enrollmentResponse.deviceId };
}

async function fetchSessions(
  harness: Harness,
  cookie: string,
): Promise<{ sessions: Record<string, unknown>[] }> {
  const response = await fetch(`${harness.ingressUrl}/api/sessions`, {
    method: 'POST',
    headers: {
      origin: ORIGIN,
      'tailscale-user-login': PRINCIPAL,
      cookie,
    },
  });
  expect(response.status).toBe(200);
  return response.json() as Promise<{ sessions: Record<string, unknown>[] }>;
}

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('session card enrichment', () => {
  it('omits model and attention when runtime and push are absent (bare card, still valid)', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);
    const body = await fetchSessions(harness, authorized.cookie);

    expect(body.sessions).toHaveLength(1);
    const card = body.sessions[0];
    expect(card).not.toHaveProperty('model');
    expect(card).not.toHaveProperty('attention');
    expect(isSessionCardDto(card)).toBe(true);
  });

  it('omits model and attention when runtime is present but model is null and no attention exists', async () => {
    const runtime = createRuntimeStub(stateWithModel(null));
    const harness = await createHarness(runtime);
    const authorized = await authorize(harness);
    const body = await fetchSessions(harness, authorized.cookie);

    expect(body.sessions).toHaveLength(1);
    const card = body.sessions[0];
    expect(card).not.toHaveProperty('model');
    expect(card).not.toHaveProperty('attention');
    expect(isSessionCardDto(card)).toBe(true);
  });

  it('emits model label when runtime model is present and no attention', async () => {
    const runtime = createRuntimeStub(stateWithModel('GPT-4o'));
    const harness = await createHarness(runtime);
    const authorized = await authorize(harness);
    const body = await fetchSessions(harness, authorized.cookie);

    expect(body.sessions).toHaveLength(1);
    const card = body.sessions[0];
    expect(card.model).toBe('GPT-4o');
    expect(card).not.toHaveProperty('attention');
    expect(isSessionCardDto(card)).toBe(true);
  });

  it('maps finished attention to done', async () => {
    const harness = await createHarness();
    insertAttention(harness, 'session_local', 'finished', '2026-01-01T00:00:00.000Z');
    const authorized = await authorize(harness);
    const body = await fetchSessions(harness, authorized.cookie);

    expect(body.sessions).toHaveLength(1);
    const card = body.sessions[0];
    expect(card.attention).toBe('done');
    expect(isSessionCardDto(card)).toBe(true);
  });

  it('maps needs_input attention to waiting', async () => {
    const harness = await createHarness();
    insertAttention(harness, 'session_local', 'needs_input', '2026-01-01T00:00:00.000Z');
    const authorized = await authorize(harness);
    const body = await fetchSessions(harness, authorized.cookie);

    expect(body.sessions).toHaveLength(1);
    const card = body.sessions[0];
    expect(card.attention).toBe('waiting');
    expect(isSessionCardDto(card)).toBe(true);
  });

  it('maps error attention to blocked', async () => {
    const harness = await createHarness();
    insertAttention(harness, 'session_local', 'error', '2026-01-01T00:00:00.000Z');
    const authorized = await authorize(harness);
    const body = await fetchSessions(harness, authorized.cookie);

    expect(body.sessions).toHaveLength(1);
    const card = body.sessions[0];
    expect(card.attention).toBe('blocked');
    expect(isSessionCardDto(card)).toBe(true);
  });

  it('merges model and attention together', async () => {
    const runtime = createRuntimeStub(stateWithModel('Claude 3.5 Sonnet'));
    const harness = await createHarness(runtime);
    insertAttention(harness, 'session_local', 'needs_input', '2026-01-01T00:00:00.000Z');
    const authorized = await authorize(harness);
    const body = await fetchSessions(harness, authorized.cookie);

    expect(body.sessions).toHaveLength(1);
    const card = body.sessions[0];
    expect(card.model).toBe('Claude 3.5 Sonnet');
    expect(card.attention).toBe('waiting');
    expect(isSessionCardDto(card)).toBe(true);
  });

  it('picks the latest attention per session', async () => {
    const harness = await createHarness();
    // Insert older attention first, then newer one
    insertAttention(harness, 'session_local', 'needs_input', '2026-01-01T00:00:01.000Z');
    insertAttention(harness, 'session_local', 'finished', '2026-01-01T00:00:02.000Z');
    const authorized = await authorize(harness);
    const body = await fetchSessions(harness, authorized.cookie);

    expect(body.sessions).toHaveLength(1);
    const card = body.sessions[0];
    // The latest attention wins
    expect(card.attention).toBe('done');
    expect(isSessionCardDto(card)).toBe(true);
  });
});