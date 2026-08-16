// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Loopback Read-Only HTTP Server
// ───────────────────────────────────────────────────────────────────

import { timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  approvalActionDigest,
  isApprovalAuthorityConsumeRequest,
  isApprovalAuthorityRequest,
  isApprovalDecisionCommand,
  isOpaqueId,
  isPromptSubmitCommand,
  isPushPreferences,
  isPushSubscriptionInput,
  isRuntimeIssueCode,
  isRuntimeControlCommand,
  isRuntimeModelTicketRequest,
  isRuntimeSnapshotDto,
  type EnrollmentRequest,
  type RuntimeIssueCode,
  type RuntimeControlResponse,
  type SyncCursor,
  type SyncMessage,
} from '@pi-remote/pi-rpc-protocol';
import { WebSocket, WebSocketServer } from 'ws';

import { AuthService, type ApplicationSession } from '../auth/auth-service.js';
import type { ApprovalService } from '../approval/approval-service.js';
import { FixedWindowRateLimiter } from '../auth/rate-limit.js';
import type { CommandService } from '../commands/command-service.js';
import type { SyncHub } from '../replay/sync.js';
import { RuntimeIssueError, type RuntimeService } from '../runtime/runtime-service.js';
import type { SessionCatalog } from '../sessions/catalog.js';
import type { RelayStore } from '../store/relay-store.js';
import type { PushService } from '../push/push-service.js';
import { SlashSubmissionError, type PromptService } from '../prompt/prompt-service.js';

const LOOPBACK_HOST = '127.0.0.1';
const DEFAULT_PORT = 4_310;
const MAX_HTTP_BODY_BYTES = 16_384;
const MAX_WS_MESSAGE_BYTES = 65_536;
const MAX_CONNECTIONS = 32;
const MAX_CONNECTIONS_PER_DEVICE = 4;
const MAX_PROMPTS_PER_MINUTE = 20;
const RUNTIME_RECONCILE_RETRY_AFTER_SECONDS = '1';
const DEFAULT_PAGE_LIMIT = 50;
const SESSION_COOKIE = '__Host-pi_remote_session';
const TAILSCALE_IDENTITY_HEADERS = [
  'tailscale-user-login',
  'tailscale-user-name',
  'tailscale-user-profile-pic',
  'tailscale-app-capabilities',
] as const;

interface SubscribeRequest {
  readonly type: 'subscribe';
  readonly sessionId: string;
  readonly cursor?: SyncCursor;
}

interface TrustedIngress {
  readonly path: string;
  readonly origin: string;
  readonly principal: string;
}

interface ActiveSocket {
  readonly client: WebSocket;
  readonly deviceId: string;
  readonly sessionToken: string;
}

export interface ReadOnlyServerOptions {
  readonly store: RelayStore;
  readonly catalog: SessionCatalog;
  readonly syncHub: SyncHub;
  readonly hostId: string;
  readonly workspaceRef: string;
  readonly publicOrigin: string;
  readonly serveSecret: string;
  readonly port?: number;
  readonly auth?: AuthService;
  readonly approvals?: ApprovalService;
  readonly extensionAuthority?: {
    readonly secret: string;
    readonly principal: string;
    readonly sessionId: string;
    readonly epoch: string;
    readonly policyVersion: number;
  };
  readonly prompts?: PromptService;
  readonly runtime?: RuntimeService;
  readonly commands?: CommandService;
  readonly push?: PushService;
  readonly now?: () => number;
}

export interface RunningReadOnlyServer {
  readonly host: typeof LOOPBACK_HOST;
  readonly port: number;
  readonly auth: AuthService;
  readonly foregroundDeviceIds: ReadonlySet<string>;
  readonly stop: () => Promise<void>;
}

