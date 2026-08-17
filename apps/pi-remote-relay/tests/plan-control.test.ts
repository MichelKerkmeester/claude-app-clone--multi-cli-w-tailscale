// ───────────────────────────────────────────────────────────────────
// MODULE: Plan Control Authority Integration Tests
// ───────────────────────────────────────────────────────────────────

import { randomBytes, generateKeyPairSync, sign, type KeyObject } from 'node:crypto';

import {
  enrollmentProof,
  sessionProof,
  type DevicePublicKeyJwk,
  type EnrollmentQr,
  type ExecutePlanCommand,
  type PiRpcCommand,
  type PiRpcEvent,
  type PiRpcResponse,
  type SessionChallengeResponse,
  type SetModeCommand,
  type WebSocketTicketResponse,
} from '@pi-remote/pi-rpc-protocol';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';

import { AuthService } from '../src/auth/auth-service.js';
import { startReadOnlyServer, type RunningReadOnlyServer } from '../src/http/server.js';
import { SyncHub } from '../src/replay/sync.js';
import type { RpcSupervisor, SupervisorLifecycleEvent } from '../src/rpc/supervisor.js';
import { RuntimeService } from '../src/runtime/runtime-service.js';
import { SessionCatalog } from '../src/sessions/catalog.js';
import { RelayStore } from '../src/store/relay-store.js';

const ORIGIN = 'https://pi-remote.example.ts.net';
const PRINCIPAL = 'operator@example.com';
const SERVE_SECRET = 'serve_0123456789abcdefghijklmnopqrstuvwxyz';
const PLAN_TOKEN = 'token_plan_binding_abcdef0123456789';

/** A stateful fake pi whose plan extension answers mode and artifact control. */
class FakeSupervisor {
  public model = { provider: 'deepseek', id: 'deepseek-v4-flash', label: 'DeepSeek Flash' };
  public thinkingLevel = 'high';
  public levels = ['off', 'high', 'max'];
  public models = [this.model];
  public rejectSettled = false;
  public streaming = false;
  public settledCount = 0;
  public readonly settled: PiRpcCommand[] = [];
  private readonly lifecycleListeners = new Set<(event: SupervisorLifecycleEvent) => void>();
  private readonly eventListeners = new Set<(event: PiRpcEvent) => void>();

  public onLifecycle(listener: (event: SupervisorLifecycleEvent) => void): () => void {
    this.lifecycleListeners.add(listener);
    return () => this.lifecycleListeners.delete(listener);
  }

