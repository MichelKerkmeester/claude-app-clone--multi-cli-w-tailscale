// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Authority Loop Tests
// ───────────────────────────────────────────────────────────────────

import { generateKeyPairSync, randomBytes, sign, type KeyObject } from 'node:crypto';

import {
  approvalActionDigest,
  enrollmentProof,
  sessionProof,
  type ApprovalDecisionCommand,
  type DevicePublicKeyJwk,
  type Envelope,
  type EnrollmentQr,
  type ExecutePlanCommand,
  type PiRpcCommand,
  type PiRpcEvent,
  type PiRpcResponse,
  type SessionChallengeResponse,
  type SetModeCommand,
} from '@pi-remote/pi-rpc-protocol';
import {
  createFinalBoundaryHandler,
  createRelayLeaseAuthorizer,
} from '../../../extensions/pi-remote-approval/src/index.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApprovalService } from '../src/approval/approval-service.js';
import { startReadOnlyServer, type RunningReadOnlyServer } from '../src/http/server.js';
import { bindPushNotifications, mutationPiArguments } from '../src/index.js';
import { MutationPolicy } from '../src/policy/mutation-policy.js';
import { PushService } from '../src/push/push-service.js';
import { SyncHub } from '../src/replay/sync.js';
import type { RpcSupervisor, SupervisorLifecycleEvent } from '../src/rpc/supervisor.js';
import { RuntimeService } from '../src/runtime/runtime-service.js';
import { SessionCatalog } from '../src/sessions/catalog.js';
import { RelayStore } from '../src/store/relay-store.js';

const PRINCIPAL = 'operator@example.com';
const SESSION_ID = 'session_local';
const EPOCH = 'epoch_authority';
const ORIGIN = 'https://pi-remote.example.ts.net';
const SERVE_SECRET = 'serve_0123456789abcdefghijklmnopqrstuvwxyz';
const INPUT = { path: 'safe.txt', content: 'hello' } as const;

interface Harness {
  readonly store: RelayStore;
  readonly syncHub: SyncHub;
  readonly policy: MutationPolicy;
  readonly approvals: ApprovalService;
  readonly server: RunningReadOnlyServer;
  readonly handler: ReturnType<typeof createFinalBoundaryHandler>;
  readonly sendNotification: ReturnType<typeof vi.fn>;
  readonly stopPushListener: () => void;
  readonly setNow: (value: number) => void;
}

const activeHarnesses: Harness[] = [];

afterEach(async () => {
  await Promise.all(
    activeHarnesses.splice(0).map(async (harness) => {
      harness.approvals.close();
      harness.stopPushListener();
      await harness.server.stop();
      harness.store.close();
    }),
  );
});

