// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Prompt Submission Tests
// ───────────────────────────────────────────────────────────────────

import { generateKeyPairSync, sign, type KeyObject } from 'node:crypto';

import {
  enrollmentProof,
  sessionProof,
  type DevicePublicKeyJwk,
  type EnrollmentQr,
  type PiRpcCommand,
  type PiRpcResponse,
  type SessionChallengeResponse,
  type WebSocketTicketResponse,
} from '@pi-remote/pi-rpc-protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../src/auth/auth-service.js';
import { authorizeAction } from '../src/auth/policy.js';
import { startReadOnlyServer, type RunningReadOnlyServer } from '../src/http/server.js';
import { MutationPolicy } from '../src/policy/mutation-policy.js';
import { PromptService } from '../src/prompt/prompt-service.js';
import { SyncHub } from '../src/replay/sync.js';
import type { RpcSupervisor } from '../src/rpc/supervisor.js';
import { SessionCatalog } from '../src/sessions/catalog.js';
import { RelayStore } from '../src/store/relay-store.js';
import { TranscriptProjector } from '../src/store/transcript-projector.js';

const ORIGIN = 'https://pi-remote.example.ts.net';
const PRINCIPAL = 'operator@example.com';
const SERVE_SECRET = 'serve_0123456789abcdefghijklmnopqrstuvwxyz';
const EPOCH = 'epoch_prompt_transport';
const SESSION_ID = 'session_local';

interface Harness {
  readonly store: RelayStore;
  readonly server: RunningReadOnlyServer;
  readonly ingressUrl: string;
  readonly send: ReturnType<typeof vi.fn<(command: PiRpcCommand) => Promise<PiRpcResponse>>>;
}

interface AuthorizedClient {
  readonly cookie: string;
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

describe('live prompt command transport', () => {
  it('requires authentication, sends one typed Pi command, and persists only a redacted user block', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);
    const ticket = await issueTicket(harness, authorized.cookie);
    const canary = 'CANARY_PROMPT_SECRET_42';
    const response = await submit(harness, authorized.cookie, {
      submissionId: 'prompt_submission_001',
      message: `Continue with token=${canary}`,
      ticket: ticket.ticket,
    });

    expect(response.status).toBe(202);
    // An idle submit carries no streamingBehavior; steer/followUp are sent only mid-turn.
    expect(harness.send).toHaveBeenCalledWith({
      id: 'prompt_submission_001',
      type: 'prompt',
      message: `Continue with token=${canary}`,
    });
    const payload = (await response.json()) as { block: { role: string; text: string } };
    expect(payload.block).toMatchObject({ role: 'user', text: 'Continue with [REDACTED_SECRET]' });
    const durable = JSON.stringify(
      harness.store.createSyncPlan({
        hostId: 'host_local',
        workspaceRef: 'workspace_default',
        sessionId: SESSION_ID,
      }),
    );
    expect(durable).not.toContain(canary);
    expect(durable).not.toContain('prompt.submit');
    expect(durable).not.toContain('streamingBehavior');
    expect(durable).toContain('[REDACTED_SECRET]');
  });

  it('fails closed for unauthenticated and wrong-Origin submissions', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);
    const ticket = await issueTicket(harness, authorized.cookie);
    const body = promptBody('prompt_auth_boundary', 'hello', ticket.ticket);

    expect(
      (
        await post(harness.ingressUrl, '/api/prompt/submit', {
          headers: trustedHeaders(),
          body,
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await post(harness.ingressUrl, '/api/prompt/submit', {
          headers: authorizedHeaders(authorized.cookie, 'https://wrong.example.ts.net'),
          body,
        })
      ).status,
    ).toBe(403);
    expect(harness.send).not.toHaveBeenCalled();
  });

  it('requires a fresh one-use ticket and rejects ticket replay', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);

    expect(
      (
        await submit(harness, authorized.cookie, {
          submissionId: 'prompt_missing_ticket',
          message: 'hello',
          ticket: 'ticket_missing',
        })
      ).status,
    ).toBe(401);
    const ticket = await issueTicket(harness, authorized.cookie);
    expect(
      (
        await submit(harness, authorized.cookie, {
          submissionId: 'prompt_once',
          message: 'hello',
          ticket: ticket.ticket,
        })
      ).status,
    ).toBe(202);
    expect(
      (
        await submit(harness, authorized.cookie, {
          submissionId: 'prompt_replay',
          message: 'again',
          ticket: ticket.ticket,
        })
      ).status,
    ).toBe(401);
    expect(harness.send).toHaveBeenCalledTimes(1);