/** Start a fail-closed read-only API that cannot bind beyond IPv4 loopback. */
export async function startReadOnlyServer(
  options: ReadOnlyServerOptions,
): Promise<RunningReadOnlyServer> {
  assertServerConfiguration(options);
  const auth =
    options.auth ??
    new AuthService({
      origin: options.publicOrigin,
      hostId: options.hostId,
      ...(options.now === undefined ? {} : { now: options.now }),
    });
  const requestLimiter = new FixedWindowRateLimiter(120, 60_000, options.now ?? Date.now);
  const enrollmentLimiter = new FixedWindowRateLimiter(10, 60_000, options.now ?? Date.now);
  const promptLimiter = new FixedWindowRateLimiter(
    MAX_PROMPTS_PER_MINUTE,
    60_000,
    options.now ?? Date.now,
  );
  const runtimeControlLimiter = new FixedWindowRateLimiter(30, 60_000, options.now ?? Date.now);
  const runtimeTicketLimiter = new FixedWindowRateLimiter(10, 60_000, options.now ?? Date.now);
  const runtimeReconcileLimiter = new FixedWindowRateLimiter(30, 60_000, options.now ?? Date.now);
  const activeSockets = new Set<ActiveSocket>();
  // A runtime mutation is only valid from a device that also holds a live, authenticated
  // sync socket — a background or stale device can never steer the host.
  const isForegroundDevice = (deviceId: string, token: string): boolean =>
    [...activeSockets].some(
      (active) => active.deviceId === deviceId && active.sessionToken === token,
    );
  const upgradingSessions = new WeakMap<WebSocket, ApplicationSession>();
  const server = createServer((request, response) => {
    void handleHttp(
      request,
      response,
      options,
      auth,
      requestLimiter,
      enrollmentLimiter,
      promptLimiter,
      runtimeTicketLimiter,
      runtimeControlLimiter,
      runtimeReconcileLimiter,
      isForegroundDevice,
    ).catch(() => sendJson(response, 400, { error: 'invalid_request' }));
  });
  const webSocketServer = new WebSocketServer({
    noServer: true,
    maxPayload: MAX_WS_MESSAGE_BYTES,
  });

  server.on('upgrade', (request, socket, head) => {
    const ingress = authenticateIngress(request, options);
    if (ingress === null || ingress.path !== '/api/sync') {
      rejectUpgrade(socket, ingress === null ? 403 : 404);
      return;
    }
    const rateKey = `${ingress.principal}\0${request.socket.remoteAddress ?? 'unknown'}`;
    if (!requestLimiter.consume(rateKey)) {
      auth.metrics.rateLimited += 1;
      rejectUpgrade(socket, 429);
      return;
    }
    const requestUrl = new URL(request.url ?? '/', 'http://localhost');
    const ticketId = requestUrl.searchParams.get('ticket');
    const session =
      ticketId === null ? null : auth.consumeTicket(ticketId, ingress.origin, ingress.principal);
    if (
      session === null ||
      activeSockets.size >= MAX_CONNECTIONS ||
      countDeviceSockets(activeSockets, session.deviceId) >= MAX_CONNECTIONS_PER_DEVICE
    ) {
      rejectUpgrade(socket, session === null ? 401 : 429);
      return;
    }
    webSocketServer.handleUpgrade(request, socket, head, (client) => {
      upgradingSessions.set(client, session);
      webSocketServer.emit('connection', client, request);
    });
  });

  webSocketServer.on('connection', (client) => {
    const session = upgradingSessions.get(client);
    upgradingSessions.delete(client);
    if (session === undefined) {
      client.terminate();
      return;
    }
    const active: ActiveSocket = {
      client,
      deviceId: session.deviceId,
      sessionToken: session.token,
    };
    const expiresIn = Math.max(0, Date.parse(session.expiresAt) - (options.now?.() ?? Date.now()));
    const expiryTimer = setTimeout(() => {
      client.close(4001, 'Application session expired.');
    }, expiresIn);
    expiryTimer.unref();
    activeSockets.add(active);
    auth.metrics.connectionsAccepted += 1;
    let unsubscribe: (() => void) | null = null;
    let subscribed = false;
    client.on('message', (raw) => {
      if (subscribed) {
        client.close(1008, 'Remote mode accepts one read-only subscription only.');
        return;
      }
      const subscribe = parseSubscribe(raw.toString());
      if (subscribe === null || !auth.isAllowed('sync:read')) {
        auth.metrics.policyDenied += 1;
        client.close(1008, 'Expected a valid read-only subscription.');
        return;
      }
      subscribed = true;
      unsubscribe = options.syncHub.subscribe(
        {
          hostId: options.hostId,
          workspaceRef: options.workspaceRef,
          sessionId: subscribe.sessionId,
        },
        (message) => sendSync(client, message),
        subscribe.cursor,
      );
    });
    const release = (): void => {
      clearTimeout(expiryTimer);
      unsubscribe?.();
      activeSockets.delete(active);
    };
    client.on('close', release);
    client.on('error', release);
  });

  const stopRevocationListener = auth.onRevocation((deviceId, sessionToken) => {
    for (const active of activeSockets) {
      if (
        active.deviceId === deviceId &&
        (sessionToken === undefined || active.sessionToken === sessionToken)
      ) {
        active.client.close(4003, 'Authorization revoked.');
      }
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? DEFAULT_PORT, LOOPBACK_HOST, () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Loopback relay did not expose a TCP address.');
  }

  return {
    host: LOOPBACK_HOST,
    port: address.port,
    auth,
    get foregroundDeviceIds() {
      return new Set([...activeSockets].map((active) => active.deviceId));
    },
    stop: async () => {
      stopRevocationListener();
      for (const client of webSocketServer.clients) client.terminate();
      await new Promise<void>((resolve) => webSocketServer.close(() => resolve()));
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error === undefined ? resolve() : reject(error)));
      });
    },
  };
}