describe('live protected-mutation authority loop', () => {
  it('starts the owned child with only reads, one protected family, and the explicit extension', () => {
    const args = mutationPiArguments('filesystem');
    expect(args).toEqual(
      expect.arrayContaining([
        '--tools',
        'read,grep,find,ls,edit,write',
        '--no-extensions',
        '--extension',
      ]),
    );
    expect(args).not.toContain('--no-tools');
    expect(args.join(' ')).not.toContain('bash');
    expect(args.join(' ')).not.toContain('fetch');
  });

  it('requests, pushes, approves, consumes, and returns tool authority', async () => {
    const harness = await createHarness();
    const committed: Envelope[] = [];
    harness.syncHub.onCommitted((envelope) => committed.push(envelope));
    const execution = harness.handler(toolCall(), piContext());
    const card = await waitForCard(harness);
    expect(committed.map((item) => item.kind)).toContain('approval.requested');
    await vi.waitFor(() => expect(harness.sendNotification).toHaveBeenCalledOnce());

    expect(harness.approvals.decide(decision(card), 'device_one', PRINCIPAL).accepted).toBe(true);
    await expect(execution).resolves.toBeUndefined();
    expect(committed.map((item) => item.kind)).toEqual(
      expect.arrayContaining(['approval.requested', 'approval.result', 'approval.result']),
    );
    expect(harness.approvals.list(SESSION_ID, PRINCIPAL)).toContainEqual(
      expect.objectContaining({ approvalId: card.approvalId, status: 'consumed' }),
    );

    const replay = JSON.stringify(
      harness.store.createSyncPlan({
        hostId: 'host_local',
        workspaceRef: 'workspace_default',
        sessionId: SESSION_ID,
      }),
    );
    expect(replay).not.toContain('approval.decide');
    expect(replay).not.toContain(PRINCIPAL);
    expect(replay).not.toContain('/Users/');
  });

  it('blocks an operator denial', async () => {
    const harness = await createHarness();
    const execution = harness.handler(toolCall(), piContext());
    const card = await waitForCard(harness);
    expect(
      harness.approvals.decide({ ...decision(card), decision: 'deny' }, 'device_one', PRINCIPAL)
        .accepted,
    ).toBe(true);
    await expect(execution).resolves.toEqual({ block: true, reason: 'not-approved' });
  });

  it('blocks an expired lease', async () => {
    const harness = await createHarness({ ttlMs: 10 });
    const execution = harness.handler(toolCall(), piContext());
    const card = await waitForCard(harness);
    harness.setNow(Date.parse(card.expiresAt));
    await expect(execution).resolves.toEqual({ block: true, reason: 'approval-expired' });
  });

  it('blocks a changed action at consume time', async () => {
    const harness = await createHarness();
    const direct = createRelayLeaseAuthorizer({
      baseUrl: `http://${harness.server.host}:${harness.server.port}`,
      secret: AUTHORITY_SECRET,
    });
    const action = actionFor(INPUT);
    const requested = await direct.request({ action, digest: digestFor(action) });
    expect(requested.requested).toBe(true);
    if (!requested.requested) throw new Error('Authority request failed.');
    const card = harness.approvals.list(SESSION_ID, PRINCIPAL)[0];
    if (card === undefined) throw new Error('Approval card was not created.');
    expect(harness.approvals.decide(decision(card), 'device_one', PRINCIPAL).accepted).toBe(true);

    const changed = actionFor({ ...INPUT, content: 'altered' });
    await expect(
      direct.consume({
        approvalId: requested.approvalId,
        action: changed,
        digest: digestFor(changed),
      }),
    ).resolves.toEqual({ allowed: false, reason: 'digest-mismatch' });
  });

  it('denies disabled mutation without creating a lease', async () => {
    const harness = await createHarness({ enabled: false });
    await expect(harness.handler(toolCall(), piContext())).resolves.toEqual({
      block: true,
      reason: 'mutation-disabled',
    });
    expect(harness.approvals.list(SESSION_ID, PRINCIPAL)).toEqual([]);
  });

  it('rejects missing extension authentication', async () => {
    const harness = await createHarness();
    const response = await fetch(
      `http://${harness.server.host}:${harness.server.port}/api/extension/approval/request`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: actionFor(INPUT), digest: 'f'.repeat(64) }),
      },
    );
    expect(response.status).toBe(401);
    expect(harness.approvals.list(SESSION_ID, PRINCIPAL)).toEqual([]);
  });

  it('drains principal authority before device revocation succeeds', async () => {
    const harness = await createHarness();
    const cookie = await authorize(harness);
    const pending = harness.approvals.request(actionFor({ ...INPUT, path: 'pending.txt' }));
    const runningCard = harness.approvals.request(actionFor({ ...INPUT, path: 'running.txt' }));
    expect(harness.approvals.decide(decision(runningCard), 'device_one', PRINCIPAL).accepted).toBe(
      true,
    );
    const running = harness.approvals.consume({
      approvalId: runningCard.approvalId,
      action: actionFor({ ...INPUT, path: 'running.txt' }),
      currentEpoch: EPOCH,
    });
    expect(running.allowed).toBe(true);
    const grant = harness.approvals.createAcceptEditsGrant({
      principal: PRINCIPAL,
      sessionId: SESSION_ID,
      epoch: EPOCH,
      allowedTools: ['edit'],
      remainingActions: 2,
      ttlMs: 1_000,
    });

    const response = await post(harness, '/api/auth/revoke-device', cookie);

    expect(response.status).toBe(204);
    expect(harness.approvals.list(SESSION_ID, PRINCIPAL)).toContainEqual(
      expect.objectContaining({ approvalId: pending.approvalId, status: 'revoked' }),
    );
    expect(harness.approvals.getGrantDto(grant.grantId)).toMatchObject({ status: 'revoked' });
    if (running.allowed) {
      expect(running.signal.aborted).toBe(true);
      expect(running.signal.reason).toBe('device-revoked');
    }
    expect(() => harness.approvals.request(actionFor(INPUT))).toThrow(/revoked/);
  });
});

