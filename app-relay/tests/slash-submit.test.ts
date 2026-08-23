// ───────────────────────────────────────────────────────────────────
// MODULE: Fail-Closed Slash Submission Transport Tests
// ───────────────────────────────────────────────────────────────────

import { generateKeyPairSync, sign, type KeyObject } from 'node:crypto';

import {
  enrollmentProof,
  sessionProof,
  type CommandCatalogDto,
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
import { CommandService } from '../src/commands/command-service.js';
import { startReadOnlyServer, type RunningReadOnlyServer } from '../src/http/server.js';
import { PromptService } from '../src/prompt/prompt-service.js';
import { SyncHub } from '../src/replay/sync.js';
import type { RpcSupervisor } from '../src/rpc/supervisor.js';
import { SessionCatalog } from '../src/sessions/catalog.js';
import { RelayStore } from '../src/store/relay-store.js';
import { TranscriptProjector } from '../src/store/transcript-projector.js';

const ORIGIN = 'https://pi-remote.example.ts.net';
const PRINCIPAL = 'operator@example.com';
const SERVE_SECRET = 'serve_0123456789abcdefghijklmnopqrstuvwxyz';
const EPOCH = 'epoch_slash_transport';
const SESSION_ID = 'session_local';

const RAW_COMMANDS = [
  { name: 'compact', description: 'Compact context', source: 'prompt' },
  { name: 'model', description: 'Pick a model', source: 'prompt' },
  { name: 'login', description: 'Authenticate', source: 'prompt' },
];

class FakeSupervisor {
  public rawCommands: unknown[] = RAW_COMMANDS;
  public readonly send = vi.fn(async (command: PiRpcCommand): Promise<PiRpcResponse> => {
    if (command.type === 'get_commands') {
      return {
        id: command.id,
        type: 'response',
        command: 'get_commands',
        success: true,
        data: { commands: this.rawCommands },
      };
    }
    return { id: command.id, type: 'response', command: command.type, success: true };
  });
}

interface Harness {
  readonly store: RelayStore;
  readonly server: RunningReadOnlyServer;
  readonly ingressUrl: string;
  readonly supervisor: FakeSupervisor;
  readonly commands: CommandService;
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

describe('slash submission transport', () => {
  it('forwards exactly one revision-checked prompt per valid submission', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);
    const catalog = await fetchCatalog(harness, authorized.cookie);
    const ticket = await issueTicket(harness, authorized.cookie);

    const response = await submit(harness, authorized.cookie, {
      submissionId: 'slash_valid_001',
      message: '/compact',
      ticket: ticket.ticket,
      binding: bindingOf(catalog, 'compact'),
    });
    expect(response.status).toBe(202);
    const payload = (await response.json()) as { accepted: boolean; block: { role: string } };
    expect(payload.accepted).toBe(true);
    expect(payload.block.role).toBe('user');

    // One revalidation read plus exactly one prompt forward; no steering metadata.
    const sent = harness.supervisor.send.mock.calls.map(([command]) => command);
    expect(sent.filter((command) => command.type === 'get_commands')).toHaveLength(2);
    const forwarded = sent.filter((command) => command.type === 'prompt');
    expect(forwarded).toEqual([{ id: 'slash_valid_001', type: 'prompt', message: '/compact' }]);
  });

  it('rejects a stale catalog before forwarding and never retries', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);
    const catalog = await fetchCatalog(harness, authorized.cookie);
    harness.supervisor.rawCommands = [
      { name: 'compact', description: 'Compact', source: 'prompt' },
    ];
    const ticket = await issueTicket(harness, authorized.cookie);

    const response = await submit(harness, authorized.cookie, {
      submissionId: 'slash_stale_001',
      message: '/compact',
      ticket: ticket.ticket,
      binding: bindingOf(catalog, 'compact'),
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'stale_catalog' });
    expect(harness.supervisor.send).toHaveBeenCalledTimes(2);
    expect(
      harness.supervisor.send.mock.calls.every(([command]) => command.type === 'get_commands'),
    ).toBe(true);
  });

  it('rejects a stale session revision with zero Pi RPCs', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);
    const catalog = await fetchCatalog(harness, authorized.cookie);
    harness.commands.setAvailability('running');
    harness.commands.setAvailability('idle');
    const ticket = await issueTicket(harness, authorized.cookie);

    const response = await submit(harness, authorized.cookie, {
      submissionId: 'slash_session_stale',
      message: '/compact',
      ticket: ticket.ticket,
      binding: bindingOf(catalog, 'compact'),
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'stale_catalog' });
    // Only the catalog read that produced the binding ever reached Pi.
    expect(harness.supervisor.send).toHaveBeenCalledTimes(1);
  });

  it('rejects a hidden command with no prompt forwarding', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);
    const catalog = await fetchCatalog(harness, authorized.cookie);
    const ticket = await issueTicket(harness, authorized.cookie);

    const response = await submit(harness, authorized.cookie, {
      submissionId: 'slash_denied_001',
      message: '/login now',
      ticket: ticket.ticket,
      binding: bindingOf(catalog, 'login'),
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'command_denied' });
    const sent = harness.supervisor.send.mock.calls.map(([command]) => command);
    expect(sent.every((command) => command.type === 'get_commands')).toBe(true);
    expect(harness.supervisor.send).toHaveBeenCalledTimes(2);
  });

  it('rejects a forged plan-control binding with zero Pi RPCs', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);
    const catalog = await fetchCatalog(harness, authorized.cookie);
    const ticket = await issueTicket(harness, authorized.cookie);

    // Plan control is host-authoritative: even a bound /plan submission is
    // rejected at the prompt boundary before any revalidation or forwarding.
    const response = await submit(harness, authorized.cookie, {
      submissionId: 'slash_plan_forged',
      message: '/plan on',
      ticket: ticket.ticket,
      binding: bindingOf(catalog, 'compact'),
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'command_denied' });
    // Only the catalog read that produced the binding ever reached Pi.
    expect(harness.supervisor.send).toHaveBeenCalledTimes(1);
  });

  it('rejects a cross-session submission with zero Pi RPCs', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);
    const catalog = await fetchCatalog(harness, authorized.cookie);
    const ticket = await issueTicket(harness, authorized.cookie);

    const response = await post(harness.ingressUrl, '/api/prompt/submit', {
      headers: authorizedHeaders(authorized.cookie),
      body: {
        type: 'prompt.submit',
        submissionId: 'slash_cross_session',
        sessionId: 'session_other',
        message: '/compact',
        ticket: ticket.ticket,
        command: bindingOf(catalog, 'compact'),
      },
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'stale_catalog' });
    expect(harness.supervisor.send).toHaveBeenCalledTimes(1);
  });

  it('rejects a body that does not match the bound command with zero Pi RPCs', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);
    const catalog = await fetchCatalog(harness, authorized.cookie);
    const ticket = await issueTicket(harness, authorized.cookie);

    const response = await submit(harness, authorized.cookie, {
      submissionId: 'slash_mismatch',
      message: '/login now',
      ticket: ticket.ticket,
      binding: bindingOf(catalog, 'compact'),
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'command_denied' });
    expect(harness.supervisor.send).toHaveBeenCalledTimes(1);
  });

  it('denies slash submission while a turn is running with zero Pi RPCs', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);
    await fetchCatalog(harness, authorized.cookie);
    harness.commands.setAvailability('running');
    // A binding that is current under the running session revision is still denied.
    const runningCatalog = await fetchCatalog(harness, authorized.cookie);
    const ticket = await issueTicket(harness, authorized.cookie);

    const response = await submit(harness, authorized.cookie, {
      submissionId: 'slash_running',
      message: '/compact',
      ticket: ticket.ticket,
      binding: bindingOf(runningCatalog, 'compact'),
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'command_denied' });
    // Only the two catalog reads ever reached Pi; no prompt was forwarded.
    expect(harness.supervisor.send).toHaveBeenCalledTimes(2);
    expect(
      harness.supervisor.send.mock.calls.every(([command]) => command.type === 'get_commands'),
    ).toBe(true);
  });

  it('never maps a bound submission to steer or followUp', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);
    const catalog = await fetchCatalog(harness, authorized.cookie);
    const ticket = await issueTicket(harness, authorized.cookie);

    const response = await post(harness.ingressUrl, '/api/prompt/submit', {
      headers: authorizedHeaders(authorized.cookie),
      body: {
        type: 'prompt.submit',
        submissionId: 'slash_steer_shape',
        sessionId: SESSION_ID,
        message: '/compact',
        ticket: ticket.ticket,
        streamingBehavior: 'steer',
        command: bindingOf(catalog, 'compact'),
      },
    });
    expect(response.status).toBe(400);
    // The only Pi RPC was the catalog read that produced the binding.
    expect(harness.supervisor.send).toHaveBeenCalledTimes(1);
    expect(
      harness.supervisor.send.mock.calls.every(([command]) => command.type === 'get_commands'),
    ).toBe(true);
  });

  it('consumes exactly one fresh ticket per slash send and rejects replay', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);
    const catalog = await fetchCatalog(harness, authorized.cookie);
    const ticket = await issueTicket(harness, authorized.cookie);

    expect(
      (
        await submit(harness, authorized.cookie, {
          submissionId: 'slash_ticket_once',
          message: '/compact',
          ticket: ticket.ticket,
          binding: bindingOf(catalog, 'compact'),
        })
      ).status,
    ).toBe(202);
    expect(
      (
        await submit(harness, authorized.cookie, {
          submissionId: 'slash_ticket_replay',
          message: '/compact',
          ticket: ticket.ticket,
          binding: bindingOf(catalog, 'compact'),
        })
      ).status,
    ).toBe(401);
    const forwarded = harness.supervisor.send.mock.calls.filter(
      ([command]) => command.type === 'prompt',
    );
    expect(forwarded).toHaveLength(1);
  });

  it('leaves ordinary prompt submission unchanged', async () => {
    const harness = await createHarness();
    const authorized = await authorize(harness);
    const ticket = await issueTicket(harness, authorized.cookie);

    const response = await post(harness.ingressUrl, '/api/prompt/submit', {
      headers: authorizedHeaders(authorized.cookie),
      body: {
        type: 'prompt.submit',
        submissionId: 'ordinary_prompt',
        sessionId: SESSION_ID,
        message: 'hello',
        ticket: ticket.ticket,
      },
    });
    expect(response.status).toBe(202);
    const sent = harness.supervisor.send.mock.calls.map(([command]) => command);
    expect(sent).toEqual([{ id: 'ordinary_prompt', type: 'prompt', message: 'hello' }]);
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
  const supervisor = new FakeSupervisor();
  const commands = new CommandService(supervisor as unknown as RpcSupervisor, {
    sessionId: SESSION_ID,
    hostEpoch: 'epoch_command_authority',
  });
  const prompts = new PromptService({
    store,
    syncHub,
    supervisor: supervisor as unknown as RpcSupervisor,
    projector: new TranscriptProjector(),
    hostId: 'host_local',
    workspaceRef: 'workspace_default',
    sessionId: SESSION_ID,
    epoch: EPOCH,
    commands,
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
    commands,
    now: () => now,
    port: 0,
  });
  const harness: Harness = {
    store,
    server,
    ingressUrl: `http://${server.host}:${server.port}/_serve/${SERVE_SECRET}`,
    supervisor,
    commands,
  };
  activeHarnesses.push(harness);
  return harness;
}

async function fetchCatalog(harness: Harness, cookie: string): Promise<CommandCatalogDto> {
  const response = await post(harness.ingressUrl, '/api/commands/list', {
    headers: authorizedHeaders(cookie),
  });
  expect(response.status).toBe(200);
  const catalog = (await response.json()) as CommandCatalogDto;
  expect(catalog.sessionId).toBe(SESSION_ID);
  expect(catalog.commands.map((command) => command.name)).toEqual(['compact', 'model']);
  return catalog;
}

function bindingOf(
  catalog: CommandCatalogDto,
  name: string,
): {
  readonly hostEpoch: string;
  readonly name: string;
  readonly sessionRevision: number;
  readonly catalogRevision: number;
} {
  return {
    hostEpoch: catalog.hostEpoch,
    name,
    sessionRevision: catalog.sessionRevision,
    catalogRevision: catalog.catalogRevision,
  };
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
  input: {
    readonly submissionId: string;
    readonly message: string;
    readonly ticket: string;
    readonly binding: {
      readonly hostEpoch: string;
      readonly name: string;
      readonly sessionRevision: number;
      readonly catalogRevision: number;
    };
  },
): Promise<Response> {
  return post(harness.ingressUrl, '/api/prompt/submit', {
    headers: authorizedHeaders(cookie),
    body: {
      type: 'prompt.submit',
      submissionId: input.submissionId,
      sessionId: SESSION_ID,
      message: input.message,
      ticket: input.ticket,
      command: input.binding,
    },
  });
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
