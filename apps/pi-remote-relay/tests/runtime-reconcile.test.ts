import { generateKeyPairSync, sign, type KeyObject } from 'node:crypto';

import {
  enrollmentProof,
  sessionProof,
  type DevicePublicKeyJwk,
  type EnrollmentQr,
  type RuntimeSnapshotDto,
  type SessionChallengeResponse,
} from '@pi-remote/pi-rpc-protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../src/auth/auth-service.js';
import { startReadOnlyServer, type RunningReadOnlyServer } from '../src/http/server.js';
import type { RuntimeService } from '../src/runtime/runtime-service.js';
import { SyncHub } from '../src/replay/sync.js';
import { SessionCatalog } from '../src/sessions/catalog.js';
import { RelayStore } from '../src/store/relay-store.js';

const ORIGIN = 'https://pi-remote.example.test';
const PRINCIPAL = 'operator@example.test';
const SERVE_SECRET = 'serve_secret_abcdefghijklmnopqrstuvwxyz';

interface Harness {
  readonly store: RelayStore;
  readonly server: RunningReadOnlyServer;
  readonly ingressUrl: string;
}

const harnesses: Harness[] = [];

afterEach(async () => {
  while (harnesses.length > 0) {
    const harness = harnesses.pop();
    if (harness === undefined) continue;
    await harness.server.stop();
    harness.store.close();
  }
});

describe('runtime reconcile endpoint', () => {
  it('returns one snapshot without tickets, foreground authority, or mutation calls', async () => {
    const snapshot = runtimeSnapshot();
    const hydrate = vi.fn().mockResolvedValue(snapshot);
    const harness = await createHarness({ hydrate });
    const cookie = await authorize(harness);
    const ticketsBefore = { ...harness.server.auth.metrics };

    const response = await post(harness.ingressUrl, '/api/runtime/reconcile', {
      headers: authorizedHeaders(cookie),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(snapshot);
    expect(hydrate).toHaveBeenCalledOnce();
    expect(harness.server.auth.metrics.ticketsIssued).toBe(ticketsBefore.ticketsIssued);
    expect(harness.server.auth.metrics.ticketsConsumed).toBe(ticketsBefore.ticketsConsumed);
  });

  it('maps raw host failures to a fixed issue code', async () => {
    const hydrate = vi
      .fn()
      .mockRejectedValue(new Error('policy denied /Users/private token=SECRET'));
    const harness = await createHarness({ hydrate });
    const cookie = await authorize(harness);

    const response = await post(harness.ingressUrl, '/api/runtime/reconcile', {
      headers: authorizedHeaders(cookie),
    });
    const body = (await response.json()) as unknown;

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: 'host-unavailable' });
    expect(JSON.stringify(body)).not.toContain('/Users/private');
    expect(JSON.stringify(body)).not.toContain('SECRET');
  });

  it('returns bounded retry metadata when reconcile is rate limited', async () => {
    const harness = await createHarness({ hydrate: vi.fn().mockResolvedValue(runtimeSnapshot()) });
    const cookie = await authorize(harness);
    const responses = await Promise.all(
      Array.from({ length: 31 }, () =>
        post(harness.ingressUrl, '/api/runtime/reconcile', {
          headers: authorizedHeaders(cookie),
        }),
      ),
    );
    const limited = responses.find((response) => response.status === 429);

    expect(limited).toBeDefined();
    expect(limited?.headers.get('retry-after')).toBe('1');
    expect(await limited?.json()).toEqual({ error: 'rate-limited' });
  });
});

async function createHarness(runtime: {
  readonly hydrate: () => Promise<unknown>;
}): Promise<Harness> {
  const store = new RelayStore();
  const catalog = new SessionCatalog(store);
  catalog.register('session_local', 'idle', 0);
  const syncHub = new SyncHub(store);
  const auth = new AuthService({ origin: ORIGIN, hostId: 'host_local' });
  const server = await startReadOnlyServer({
    store,
    catalog,
    syncHub,
    hostId: 'host_local',
    workspaceRef: 'workspace_default',
    publicOrigin: ORIGIN,
    serveSecret: SERVE_SECRET,
    auth,
    runtime: runtime as unknown as RuntimeService,
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

async function authorize(harness: Harness): Promise<string> {
  const keys = deviceKeys();
  const enrollment = harness.server.auth.enrollment.createChallenge();
  const enrolled = await post(harness.ingressUrl, '/api/auth/enroll', {
    headers: trustedHeaders(),
    body: enrollmentBody(enrollment, keys),
  });
  const enrollmentResponse = (await enrolled.json()) as { readonly deviceId: string };
  const challengeResponse = await post(harness.ingressUrl, '/api/auth/challenge', {
    headers: trustedHeaders(),
    body: { deviceId: enrollmentResponse.deviceId },
  });
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
  const cookie = sessionResponse.headers.get('set-cookie')?.split(';')[0];
  if (cookie === undefined) throw new Error('Test session omitted its cookie.');
  return cookie;
}

function post(
  ingressUrl: string,
  path: string,
  options: { readonly headers: Record<string, string>; readonly body?: unknown },
): Promise<Response> {
  const headers =
    options.body === undefined
      ? options.headers
      : { ...options.headers, 'content-type': 'application/json' };
  return fetch(`${ingressUrl}${path}`, {
    method: 'POST',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

function trustedHeaders(): Record<string, string> {
  return { origin: ORIGIN, 'tailscale-user-login': PRINCIPAL };
}

function authorizedHeaders(cookie: string): Record<string, string> {
  return { ...trustedHeaders(), cookie };
}

function runtimeSnapshot(): RuntimeSnapshotDto {
  const model = { provider: 'deepseek', id: 'deepseek-v4-flash', label: 'DeepSeek Flash' } as const;
  const state = {
    sessionId: 'session_local',
    revision: 3,
    model,
    thinkingLevel: 'high',
    availableThinkingLevels: ['off', 'high', 'max'],
    mode: 'build',
    streaming: false,
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as const;
  return {
    sessionId: 'session_local',
    state,
    models: {
      sessionId: 'session_local',
      catalogRevision: 2,
      runtimeRevision: 3,
      currentModel: model,
      streaming: false,
      canSetModelWhileStreaming: false,
      models: [model],
    },
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

function signStatement(privateKey: KeyObject, statement: string): string {
  return sign('sha256', Buffer.from(statement), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  }).toString('base64url');
}
