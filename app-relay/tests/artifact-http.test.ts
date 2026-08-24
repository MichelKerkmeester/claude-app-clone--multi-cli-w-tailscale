// ───────────────────────────────────────────────────────────────────
// MODULE: Artifact HTTP TESTS
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
  type FilePreviewBlock,
  type SessionChallengeResponse,
} from '@pi-remote/pi-rpc-protocol';
import { afterEach, describe, expect, it } from 'vitest';

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
const BYTES = Buffer.from('artifact body never guessed\n', 'utf8');
const IDENTITY = {
  sessionId: 'session_local',
  artifactId: 'artifact_http_001',
  revision: 'rev_http_001',
} as const;

interface Harness {
  readonly store: RelayStore;
  readonly server: RunningReadOnlyServer;
  readonly baseUrl: string;
  readonly ingressUrl: string;
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

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function digest(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function descriptor(
  identity = IDENTITY,
  bytes = BYTES,
  overrides: Partial<FilePreviewBlock> = {},
): FilePreviewBlock {
  return {
    id: 'block_artifact_http_001',
    revision: identity.revision,
    seq: 1,
    occurredAt: '2026-01-01T00:00:00.000Z',
    kind: 'file_preview',
    artifactId: identity.artifactId,
    displayName: 'safe.txt',
    renderer: 'text',
    mimeType: 'text/plain',
    byteLength: bytes.byteLength,
    digest: digest(bytes),
    redaction: 'applied',
    completeness: 'complete',
    shareAllowed: false,
    availability: 'ready',
    content: { kind: 'artifact-ref' },
    ...overrides,
  };
}

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('authenticated exact artifact reads', () => {
  it('serves one exact revision and keeps range identity and security headers stable', async () => {
    const harness = await createHarness();
    const cookie = await authorize(harness);
    harness.store.artifactStore.putArtifact({
      ...IDENTITY,
      descriptor: descriptor(),
      bytes: BYTES,
      expiresAt: '2026-01-02T00:00:00.000Z',
    });

    const path = artifactPath(IDENTITY);
    const response = await get(harness, path, cookie);
    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(BYTES);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('cross-origin-resource-policy')).toBe('same-origin');
    expect(response.headers.get('x-artifact-revision')).toBe(IDENTITY.revision);
    expect(response.headers.get('x-artifact-digest')).toBe(digest(BYTES));
    expect(response.headers.get('etag')).toBe(`"${digest(BYTES)}"`);

    const ranged = await get(harness, path, cookie, { range: 'bytes=0-7' });
    expect(ranged.status).toBe(206);
    expect(Buffer.from(await ranged.arrayBuffer()).toString('utf8')).toBe('artifact');
    expect(ranged.headers.get('content-range')).toBe(`bytes 0-7/${BYTES.byteLength}`);
    expect(ranged.headers.get('etag')).toBe(response.headers.get('etag'));
    expect(ranged.headers.get('x-artifact-digest')).toBe(response.headers.get('x-artifact-digest'));

    const unsatisfiable = await get(harness, path, cookie, { range: 'bytes=999-1000' });
    expect(unsatisfiable.status).toBe(416);
  });

  it('redacts every tuple and authorization failure without disclosing the stored body', async () => {
    const harness = await createHarness();
    const cookie = await authorize(harness);
    harness.store.artifactStore.putArtifact({
      ...IDENTITY,
      descriptor: descriptor(),
      bytes: BYTES,
      expiresAt: '2026-01-01T00:00:02.000Z',
    });

    const failures = [
      await get(harness, artifactPath(IDENTITY), null),
      await get(harness, artifactPath({ ...IDENTITY, sessionId: 'session_other' }), cookie),
      await get(harness, artifactPath({ ...IDENTITY, revision: 'rev_other_001' }), cookie),
      await get(harness, `/api/sessions/${IDENTITY.sessionId}/artifacts/${IDENTITY.artifactId}/revisions/latest`, cookie),
      await get(
        harness,
        `/api/sessions/${IDENTITY.sessionId}/artifacts/${encodeURIComponent('/Users/private.txt')}/revisions/${IDENTITY.revision}`,
        cookie,
      ),
      await get(harness, `${artifactPath(IDENTITY)}?ticket=mutation_ticket_should_not_be_used`, cookie),
    ];
    for (const response of failures) {
      expect(response.status).not.toBe(200);
      expect(await response.text()).not.toContain('artifact body never guessed');
    }
    expect(harness.server.auth.metrics.ticketsIssued).toBe(0);

    harness.setNow(Date.parse('2026-01-01T00:00:03.000Z'));
    const expired = await get(harness, artifactPath(IDENTITY), cookie);
    expect(expired.status).not.toBe(200);
    expect(await expired.text()).not.toContain('artifact body never guessed');

    const revocableIdentity = {
      sessionId: 'session_local',
      artifactId: 'artifact_http_revocable',
      revision: 'rev_http_revocable',
    } as const;
    const revocableBytes = Buffer.from('revocable body', 'utf8');
    harness.store.artifactStore.putArtifact({
      ...revocableIdentity,
      descriptor: descriptor(revocableIdentity, revocableBytes),
      bytes: revocableBytes,
      expiresAt: '2026-01-02T00:00:00.000Z',
    });
    expect(harness.store.artifactStore.revokeArtifact(revocableIdentity)).toBe(true);
    const revoked = await get(harness, artifactPath(revocableIdentity), cookie);
    expect(revoked.status).not.toBe(200);
    expect(await revoked.text()).not.toContain('revocable body');
  });
});

async function createHarness(): Promise<Harness> {
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
    baseUrl: `http://${server.host}:${server.port}`,
    ingressUrl: `http://${server.host}:${server.port}/_serve/${SERVE_SECRET}`,
    setNow: (value) => {
      now = value;
    },
  };
  harnesses.push(harness);
  return harness;
}

async function authorize(harness: Harness): Promise<string> {
  const keys = deviceKeys();
  const enrollment = harness.server.auth.enrollment.createChallenge();
  const enrolled = harness.server.auth.enroll(enrollmentBody(enrollment, keys), ORIGIN, PRINCIPAL);
  if (enrolled === null) throw new Error('Artifact test enrollment failed.');
  const challenge = harness.server.auth.createSessionChallenge(enrolled.deviceId, ORIGIN, PRINCIPAL);
  if (challenge === null) throw new Error('Artifact test challenge failed.');
  const session = harness.server.auth.createSession(
    enrolled.deviceId,
    challenge.challengeId,
    signStatement(keys.privateKey, sessionProof(ORIGIN, enrolled.deviceId, challenge)),
    ORIGIN,
    PRINCIPAL,
  );
  if (session === null) throw new Error('Artifact test session failed.');
  return `__Host-pi_remote_session=${session.token}`;
}

async function get(
  harness: Harness,
  path: string,
  cookie: string | null,
  extra: { readonly range?: string } = {},
): Promise<Response> {
  return fetch(`${harness.ingressUrl}${path}`, {
    method: 'GET',
    headers: {
      origin: ORIGIN,
      'tailscale-user-login': PRINCIPAL,
      ...(cookie === null ? {} : { cookie }),
      ...(extra.range === undefined ? {} : { range: extra.range }),
    },
  });
}

function artifactPath(identity: { readonly sessionId: string; readonly artifactId: string; readonly revision: string }): string {
  return `/api/sessions/${encodeURIComponent(identity.sessionId)}/artifacts/${encodeURIComponent(
    identity.artifactId,
  )}/revisions/${encodeURIComponent(identity.revision)}`;
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
    throw new Error('Artifact test key export failed.');
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