async function handleHttp(
  request: IncomingMessage,
  response: ServerResponse,
  options: ReadOnlyServerOptions,
  auth: AuthService,
  requestLimiter: FixedWindowRateLimiter,
  enrollmentLimiter: FixedWindowRateLimiter,
  promptLimiter: FixedWindowRateLimiter,
  runtimeTicketLimiter: FixedWindowRateLimiter,
  runtimeControlLimiter: FixedWindowRateLimiter,
  runtimeReconcileLimiter: FixedWindowRateLimiter,
  isForegroundDevice: (deviceId: string, token: string) => boolean,
): Promise<void> {
  if (
    request.socket.remoteAddress === LOOPBACK_HOST &&
    (ingressPath(request) === '/api/extension/approval/request' ||
      ingressPath(request) === '/api/extension/approval/consume')
  ) {
    await handleExtensionAuthority(request, response, options);
    return;
  }
  const ingress = authenticateIngress(request, options);
  if (ingress === null) {
    discardRequest(request);
    sendJson(response, 403, { error: 'forbidden' });
    return;
  }
  const rateKey = `${ingress.principal}\0${request.socket.remoteAddress ?? 'unknown'}`;
  if (!requestLimiter.consume(rateKey)) {
    auth.metrics.rateLimited += 1;
    discardRequest(request);
    sendJson(response, 429, { error: 'rate_limited' });
    return;
  }
  if (request.method !== 'POST') {
    discardRequest(request);
    sendJson(response, 405, { error: 'read_only' });
    return;
  }

  if (ingress.path === '/api/auth/enroll') {
    if (!enrollmentLimiter.consume(rateKey)) {
      auth.metrics.rateLimited += 1;
      discardRequest(request);
      sendJson(response, 429, { error: 'rate_limited' });
      return;
    }
    const body = await readJsonBody(request);
    const result = isRecord(body)
      ? auth.enroll(body as unknown as EnrollmentRequest, ingress.origin, ingress.principal)
      : null;
    sendJson(response, result === null ? 401 : 201, result ?? { error: 'invalid_enrollment' });
    return;
  }

  if (ingress.path === '/api/auth/challenge') {
    const body = await readJsonBody(request);
    const result =
      isRecord(body) && isOpaqueId(body.deviceId)
        ? auth.createSessionChallenge(body.deviceId, ingress.origin, ingress.principal)
        : null;
    sendJson(response, result === null ? 401 : 200, result ?? { error: 'unauthorized' });
    return;
  }

  if (ingress.path === '/api/auth/session') {
    const body = await readJsonBody(request);
    const session =
      isRecord(body) &&
      isOpaqueId(body.deviceId) &&
      isOpaqueId(body.challengeId) &&
      typeof body.signature === 'string'
        ? auth.createSession(
            body.deviceId,
            body.challengeId,
            body.signature,
            ingress.origin,
            ingress.principal,
          )
        : null;
    if (session === null) {
      sendJson(response, 401, { error: 'unauthorized' });
      return;
    }
    sendJson(
      response,
      201,
      { expiresAt: session.expiresAt, mode: 'read-only' },
      {
        'set-cookie': sessionCookie(
          session.token,
          session.expiresAt,
          options.now?.() ?? Date.now(),
        ),
      },
    );
    return;
  }

  const sessionToken = readCookie(request, SESSION_COOKIE);
  const action = actionForRequest(ingress.path);
  const session = auth.authenticate(
    sessionToken,
    ingress.origin,
    ingress.principal,
    action ?? 'unknown',
  );
  if (session === null) {
    discardRequest(request);
    sendJson(response, 401, { error: 'unauthorized' });
    return;
  }

  if (ingress.path === '/health') {
    discardRequest(request);
    sendJson(response, 200, {
      status: 'ok',
      mode: 'read-only',
      auth: { ...auth.metrics },
    });
    return;
  }
  if (ingress.path === '/api/auth/ticket') {
    await requireEmptyBody(request);
    sendJson(response, 201, auth.issueTicket(session));
    return;
  }
  if (ingress.path === '/api/auth/logout') {
    await requireEmptyBody(request);
    options.push?.unsubscribe(session.deviceId);
    auth.revokeSession(session.token);
    sendJson(response, 204, null, { 'set-cookie': expiredSessionCookie() });
    return;
  }
  if (ingress.path === '/api/auth/revoke-device') {
    await requireEmptyBody(request);
    options.approvals?.revokePrincipal(session.principal);
    options.push?.unsubscribe(session.deviceId);
    auth.revokeDevice(session.deviceId);
    sendJson(response, 204, null, { 'set-cookie': expiredSessionCookie() });
    return;
  }
  if (ingress.path === '/api/sessions') {
    await requireEmptyBody(request);
    sendJson(response, 200, { sessions: options.catalog.list() });
    return;
  }
  if (ingress.path === '/api/attention') {
    await requireEmptyBody(request);
    sendJson(response, 200, { items: options.push?.listAttention() ?? [] });
    return;
  }
  if (ingress.path === '/api/attention/open') {
    const body = await readJsonBody(request);
    if (options.push === undefined || !isRecord(body) || !isOpaqueId(body.lookupId)) {
      sendJson(response, 404, { error: 'stale_hint' });
      return;
    }
    const resolution = options.push.resolve(body.lookupId, {
      hostId: options.hostId,
      workspaceRef: options.workspaceRef,
    });
    sendJson(response, resolution === null ? 410 : 200, resolution ?? { error: 'stale_hint' });
    return;
  }
  if (ingress.path === '/api/push/config') {
    await requireEmptyBody(request);
    sendJson(response, 200, {
      supported: options.push?.vapidPublicKey !== null && options.push !== undefined,
      vapidPublicKey: options.push?.vapidPublicKey ?? null,
      preferences: options.push?.preferences(session.deviceId) ?? null,
    });
    return;
  }
  if (ingress.path === '/api/push/subscribe') {
    const body = await readJsonBody(request);
    if (
      options.push === undefined ||
      !isRecord(body) ||
      !isPushSubscriptionInput(body.subscription)
    ) {
      sendJson(response, 400, { error: 'invalid_subscription' });
      return;
    }
    options.push.subscribe(session.deviceId, body.subscription);
    sendJson(response, 201, { preferences: options.push.preferences(session.deviceId) });
    return;
  }
  if (ingress.path === '/api/push/preferences') {
    const body = await readJsonBody(request);
    if (
      options.push === undefined ||
      !isRecord(body) ||
      !isPushPreferences(body.preferences) ||
      !options.push.setPreferences(session.deviceId, body.preferences)
    ) {
      sendJson(response, 404, { error: 'subscription_not_found' });
      return;
    }
    sendJson(response, 200, { preferences: body.preferences });
    return;
  }
  if (ingress.path === '/api/push/foreground') {
    const body = await readJsonBody(request);
    if (options.push === undefined || !isRecord(body) || typeof body.foreground !== 'boolean') {
      sendJson(response, 400, { error: 'invalid_foreground_state' });
      return;
    }
    options.push.setForeground(session.deviceId, body.foreground);
    sendJson(response, 204, null);
    return;
  }
  if (ingress.path === '/api/push/unsubscribe') {
    await requireEmptyBody(request);
    options.push?.unsubscribe(session.deviceId);
    sendJson(response, 204, null);
    return;
  }
  if (ingress.path === '/api/approvals') {
    const body = await readJsonBody(request);
    if (options.approvals === undefined || !isRecord(body) || !isOpaqueId(body.sessionId)) {
      sendJson(response, 404, { error: 'not_available' });
      return;
    }
    sendJson(response, 200, {
      approvals: options.approvals.list(body.sessionId, session.principal),
    });
    return;
  }
  if (ingress.path === '/api/approval/decide') {
    const body = await readJsonBody(request);
    if (options.approvals === undefined || !isApprovalDecisionCommand(body)) {
      sendJson(response, 400, { error: 'invalid_decision' });
      return;
    }
    const result = options.approvals.decide(body, session.deviceId, session.principal);
    sendJson(response, result.accepted ? 202 : 409, result);
    return;
  }
  if (ingress.path === '/api/prompt/submit') {
    const body = await readJsonBody(request);
    if (options.prompts === undefined || !isPromptSubmitCommand(body)) {
      sendJson(response, 400, { error: 'invalid_prompt' });
      return;
    }
    // A bound slash submission consumes its one-use ticket through its own
    // authorized action, so the lane can be denied independently.
    const action = body.command === undefined ? 'prompt:submit' : 'commands:submit';
    const ticketSession = auth.consumeTicket(body.ticket, ingress.origin, ingress.principal, action);
    if (
      ticketSession === null ||
      ticketSession.token !== session.token ||
      ticketSession.deviceId !== session.deviceId
    ) {
      sendJson(response, 401, { error: 'unauthorized' });
      return;
    }
    if (!promptLimiter.consume(session.deviceId)) {
      auth.metrics.rateLimited += 1;
      sendJson(response, 429, { error: 'rate_limited' });
      return;
    }
    try {
      const block = await options.prompts.submit(body, session.deviceId);
      sendJson(response, 202, { accepted: true, block });
    } catch (error: unknown) {
      if (error instanceof SlashSubmissionError) {
        // Typed stale/denied outcomes carry no host detail and are never retried.
        sendJson(response, error.reason === 'stale_catalog' ? 409 : 403, {
          error: error.reason,
        });
        return;
      }
      sendJson(response, 503, { error: 'pi_unavailable' });
    }
    return;
  }
  if (ingress.path === '/api/runtime/state') {
    await requireEmptyBody(request);
    const state = options.runtime?.getState() ?? null;
    if (state === null) {
      sendJson(response, 503, { error: 'runtime_unavailable' });
      return;
    }
    sendJson(response, 200, { state });
    return;
  }
  if (ingress.path === '/api/runtime/reconcile') {
    if (options.runtime === undefined) {
      discardRequest(request);
      sendRuntimeIssue(response, 'host-unavailable');
      return;
    }
    if (!runtimeReconcileLimiter.consume(session.deviceId)) {
      auth.metrics.rateLimited += 1;
      discardRequest(request);
      sendJson(
        response,
        429,
        { error: 'rate-limited' },
        { 'retry-after': RUNTIME_RECONCILE_RETRY_AFTER_SECONDS },
      );
      return;
    }
    try {
      await requireEmptyBody(request);
    } catch {
      sendRuntimeIssue(response, 'invalid-response', 400);
      return;
    }
    try {
      const snapshot = await options.runtime.hydrate();
      if (!isRuntimeSnapshotDto(snapshot)) {
        sendRuntimeIssue(response, 'invalid-response', 502);
        return;
      }
      sendJson(response, 200, snapshot);
    } catch (error: unknown) {
      const issueCode = runtimeIssueCode(error);
      sendRuntimeIssue(response, issueCode);
    }
    return;
  }
  if (ingress.path === '/api/runtime/models') {
    await requireEmptyBody(request);
    const catalog = options.runtime?.getModelCatalog() ?? null;
    if (catalog === null) {
      sendJson(response, 503, { error: 'runtime_unavailable' });
      return;
    }
    sendJson(response, 200, catalog);
    return;
  }
  if (ingress.path === '/api/runtime/ticket') {
    const body = await readJsonBody(request);
    if (options.runtime === undefined || !isRuntimeModelTicketRequest(body)) {
      sendJson(response, 400, { error: 'invalid_runtime_ticket_request' });
      return;
    }
    if (!isForegroundDevice(session.deviceId, session.token)) {
      sendJson(response, 403, { error: 'foreground_required' });
      return;
    }
    if (!runtimeTicketLimiter.consume(session.deviceId)) {
      auth.metrics.rateLimited += 1;
      sendJson(response, 429, { error: 'rate_limited' });
      return;
    }
    const reasonCode = await options.runtime.validateFreshModelTicketRequest(body);
    if (reasonCode !== null) {
      sendJson(response, reasonCode.startsWith('stale_') ? 409 : 422, { error: reasonCode });
      return;
    }
    sendJson(response, 201, auth.issueRuntimeModelTicket(session, body));
    return;
  }
  if (ingress.path === '/api/commands/list') {
    await requireEmptyBody(request);
    if (options.commands === undefined) {
      sendJson(response, 503, { error: 'commands_unavailable' });
      return;
    }
    try {
      sendJson(response, 200, await options.commands.listCommands());
    } catch {
      sendJson(response, 503, { error: 'pi_unavailable' });
    }
    return;
  }
  if (ingress.path === '/api/prompt/abort') {
    const body = await readJsonBody(request);
    if (options.prompts === undefined || !isRecord(body) || !isOpaqueId(body.ticket)) {
      sendJson(response, 400, { error: 'invalid_abort' });
      return;
    }
    const ticketSession = auth.consumeTicket(
      body.ticket,
      ingress.origin,
      ingress.principal,
      'prompt:abort',
    );
    if (
      ticketSession === null ||
      ticketSession.token !== session.token ||
      ticketSession.deviceId !== session.deviceId
    ) {
      sendJson(response, 401, { error: 'unauthorized' });
      return;
    }
    if (!isForegroundDevice(session.deviceId, session.token)) {
      sendJson(response, 403, { error: 'foreground_required' });
      return;
    }
    try {
      const result = await options.prompts.abort();
      sendJson(response, result.outcome.status === 'aborted' ? 202 : 503, result);
    } catch {
      sendJson(response, 503, { error: 'pi_unavailable' });
    }
    return;
  }
  if (ingress.path === '/api/runtime/control') {
    const body = await readJsonBody(request);
    if (options.runtime === undefined || !isRuntimeControlCommand(body)) {
      sendJson(response, 400, { error: 'invalid_runtime_control' });
      return;
    }
    const ticketAccepted =
      body.operation.type === 'set_model'
        ? auth.consumeRuntimeModelTicket(body.ticket, session, body)
        : auth.consumeTicket(body.ticket, ingress.origin, ingress.principal, 'runtime:control')
            ?.token === session.token;
    if (!ticketAccepted) {
      sendJson(response, 401, { error: 'unauthorized' });
      return;
    }
    if (!isForegroundDevice(session.deviceId, session.token)) {
      sendJson(response, 403, { error: 'foreground_required' });
      return;
    }
    if (!runtimeControlLimiter.consume(session.deviceId)) {
      auth.metrics.rateLimited += 1;
      sendJson(response, 429, { error: 'rate_limited' });
      return;
    }
    try {
      const result = await options.runtime.control(body);
      sendJson(response, statusForRuntimeOutcome(result), result);
    } catch {
      sendRuntimeIssue(response, 'host-unavailable');
    }
    return;
  }
  if (ingress.path === '/api/accept-edits') {
    const body = await readJsonBody(request);
    if (
      options.approvals === undefined ||
      !isRecord(body) ||
      !isOpaqueId(body.sessionId) ||
      !isOpaqueId(body.epoch) ||
      !Array.isArray(body.allowedTools) ||
      !body.allowedTools.every((tool) => typeof tool === 'string') ||
      typeof body.remainingActions !== 'number' ||
      typeof body.ttlMs !== 'number'
    ) {
      sendJson(response, 400, { error: 'invalid_grant' });
      return;
    }
    try {
      sendJson(
        response,
        201,
        options.approvals.createAcceptEditsGrant({
          principal: session.principal,
          sessionId: body.sessionId,
          epoch: body.epoch,
          allowedTools: body.allowedTools,
          remainingActions: body.remainingActions,
          ttlMs: body.ttlMs,
        }),
      );
    } catch {
      sendJson(response, 403, { error: 'grant_denied' });
    }
    return;
  }

  const transcriptMatch = /^\/api\/sessions\/([^/]+)\/transcript$/.exec(ingress.path);
  const encodedSessionId = transcriptMatch?.[1];
  if (encodedSessionId !== undefined) {
    const sessionId = decodeURIComponent(encodedSessionId);
    const body = await readJsonBody(request);
    if (!isOpaqueId(sessionId) || !isRecord(body)) {
      sendJson(response, 400, { error: 'invalid_session' });
      return;
    }
    const afterSeq = parseInteger(body.after, 0, 0);
    const limit = parseInteger(body.limit, DEFAULT_PAGE_LIMIT, 1);
    sendJson(
      response,
      200,
      options.store.getTranscriptPage(
        {
          hostId: options.hostId,
          workspaceRef: options.workspaceRef,
          sessionId,
        },
        afterSeq,
        limit,
      ),
    );
    return;
  }
  discardRequest(request);
  sendJson(response, 404, { error: 'not_found' });
}