describe('plan authority lifecycle loop', () => {
  it('derives plan-ready only from structured artifact events, never from prose or tool events', async () => {
    const fake = new PlanFakeSupervisor();
    const runtime = new RuntimeService(fake as unknown as RpcSupervisor, {
      sessionId: SESSION_ID,
    });
    await runtime.hydrate();

    expect(runtime.getState()?.plan).toEqual({
      planId: null,
      planRevision: 0,
      validity: 'none',
      artifact: null,
    });

    // Prose and tool activity never mint a plan binding.
    fake.emit({ type: 'agent_start' });
    fake.emit({
      type: 'message_start',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: 'Here is my plan: rewrite everything.' }],
      },
    });
    expect(runtime.getState()?.plan?.validity).toBe('none');

    fake.emitPlanArtifact({ planRevision: 1, validity: 'valid' });
    expect(runtime.getState()?.plan?.planRevision).toBe(1);
    expect(runtime.getState()?.plan?.validity).toBe('valid');

    fake.emitPlanArtifact({ planRevision: 2, validity: 'valid' });
    expect(runtime.getState()?.plan?.planRevision).toBe(2);

    // A malformed publication drops the binding instead of guessing a plan.
    fake.emitPlanArtifact({ planToken: 'short' });
    expect(runtime.getState()?.plan?.validity).toBe('none');
  });

  it('invalidates the old artifact before a replacement is accepted', async () => {
    const fake = new PlanFakeSupervisor();
    const runtime = new RuntimeService(fake as unknown as RpcSupervisor, {
      sessionId: SESSION_ID,
    });
    await runtime.hydrate();
    fake.emitPlanArtifact({ planRevision: 1, validity: 'valid' });

    const entered = await runtime.planControl(enterPlanControl('c_enter', 0));
    expect(entered.outcome.status).toBe('accepted');
    expect(entered.outcome).toMatchObject({ state: { mode: 'plan', revision: 1 } });

    // Feedback invalidates the reviewed binding: its Execute is stale and
    // never dispatched before the replacement artifact is accepted.
    fake.emitPlanArtifact({ planRevision: 1, validity: 'superseded' });
    expect(runtime.getState()?.plan?.validity).toBe('superseded');
    expect((await runtime.planControl(executePlanControl(1, 'c_stale'))).outcome.status).toBe(
      'stale',
    );
    expect(fake.settled).toHaveLength(1);

    fake.emitPlanArtifact({ planRevision: 2, validity: 'valid' });
    expect((await runtime.planControl(executePlanControl(1, 'c_stale_again'))).outcome.status).toBe(
      'stale',
    );
    const executed = await runtime.planControl(executePlanControl(2, 'c_execute'));
    expect(executed.outcome.status).toBe('accepted');
    if (executed.outcome.status !== 'accepted') throw new Error('expected accepted execute');
    expect(executed.outcome.state.mode).toBe('executing-plan');
    expect(executed.outcome.state.revision).toBe(2);
    expect(
      fake.settled.map((command) => (command as unknown as { readonly type: string }).type),
    ).toEqual(['prompt', 'execute_plan']);
  });

  it('maps unhealthy extension state to unknown and never to Build', async () => {
    const fake = new PlanFakeSupervisor();
    const runtime = new RuntimeService(fake as unknown as RpcSupervisor, {
      sessionId: SESSION_ID,
    });
    await runtime.hydrate();
    fake.emitPlanStatus('plan');
    expect(runtime.getState()?.mode).toBe('plan');

    // A restoration-failure status and any extension error degrade to unknown.
    fake.emitPlanStatus('error');
    expect(runtime.getState()?.mode).toBe('unknown');
    fake.emitExtensionError('Plan safety could not be verified');
    expect(runtime.getState()?.mode).toBe('unknown');
    fake.emitExtensionError('unrelated extension failure');
    expect(runtime.getState()?.mode).toBe('unknown');

    // Only an explicit healthy publication restores a known mode.
    fake.emitPlanStatus('build');
    expect(runtime.getState()?.mode).toBe('build');
    expect(JSON.stringify(runtime.getState())).not.toContain('unrelated');
  });

  it('mirrors host-confirmed mode events into state without advancing the runtime revision', async () => {
    const fake = new PlanFakeSupervisor();
    const runtime = new RuntimeService(fake as unknown as RpcSupervisor, {
      sessionId: SESSION_ID,
    });
    await runtime.hydrate();
    const before = runtime.getRevision();
    expect(before).toBe(0);

    fake.emitPlanStatus('plan');
    expect(runtime.getState()?.mode).toBe('plan');
    expect(runtime.getRevision()).toBe(before);

    fake.emitPlanStatus('build');
    expect(runtime.getState()?.mode).toBe('build');
    expect(runtime.getRevision()).toBe(before);

    // A relay commit advances the revision; events alone never do.
    await runtime.planControl(enterPlanControl('c_commit', 0));
    expect(runtime.getRevision()).toBe(before + 1);
  });
});