    const retryTicket = await issueTicket(harness, authorized.cookie);
    expect(
      (
        await submit(harness, authorized.cookie, {
          submissionId: 'prompt_once',
          message: 'hello',
          ticket: retryTicket.ticket,
        })
      ).status,
    ).toBe(202);
    expect(harness.send).toHaveBeenCalledTimes(1);
  });

  it('rejects oversized prompt bodies before command delivery', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);
    const ticket = await issueTicket(harness, authorized.cookie);
    const response = await submit(harness, authorized.cookie, {
      submissionId: 'prompt_oversized',
      message: 'x'.repeat(16_385),
      ticket: ticket.ticket,
    });

    expect(response.status).toBe(400);
    expect(harness.send).not.toHaveBeenCalled();
  });

  it('rate-limits prompt submissions independently and fails closed', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);
    for (let index = 0; index < 20; index += 1) {
      const ticket = await issueTicket(harness, authorized.cookie);
      const response = await submit(harness, authorized.cookie, {
        submissionId: `prompt_rate_${index}`,
        message: `message ${index}`,
        ticket: ticket.ticket,
      });
      expect(response.status).toBe(202);
    }
    const ticket = await issueTicket(harness, authorized.cookie);
    expect(
      (
        await submit(harness, authorized.cookie, {
          submissionId: 'prompt_rate_blocked',
          message: 'blocked',
          ticket: ticket.ticket,
        })
      ).status,
    ).toBe(429);
    expect(harness.send).toHaveBeenCalledTimes(20);
  });

  it('rejects leading /plan control variants before any host prompt is sent', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);

    const variants = [
      '/plan',
      '/plan on',
      '/plan off',
      '/plan execute',
      '  /plan on',
      '\t/plan execute',
    ];
    for (const [index, message] of variants.entries()) {
      const ticket = await issueTicket(harness, authorized.cookie);
      const response = await submit(harness, authorized.cookie, {
        submissionId: `plan_control_reject_${index}`,
        message,
        ticket: ticket.ticket,
      });
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: 'command_denied' });
    }
    // No Pi prompt was ever sent, and nothing became transcript residue.
    expect(harness.send).not.toHaveBeenCalled();
    const durable = JSON.stringify(
      harness.store.createSyncPlan({
        hostId: 'host_local',
        workspaceRef: 'workspace_default',
        sessionId: SESSION_ID,
      }),
    );
    expect(durable).not.toContain('/plan');
  });

  it('forwards ordinary prose and non-leading /plan tokens unchanged', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);

    for (const [index, message] of [
      'hello',
      '/planning next steps',
      'explain the /plan command',
    ].entries()) {
      const ticket = await issueTicket(harness, authorized.cookie);
      const response = await submit(harness, authorized.cookie, {
        submissionId: `plan_prose_${index}`,
        message,
        ticket: ticket.ticket,
      });
      expect(response.status).toBe(202);
    }
    expect(harness.send.mock.calls.map(([command]) => command)).toEqual([
      { id: 'plan_prose_0', type: 'prompt', message: 'hello' },
      { id: 'plan_prose_1', type: 'prompt', message: '/planning next steps' },
      { id: 'plan_prose_2', type: 'prompt', message: 'explain the /plan command' },
    ]);
  });

  it('allows only the named steering action while tool mutation remains disabled', () => {
    const mutation = new MutationPolicy();

    expect(authorizeAction('prompt:submit')).toBe(true);
    expect(authorizeAction('prompt:execute-tool')).toBe(false);
    expect(authorizeAction('mutation:write')).toBe(false);
    expect(mutation.status()).toEqual({ enabled: false, family: null });
    expect(mutation.isAllowed('edit')).toBe(false);
  });
});

async function createHarness(): Promise<Harness> {
  const now = Date.parse('2026-01-01T00:00:00.000Z');
  const store = new RelayStore();
  const catalog = new SessionCatalog(store);
  catalog.register(SESSION_ID, 'idle', 0, new Date(now).toISOString());
  const auth = new AuthService({
    origin: ORIGIN,
    hostId: 'host_local',
    now: () => now,
  });
  const syncHub = new SyncHub(store);
  const send = vi.fn(async (command: PiRpcCommand): Promise<PiRpcResponse> => ({
    id: command.id,
    type: 'response',
    command: command.type,
    success: true,
  }));
  const prompts = new PromptService({
    store,
    syncHub,
    supervisor: { send } as unknown as RpcSupervisor,
    projector: new TranscriptProjector(),
    hostId: 'host_local',
    workspaceRef: 'workspace_default',
    sessionId: SESSION_ID,
    epoch: EPOCH,
    now: () => new Date(now),
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
    prompts,
    now: () => now,
    port: 0,
  });
  const harness = {
    store,
    server,
    ingressUrl: `http://${server.host}:${server.port}/_serve/${SERVE_SECRET}`,
    send,
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
  const enrollmentResponse = (await enrolled.json()) as { deviceId: string };
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
  return { cookie };
}

async function issueTicket(harness: Harness, cookie: string): Promise<WebSocketTicketResponse> {
  const response = await post(harness.ingressUrl, '/api/auth/ticket', {
    headers: authorizedHeaders(cookie),
  });
  return response.json() as Promise<WebSocketTicketResponse>;
}

function submit(
  harness: Harness,
  cookie: string,
  input: { readonly submissionId: string; readonly message: string; readonly ticket: string },
): Promise<Response> {
  return post(harness.ingressUrl, '/api/prompt/submit', {
    headers: authorizedHeaders(cookie),
    body: promptBody(input.submissionId, input.message, input.ticket),
  });
}

function promptBody(submissionId: string, message: string, ticket: string) {
  return { type: 'prompt.submit', submissionId, sessionId: SESSION_ID, message, ticket };
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
    headers: {
      ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...options.headers,
    },
    body: options.body === undefined ? null : JSON.stringify(options.body),
  });
}