async function handleExtensionAuthority(
  request: IncomingMessage,
  response: ServerResponse,
  options: ReadOnlyServerOptions,
): Promise<void> {
  const authority = options.extensionAuthority;
  if (
    request.method !== 'POST' ||
    authority === undefined ||
    options.approvals === undefined ||
    !matchesSecret(singleHeader(request.headers.authorization), authority.secret)
  ) {
    discardRequest(request);
    sendJson(response, 401, { error: 'unauthorized' });
    return;
  }
  const path = ingressPath(request);
  const body = await readJsonBody(request);
  if (path === '/api/extension/approval/request') {
    if (
      !isApprovalAuthorityRequest(body) ||
      !matchesAuthorityAction(body.action, authority) ||
      body.digest !== approvalActionDigest(body.action)
    ) {
      sendJson(response, 403, { requested: false, reason: 'authority-request-mismatch' });
      return;
    }
    try {
      sendJson(response, 201, {
        requested: true,
        approval: options.approvals.request(body.action),
      });
    } catch {
      sendJson(response, 403, { requested: false, reason: 'mutation-disabled' });
    }
    return;
  }
  if (
    !isApprovalAuthorityConsumeRequest(body) ||
    !matchesAuthorityAction(body.action, authority) ||
    body.digest !== approvalActionDigest(body.action)
  ) {
    sendJson(response, 403, { allowed: false, reason: 'authority-consume-mismatch' });
    return;
  }
  const result = options.approvals.consume({
    approvalId: body.approvalId,
    action: body.action,
    currentEpoch: authority.epoch,
  });
  sendJson(
    response,
    result.allowed ? 200 : 403,
    result.allowed ? { allowed: true } : { allowed: false, reason: result.reason },
  );
}