class PlanFakeSupervisor {
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
    if (command.type === 'get_state') {
      return Promise.resolve(ok({ thinkingLevel: 'high', model: MODEL, streaming: false }));
    }
    if (command.type === 'get_available_thinking_levels') {
      return Promise.resolve(ok(['off', 'high', 'max']));
    }
    if (command.type === 'get_available_models') {
      return Promise.resolve(ok([MODEL]));
    }
    return Promise.reject(new Error(`unexpected command ${command.type}`));
  }

  public sendSettled(command: PiRpcCommand): Promise<PiRpcResponse> {
    this.settled.push(command);
    const commandType = (command as unknown as { readonly type: string }).type;
    if (commandType === 'execute_plan') {
      queueMicrotask(() => this.emitPlanStatus('executing-plan'));
      return Promise.resolve(ok({}));
    }
    if (command.type !== 'prompt') {
      return Promise.reject(new Error(`unexpected mutation ${command.type}`));
    }
    const message = (command as unknown as { message: string }).message;
    queueMicrotask(() => this.emitPlanStatus(message === '/plan on' ? 'plan' : 'build'));
    return Promise.resolve(ok({}));
  }

  public emit(event: unknown): void {
    for (const listener of this.eventListeners) {
      listener(event as PiRpcEvent);
    }
  }

  public emitPlanStatus(mode: 'build' | 'plan' | 'executing-plan'): void {
    this.emit({
      type: 'extension_ui_request',
      method: 'setStatus',
      statusKey: 'pi-remote-plan-mode',
      statusText: mode,
    });
  }

  public emitExtensionError(error: string): void {
    this.emit({ type: 'extension_error', error });
  }

  public emitPlanArtifact(options: {
    readonly planRevision: number;
    readonly validity: 'valid' | 'superseded';
    readonly planToken?: string;
  }): void {
    this.emit({
      type: 'extension_ui_request',
      method: 'setPlan',
      statusKey: 'pi-remote-plan-artifact',
      plan: {
        planId: 'plan_007',
        planRevision: options.planRevision,
        planToken: options.planToken ?? PLAN_TOKEN,
        validity: options.validity,
        title: 'Harden the relay boundary',
        summary: 'Redacted outline only',
        stepCount: 4,
        approachCount: 2,
      },
    });
  }
}

const PLAN_TOKEN = 'token_plan_binding_abcdef0123456789';
const MODEL = { provider: 'deepseek', id: 'deepseek-v4-flash', label: 'DeepSeek Flash' };

function ok(data: unknown): PiRpcResponse {
  return { type: 'response', command: 'x', success: true, data: data as PiRpcResponse['data'] };
}

function enterPlanControl(controlId: string, expectedRuntimeRevision: number): SetModeCommand {
  return {
    type: 'set_mode',
    target: 'plan',
    expectedRuntimeRevision,
    controlId,
    oneUseTicket: 'ticket_plan_mode_abcdef',
  };
}

function executePlanControl(expectedPlanRevision: number, controlId: string): ExecutePlanCommand {
  return {
    type: 'execute_plan',
    planId: 'plan_007',
    expectedPlanRevision,
    planToken: PLAN_TOKEN,
    expectedRuntimeRevision: 1,
    postRunMode: 'plan',
    controlId,
    oneUseTicket: 'ticket_plan_exec_abcdef',
  };
}

const AUTHORITY_SECRET = randomBytes(32).toString('base64url');