  public onEvent(listener: (event: PiRpcEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  public send(command: PiRpcCommand): Promise<PiRpcResponse> {
    if (
      command.type === 'get_state' ||
      command.type === 'get_available_thinking_levels' ||
      command.type === 'get_available_models'
    ) {
      if (command.type === 'get_state') {
        return Promise.resolve(
          ok({ thinkingLevel: this.thinkingLevel, model: this.model, streaming: this.streaming }),
        );
      }
      if (command.type === 'get_available_thinking_levels') {
        return Promise.resolve(ok(this.levels));
      }
      return Promise.resolve(ok(this.models));
    }
    return Promise.reject(new Error(`unexpected command ${command.type}`));
  }

  public sendSettled(command: PiRpcCommand): Promise<PiRpcResponse> {
    this.settledCount += 1;
    this.settled.push(command);
    if (this.rejectSettled) {
      return Promise.reject(new Error('transport failed after write'));
    }
    const commandType = (command as unknown as { readonly type: string }).type;
    if (commandType === 'execute_plan') {
      queueMicrotask(() => this.emitPlanStatus('executing-plan'));
      return Promise.resolve(ok({}));
    }
    if (command.type !== 'prompt') {
      return Promise.reject(new Error(`unexpected mutation ${command.type}`));
    }
    const message = (command as unknown as { message: string }).message;
    if (message === '/plan execute') {
      queueMicrotask(() => this.emitPlanStatus('executing-plan'));
      return Promise.resolve(ok({}));
    }
    queueMicrotask(() => this.emitPlanStatus(message === '/plan on' ? 'plan' : 'build'));
    return Promise.resolve(ok({}));
  }

  public emitPlanStatus(mode: 'build' | 'plan' | 'executing-plan'): void {
    for (const listener of this.eventListeners) {
      listener({
        type: 'extension_ui_request',
        method: 'setStatus',
        statusKey: 'pi-remote-plan-mode',
        statusText: mode,
      } as unknown as PiRpcEvent);
    }
  }

  public emitPlanArtifact(): void {
    for (const listener of this.eventListeners) {
      listener({
        type: 'extension_ui_request',
        method: 'setPlan',
        statusKey: 'pi-remote-plan-artifact',
        plan: {
          planId: 'plan_007',
          planRevision: 1,
          planToken: PLAN_TOKEN,
          validity: 'valid',
          title: 'Harden the relay boundary',
          summary: 'Redacted outline only',
          stepCount: 4,
          approachCount: 2,
        },
      } as unknown as PiRpcEvent);
    }
  }
}

function ok(data: unknown): PiRpcResponse {
  return { type: 'response', command: 'x', success: true, data: data as PiRpcResponse['data'] };
}

interface Harness {
  readonly store: RelayStore;
  readonly syncHub: SyncHub;
  readonly server: RunningReadOnlyServer;
  readonly baseUrl: string;
  readonly ingressUrl: string;
  readonly setNow: (value: number) => void;
  readonly fake: FakeSupervisor;
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

describe('plan control boundary', () => {
  it('answers two foreground clients on one revision with one accepted and one stale', async () => {
    const harness = await createHarness();
    const first = await authorize(harness);
    const second = await authorize(harness);
    const firstSocket = await connectWebSocket(
      harness,
      (await issueTicket(harness, first.cookie)).ticket,
    );
    const secondSocket = await connectWebSocket(
      harness,
      (await issueTicket(harness, second.cookie)).ticket,
    );

    const [firstResponse, secondResponse] = await Promise.all([
      post(harness.ingressUrl, '/api/plan/control', {
        headers: authorizedHeaders(first.cookie),
        body: setModeBody((await issueTicket(harness, first.cookie)).ticket, 'client_a'),
      }),
      post(harness.ingressUrl, '/api/plan/control', {
        headers: authorizedHeaders(second.cookie),
        body: setModeBody((await issueTicket(harness, second.cookie)).ticket, 'client_b'),
      }),
    ]);

    const statuses = [firstResponse.status, secondResponse.status].sort((a, b) => a - b);
    expect(statuses).toEqual([202, 409]);
    expect(harness.fake.settledCount).toBe(1);
    expect(harness.fake.settled.map((command) => command.type)).toEqual(['prompt']);

    const accepted = firstResponse.status === 202 ? firstResponse : secondResponse;
    const stale = firstResponse.status === 409 ? firstResponse : secondResponse;
    const acceptedBody = (await accepted.json()) as { outcome: { state: { revision: number } } };
    expect(acceptedBody.outcome.state.revision).toBe(1);
    expect((await stale.json()) as { outcome: { status: string } }).toMatchObject({
      outcome: { status: 'stale' },
    });

    firstSocket.close();
    secondSocket.close();
  });

  it('replays ten repeated submissions of one control ID as one host mutation', async () => {
    const harness = await createHarness();
    const client = await authorize(harness);
    const socket = await connectWebSocket(
      harness,
      (await issueTicket(harness, client.cookie)).ticket,
    );

    const ticket = (await issueTicket(harness, client.cookie)).ticket;
    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        post(harness.ingressUrl, '/api/plan/control', {
          headers: authorizedHeaders(client.cookie),
          body: setModeBody(ticket, 'control_ten'),
        }),
      ),
    );
    // Every repeat after the first must consume its own ticket, so only the
    // first request carries the reusable ticket; the rest are 401 replays.
    expect(responses[0]?.status).toBe(202);
    expect(responses.slice(1).map((response) => response.status)).toEqual(
      Array.from({ length: 9 }, () => 401),
    );
    expect(harness.fake.settledCount).toBe(1);

    // Ten fresh tickets with one control ID: one accepted, nine identical replays.
    const freshTickets = await Promise.all(
      Array.from({ length: 10 }, () => issueTicket(harness, client.cookie)),
    );
    const repeated = await Promise.all(
      freshTickets.map((fresh) =>
        post(harness.ingressUrl, '/api/plan/control', {
          headers: authorizedHeaders(client.cookie),
          body: setModeBody(fresh.ticket, 'control_ten_repeat', 1),
        }),
      ),
    );
    expect(repeated[0]?.status).toBe(202);
    expect(repeated.slice(1).map((response) => response.status)).toEqual(
      Array.from({ length: 9 }, () => 202),
    );
    const firstBody = await repeated[0]?.json();
    for (const response of repeated.slice(1)) {
      expect(await response.json()).toEqual(firstBody);
    }
    expect(harness.fake.settledCount).toBe(2);

    socket.close();
  });

  it('rejects ticket replay, expiry, wrong session, non-foreground, and unavailable hosts without mutation', async () => {
    const harness = await createHarness();
    const client = await authorize(harness);
    const other = await authorize(harness);
    const socket = await connectWebSocket(
      harness,
      (await issueTicket(harness, client.cookie)).ticket,
    );

    // Replay: the ticket was consumed by the first attempt.
    const replayedTicket = (await issueTicket(harness, client.cookie)).ticket;
    expect(
      (
        await post(harness.ingressUrl, '/api/plan/control', {
          headers: authorizedHeaders(client.cookie),
          body: setModeBody(replayedTicket, 'c_replay_1'),
        })
      ).status,
    ).toBe(202);
    expect(
      (
        await post(harness.ingressUrl, '/api/plan/control', {
          headers: authorizedHeaders(client.cookie),
          body: setModeBody(replayedTicket, 'c_replay_2'),
        })
      ).status,
    ).toBe(401);

    // Expiry: the clock passes the ticket TTL before the attempt.
    const expiring = (await issueTicket(harness, client.cookie)).ticket;
    harness.setNow(Date.now() + 1_000);
    expect(
      (
        await post(harness.ingressUrl, '/api/plan/control', {
          headers: authorizedHeaders(client.cookie),
          body: setModeBody(expiring, 'c_expiry'),
        })
      ).status,
    ).toBe(401);

    // Wrong session: the ticket was minted for the other device's session.
    const foreignTicket = (await issueTicket(harness, other.cookie)).ticket;
    expect(
      (
        await post(harness.ingressUrl, '/api/plan/control', {
          headers: authorizedHeaders(client.cookie),
          body: setModeBody(foreignTicket, 'c_foreign'),
        })
      ).status,
    ).toBe(401);

    // Non-foreground: no live sync socket means no host mutation.
    const detached = await authorize(harness);
    expect(
      (
        await post(harness.ingressUrl, '/api/plan/control', {
          headers: authorizedHeaders(detached.cookie),
          body: setModeBody((await issueTicket(harness, detached.cookie)).ticket, 'c_background'),
        })
      ).status,
    ).toBe(403);

    const before = harness.fake.settledCount;
    expect(before).toBe(1);

    // Unavailable host: a never-hydrated runtime refuses before any dispatch.
    const cold = await createHarness({ hydrate: false });
    const coldClient = await authorize(cold);
    const coldSocket = await connectWebSocket(
      cold,
      (await issueTicket(cold, coldClient.cookie)).ticket,
    );
    const unavailable = await post(cold.ingressUrl, '/api/plan/control', {
      headers: authorizedHeaders(coldClient.cookie),
      body: setModeBody((await issueTicket(cold, coldClient.cookie)).ticket, 'c_cold'),
    });
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({
      outcome: {
        status: 'unavailable',
        reasonCode: 'runtime_unavailable',
        issueCode: 'host-unavailable',
      },
    });
    expect(cold.fake.settledCount).toBe(0);

    socket.close();
    coldSocket.close();
  });

  it('executes only the exact reviewed plan binding and never auto-retries delivery-unknown', async () => {
    const harness = await createHarness();
    const client = await authorize(harness);
    const socket = await connectWebSocket(
      harness,
      (await issueTicket(harness, client.cookie)).ticket,
    );
    harness.fake.emitPlanArtifact();

    // Enter plan mode first.
    expect(
      (
        await post(harness.ingressUrl, '/api/plan/control', {
          headers: authorizedHeaders(client.cookie),
          body: setModeBody((await issueTicket(harness, client.cookie)).ticket, 'c_enter'),
        })
      ).status,
    ).toBe(202);

    // A mismatched plan token is rejected without dispatch.
    const wrongBinding = await post(harness.ingressUrl, '/api/plan/control', {
      headers: authorizedHeaders(client.cookie),
      body: executePlanBody((await issueTicket(harness, client.cookie)).ticket, 'c_wrong', {
        planToken: 'token_wrong_binding_0000000000000',
      }),
    });
    expect(wrongBinding.status).toBe(409);
    expect(harness.fake.settledCount).toBe(1);

    // The exact binding executes atomically.
    const executed = await post(harness.ingressUrl, '/api/plan/control', {
      headers: authorizedHeaders(client.cookie),
      body: executePlanBody((await issueTicket(harness, client.cookie)).ticket, 'c_execute'),
    });
    expect(executed.status).toBe(202);
    const executedBody = (await executed.json()) as {
      outcome: { status: string; state: { mode: string; revision: number } };
    };
    expect(executedBody.outcome.status).toBe('accepted');
    expect(executedBody.outcome.state.mode).toBe('executing-plan');
    expect(executedBody.outcome.state.revision).toBe(2);
    expect(JSON.stringify(executedBody)).not.toContain(PLAN_TOKEN);
    expect(harness.fake.settledCount).toBe(2);

    // A lost response is terminal delivery-unknown: the same control ID replays
    // the settled outcome and a fresh control ID never triggers an automatic
    // second request for the failed mutation.
    harness.fake.rejectSettled = true;
    const lost = await post(harness.ingressUrl, '/api/plan/control', {
      headers: authorizedHeaders(client.cookie),
      body: setModeBody((await issueTicket(harness, client.cookie)).ticket, 'c_lost', 2),
    });
    expect(lost.status).toBe(503);
    const lostBody = await lost.json();
    expect(lostBody).toEqual({
      outcome: {
        status: 'delivery-unknown',
        reasonCode: 'delivery_unknown',
        issueCode: 'delivery-unknown',
      },
    });
    expect(harness.fake.settledCount).toBe(3);
    const replay = await post(harness.ingressUrl, '/api/plan/control', {
      headers: authorizedHeaders(client.cookie),
      body: setModeBody((await issueTicket(harness, client.cookie)).ticket, 'c_lost', 2),
    });
    expect(replay.status).toBe(503);
    expect(await replay.json()).toEqual(lostBody);
    expect(harness.fake.settledCount).toBe(3);

    socket.close();
  });

  it('exposes the token only through the live binding read and rejects a non-idle execute before host handoff', async () => {
    const harness = await createHarness();
    const client = await authorize(harness);
    const socket = await connectWebSocket(
      harness,
      (await issueTicket(harness, client.cookie)).ticket,
    );
    harness.fake.emitPlanArtifact();

    const entered = await post(harness.ingressUrl, '/api/plan/control', {
      headers: authorizedHeaders(client.cookie),
      body: setModeBody((await issueTicket(harness, client.cookie)).ticket, 'c_binding_enter'),
    });
    expect(entered.status).toBe(202);

    const binding = await post(harness.ingressUrl, '/api/plan/binding', {
      headers: authorizedHeaders(client.cookie),
      body: {
        sessionId: 'session_local',
        planId: 'plan_007',
        expectedPlanRevision: 1,
        expectedRuntimeRevision: 1,
      },
    });
    expect(binding.status).toBe(200);
    expect(JSON.stringify(await binding.json())).toContain(PLAN_TOKEN);

    harness.fake.streaming = true;
    const before = harness.fake.settledCount;
    const nonIdle = await post(harness.ingressUrl, '/api/plan/control', {
      headers: authorizedHeaders(client.cookie),
      body: executePlanBody((await issueTicket(harness, client.cookie)).ticket, 'c_non_idle'),
    });
    expect(nonIdle.status).toBe(409);
    expect((await nonIdle.json()) as { outcome: { status: string } }).toMatchObject({
      outcome: { status: 'stale' },
    });
    expect(harness.fake.settledCount).toBe(before);

    socket.close();
  });

  it('rejects execution after the host leaves Plan without invoking a host execution operation', async () => {
    const harness = await createHarness();
    const client = await authorize(harness);
    const socket = await connectWebSocket(
      harness,
      (await issueTicket(harness, client.cookie)).ticket,
    );
    harness.fake.emitPlanArtifact();
    expect(
      (
        await post(harness.ingressUrl, '/api/plan/control', {
          headers: authorizedHeaders(client.cookie),
          body: setModeBody((await issueTicket(harness, client.cookie)).ticket, 'c_non_plan_enter'),
        })
      ).status,
    ).toBe(202);
    expect(
      (
        await post(harness.ingressUrl, '/api/plan/control', {
          headers: authorizedHeaders(client.cookie),
          body: setModeBody(
            (await issueTicket(harness, client.cookie)).ticket,
            'c_non_plan_leave',
            1,
            'build',
          ),
        })
      ).status,
    ).toBe(202);

    const before = harness.fake.settledCount;
    const result = await post(harness.ingressUrl, '/api/plan/control', {
      headers: authorizedHeaders(client.cookie),
      body: executePlanBody((await issueTicket(harness, client.cookie)).ticket, 'c_non_plan_exec', {
        expectedRuntimeRevision: 2,
      }),
    });
    expect(result.status).toBe(409);
    expect((await result.json()) as { outcome: { status: string } }).toMatchObject({
      outcome: { status: 'stale' },
    });
    expect(harness.fake.settledCount).toBe(before);
    socket.close();
  });

  it('never persists, syncs, or broadcasts the raw plan token', async () => {
    const harness = await createHarness();
    const client = await authorize(harness);
    const socket = await connectWebSocket(
      harness,
      (await issueTicket(harness, client.cookie)).ticket,
    );
    socket.send(JSON.stringify({ type: 'subscribe', sessionId: 'session_local' }));
    await nextMessage(socket);

    // The host publishes the raw artifact; the runtime projects a token-free state.
    harness.fake.emitPlanArtifact();
    const stateResponse = await post(harness.ingressUrl, '/api/runtime/state', {
      headers: authorizedHeaders(client.cookie),
    });
    expect(stateResponse.status).toBe(200);
    const stateBody = JSON.stringify(await stateResponse.json());
    expect(stateBody).not.toContain(PLAN_TOKEN);
    expect(stateBody).toContain('plan_007');

    // A raw envelope carrying the token is redacted before persistence and sync.
    const now = new Date().toISOString();
    harness.syncHub.publish({
      v: 1,
      eventId: 'event_raw_artifact',
      kind: 'pi.extension_ui_request',
      hostId: 'host_local',
      workspaceRef: 'workspace_default',
      sessionId: 'session_local',
      epoch: 'epoch_plan_control',
      seq: 1,
      occurredAt: now,
      causedBy: null,
      payload: {
        type: 'extension_ui_request',
        method: 'setPlan',
        statusKey: 'pi-remote-plan-artifact',
        plan: {
          planId: 'plan_007',
          planRevision: 1,
          planToken: PLAN_TOKEN,
          validity: 'valid',
          title: 'Harden the relay boundary',
          summary: 'Redacted outline only',
          stepCount: 4,
          approachCount: 2,
        },
      },
      redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
      replay: { eligible: true, snapshotEligible: true },
    });
    const synced = JSON.parse(await nextMessage(socket)) as { payload: unknown };
    const serialized = JSON.stringify(synced);
    expect(serialized).not.toContain(PLAN_TOKEN);
    expect(serialized).toContain('[REDACTED_SECRET]');
    const persisted = JSON.stringify(
      harness.store.createSyncPlan({
        hostId: 'host_local',
        workspaceRef: 'workspace_default',
        sessionId: 'session_local',
      }),
    );
    expect(persisted).not.toContain(PLAN_TOKEN);

    socket.close();
  });
});

async function createHarness(options: { readonly hydrate?: boolean } = {}): Promise<Harness> {
  let now = Date.now();
  const store = new RelayStore();
  const catalog = new SessionCatalog(store);
  catalog.register('session_local', 'idle', 0, new Date(now).toISOString());
  const auth = new AuthService({
    origin: ORIGIN,
    hostId: 'host_local',
    now: () => now,
    enrollmentTtlMs: 60_000,
    sessionChallengeTtlMs: 60_000,
    sessionTtlMs: 300_000,
    ticketTtlMs: 500,
  });
  const syncHub = new SyncHub(store);
  const fake = new FakeSupervisor();
  const runtime = new RuntimeService(fake as unknown as RpcSupervisor, {
    sessionId: 'session_local',
    now: () => now,
  });
  if (options.hydrate !== false) {
    await runtime.hydrate();
  }
  const server = await startReadOnlyServer({
    store,
    catalog,
    syncHub,
    hostId: 'host_local',
    workspaceRef: 'workspace_default',
    publicOrigin: ORIGIN,
    serveSecret: SERVE_SECRET,
    auth,
    runtime,
    now: () => now,
    port: 0,
  });
  const baseUrl = `http://${server.host}:${server.port}`;
  const harness = {
    store,
    syncHub,
    server,
    baseUrl,
    ingressUrl: `${baseUrl}/_serve/${SERVE_SECRET}`,
    setNow: (value: number) => {
      now = value;
    },
    fake,
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

function setModeBody(
  ticket: string,
  controlId: string,
  expectedRuntimeRevision = 0,
  target: 'build' | 'plan' = 'plan',
): SetModeCommand {
  return {
    type: 'set_mode',
    target,
    expectedRuntimeRevision,
    controlId,
    oneUseTicket: ticket,
  };
}

function executePlanBody(
  ticket: string,
  controlId: string,
  options: Partial<ExecutePlanCommand> = {},
): ExecutePlanCommand {
  return {
    type: 'execute_plan',
    planId: 'plan_007',
    expectedPlanRevision: 1,
    planToken: PLAN_TOKEN,
    expectedRuntimeRevision: 1,
    postRunMode: 'plan',
    controlId,
    oneUseTicket: ticket,
    ...options,
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

function nextMessage(socket: WebSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    socket.once('message', (data) => resolve(data.toString()));
    socket.once('error', reject);
  });
}