function matchesAuthorityAction(
  action: {
    readonly principal: string;
    readonly sessionId: string;
    readonly epoch: string;
    readonly policyVersion: number;
  },
  authority: NonNullable<ReadOnlyServerOptions['extensionAuthority']>,
): boolean {
  return (
    action.principal === authority.principal &&
    action.sessionId === authority.sessionId &&
    action.epoch === authority.epoch &&
    action.policyVersion === authority.policyVersion
  );
}

function matchesSecret(authorization: string | null, secret: string): boolean {
  const prefix = 'Bearer ';
  if (authorization === null || !authorization.startsWith(prefix)) return false;
  const candidate = Buffer.from(authorization.slice(prefix.length));
  const expected = Buffer.from(secret);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function ingressPath(request: IncomingMessage): string {
  return new URL(request.url ?? '/', 'http://localhost').pathname;
}

function authenticateIngress(
  request: IncomingMessage,
  options: ReadOnlyServerOptions,
): TrustedIngress | null {
  const requestUrl = new URL(request.url ?? '/', 'http://localhost');
  const prefix = `/_serve/${options.serveSecret}`;
  if (!safePathPrefix(requestUrl.pathname, prefix)) return null;
  const origin = singleHeader(request.headers.origin);
  if (origin !== options.publicOrigin) return null;
  const principal = singleHeader(request.headers['tailscale-user-login']);
  if (principal === null || principal.length === 0 || principal.length > 320) return null;
  for (const header of TAILSCALE_IDENTITY_HEADERS) delete request.headers[header];
  return {
    path: requestUrl.pathname.slice(prefix.length) || '/',
    origin,
    principal,
  };
}

function safePathPrefix(path: string, prefix: string): boolean {
  if (!path.startsWith(`${prefix}/`) && path !== prefix) return false;
  const candidate = Buffer.from(path.slice(0, prefix.length));
  const expected = Buffer.from(prefix);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function actionForRequest(path: string): string | null {
  if (path === '/health') return 'health:read';
  if (path === '/api/sessions') return 'sessions:list';
  if (path === '/api/attention' || path === '/api/attention/open') return 'attention:read';
  if (path.startsWith('/api/push/')) return 'push:manage';
  if (/^\/api\/sessions\/[^/]+\/transcript$/.test(path)) return 'transcript:read';
  if (path === '/api/auth/ticket') return 'ticket:create';
  if (path === '/api/auth/logout') return 'session:revoke';
  if (path === '/api/auth/revoke-device') return 'device:revoke';
  if (path === '/api/approvals') return 'approvals:list';
  if (path === '/api/approval/decide') return 'approval:decide';
  if (path === '/api/prompt/submit') return 'prompt:submit';
  if (path === '/api/prompt/abort') return 'prompt:abort';
  if (path === '/api/accept-edits') return 'accept-edits:create';
  if (
    path === '/api/runtime/state' ||
    path === '/api/runtime/models' ||
    path === '/api/runtime/reconcile'
  ) {
    return 'runtime:read';
  }
  if (path === '/api/runtime/ticket') return 'runtime-ticket:create';
  if (path === '/api/runtime/control') return 'runtime:control';
  if (path === '/api/commands/list') return 'commands:list';
  return null;
}

function statusForRuntimeOutcome(result: RuntimeControlResponse): number {
  switch (result.outcome.status) {
    case 'accepted':
      return 202;
    case 'stale':
      return 409;
    case 'unsupported':
    case 'policy_blocked':
      return 422;
    case 'unavailable':
      return result.outcome.issueCode === 'unsupported' ? 422 : 503;
    default:
      return 503;
  }
}

function sendRuntimeIssue(
  response: ServerResponse,
  issueCode: RuntimeIssueCode,
  statusCode = statusForRuntimeIssue(issueCode),
): void {
  sendJson(response, statusCode, { error: issueCode });
}

function runtimeIssueCode(error: unknown): RuntimeIssueCode {
  if (error instanceof RuntimeIssueError) return error.issueCode;
  if (isRecord(error) && isRuntimeIssueCode(error.issueCode)) return error.issueCode;
  return 'host-unavailable';
}

function statusForRuntimeIssue(issueCode: RuntimeIssueCode): number {
  switch (issueCode) {
    case 'unsupported':
      return 422;
    case 'invalid-response':
      return 502;
    case 'foreground-required':
      return 403;
    case 'rate-limited':
      return 429;
    default:
      return 503;
  }
}

function parseSubscribe(serialized: string): SubscribeRequest | null {
  try {
    const parsed = JSON.parse(serialized) as unknown;
    if (
      !isRecord(parsed) ||
      Object.keys(parsed).some((key) => !['type', 'sessionId', 'cursor'].includes(key)) ||
      parsed.type !== 'subscribe' ||
      !isOpaqueId(parsed.sessionId)
    ) {
      return null;
    }
    if (parsed.cursor === undefined) return { type: 'subscribe', sessionId: parsed.sessionId };
    if (
      !isRecord(parsed.cursor) ||
      !isOpaqueId(parsed.cursor.epoch) ||
      typeof parsed.cursor.seq !== 'number' ||
      !Number.isSafeInteger(parsed.cursor.seq) ||
      parsed.cursor.seq < 0
    ) {
      return null;
    }
    return {
      type: 'subscribe',
      sessionId: parsed.sessionId,
      cursor: { epoch: parsed.cursor.epoch, seq: parsed.cursor.seq },
    };
  } catch {
    return null;
  }
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const serialized = await readBody(request);
  if (serialized.length === 0) throw new Error('Expected a JSON body.');
  return JSON.parse(serialized) as unknown;
}

async function requireEmptyBody(request: IncomingMessage): Promise<void> {
  if ((await readBody(request)).length !== 0) throw new Error('Expected an empty body.');
}

async function readBody(request: IncomingMessage): Promise<string> {
  const declaredLength = Number.parseInt(request.headers['content-length'] ?? '0', 10);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_HTTP_BODY_BYTES) {
    throw new Error('Request body too large.');
  }
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > MAX_HTTP_BODY_BYTES) throw new Error('Request body too large.');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function discardRequest(request: IncomingMessage): void {
  request.resume();
}

function sendSync(client: WebSocket, message: SyncMessage): void {
  if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(message));
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  value: unknown,
  extraHeaders: Readonly<Record<string, string>> = {},
): void {
  if (response.headersSent || response.destroyed) return;
  const body = statusCode === 204 ? '' : JSON.stringify(value);
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
    'x-content-type-options': 'nosniff',
    ...extraHeaders,
  });
  response.end(body);
}

