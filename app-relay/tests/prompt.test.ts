// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Prompt Submission Tests
// ───────────────────────────────────────────────────────────────────

import { generateKeyPairSync, sign, type KeyObject } from 'node:crypto';

import {
  DEFAULT_MEDIA_POLICY,
  enrollmentProof,
  isPiRpcCommand,
  sessionProof,
  type DevicePublicKeyJwk,
  type EnrollmentQr,
  type PiRpcCommand,
  type PiRpcResponse,
  type SessionChallengeResponse,
  type WebSocketTicketResponse,
} from '@pi-remote/pi-rpc-protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';

import { AuthService } from '../src/auth/auth-service.js';
import type { AttachmentOwner, AttachmentStatusDto } from '../src/attachments/attachment-types.js';
import {
  PiImageBridge,
  type PiImageAttachmentSource,
} from '../src/attachments/pi-image-bridge.js';
import { authorizeAction } from '../src/auth/policy.js';
import { startReadOnlyServer, type RunningReadOnlyServer } from '../src/http/server.js';
import { MutationPolicy } from '../src/policy/mutation-policy.js';
import { PromptService } from '../src/prompt/prompt-service.js';
import { PromptRevisionCoordinator } from '../src/prompt/prompt-revision-coordinator.js';
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

describe('live prompt command transport', () => {
  it('refuses a background device whether or not the prompt carries an attachment', async () => {
    const harness = await createHarness();
    // No sync socket: this is a device that cannot be shown what it just did.
    const background = await authorize(harness, { foreground: false });
    const ticket = await issueTicket(harness, background.cookie);

    const plain = await submit(harness, background.cookie, {
      submissionId: 'prompt_submission_background',
      message: 'Steer the host from the background.',
      ticket: ticket.ticket,
    });

    expect(plain.status).toBe(403);
    expect(await plain.json()).toEqual({ error: 'foreground_required' });
    // The gate used to depend on payload shape, so a plain prompt slipped
    // through while the same prompt carrying an image was refused.
    expect(harness.send).not.toHaveBeenCalled();
  });

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

describe('normalized image prompt lane', () => {
  it('returns the committed redacted text projection rather than the raw prompt', async () => {
    const harness = createImagePromptHarness();
    const canary = 'PROMPT_SECRET_CANARY';
    try {
      const result = await harness.prompts.submit(
        {
          type: 'prompt.submit',
          submissionId: 'text_submission',
          sessionId: SESSION_ID,
          message: `Continue token=${canary}`,
          ticket: 'ticket_text_submission',
        },
        'device_image',
      );
      expect(result.text).toBe('Continue [REDACTED_SECRET]');
      expect(JSON.stringify(result)).not.toContain(canary);
    } finally {
      harness.store.close();
    }
  });

  it('submits ordered images through the bridge and publishes only redacted cards', async () => {
    const harness = createImagePromptHarness();
    try {
      const result = await harness.prompts.submit(imagePromptCommand(), 'device_image');
      expect(result).toMatchObject({ kind: 'text', text: '' });
      expect(harness.send).toHaveBeenCalledTimes(1);
      const [rpcCommand] = harness.send.mock.calls[0] ?? [];
      expect(rpcCommand).toBeDefined();
      expect(isPiRpcCommand(rpcCommand)).toBe(true);
      if (rpcCommand === undefined || rpcCommand.type !== 'prompt') {
        throw new Error('The bridge did not issue a prompt command.');
      }
      expect(rpcCommand).toMatchObject({
        type: 'prompt',
        message: '',
        streamingBehavior: 'steer',
      });
      expect(rpcCommand.images?.map((image) => image.mimeType)).toEqual([
        'image/png',
        'image/jpeg',
      ]);
      expect(rpcCommand.images?.every((image) => image.data.length > 0)).toBe(true);
      expect(harness.acknowledged).toBe(true);
      expect(harness.revision.current()).toBe(8);

      const blocks = harness.store.getTranscriptPage({
        hostId: 'host_local',
        workspaceRef: 'workspace_default',
        sessionId: SESSION_ID,
      }).items;
      const attachmentBlocks = blocks.filter(
        (block): block is Extract<typeof block, { readonly kind: 'attachment' }> =>
          block.kind === 'attachment',
      );
      expect(attachmentBlocks.map((block) => [block.kind, block.ordinal, block.status])).toEqual([
        ['attachment', 1, 'delivered'],
        ['attachment', 2, 'delivered'],
      ]);
      const durable = JSON.stringify(blocks);
      expect(durable).not.toContain('attachment_1');
      expect(durable).not.toContain('attachment_2');
      expect(durable).not.toContain('image/png');
      expect(durable).not.toContain('image/jpeg');
      expect(durable).not.toContain('base64');
    } finally {
      harness.store.close();
    }
  });

  it('deduplicates concurrent sends and advances only on accepted mutations', async () => {
    const harness = createImagePromptHarness();
    try {
      const command = imagePromptCommand();
      const first = harness.prompts.submit(command, 'device_image');
      const second = harness.prompts.submit(command, 'device_image');
      await Promise.all([first, second]);
      expect(harness.send).toHaveBeenCalledTimes(1);
      expect(harness.revision.current()).toBe(8);

      const revision = new PromptRevisionCoordinator(4);
      expect(revision.observeStreamingToken()).toBe(4);
      expect(revision.accept('user')).toBe(5);
      expect(revision.accept('runtime')).toBe(6);
      expect(revision.observeStreamingToken()).toBe(6);
    } finally {
      harness.store.close();
    }
  });

  it('rejects stale, mismatched, expired, text-only, and plan-invalid sets before Pi', async () => {
    const cases = [
      { name: 'stale', options: { revision: 8 } },
      { name: 'mismatched', options: { bindingRevision: 8 } },
      { name: 'expired', options: { expiresAt: Date.parse('2025-12-31T23:59:59.000Z') } },
      { name: 'plan-invalid', options: { planAllowed: false } },
    ] as const;
    for (const testCase of cases) {
      const harness = createImagePromptHarness(testCase.options);
      try {
        await expect(
          harness.prompts.submit(imagePromptCommand({ submissionId: `reject_${testCase.name}` }), 'device_image'),
        ).rejects.toThrow();
        expect(harness.send).not.toHaveBeenCalled();
        expect(harness.loadCount).toBe(0);
      } finally {
        harness.store.close();
      }
    }

    const textOnly = createImagePromptHarness();
    try {
      await expect(
        textOnly.prompts.submit(
          imagePromptCommand({ attachmentIds: [] as unknown as readonly string[] }),
          'device_image',
        ),
      ).rejects.toThrow();
      expect(textOnly.send).not.toHaveBeenCalled();
      expect(textOnly.loadCount).toBe(0);
    } finally {
      textOnly.store.close();
    }
  });

  it('does not invoke Pi when the final capability check changes before load', async () => {
    let snapshotCalls = 0;
    const harness = createImagePromptHarness({
      getRuntimeSnapshot: () => {
        snapshotCalls += 1;
        const snapshot = imageRuntimeSnapshot();
        return snapshotCalls === 1
          ? snapshot
          : { ...snapshot, media: { ...snapshot.media!, imageIn: false } };
      },
    });
    try {
      await expect(harness.prompts.submit(imagePromptCommand(), 'device_image')).rejects.toThrow();
      expect(snapshotCalls).toBeGreaterThanOrEqual(2);
      expect(harness.loadCount).toBe(0);
      expect(harness.send).not.toHaveBeenCalled();
    } finally {
      harness.store.close();
    }
  });

  it('marks a dropped acknowledgement delivery-unknown and never auto-resends', async () => {
    const harness = createImagePromptHarness({ sendThrows: true });
    try {
      const command = imagePromptCommand();
      await harness.prompts.submit(command, 'device_image');
      expect(harness.markedUnknown).toBe(true);
      expect(harness.send).toHaveBeenCalledTimes(1);
      const blocks = harness.store.getTranscriptPage({
        hostId: 'host_local',
        workspaceRef: 'workspace_default',
        sessionId: SESSION_ID,
      }).items;
      expect(
        blocks.every(
          (block) => block.kind === 'attachment' && block.status === 'delivery-unknown',
        ),
      ).toBe(true);
      await expect(harness.prompts.submit(command, 'device_image')).rejects.toThrow(
        'automatic retry is blocked',
      );
      expect(harness.send).toHaveBeenCalledTimes(1);
    } finally {
      harness.store.close();
    }
  });

  it('keeps an explicit Pi rejection retryable without acknowledging bytes', async () => {
    const harness = createImagePromptHarness({ responseSuccess: false });
    try {
      await expect(harness.prompts.submit(imagePromptCommand(), 'device_image')).rejects.toThrow();
      expect(harness.acknowledged).toBe(false);
      expect(harness.markedUnknown).toBe(false);
      expect(
        harness.store.getTranscriptPage({
          hostId: 'host_local',
          workspaceRef: 'workspace_default',
          sessionId: SESSION_ID,
        }).items,
      ).toHaveLength(0);
    } finally {
      harness.store.close();
    }
  });
});

interface ImagePromptHarnessOptions {
  readonly revision?: number;
  readonly bindingRevision?: number;
  readonly expiresAt?: number;
  readonly planAllowed?: boolean;
  readonly responseSuccess?: boolean;
  readonly sendThrows?: boolean;
  readonly getRuntimeSnapshot?: () => ReturnType<typeof imageRuntimeSnapshot>;
}

function createImagePromptHarness(options: ImagePromptHarnessOptions = {}) {
  const now = Date.parse('2026-01-01T00:00:00.000Z');
  const revision = options.revision ?? 7;
  const expiresAt = options.expiresAt ?? now + 60_000;
  const owner: AttachmentOwner = {
    sessionToken: 'session_token_image',
    sessionId: SESSION_ID,
    sessionEpoch: EPOCH,
    deviceId: 'device_image',
    principal: PRINCIPAL,
    origin: ORIGIN,
  };
  const partRows = [
    {
      setId: 'set_image_001',
      attachmentId: 'attachment_1',
      partId: 'part_1',
      item: {
        clientId: 'client_1',
        ordinal: 1,
        declaredType: 'image/png' as const,
        byteLength: 4,
        sha256: 'a'.repeat(43),
      },
    },
    {
      setId: 'set_image_001',
      attachmentId: 'attachment_2',
      partId: 'part_2',
      item: {
        clientId: 'client_2',
        ordinal: 2,
        declaredType: 'image/jpeg' as const,
        byteLength: 4,
        sha256: 'b'.repeat(43),
      },
    },
  ];
  const reservation = {
    setId: 'set_image_001',
    owner,
    binding: {
      sessionId: SESSION_ID,
      sessionEpoch: EPOCH,
      expectedPromptRevision: options.bindingRevision ?? revision,
      submissionId: 'image_submission',
    },
    manifest: {
      submissionId: 'image_submission',
      sessionId: SESSION_ID,
      ticket: 'ticket_image_001',
      expiresAt: new Date(expiresAt).toISOString(),
    },
    modelId: 'model_hidden_from_gate',
    policyVersion: 1,
    expiresAt,
  };
  let status: AttachmentStatusDto = {
    attachmentSetId: 'set_image_001',
    revision: options.bindingRevision ?? revision,
    status: 'ready',
    expiresAt: new Date(expiresAt).toISOString(),
    parts: partRows.map((part) => ({
      attachmentSetId: part.setId,
      attachmentId: part.attachmentId,
      partId: part.partId,
      ordinal: part.item.ordinal,
      status: 'ready' as const,
    })),
  };
  const bytes = new Map<string, Uint8Array>([
    ['attachment_1', new Uint8Array([137, 80, 78, 71])],
    ['attachment_2', new Uint8Array([255, 216, 255, 224])],
  ]);
  let acknowledged = false;
  let markedUnknown = false;
  let loadCount = 0;
  const defaultSnapshot = imageRuntimeSnapshot();
  const getRuntimeSnapshot = options.getRuntimeSnapshot ?? (() => defaultSnapshot);
  const send = vi.fn(async (command: PiRpcCommand): Promise<PiRpcResponse> => {
    if (options.sendThrows === true) throw new Error('transport dropped');
    return {
      id: command.id,
      type: 'response',
      command: command.type,
      success: options.responseSuccess ?? true,
    };
  });
  const source: PiImageAttachmentSource = {
    getReservation: () => reservation,
    getPartRecords: () => partRows,
    status: () => status,
    loadNormalizedDerivative: async (_setId, attachmentId) => {
      loadCount += 1;
      const value = bytes.get(attachmentId);
      return value === undefined
        ? null
        : { bytes: new Uint8Array(value), mimeType: attachmentId === 'attachment_1' ? 'image/png' : 'image/jpeg' };
    },
    acknowledgeDelivered: async () => {
      acknowledged = true;
    },
    markDeliveryUnknown: async () => {
      markedUnknown = true;
      status = { ...status, status: 'delivery-unknown' };
    },
  };
  const revisionCoordinator = new PromptRevisionCoordinator(revision);
  const bridge = new PiImageBridge({
    supervisor: { send },
    attachments: source,
    getRuntimeSnapshot,
    currentPromptRevision: () => revisionCoordinator.current(),
    planPolicy: () => options.planAllowed !== false,
    now: () => new Date(now),
  });
  const store = new RelayStore();
  const prompts = new PromptService({
    store,
    syncHub: new SyncHub(store),
    supervisor: { send } as unknown as RpcSupervisor,
    projector: new TranscriptProjector(),
    hostId: 'host_local',
    workspaceRef: 'workspace_default',
    sessionId: SESSION_ID,
    epoch: EPOCH,
    now: () => new Date(now),
    imageBridge: bridge,
    getAttachmentOwner: () => owner,
    revisionCoordinator,
  });
  return {
    prompts,
    bridge,
    revision: revisionCoordinator,
    store,
    send,
    get acknowledged() {
      return acknowledged;
    },
    get markedUnknown() {
      return markedUnknown;
    },
    get loadCount() {
      return loadCount;
    },
  };
}

function imagePromptCommand(
  overrides: Partial<PromptSubmitCommand> = {},
): PromptSubmitCommand {
  return {
    type: 'prompt.submit',
    submissionId: 'image_submission',
    sessionId: SESSION_ID,
    message: '',
    ticket: 'ticket_image_001',
    expectedPromptRevision: 7,
    attachmentSetId: 'set_image_001',
    attachmentIds: ['attachment_1', 'attachment_2'],
    streamingBehavior: 'steer',
    ...overrides,
  };
}

function imageRuntimeSnapshot() {
  return {
    sessionId: SESSION_ID,
    state: {
      sessionId: SESSION_ID,
      revision: 7,
      model: null,
      thinkingLevel: 'unknown',
      availableThinkingLevels: [],
      mode: 'build' as const,
      streaming: false,
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    models: {
      sessionId: SESSION_ID,
      catalogRevision: 1,
      runtimeRevision: 7,
      currentModel: null,
      streaming: false,
      canSetModelWhileStreaming: false,
      models: [],
    },
    media: { enabled: true, imageIn: true, policy: DEFAULT_MEDIA_POLICY },
  };
}

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
  if (!foreground) return { cookie, socket: null };
  const ticket = await issueTicket(harness, cookie);
  return { cookie, socket: await connectForeground(harness, ticket.ticket) };
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

/**
 * Open the live sync socket, which is what makes a device foreground: the
 * server derives foreground from an open /api/sync connection, and the real
 * client holds one for the whole session because the transcript streams over
 * it. A harness that submits without one is a background caller.
 */
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