async function createHarness(
  options: { readonly enabled?: boolean; readonly ttlMs?: number } = {},
): Promise<Harness> {
  let now = Date.now();
  const store = new RelayStore();
  const syncHub = new SyncHub(store);
  const policy = new MutationPolicy();
  policy.enableFamily('filesystem');
  policy.setEnabled(options.enabled ?? true);
  const approvals = new ApprovalService({
    store,
    syncHub,
    policy,
    identity: { hostId: 'host_local', workspaceRef: 'workspace_default' },
    now: () => now,
    defaultTtlMs: options.ttlMs ?? 1_000,
  });
  const catalog = new SessionCatalog(store);
  catalog.register(SESSION_ID, 'idle', 0, new Date(now).toISOString());
  const sendNotification = vi.fn().mockResolvedValue(undefined);
  const push = new PushService({
    store,
    encryptionKey: randomBytes(32),
    sender: { sendNotification },
  });
  push.subscribe('device_one', {
    endpoint: 'https://push.example.test/authority',
    expirationTime: null,
    keys: { p256dh: 'p'.repeat(65), auth: 'a'.repeat(22) },
  });
  const stopPushListener = bindPushNotifications(store, syncHub, push);
  const server = await startReadOnlyServer({
    store,
    catalog,
    syncHub,
    hostId: 'host_local',
    workspaceRef: 'workspace_default',
    publicOrigin: ORIGIN,
    serveSecret: SERVE_SECRET,
    approvals,
    push,
    extensionAuthority: {
      secret: AUTHORITY_SECRET,
      principal: PRINCIPAL,
      sessionId: SESSION_ID,
      epoch: EPOCH,
      policyVersion: 1,
    },
    now: () => now,
    port: 0,
  });
  const authorizer = createRelayLeaseAuthorizer({
    baseUrl: `http://${server.host}:${server.port}`,
    secret: AUTHORITY_SECRET,
  });
  const handler = createFinalBoundaryHandler({
    principal: () => PRINCIPAL,
    sessionId: () => SESSION_ID,
    epoch: () => EPOCH,
    policyVersion: 1,
    protectedTools: new Set(['edit', 'write']),
    authorizer,
  });
  const harness = {
    store,
    syncHub,
    policy,
    approvals,
    server,
    handler,
    sendNotification,
    stopPushListener,
    setNow: (value: number) => {
      now = value;
    },
  };
  activeHarnesses.push(harness);
  return harness;
}

async function waitForCard(harness: Harness) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const card = harness.approvals.list(SESSION_ID, PRINCIPAL)[0];
    if (card !== undefined) return card;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Approval request was not observed.');
}

function toolCall() {
  return { toolName: 'edit', input: INPUT } as const;
}

function piContext() {
  return { sessionManager: { getSessionId: () => SESSION_ID } };
}

function actionFor(input: typeof INPUT | { readonly path: string; readonly content: string }) {
  return {
    principal: PRINCIPAL,
    sessionId: SESSION_ID,
    epoch: EPOCH,
    tool: 'edit',
    arguments: input,
    policyVersion: 1,
  } as const;
}

function digestFor(action: ReturnType<typeof actionFor>): string {
  return approvalActionDigest(action);
}

function decision(card: {
  readonly approvalId: string;
  readonly epoch: string;
  readonly revision: number;
  readonly digest: string;
}): ApprovalDecisionCommand {
  return {
    type: 'approval.decide',
    approvalId: card.approvalId,
    decision: 'approve',
    idempotencyKey: `decision_${card.approvalId}`,
    epoch: card.epoch,
    revision: card.revision,
    digest: card.digest,
  };
}

async function authorize(harness: Harness): Promise<string> {
  const keys = deviceKeys();
  const enrollment = harness.server.auth.enrollment.createChallenge();
  const enrolled = await fetch(`${ingressUrl(harness)}/api/auth/enroll`, {
    method: 'POST',
    headers: trustedHeaders(true),
    body: JSON.stringify(enrollmentBody(enrollment, keys)),
  });
  expect(enrolled.status).toBe(201);
  const { deviceId } = (await enrolled.json()) as { deviceId: string };
  const challenged = await fetch(`${ingressUrl(harness)}/api/auth/challenge`, {
    method: 'POST',
    headers: trustedHeaders(true),
    body: JSON.stringify({ deviceId }),
  });
  expect(challenged.status).toBe(200);
  const challenge = (await challenged.json()) as SessionChallengeResponse;
  const session = await fetch(`${ingressUrl(harness)}/api/auth/session`, {
    method: 'POST',
    headers: trustedHeaders(true),
    body: JSON.stringify({
      deviceId,
      challengeId: challenge.challengeId,
      signature: signStatement(keys.privateKey, sessionProof(ORIGIN, deviceId, challenge)),
    }),
  });
  expect(session.status).toBe(201);
  return session.headers.get('set-cookie')?.split(';')[0] ?? '';
}

function post(harness: Harness, path: string, cookie: string): Promise<Response> {
  return fetch(`${ingressUrl(harness)}${path}`, {
    method: 'POST',
    headers: { ...trustedHeaders(false), cookie },
  });
}

function ingressUrl(harness: Harness): string {
  return `http://${harness.server.host}:${harness.server.port}/_serve/${SERVE_SECRET}`;
}

function trustedHeaders(json: boolean): Record<string, string> {
  return {
    origin: ORIGIN,
    'tailscale-user-login': PRINCIPAL,
    ...(json ? { 'content-type': 'application/json' } : {}),
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