function rejectUpgrade(
  socket: NodeJS.WritableStream & { destroy: () => void },
  status: number,
): void {
  const reason =
    status === 401
      ? 'Unauthorized'
      : status === 429
        ? 'Too Many Requests'
        : status === 404
          ? 'Not Found'
          : 'Forbidden';
  socket.write(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

function readCookie(request: IncomingMessage, name: string): string | null {
  const cookie = singleHeader(request.headers.cookie);
  if (cookie === null) return null;
  for (const pair of cookie.split(';')) {
    const separator = pair.indexOf('=');
    if (separator !== -1 && pair.slice(0, separator).trim() === name) {
      const value = pair.slice(separator + 1).trim();
      return isOpaqueId(value) ? value : null;
    }
  }
  return null;
}

function sessionCookie(token: string, expiresAt: string, now: number): string {
  const maxAge = Math.max(0, Math.floor((Date.parse(expiresAt) - now) / 1_000));
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

function expiredSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

function parseInteger(value: unknown, fallback: number, minimum: number): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum
    ? value
    : fallback;
}

function countDeviceSockets(sockets: ReadonlySet<ActiveSocket>, deviceId: string): number {
  let count = 0;
  for (const active of sockets) if (active.deviceId === deviceId) count += 1;
  return count;
}

function singleHeader(value: string | readonly string[] | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertServerConfiguration(options: ReadOnlyServerOptions): void {
  if (new URL(options.publicOrigin).origin !== options.publicOrigin) {
    throw new Error('publicOrigin must be an exact URL origin.');
  }
  if (options.serveSecret.length < 32 || !/^[A-Za-z0-9_-]+$/.test(options.serveSecret)) {
    throw new Error('serveSecret must be at least 32 base64url characters.');
  }
  if (
    options.extensionAuthority !== undefined &&
    (options.extensionAuthority.secret.length < 32 ||
      !/^[A-Za-z0-9_-]+$/.test(options.extensionAuthority.secret))
  ) {
    throw new Error('extension authority secret must be at least 32 base64url characters.');
  }
}
