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
  type PiRpcEvent,
  type RuntimeStateDto,
} from '@pi-remote/pi-rpc-protocol';
import { afterEach, describe, expect, it } from 'vitest';

import { AuthService } from '../src/auth/auth-service.js';
import { startReadOnlyServer, type RunningReadOnlyServer, type SessionCardLiveSource } from '../src/http/server.js';
import { PushService } from '../src/push/push-service.js';
import { SyncHub } from '../src/replay/sync.js';
import { SessionEnrichmentService } from '../src/services/session-enrichment-service.js';
import { SessionCatalog } from '../src/sessions/catalog.js';
import { RelayStore } from '../src/store/relay-store.js';
import { TranscriptProjector } from '../src/store/transcript-projector.js';
import type { RuntimeService } from '../src/runtime/runtime-service.js';

const ORIGIN = 'https://pi-remote.example.ts.net';
const PRINCIPAL = 'operator@example.com';
const SERVE_SECRET = 'serve_0123456789abcdefghijklmnopqrstuvwxyz';
const SESSION_ID = 'session_local';
const DERIVED_FIELDS = [
  'title',
  'prompt',
  'lastMessagePreview',
  'previewMessages',
  'tool',
  'contextPercent',
] as const;

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

function stateWithModel(modelLabel: string | null, contextWindow?: number): RuntimeStateDto {
  return {
    sessionId: 'session_local',
    revision: 1,
    model:
      modelLabel === null
        ? null
        : {
            provider: 'openai',
            id: 'gpt-4o',
            label: modelLabel,
            ...(contextWindow === undefined ? {} : { contextWindow }),
          },
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

async function createHarness(
  runtime?: RuntimeService,
  sessionEnrichment?: SessionEnrichmentService,
  sessionCardLive?: SessionCardLiveSource,
): Promise<Harness> {
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
    ...(sessionEnrichment === undefined ? {} : { sessionEnrichment }),
    ...(sessionCardLive === undefined ? {} : { sessionCardLive }),
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

function expectDerivedOmitted(card: Record<string, unknown>): void {
  for (const field of DERIVED_FIELDS) {
    expect(card).not.toHaveProperty(field);
  }
}

function userText(id: string, text: string): Record<string, unknown> {
  return { kind: 'text', id, role: 'user', text };
}

function assistantText(id: string, text: string): Record<string, unknown> {
  return { kind: 'text', id, role: 'assistant', text };
}

function toolCall(id: string, toolName: string): Record<string, unknown> {
  return { kind: 'tool_call', id, toolName, inputSummary: '' };
}

function usage(id: string, inputTokens: number, outputTokens: number): Record<string, unknown> {
  return { kind: 'usage', id, inputTokens, outputTokens, cost: 0 };
}

function liveFromProjector(projector: TranscriptProjector): SessionCardLiveSource {
  return {
    snapshotFor: (sessionId) =>
      sessionId === SESSION_ID ? projector.cardSnapshot() : undefined,
  };
}

function projectEvent(projector: TranscriptProjector, event: Record<string, unknown>): void {
  let sequence = 1;
  projector.project(event as PiRpcEvent, {
    occurredAt: '2026-01-01T00:00:00.000Z',
    nextSequence: () => sequence++,
    sessionId: SESSION_ID,
  });
}

function messageStart(text: string): Record<string, unknown> {
  return {
    type: 'message_start',
    message: {
      role: 'assistant',
      content: [{ type: 'text', text }],
      api: 'test',
      provider: 'test',
      model: 'test',
      usage: { input: 1, output: 1, totalTokens: 2, cost: { total: 0 } },
      stopReason: 'stop',
      timestamp: 1,
    },
  };
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
    expectDerivedOmitted(card);
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
    expectDerivedOmitted(card);
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

  it('omits all six derived fields when the accumulator is empty (bare card, still valid)', async () => {
    const enrichment = new SessionEnrichmentService();
    const harness = await createHarness(undefined, enrichment);
    const authorized = await authorize(harness);
    const body = await fetchSessions(harness, authorized.cookie);

    expect(body.sessions).toHaveLength(1);
    const card = body.sessions[0];
    expect(enrichment.getEnrichment(SESSION_ID)).toEqual({});
    expectDerivedOmitted(card);
    expect(isSessionCardDto(card)).toBe(true);
  });

  it('captures title from the first prompt and keeps it stable across later prompts', async () => {
    const enrichment = new SessionEnrichmentService();
    const harness = await createHarness(undefined, enrichment);
    enrichment.ingestBlock(SESSION_ID, userText('block_u1', 'Plan the garden beds'));
    enrichment.ingestBlock(SESSION_ID, userText('block_u2', 'What about tomatoes?'));
    const authorized = await authorize(harness);
    const body = await fetchSessions(harness, authorized.cookie);

    expect(body.sessions).toHaveLength(1);
    const card = body.sessions[0];
    expect(card.title).toBe('Plan the garden beds');
    expect(card.prompt).toBe('What about tomatoes?');
    expect(isSessionCardDto(card)).toBe(true);
  });

  it('reflects latest prompt, assistant preview, and recent text blocks, each redacted and capped', async () => {
    const enrichment = new SessionEnrichmentService();
    const harness = await createHarness(undefined, enrichment);
    enrichment.ingestBlock(SESSION_ID, userText('block_u1', 'First prompt'));
    enrichment.ingestBlock(SESSION_ID, assistantText('block_a1', 'First reply'));
    for (let index = 2; index <= 10; index += 1) {
      enrichment.ingestBlock(
        SESSION_ID,
        assistantText(`block_a${index}`, `Reply number ${index}`),
      );
    }
    enrichment.ingestBlock(SESSION_ID, userText('block_u2', 'Latest prompt'));
    enrichment.ingestBlock(SESSION_ID, assistantText('block_a_over', 'a'.repeat(281)));
    const authorized = await authorize(harness);
    const body = await fetchSessions(harness, authorized.cookie);

    expect(body.sessions).toHaveLength(1);
    const card = body.sessions[0];
    expect(card.prompt).toBe('Latest prompt');
    expect(card).not.toHaveProperty('lastMessagePreview');
    expect(card.previewMessages).toEqual([
      'Reply number 4',
      'Reply number 5',
      'Reply number 6',
      'Reply number 7',
      'Reply number 8',
      'Reply number 9',
      'Reply number 10',
      'Latest prompt',
    ]);
    expect(isSessionCardDto(card)).toBe(true);

    enrichment.ingestBlock(SESSION_ID, assistantText('block_a_ok', 'a'.repeat(280)));
    const capped = await fetchSessions(harness, authorized.cookie);
    expect(capped.sessions[0]?.lastMessagePreview).toBe('a'.repeat(280));
    expect(isSessionCardDto(capped.sessions[0])).toBe(true);
  });

  it('rejects path, URL, and secret text so those fields are omitted and raw text never appears', async () => {
    const pathText = 'Please open /Users/michel/private/notes.txt tonight';
    const urlText = 'Visit https://evil.example/leak for details';
    const secretText = 'password: hunter2-never-emit';
    const enrichment = new SessionEnrichmentService();
    const harness = await createHarness(undefined, enrichment);
    enrichment.ingestBlock(SESSION_ID, userText('block_ok', 'Garden plan'));
    enrichment.ingestBlock(SESSION_ID, userText('block_path', pathText));
    enrichment.ingestBlock(SESSION_ID, assistantText('block_url', urlText));
    enrichment.ingestBlock(SESSION_ID, assistantText('block_secret', secretText));
    enrichment.ingestBlock(SESSION_ID, assistantText('block_safe', 'Water the seedlings'));
    const authorized = await authorize(harness);
    const body = await fetchSessions(harness, authorized.cookie);

    expect(body.sessions).toHaveLength(1);
    const card = body.sessions[0];
    const serialized = JSON.stringify(card);
    expect(card.title).toBe('Garden plan');
    expect(card).not.toHaveProperty('prompt');
    expect(card.lastMessagePreview).toBe('Water the seedlings');
    expect(card.previewMessages).toEqual(['Garden plan', 'Water the seedlings']);
    expect(serialized).not.toContain(pathText);
    expect(serialized).not.toContain('/Users/michel/private/notes.txt');
    expect(serialized).not.toContain(urlText);
    expect(serialized).not.toContain('https://evil.example/leak');
    expect(serialized).not.toContain(secretText);
    expect(serialized).not.toContain('hunter2-never-emit');
    expect(serialized).not.toContain('password:');
    expect(isSessionCardDto(card)).toBe(true);
  });

  it('sets tool from the latest tool_call name', async () => {
    const enrichment = new SessionEnrichmentService();
    const harness = await createHarness(undefined, enrichment);
    enrichment.ingestBlock(SESSION_ID, toolCall('block_t1', 'read'));
    enrichment.ingestBlock(SESSION_ID, toolCall('block_t2', 'bash'));
    const authorized = await authorize(harness);
    const body = await fetchSessions(harness, authorized.cookie);

    expect(body.sessions).toHaveLength(1);
    const card = body.sessions[0];
    expect(card.tool).toBe('bash');
    expect(isSessionCardDto(card)).toBe(true);
  });

  it('computes contextPercent as round(100*used/max), clamped, and omits without max or usage', async () => {
    const runtime = createRuntimeStub(stateWithModel('GPT-4o', 200));
    const enrichment = new SessionEnrichmentService({
      getContextWindow: () => runtime.getState()?.model?.contextWindow ?? null,
    });
    const harness = await createHarness(runtime, enrichment);
    const authorized = await authorize(harness);

    let body = await fetchSessions(harness, authorized.cookie);
    expect(body.sessions[0]).not.toHaveProperty('contextPercent');
    expect(isSessionCardDto(body.sessions[0])).toBe(true);

    enrichment.ingestBlock(SESSION_ID, usage('block_use1', 70, 10));
    body = await fetchSessions(harness, authorized.cookie);
    expect(body.sessions[0]?.contextPercent).toBe(40);
    expect(isSessionCardDto(body.sessions[0])).toBe(true);

    enrichment.ingestBlock(SESSION_ID, usage('block_use2', 250, 0));
    body = await fetchSessions(harness, authorized.cookie);
    expect(body.sessions[0]?.contextPercent).toBe(100);
    expect(isSessionCardDto(body.sessions[0])).toBe(true);

    const noMax = new SessionEnrichmentService();
    noMax.ingestBlock(SESSION_ID, usage('block_use3', 70, 10));
    const harnessNoMax = await createHarness(undefined, noMax);
    const authorizedNoMax = await authorize(harnessNoMax);
    const omitted = await fetchSessions(harnessNoMax, authorizedNoMax.cookie);
    expect(omitted.sessions[0]).not.toHaveProperty('contextPercent');
    expect(isSessionCardDto(omitted.sessions[0])).toBe(true);
  });

  it('does not double-count duplicate usage ids and reports contextPercent after many usage blocks', async () => {
    const runtime = createRuntimeStub(stateWithModel('GPT-4o', 1_000));
    const enrichment = new SessionEnrichmentService({
      getContextWindow: () => runtime.getState()?.model?.contextWindow ?? null,
    });
    const harness = await createHarness(runtime, enrichment);
    const authorized = await authorize(harness);

    enrichment.ingestBlock(SESSION_ID, usage('block_dup', 100, 0));
    enrichment.ingestBlock(SESSION_ID, usage('block_dup', 100, 0));
    enrichment.ingestBlock(SESSION_ID, usage('block_dup', 400, 0));
    let body = await fetchSessions(harness, authorized.cookie);
    expect(body.sessions[0]?.contextPercent).toBe(10);
    expect(isSessionCardDto(body.sessions[0])).toBe(true);

    for (let index = 0; index < 200; index += 1) {
      enrichment.ingestBlock(SESSION_ID, usage(`block_many_${index}`, 1, 0));
    }
    body = await fetchSessions(harness, authorized.cookie);
    expect(body.sessions[0]?.contextPercent).toBe(30);
    expect(isSessionCardDto(body.sessions[0])).toBe(true);
  });

  it('omits un-prefixed sk-ant token from prompt and never emits the raw token in card JSON', async () => {
    const leaked = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz012345';
    const enrichment = new SessionEnrichmentService();
    const harness = await createHarness(undefined, enrichment);
    enrichment.ingestBlock(SESSION_ID, userText('block_ok', 'Garden plan'));
    enrichment.ingestBlock(SESSION_ID, userText('block_leaked', `Continue with ${leaked}`));
    const authorized = await authorize(harness);
    const body = await fetchSessions(harness, authorized.cookie);

    expect(body.sessions).toHaveLength(1);
    const card = body.sessions[0];
    const serialized = JSON.stringify(card);
    expect(card.title).toBe('Garden plan');
    expect(card).not.toHaveProperty('prompt');
    expect(card.previewMessages).toEqual(['Garden plan']);
    expect(serialized).not.toContain(leaked);
    expect(serialized).not.toContain('sk-ant-api03');
    expect(isSessionCardDto(card)).toBe(true);
  });

  it('excludes role-less Agent started lifecycle text from preview fields', async () => {
    const enrichment = new SessionEnrichmentService();
    const harness = await createHarness(undefined, enrichment);
    enrichment.ingestBlock(SESSION_ID, { kind: 'text', id: 'life_start', text: 'Agent started.' });
    enrichment.ingestBlock(SESSION_ID, assistantText('block_a1', 'Hello from the agent'));
    enrichment.ingestBlock(SESSION_ID, { kind: 'text', id: 'life_end', text: 'Agent run ended.' });
    enrichment.ingestBlock(SESSION_ID, { kind: 'text', id: 'life_pi', text: 'Pi event: session idle' });
    const authorized = await authorize(harness);
    const body = await fetchSessions(harness, authorized.cookie);

    expect(body.sessions).toHaveLength(1);
    const card = body.sessions[0];
    const serialized = JSON.stringify(card);
    expect(card.lastMessagePreview).toBe('Hello from the agent');
    expect(card.previewMessages).toEqual(['Hello from the agent']);
    expect(serialized).not.toContain('Agent started.');
    expect(serialized).not.toContain('Agent run ended.');
    expect(serialized).not.toContain('Pi event:');
    expect(isSessionCardDto(card)).toBe(true);
  });

  it('emits the real projector message count after messages and 0 for an empty session', async () => {
    const emptyProjector = new TranscriptProjector();
    const emptyHarness = await createHarness(undefined, undefined, liveFromProjector(emptyProjector));
    const emptyAuth = await authorize(emptyHarness);
    const emptyBody = await fetchSessions(emptyHarness, emptyAuth.cookie);
    expect(emptyBody.sessions[0]?.messageCount).toBe(0);
    expect(isSessionCardDto(emptyBody.sessions[0])).toBe(true);

    const projector = new TranscriptProjector();
    projectEvent(projector, messageStart('first'));
    projectEvent(projector, messageStart('second'));
    const harness = await createHarness(undefined, undefined, liveFromProjector(projector));
    const authorized = await authorize(harness);
    const body = await fetchSessions(harness, authorized.cookie);
    expect(body.sessions[0]?.messageCount).toBe(2);
    expect(body.sessions[0]).not.toHaveProperty('queuedMessageCount');
    expect(isSessionCardDto(body.sessions[0])).toBe(true);
  });

  it('sets card status interrupted when a turn ends interrupted, and a normal settle stays idle', async () => {
    const interruptedProjector = new TranscriptProjector();
    projectEvent(interruptedProjector, { type: 'agent_start' });
    projectEvent(interruptedProjector, { type: 'agent_end', lifecycle: 'interrupted' });
    const interruptedHarness = await createHarness(
      undefined,
      undefined,
      liveFromProjector(interruptedProjector),
    );
    interruptedHarness.catalog.register(SESSION_ID, 'running', 0, '2026-01-01T00:00:00.000Z');
    const interruptedAuth = await authorize(interruptedHarness);
    const interruptedBody = await fetchSessions(interruptedHarness, interruptedAuth.cookie);
    expect(interruptedBody.sessions[0]?.status).toBe('interrupted');
    expect(isSessionCardDto(interruptedBody.sessions[0])).toBe(true);

    const cancelledProjector = new TranscriptProjector();
    projectEvent(cancelledProjector, { type: 'agent_start' });
    projectEvent(cancelledProjector, { type: 'turn_end', status: 'cancelled' });
    const cancelledHarness = await createHarness(
      undefined,
      undefined,
      liveFromProjector(cancelledProjector),
    );
    cancelledHarness.catalog.register(SESSION_ID, 'running', 0, '2026-01-01T00:00:00.000Z');
    const cancelledAuth = await authorize(cancelledHarness);
    const cancelledBody = await fetchSessions(cancelledHarness, cancelledAuth.cookie);
    expect(cancelledBody.sessions[0]?.status).toBe('interrupted');
    expect(isSessionCardDto(cancelledBody.sessions[0])).toBe(true);

    const settledProjector = new TranscriptProjector();
    projectEvent(settledProjector, { type: 'agent_start' });
    projectEvent(settledProjector, { type: 'agent_settled' });
    const settledHarness = await createHarness(
      undefined,
      undefined,
      liveFromProjector(settledProjector),
    );
    settledHarness.catalog.register(SESSION_ID, 'running', 0, '2026-01-01T00:00:00.000Z');
    const settledAuth = await authorize(settledHarness);
    const settledBody = await fetchSessions(settledHarness, settledAuth.cookie);
    expect(settledBody.sessions[0]?.status).toBe('idle');
    expect(isSessionCardDto(settledBody.sessions[0])).toBe(true);
  });

  it('emits queuedMessageCount as steering plus followUp from queue_update and omits it with no queue', async () => {
    const queuedProjector = new TranscriptProjector();
    projectEvent(queuedProjector, messageStart('hello'));
    projectEvent(queuedProjector, {
      type: 'queue_update',
      steering: ['steer-one', 'steer-two'],
      followUp: ['follow-one'],
    });
    const queuedHarness = await createHarness(undefined, undefined, liveFromProjector(queuedProjector));
    const queuedAuth = await authorize(queuedHarness);
    const queuedBody = await fetchSessions(queuedHarness, queuedAuth.cookie);
    expect(queuedBody.sessions[0]?.messageCount).toBe(1);
    expect(queuedBody.sessions[0]?.queuedMessageCount).toBe(3);
    expect(isSessionCardDto(queuedBody.sessions[0])).toBe(true);

    const emptyQueueProjector = new TranscriptProjector();
    projectEvent(emptyQueueProjector, messageStart('hello'));
    projectEvent(emptyQueueProjector, { type: 'queue_update', steering: [], followUp: [] });
    const emptyQueueHarness = await createHarness(
      undefined,
      undefined,
      liveFromProjector(emptyQueueProjector),
    );
    const emptyQueueAuth = await authorize(emptyQueueHarness);
    const emptyQueueBody = await fetchSessions(emptyQueueHarness, emptyQueueAuth.cookie);
    expect(emptyQueueBody.sessions[0]?.messageCount).toBe(1);
    expect(emptyQueueBody.sessions[0]).not.toHaveProperty('queuedMessageCount');
    expect(isSessionCardDto(emptyQueueBody.sessions[0])).toBe(true);
  });

  it('preserves model, attention, and content enrichment alongside live card fields', async () => {
    const runtime = createRuntimeStub(stateWithModel('GPT-4o', 200));
    const enrichment = new SessionEnrichmentService({
      getContextWindow: () => runtime.getState()?.model?.contextWindow ?? null,
    });
    enrichment.ingestBlock(SESSION_ID, userText('block_u1', 'Garden plan'));
    enrichment.ingestBlock(SESSION_ID, assistantText('block_a1', 'Water the seedlings'));
    enrichment.ingestBlock(SESSION_ID, toolCall('block_t1', 'bash'));
    enrichment.ingestBlock(SESSION_ID, usage('block_use1', 70, 10));
    const projector = new TranscriptProjector();
    projectEvent(projector, messageStart('Water the seedlings'));
    projectEvent(projector, {
      type: 'queue_update',
      steering: ['next'],
      followUp: [],
    });
    const harness = await createHarness(runtime, enrichment, liveFromProjector(projector));
    insertAttention(harness, SESSION_ID, 'needs_input', '2026-01-01T00:00:00.000Z');
    const authorized = await authorize(harness);
    const body = await fetchSessions(harness, authorized.cookie);
    const card = body.sessions[0];
    expect(card?.model).toBe('GPT-4o');
    expect(card?.attention).toBe('waiting');
    expect(card?.title).toBe('Garden plan');
    expect(card?.lastMessagePreview).toBe('Water the seedlings');
    expect(card?.tool).toBe('bash');
    expect(card?.contextPercent).toBe(40);
    expect(card?.messageCount).toBe(1);
    expect(card?.queuedMessageCount).toBe(1);
    expect(isSessionCardDto(card)).toBe(true);
  });
});