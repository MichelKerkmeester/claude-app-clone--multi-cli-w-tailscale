// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Loopback Read-Only HTTP Server
// ───────────────────────────────────────────────────────────────────

import { timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  approvalActionDigest,
  isAttachmentSetManifest,
  isApprovalAuthorityConsumeRequest,
  isApprovalAuthorityRequest,
  isApprovalDecisionCommand,
  isAskQuestionAnswerRequest,
  isAskQuestionAnswerTicketRequest,
  isAskQuestionDisplayDto,
  isAskQuestionDisplayReadRequest,
  isOpaqueId,
  isPlanControlCommand,
  isPromptSubmitCommand,
  isPushPreferences,
  isPushSubscriptionInput,
  isRuntimeIssueCode,
  isRuntimeControlCommand,
  isRuntimeModelTicketRequest,
  isRuntimeSnapshotDto,
  TODO_PROJECTION_CAPABILITY,
  type EnrollmentRequest,
  type PlanControlResponse,
  type RuntimeIssueCode,
  type RuntimeControlResponse,
  type SyncCursor,
  type SyncMessage,
} from '@pi-remote/pi-rpc-protocol';
import { WebSocket, WebSocketServer } from 'ws';

import {
  AuthService,
  type ApplicationSession,
  type ArtifactPublishTicketBinding,
} from '../auth/auth-service.js';
import { isAttachmentAction } from '../auth/policy.js';
import type { ApprovalService } from '../approval/approval-service.js';
import type { AskQuestionService } from '../ask-question/ask-question-service.js';
import {
  ArtifactReadRateLimiter,
  FixedWindowRateLimiter,
  type ArtifactReadVariant,
} from '../auth/rate-limit.js';
import {
  AttachmentService,
  type AttachmentUploadInput,
} from '../attachments/attachment-service.js';
import { AttachmentReaper } from '../attachments/attachment-reaper.js';
import { UPLOAD_BODY_DEADLINE_MS } from '../attachments/attachment-limits.js';
import {
  AttachmentServiceError,
  isAttachmentTicketBinding,
  type AttachmentOwner,
  type AttachmentTicketBinding,
} from '../attachments/attachment-types.js';
import { PiImageBridgeError } from '../attachments/pi-image-bridge.js';
import type { CommandService } from '../commands/command-service.js';
import type { SyncHub } from '../replay/sync.js';
import { RuntimeIssueError, type RuntimeService } from '../runtime/runtime-service.js';
import type { SessionCatalog } from '../sessions/catalog.js';
import type { RelayStore } from '../store/relay-store.js';
import type { InboundSecretScanner } from '../store/artifact-sanitizer.js';
import type { PushService } from '../push/push-service.js';
import {
  PromptRevisionStaleError,
  SlashSubmissionError,
  type PromptService,
} from '../prompt/prompt-service.js';

const LOOPBACK_HOST = '127.0.0.1';
const DEFAULT_PORT = 4_310;
const MAX_HTTP_BODY_BYTES = 16_384;
const MAX_WS_MESSAGE_BYTES = 65_536;
const MAX_CONNECTIONS = 32;
const MAX_CONNECTIONS_PER_DEVICE = 4;
const DEFAULT_SYNC_HEARTBEAT_INTERVAL_MS = 30_000;
const MAX_PROMPTS_PER_MINUTE = 20;
const MAX_ARTIFACT_READS_PER_MINUTE = 60;
const MAX_ARTIFACT_READ_BYTES = 50 * 1024 * 1024;
const RUNTIME_RECONCILE_RETRY_AFTER_SECONDS = '1';
const DEFAULT_PAGE_LIMIT = 50;
const SESSION_COOKIE = '__Host-pi_remote_session';
const ATTACHMENT_BINARY_CONTENT_TYPE = 'application/octet-stream';
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
  isAlive: boolean;
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
  // Keep liveness timing injectable so heartbeat checks stay deterministic.
  readonly syncHeartbeatIntervalMs?: number;
  readonly auth?: AuthService;
  readonly approvals?: ApprovalService;
  readonly extensionAuthority?: {
    readonly secret: string;
    readonly principal: string;
    readonly sessionId: string;
    readonly epoch: string;
    readonly policyVersion: number;
    readonly hostExtension?: string;
    readonly deviceId?: string;
    readonly runId?: string;
  };
  readonly prompts?: PromptService;
  readonly runtime?: RuntimeService;
  readonly askQuestions?: AskQuestionService;
  readonly commands?: CommandService;
  readonly push?: PushService;
  readonly now?: () => number;
  readonly mediaEnabled?: boolean;
  readonly attachments?: AttachmentService;
  readonly attachmentReaper?: AttachmentReaper;
  readonly attachmentSessionId?: string;
  readonly inboundScanner?: InboundSecretScanner;
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
  await options.attachments?.initialize();
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
  const artifactReadLimiter = new FixedWindowRateLimiter(
    MAX_ARTIFACT_READS_PER_MINUTE,
    60_000,
    options.now ?? Date.now,
  );
  const inboundArtifactReadLimiter = new ArtifactReadRateLimiter(options.now ?? Date.now);
  const runtimeControlLimiter = new FixedWindowRateLimiter(30, 60_000, options.now ?? Date.now);
  const runtimeTicketLimiter = new FixedWindowRateLimiter(10, 60_000, options.now ?? Date.now);
  const runtimeReconcileLimiter = new FixedWindowRateLimiter(30, 60_000, options.now ?? Date.now);
  const planControlLimiter = new FixedWindowRateLimiter(30, 60_000, options.now ?? Date.now);
  const planBindingLimiter = new FixedWindowRateLimiter(30, 60_000, options.now ?? Date.now);
  const approvalDecisionLimiter = new FixedWindowRateLimiter(30, 60_000, options.now ?? Date.now);
  const acceptEditsLimiter = new FixedWindowRateLimiter(30, 60_000, options.now ?? Date.now);
  const askQuestionTicketLimiter = new FixedWindowRateLimiter(10, 60_000, options.now ?? Date.now);
  const askQuestionAnswerLimiter = new FixedWindowRateLimiter(30, 60_000, options.now ?? Date.now);
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
      artifactReadLimiter,
      inboundArtifactReadLimiter,
      runtimeTicketLimiter,
      runtimeControlLimiter,
      runtimeReconcileLimiter,
      planControlLimiter,
      planBindingLimiter,
      approvalDecisionLimiter,
      acceptEditsLimiter,
      askQuestionTicketLimiter,
      askQuestionAnswerLimiter,
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
    const admission = requestLimiter.consume(rateKey);
    if (!admission.allowed) {
      auth.metrics.rateLimited += 1;
      rejectUpgrade(socket, 429, admission.retryAfterSeconds);
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
      isAlive: true,
    };
    const expiresIn = Math.max(0, Date.parse(session.expiresAt) - (options.now?.() ?? Date.now()));
    const expiryTimer = setTimeout(() => {
      client.close(4001, 'Application session expired.');
    }, expiresIn);
    expiryTimer.unref();
    activeSockets.add(active);
    auth.metrics.connectionsAccepted += 1;
    client.on('pong', () => {
      active.isAlive = true;
    });
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

  const heartbeatTimer = setInterval(() => {
    for (const active of activeSockets) {
      if (!active.isAlive || active.client.readyState !== WebSocket.OPEN) {
        active.client.terminate();
        activeSockets.delete(active);
        continue;
      }
      active.isAlive = false;
      active.client.ping();
    }
  }, options.syncHeartbeatIntervalMs ?? DEFAULT_SYNC_HEARTBEAT_INTERVAL_MS);
  heartbeatTimer.unref();

  const stopRevocationListener = auth.onRevocation((deviceId, sessionToken) => {
    for (const active of activeSockets) {
      if (
        active.deviceId === deviceId &&
        (sessionToken === undefined || active.sessionToken === sessionToken)
      ) {
        active.client.close(4003, 'Authorization revoked.');
      }
    }
    void (sessionToken === undefined
      ? (options.attachmentReaper?.onDeviceRevoked(deviceId) ??
        options.attachments?.cancelForDevice(deviceId))
      : (options.attachmentReaper?.onLogout(sessionToken) ??
        options.attachments?.cancelForSession(sessionToken)));
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
      clearInterval(heartbeatTimer);
      stopRevocationListener();
      if (options.attachmentReaper !== undefined) {
        await options.attachmentReaper.shutdown();
      } else {
        await options.attachments?.cleanupAll();
      }
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
  artifactReadLimiter: FixedWindowRateLimiter,
  inboundArtifactReadLimiter: ArtifactReadRateLimiter,
  runtimeTicketLimiter: FixedWindowRateLimiter,
  runtimeControlLimiter: FixedWindowRateLimiter,
  runtimeReconcileLimiter: FixedWindowRateLimiter,
  planControlLimiter: FixedWindowRateLimiter,
  planBindingLimiter: FixedWindowRateLimiter,
  approvalDecisionLimiter: FixedWindowRateLimiter,
  acceptEditsLimiter: FixedWindowRateLimiter,
  askQuestionTicketLimiter: FixedWindowRateLimiter,
  askQuestionAnswerLimiter: FixedWindowRateLimiter,
  isForegroundDevice: (deviceId: string, token: string) => boolean,
): Promise<void> {
  if (
    request.socket.remoteAddress === LOOPBACK_HOST &&
    (ingressPath(request) === '/api/extension/approval/request' ||
      ingressPath(request) === '/api/extension/approval/consume' ||
      isInboundPublishRoute(ingressPath(request)))
  ) {
    await handleExtensionAuthority(request, response, options, auth);
    return;
  }
  const ingress = authenticateIngress(request, options);
  if (ingress === null) {
    discardRequest(request);
    sendJson(response, 403, { error: 'forbidden' });
    return;
  }
  const rateKey = `${ingress.principal}\0${request.socket.remoteAddress ?? 'unknown'}`;
  const admission = requestLimiter.consume(rateKey);
  if (!admission.allowed) {
    auth.metrics.rateLimited += 1;
    discardRequest(request);
    sendJson(
      response,
      429,
      { error: 'rate_limited' },
      retryAfterHeaders(admission.retryAfterSeconds),
    );
    return;
  }
  if (isAttachmentRoute(ingress.path) && options.mediaEnabled !== true) {
    discardRequest(request);
    sendJson(response, 404, { error: 'not_found' });
    return;
  }
  const attachmentRoute = parseAttachmentRoute(ingress.path);
  if (
    (attachmentRoute === null &&
      request.method !== 'POST' &&
      parseArtifactRoute(ingress.path) === null &&
      ingress.path !== '/api/artifacts/read') ||
    (attachmentRoute !== null &&
      request.method !== (attachmentRoute.operation === 'upload' ? 'PUT' : 'POST'))
  ) {
    discardRequest(request);
    sendJson(response, 405, { error: 'read_only' });
    return;
  }

  if (ingress.path === '/api/auth/enroll') {
    const admission = enrollmentLimiter.consume(rateKey);
    if (!admission.allowed) {
      auth.metrics.rateLimited += 1;
      discardRequest(request);
      sendJson(
        response,
        429,
        { error: 'rate_limited' },
        retryAfterHeaders(admission.retryAfterSeconds),
      );
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
      {
        expiresAt: session.expiresAt,
        mode: 'read-only',
        capabilities: TODO_PROJECTION_CAPABILITY,
      },
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
  const action = actionForRequest(ingress.path, options.mediaEnabled === true);
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

  if (attachmentRoute !== null) {
    await handleAttachmentRoute(
      request,
      response,
      options,
      auth,
      ingress,
      session,
      attachmentRoute,
      isForegroundDevice,
    );
    return;
  }

  if (ingress.path === '/api/ask-question/display') {
    const body = await readJsonBody(request);
    if (options.askQuestions === undefined || !isAskQuestionDisplayReadRequest(body)) {
      sendJson(response, options.askQuestions === undefined ? 503 : 400, {
        error: options.askQuestions === undefined ? 'ask_question_unavailable' : 'invalid_request',
      });
      return;
    }
    const display = options.askQuestions.getDisplay(body.sessionId, body.questionId, body.revision);
    if (display === null || !isAskQuestionDisplayDto(display)) {
      sendJson(response, 404, { error: 'question_not_found' });
      return;
    }
    sendJson(response, 200, display);
    return;
  }

  if (ingress.path === '/api/ask-question/ticket') {
    const body = await readJsonBody(request);
    if (options.askQuestions === undefined || !isAskQuestionAnswerTicketRequest(body)) {
      sendJson(response, options.askQuestions === undefined ? 503 : 400, {
        error: options.askQuestions === undefined ? 'ask_question_unavailable' : 'invalid_ticket_request',
      });
      return;
    }
    if (!isForegroundDevice(session.deviceId, session.token)) {
      sendJson(response, 403, { error: 'foreground_required' });
      return;
    }
    const admission = askQuestionTicketLimiter.consume(session.deviceId);
    if (!admission.allowed) {
      auth.metrics.rateLimited += 1;
      sendJson(
        response,
        429,
        { error: 'rate_limited' },
        retryAfterHeaders(admission.retryAfterSeconds),
      );
      return;
    }
    const result = await options.askQuestions.issueAnswerTicket(session, body, auth);
    if (result.status === 'issued') {
      sendJson(response, 201, result.ticket);
      return;
    }
    sendJson(response, statusForAskQuestionReason(result.reason), { error: result.reason });
    return;
  }

  if (ingress.path === '/api/ask-question/answer') {
    const body = await readJsonBody(request);
    if (options.askQuestions === undefined || !isAskQuestionAnswerRequest(body)) {
      sendJson(response, options.askQuestions === undefined ? 503 : 400, {
        error: options.askQuestions === undefined ? 'ask_question_unavailable' : 'invalid_answer_request',
      });
      return;
    }
    if (!isForegroundDevice(session.deviceId, session.token)) {
      sendJson(response, 403, { error: 'foreground_required' });
      return;
    }
    const admission = askQuestionAnswerLimiter.consume(session.deviceId);
    if (!admission.allowed) {
      auth.metrics.rateLimited += 1;
      sendJson(
        response,
        429,
        { error: 'rate_limited' },
        retryAfterHeaders(admission.retryAfterSeconds),
      );
      return;
    }
    const result = await options.askQuestions.commitAnswer(session, body, auth);
    sendJson(response, result.status === 'accepted' ? 202 : statusForAskQuestionReason(result.reason), result);
    return;
  }

  if (ingress.path === '/api/artifacts/read') {
    await handleInboundArtifactReadRoute(
      request,
      response,
      options,
      session,
      inboundArtifactReadLimiter,
      isForegroundDevice,
    );
    return;
  }

  const artifactRoute = parseArtifactRoute(ingress.path);
  if (artifactRoute !== null) {
    if (
      request.method !== 'GET' ||
      new URL(request.url ?? '/', 'http://localhost').search.length > 0
    ) {
      discardRequest(request);
      sendArtifactFailure(response, 405);
      return;
    }
    const admission = artifactReadLimiter.consume(session.deviceId);
    if (!admission.allowed) {
      auth.metrics.rateLimited += 1;
      discardRequest(request);
      sendArtifactFailure(response, 429, admission.retryAfterSeconds);
      return;
    }
    const rangeHeader = singleHeader(request.headers.range);
    const range = rangeHeader === null ? null : parseArtifactRange(rangeHeader);
    if (rangeHeader !== null && range === null) {
      discardRequest(request);
      sendArtifactFailure(response, 416);
      return;
    }
    discardRequest(request);
    const now = options.now?.() ?? Date.now();
    const artifact = options.store.readArtifact(artifactRoute, range, now);
    if (artifact === null || artifact.bytes.byteLength > MAX_ARTIFACT_READ_BYTES) {
      const current =
        range === null ? null : options.store.artifactStore.lookupArtifact(artifactRoute, now);
      sendArtifactFailure(response, range !== null && current?.status === 'ready' ? 416 : 404);
      return;
    }
    const headers: Record<string, string> = {
      'content-type': artifact.descriptor.mimeType,
      'content-length': String(artifact.bytes.byteLength),
      'cache-control': 'private, no-store, max-age=0',
      'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
      'cross-origin-resource-policy': 'same-origin',
      'x-content-type-options': 'nosniff',
      etag: artifact.etag,
      'x-artifact-digest': artifact.digest,
      'x-artifact-revision': artifact.revision,
      'accept-ranges': 'bytes',
    };
    if (artifact.contentRange !== null) headers['content-range'] = artifact.contentRange;
    response.writeHead(artifact.contentRange === null ? 200 : 206, headers);
    response.end(artifact.bytes);
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
    if (hasBody(request)) {
      const body = await readJsonBody(request);
      const requestData = parseAttachmentTicketRequest(body);
      if (options.mediaEnabled !== true || options.attachments === undefined) {
        sendJson(response, 404, { error: 'not_available' });
        return;
      }
      if (requestData === null) {
        sendJson(response, 400, { error: 'invalid_ticket_request' });
        return;
      }
      if (!attachmentBindingMatchesHostSession(requestData.binding, options)) {
        sendJson(response, 404, { error: 'not_available' });
        return;
      }
      if (!isForegroundDevice(session.deviceId, session.token)) {
        sendJson(response, 403, { error: 'foreground_required' });
        return;
      }
      const owner = attachmentOwner(session, requestData.binding);
      if (!options.attachments.canIssueTicket(owner, requestData.binding)) {
        sendJson(response, 404, { error: 'not_available' });
        return;
      }
      sendJson(response, 201, auth.issueAttachmentTicket(session, requestData.binding));
      return;
    }
    await requireEmptyBody(request);
    sendJson(response, 201, auth.issueTicket(session));
    return;
  }
  if (ingress.path === '/api/auth/logout') {
    await requireEmptyBody(request);
    await (options.attachmentReaper?.onLogout(session.token) ??
      options.attachments?.cancelForSession(session.token));
    options.push?.unsubscribe(session.deviceId);
    auth.revokeSession(session.token);
    sendJson(response, 204, null, { 'set-cookie': expiredSessionCookie() });
    return;
  }
  if (ingress.path === '/api/auth/revoke-device') {
    await requireEmptyBody(request);
    await (options.attachmentReaper?.onDeviceRevoked(session.deviceId) ??
      options.attachments?.cancelForDevice(session.deviceId));
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
    if (!isForegroundDevice(session.deviceId, session.token)) {
      sendJson(response, 403, { error: 'foreground_required' });
      return;
    }
    const admission = approvalDecisionLimiter.consume(session.deviceId);
    if (!admission.allowed) {
      auth.metrics.rateLimited += 1;
      sendJson(
        response,
        429,
        { error: 'rate_limited' },
        retryAfterHeaders(admission.retryAfterSeconds),
      );
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
    const ticketSession = auth.consumeTicket(
      body.ticket,
      ingress.origin,
      ingress.principal,
      action,
    );
    if (
      ticketSession === null ||
      ticketSession.token !== session.token ||
      ticketSession.deviceId !== session.deviceId
    ) {
      sendJson(response, 401, { error: 'unauthorized' });
      return;
    }
    const hasAttachments = body.attachmentSetId !== undefined || body.attachmentIds !== undefined;
    if (hasAttachments && options.mediaEnabled !== true) {
      sendJson(response, 404, { error: 'not_available' });
      return;
    }
    if (!isForegroundDevice(session.deviceId, session.token)) {
      sendJson(response, 403, { error: 'foreground_required' });
      return;
    }
    if (
      options.prompts.getSubmissionState(body.submissionId, session.deviceId) === 'delivery-unknown'
    ) {
      sendJson(response, 503, { error: 'delivery_unknown' });
      return;
    }
    const admission = promptLimiter.consume(session.deviceId);
    if (!admission.allowed) {
      auth.metrics.rateLimited += 1;
      sendJson(
        response,
        429,
        { error: 'rate_limited' },
        retryAfterHeaders(admission.retryAfterSeconds),
      );
      return;
    }
    try {
      const block = await options.prompts.submit(body, session.deviceId);
      if (
        options.prompts.getSubmissionState(body.submissionId, session.deviceId) ===
        'delivery-unknown'
      ) {
        sendJson(response, 503, { error: 'delivery_unknown' });
        return;
      }
      sendJson(response, 202, { accepted: true, block });
    } catch (error: unknown) {
      if (error instanceof SlashSubmissionError) {
        // Typed stale/denied outcomes carry no host detail and are never retried.
        sendJson(response, error.reason === 'stale_catalog' ? 409 : 403, {
          error: error.reason,
        });
        return;
      }
      if (error instanceof PiImageBridgeError) {
        sendJson(response, statusForImageBridgeError(error.code), {
          error: imageBridgeErrorCode(error.code),
        });
        return;
      }
      if (error instanceof PromptRevisionStaleError) {
        sendJson(response, 409, { error: 'stale_revision' });
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
    if (!runtimeReconcileLimiter.consume(session.deviceId).allowed) {
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
    const admission = runtimeTicketLimiter.consume(session.deviceId);
    if (!admission.allowed) {
      auth.metrics.rateLimited += 1;
      sendJson(
        response,
        429,
        { error: 'rate_limited' },
        retryAfterHeaders(admission.retryAfterSeconds),
      );
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
    const admission = runtimeControlLimiter.consume(session.deviceId);
    if (!admission.allowed) {
      auth.metrics.rateLimited += 1;
      sendJson(
        response,
        429,
        { error: 'rate_limited' },
        retryAfterHeaders(admission.retryAfterSeconds),
      );
      return;
    }
    try {
      const result = await options.runtime.control(body);
      sendJson(response, statusForControlOutcome(result), result);
    } catch {
      sendRuntimeIssue(response, 'host-unavailable');
    }
    return;
  }
  if (ingress.path === '/api/plan/control') {
    const body = await readJsonBody(request);
    if (options.runtime === undefined || !isPlanControlCommand(body)) {
      sendJson(response, 400, { error: 'invalid_plan_control' });
      return;
    }
    // Both plan operations are one-use-ticketed, session-bound controls: the
    // ticket binds the request to the authenticated session and foreground
    // principal before any host dispatch is possible.
    const ticketAccepted =
      auth.consumeTicket(body.oneUseTicket, ingress.origin, ingress.principal, 'plan:control')
        ?.token === session.token;
    if (!ticketAccepted) {
      sendJson(response, 401, { error: 'unauthorized' });
      return;
    }
    if (!isForegroundDevice(session.deviceId, session.token)) {
      sendJson(response, 403, { error: 'foreground_required' });
      return;
    }
    const admission = planControlLimiter.consume(session.deviceId);
    if (!admission.allowed) {
      auth.metrics.rateLimited += 1;
      sendJson(
        response,
        429,
        { error: 'rate_limited' },
        retryAfterHeaders(admission.retryAfterSeconds),
      );
      return;
    }
    try {
      const result = await options.runtime.planControl(body);
      sendJson(response, statusForControlOutcome(result), result);
    } catch {
      sendRuntimeIssue(response, 'host-unavailable');
    }
    return;
  }
  if (ingress.path === '/api/plan/binding') {
    const body = await readJsonBody(request);
    if (
      options.runtime === undefined ||
      !isRecord(body) ||
      !isOpaqueId(body.sessionId) ||
      !isOpaqueId(body.planId) ||
      !isSafeNonNegativeInteger(body.expectedRuntimeRevision) ||
      !isSafeNonNegativeInteger(body.expectedPlanRevision)
    ) {
      sendJson(response, 400, { error: 'invalid_plan_binding_request' });
      return;
    }
    if (!isForegroundDevice(session.deviceId, session.token)) {
      sendJson(response, 403, { error: 'foreground_required' });
      return;
    }
    const admission = planBindingLimiter.consume(session.deviceId);
    if (!admission.allowed) {
      auth.metrics.rateLimited += 1;
      sendJson(
        response,
        429,
        { error: 'rate_limited' },
        retryAfterHeaders(admission.retryAfterSeconds),
      );
      return;
    }
    const binding = options.runtime.getPlanBinding({
      sessionId: body.sessionId,
      expectedRuntimeRevision: body.expectedRuntimeRevision,
      planId: body.planId,
      expectedPlanRevision: body.expectedPlanRevision,
    });
    if (binding === null) {
      sendJson(response, 409, { error: 'stale_plan' });
      return;
    }
    sendJson(response, 200, binding);
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
    if (!isForegroundDevice(session.deviceId, session.token)) {
      sendJson(response, 403, { error: 'foreground_required' });
      return;
    }
    const admission = acceptEditsLimiter.consume(session.deviceId);
    if (!admission.allowed) {
      auth.metrics.rateLimited += 1;
      sendJson(
        response,
        429,
        { error: 'rate_limited' },
        retryAfterHeaders(admission.retryAfterSeconds),
      );
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

interface InboundArtifactReadRequest {
  readonly sessionId: string;
  readonly artifactId: string;
  readonly revision: string;
  readonly variant: ArtifactReadVariant;
}

async function handleInboundArtifactReadRoute(
  request: IncomingMessage,
  response: ServerResponse,
  options: ReadOnlyServerOptions,
  session: ApplicationSession,
  rateLimiter: ArtifactReadRateLimiter,
  isForegroundDevice: (deviceId: string, token: string) => boolean,
): Promise<void> {
  const requestUrl = new URL(request.url ?? '/', 'http://localhost');
  if (request.method !== 'POST') {
    discardRequest(request);
    sendInboundArtifactReadFailure(response, 405);
    return;
  }
  if (requestUrl.search.length > 0) {
    discardRequest(request);
    sendInboundArtifactReadFailure(response, 400);
    return;
  }
  if (!isForegroundDevice(session.deviceId, session.token)) {
    discardRequest(request);
    sendJson(response, 403, { error: 'foreground_required' });
    return;
  }
  if (!isJsonContentType(singleHeader(request.headers['content-type']))) {
    discardRequest(request);
    sendInboundArtifactReadFailure(response, 400);
    return;
  }

  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch {
    discardRequest(request);
    sendInboundArtifactReadFailure(response, 400);
    return;
  }
  const readRequest = parseInboundArtifactReadRequest(body);
  if (readRequest === null) {
    sendInboundArtifactReadFailure(response, 400);
    return;
  }
  if (!isSessionMember(options.catalog, readRequest.sessionId)) {
    sendInboundArtifactReadFailure(response, 404);
    return;
  }

  const now = options.now?.() ?? Date.now();
  const identity = {
    sessionId: readRequest.sessionId,
    artifactId: readRequest.artifactId,
    revision: readRequest.revision,
  } as const;
  const ownsArtifactRevision = options.store.artifactStore.isInboundArtifactOwner(
    identity,
    session.principal,
  );
  const lookup = options.store.artifactStore.lookupInboundArtifact(identity, now);
  if (lookup.status !== 'ready') {
    const statusCode =
      (lookup.status === 'expired' || lookup.status === 'revoked') && ownsArtifactRevision
        ? 410
        : lookup.status === 'missing' &&
            options.store.artifactStore.hasInboundArtifactRevisionConflict(
              identity,
              session.principal,
            )
          ? 409
          : 404;
    sendInboundArtifactReadFailure(response, statusCode);
    return;
  }
  if (!ownsArtifactRevision || lookup.artifact.ownerPrincipal !== session.principal) {
    sendInboundArtifactReadFailure(response, 404);
    return;
  }

  const admission = rateLimiter.tryAcquire(
    session.deviceId,
    readRequest.sessionId,
    readRequest.variant,
  );
  if (!admission.allowed) {
    sendInboundArtifactReadFailure(response, 429, admission.retryAfterSeconds);
    return;
  }

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    rateLimiter.release(session.deviceId, readRequest.sessionId, readRequest.variant);
  };
  try {
    const result = options.store.artifactStore.readInboundVariant(
      { ...identity, variant: readRequest.variant },
      now,
    );
    if (result.status !== 'ready') {
      sendInboundArtifactReadFailure(
        response,
        result.status === 'expired' || result.status === 'revoked' ? 410 : 404,
      );
      return;
    }
    if (result.bytes.byteLength !== result.byteLength) {
      sendInboundArtifactReadFailure(response, 404);
      return;
    }
    response.writeHead(200, {
      'content-type': result.mediaType,
      'content-length': String(result.byteLength),
      'content-digest': contentDigestHeader(result.digest),
      etag: result.etag,
      'content-disposition': `attachment; filename="${previewFilename(result.mediaType)}"`,
      'cache-control': 'private, no-store, max-age=0',
      'x-content-type-options': 'nosniff',
      'cross-origin-resource-policy': 'same-origin',
      'referrer-policy': 'no-referrer',
    });
    await new Promise<void>((resolve) => {
      const complete = () => {
        response.off('finish', complete);
        response.off('close', complete);
        resolve();
      };
      response.once('finish', complete);
      response.once('close', complete);
      response.end(result.bytes);
    });
  } finally {
    release();
  }
}

type AttachmentRoute =
  | { readonly operation: 'reserve' }
  | { readonly operation: 'upload'; readonly setId: string; readonly partId: string }
  | { readonly operation: 'status'; readonly setId: string }
  | { readonly operation: 'cancel'; readonly setId: string };

async function handleAttachmentRoute(
  request: IncomingMessage,
  response: ServerResponse,
  options: ReadOnlyServerOptions,
  auth: AuthService,
  ingress: TrustedIngress,
  session: ApplicationSession,
  route: AttachmentRoute,
  isForegroundDevice: (deviceId: string, token: string) => boolean,
): Promise<void> {
  const attachments = options.attachments;
  if (attachments === undefined) {
    discardRequest(request);
    sendJson(response, 404, { error: 'not_found' });
    return;
  }
  if (options.mediaEnabled !== true) {
    discardRequest(request);
    sendJson(response, 404, { error: 'not_found' });
    return;
  }
  if (route.operation === 'reserve') {
    if (!isForegroundDevice(session.deviceId, session.token)) {
      rejectAttachmentRequest(request, response, 403, 'foreground_required');
      return;
    }
    const ticketId = attachmentTicketFromRequest(request);
    const consumed =
      ticketId === null
        ? null
        : auth.consumeAttachmentTicket(
            ticketId,
            ingress.origin,
            ingress.principal,
            'attachment:reserve',
          );
    if (consumed === null) {
      rejectAttachmentRequest(request, response, 401, 'unauthorized');
      return;
    }
    const body = await readJsonBody(request);
    if (!isAttachmentSetManifest(body)) {
      sendJson(response, 400, { error: 'invalid_manifest' });
      return;
    }
    if (
      !attachmentBindingMatchesHostSession(consumed.binding, options) ||
      consumed.binding.operation !== 'reserve' ||
      consumed.binding.sessionId !== body.sessionId
    ) {
      sendJson(response, 401, { error: 'unauthorized' });
      return;
    }
    const owner = attachmentOwner(session, consumed.binding);
    let reservation;
    try {
      reservation = await attachments.reserve(owner, body, consumed.binding);
    } catch (error: unknown) {
      sendAttachmentError(response, error);
      return;
    }
    const parts = attachments.getPartRecords(reservation.setId);
    if (parts === null) {
      sendJson(response, 503, { error: 'attachment_unavailable' });
      return;
    }
    const common = reservation.binding;
    const partTickets = parts.map((part) => {
      const binding: AttachmentTicketBinding = {
        operation: 'upload',
        ...common,
        setId: reservation.setId,
        attachmentId: part.attachmentId,
        partId: part.partId,
        ordinal: part.item.ordinal,
        byteLength: part.item.byteLength,
        sha256: part.item.sha256,
        declaredType: part.item.declaredType,
      };
      const ticket = auth.issueAttachmentTicket(session, binding);
      return {
        attachmentSetId: reservation.setId,
        attachmentId: part.attachmentId,
        partId: part.partId,
        ordinal: part.item.ordinal,
        ...ticket,
      };
    });
    const statusBinding: AttachmentTicketBinding = {
      operation: 'status',
      ...common,
      setId: reservation.setId,
    };
    const cancelBinding: AttachmentTicketBinding = {
      operation: 'cancel',
      ...common,
      setId: reservation.setId,
      reason: 'user',
    };
    sendJson(response, 201, {
      attachmentSetId: reservation.setId,
      revision: reservation.binding.expectedPromptRevision,
      expiresAt: new Date(reservation.expiresAt).toISOString(),
      parts: partTickets,
      statusTicket: auth.issueAttachmentTicket(session, statusBinding),
      cancelTicket: auth.issueAttachmentTicket(session, cancelBinding),
    });
    return;
  }

  if (route.operation === 'upload') {
    if (!isForegroundDevice(session.deviceId, session.token)) {
      rejectAttachmentRequest(request, response, 403, 'foreground_required');
      return;
    }
    if (singleHeader(request.headers['content-length']) === null) {
      rejectAttachmentRequest(request, response, 411, 'content_length_required');
      return;
    }
    const contentLength = exactContentLength(request);
    const contentType = singleHeader(request.headers['content-type']);
    const digest = attachmentDigestFromRequest(request);
    if (contentLength === null || contentType === null || digest === null) {
      rejectAttachmentRequest(request, response, 400, 'invalid_upload_headers');
      return;
    }
    const ticketId = attachmentTicketFromRequest(request);
    const consumed =
      ticketId === null
        ? null
        : auth.consumeAttachmentTicket(
            ticketId,
            ingress.origin,
            ingress.principal,
            'attachment:upload',
          );
    if (consumed === null) {
      rejectAttachmentRequest(request, response, 401, 'unauthorized');
      return;
    }
    const binding = consumed.binding;
    const owner = attachmentOwner(session, binding);
    if (
      !attachmentBindingMatchesHostSession(binding, options) ||
      binding.operation !== 'upload' ||
      binding.setId !== route.setId ||
      binding.partId !== route.partId ||
      binding.byteLength !== contentLength ||
      (contentType !== ATTACHMENT_BINARY_CONTENT_TYPE && contentType !== binding.declaredType) ||
      binding.sha256 !== digest ||
      !attachments.canIssueTicket(owner, binding)
    ) {
      rejectAttachmentRequest(request, response, 401, 'unauthorized');
      return;
    }
    const deadline = setTimeout(
      () => request.destroy(new Error('Upload body deadline.')),
      UPLOAD_BODY_DEADLINE_MS,
    );
    deadline.unref?.();
    try {
      const upload: AttachmentUploadInput = {
        setId: route.setId,
        partId: route.partId,
        contentLength,
        declaredMime: binding.declaredType,
        digest,
        body: request,
      };
      const result = await attachments.uploadPart(upload);
      sendJson(response, 201, {
        attachmentSetId: result.setId,
        partId: result.partId,
        status: result.status,
      });
    } catch (error: unknown) {
      sendAttachmentError(response, error);
    } finally {
      clearTimeout(deadline);
    }
    return;
  }

  const ticketId = attachmentTicketFromRequest(request);
  const action = route.operation === 'status' ? 'attachment:status' : 'attachment:cancel';
  const consumed =
    ticketId === null
      ? null
      : auth.consumeAttachmentTicket(ticketId, ingress.origin, ingress.principal, action);
  if (consumed === null) {
    rejectAttachmentRequest(request, response, 401, 'unauthorized');
    return;
  }
  const binding = consumed.binding;
  if (!attachmentBindingMatchesHostSession(binding, options)) {
    rejectAttachmentRequest(request, response, 401, 'unauthorized');
    return;
  }
  const owner = attachmentOwner(session, binding);
  if (binding.operation !== route.operation || binding.setId !== route.setId) {
    rejectAttachmentRequest(request, response, 401, 'unauthorized');
    return;
  }
  try {
    await requireEmptyBody(request);
    if (route.operation === 'status') {
      const status = attachments.status(route.setId, owner);
      sendJson(response, 200, status);
    } else {
      if (binding.operation !== 'cancel') {
        sendJson(response, 401, { error: 'unauthorized' });
        return;
      }
      await attachments.cancel(route.setId, owner, binding.reason);
      sendJson(response, 204, null);
    }
  } catch (error: unknown) {
    sendAttachmentError(response, error);
  }
}

function attachmentOwner(
  session: ApplicationSession,
  binding: AttachmentTicketBinding,
): AttachmentOwner {
  return {
    sessionToken: session.token,
    sessionId: binding.sessionId,
    sessionEpoch: binding.sessionEpoch,
    deviceId: session.deviceId,
    principal: session.principal,
    origin: session.origin,
  };
}

function attachmentBindingMatchesHostSession(
  binding: AttachmentTicketBinding,
  options: ReadOnlyServerOptions,
): boolean {
  return (
    options.attachmentSessionId === undefined || binding.sessionId === options.attachmentSessionId
  );
}

function parseAttachmentTicketRequest(
  value: unknown,
): { readonly binding: AttachmentTicketBinding } | null {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 2 ||
    typeof value.action !== 'string' ||
    !value.action.startsWith('attachment:') ||
    !isAttachmentTicketBinding(value.binding)
  ) {
    return null;
  }
  const action = value.action.slice('attachment:'.length);
  return isAttachmentAction(value.action) && action === value.binding.operation
    ? { binding: value.binding }
    : null;
}

function attachmentTicketFromRequest(request: IncomingMessage): string | null {
  const explicit =
    singleHeader(request.headers['x-attachment-ticket']) ??
    singleHeader(request.headers['x-pi-attachment-ticket']);
  if (explicit !== null) return explicit;
  const authorization = singleHeader(request.headers.authorization);
  const prefix = 'UploadTicket ';
  if (authorization === null || !authorization.startsWith(prefix)) return null;
  const token = authorization.slice(prefix.length);
  return isOpaqueId(token) ? token : null;
}

function attachmentDigestFromRequest(request: IncomingMessage): string | null {
  const direct =
    singleHeader(request.headers['x-attachment-sha256']) ??
    singleHeader(request.headers['x-attachment-digest']) ??
    singleHeader(request.headers['x-content-sha256']);
  if (direct !== null) return direct;
  const digestHeader = singleHeader(request.headers.digest);
  if (digestHeader === null) return null;
  const match = /^sha-256=([A-Za-z0-9_-]{43})$/u.exec(digestHeader);
  return match?.[1] ?? null;
}

function exactContentLength(request: IncomingMessage): number | null {
  const value = singleHeader(request.headers['content-length']);
  if (value === null || !/^\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function rejectAttachmentRequest(
  request: IncomingMessage,
  response: ServerResponse,
  status: number,
  error: string,
): void {
  sendJson(response, status, { error });
  request.destroy();
}

function sendAttachmentError(response: ServerResponse, error: unknown): void {
  const code = error instanceof AttachmentServiceError ? error.code : 'internal';
  const status = statusForAttachmentError(code);
  sendJson(response, status, { error: code });
}

function statusForImageBridgeError(
  code: ConstructorParameters<typeof PiImageBridgeError>[0],
): number {
  if (code === 'expired') return 410;
  if (code === 'ownership') return 401;
  if (code === 'revision-mismatch' || code === 'replayed') return 409;
  if (code === 'image-input-unavailable' || code === 'plan-invalid' || code === 'not-ready') {
    return 409;
  }
  if (code === 'invalid-reference') return 400;
  return 503;
}

function imageBridgeErrorCode(code: ConstructorParameters<typeof PiImageBridgeError>[0]): string {
  return code === 'rejected' ? 'pi_rejected' : code;
}

function statusForAttachmentError(code: string): number {
  switch (code) {
    case 'ownership':
    case 'invalid_binding':
      return 401;
    case 'rate_limited':
    case 'quarantine_full':
    case 'concurrency_limited':
      return 429;
    case 'body_too_large':
      return 413;
    case 'not_found':
      return 404;
    case 'expired':
    case 'cancelled':
      return 410;
    case 'unsupported':
    case 'mime_mismatch':
    case 'dimensions_exceeded':
    case 'channels_exceeded':
    case 'frames_exceeded':
    case 'animated':
      return 415;
    case 'decode_timeout':
      return 408;
    case 'invalid_content_length':
    case 'digest_mismatch':
    case 'invalid_manifest':
    case 'invalid_image':
    case 'output_too_large':
      return 400;
    default:
      return 503;
  }
}

async function handleExtensionAuthority(
  request: IncomingMessage,
  response: ServerResponse,
  options: ReadOnlyServerOptions,
  auth: AuthService,
): Promise<void> {
  const authority = options.extensionAuthority;
  const path = ingressPath(request);
  if (
    request.method !== 'POST' ||
    authority === undefined ||
    !matchesSecret(singleHeader(request.headers.authorization), authority.secret)
  ) {
    discardRequest(request);
    sendJson(response, 401, { error: 'unauthorized' });
    return;
  }
  if (isInboundPublishRoute(path)) {
    await handleInboundPublishRoute(request, response, options, auth, authority);
    return;
  }
  if (options.approvals === undefined) {
    discardRequest(request);
    sendJson(response, 404, { error: 'not_found' });
    return;
  }
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

async function handleInboundPublishRoute(
  request: IncomingMessage,
  response: ServerResponse,
  options: ReadOnlyServerOptions,
  auth: AuthService,
  authority: NonNullable<ReadOnlyServerOptions['extensionAuthority']>,
): Promise<void> {
  if (singleHeader(request.headers.origin) !== null) {
    discardRequest(request);
    sendJson(response, 403, { error: 'browser_origin_rejected' });
    return;
  }
  if (request.method !== 'POST') {
    discardRequest(request);
    sendJson(response, 405, { error: 'method_not_allowed' });
    return;
  }
  const path = ingressPath(request);
  if (path === '/api/extension/artifacts/publish-ticket') {
    let body: unknown;
    try {
      body = await readJsonBody(request);
    } catch {
      discardRequest(request);
      sendJson(response, 400, { error: 'invalid_ticket_request' });
      return;
    }
    const parsed = parseArtifactPublishTicketRequest(body);
    if (
      parsed === null ||
      parsed.binding.sessionId !== authority.sessionId ||
      (authority.hostExtension !== undefined && parsed.binding.hostExtension !== authority.hostExtension) ||
      (authority.runId !== undefined && parsed.binding.runId !== authority.runId)
    ) {
      sendJson(response, 403, { error: 'invalid_ticket_request' });
      return;
    }
    try {
      sendJson(
        response,
        201,
        auth.issueArtifactPublishTicketForExtension(
          authority.principal,
          parsed.binding.hostExtension,
          authority.sessionId,
          parsed.binding,
        ),
      );
    } catch {
      sendJson(response, 403, { error: 'invalid_ticket_request' });
    }
    return;
  }

  const ticketId = inboundPublishTicketFromRequest(request);
  const hostExtension = inboundHostExtensionFromRequest(request) ?? authority.hostExtension;
  const consumed =
    ticketId === null
      ? null
      : auth.consumeArtifactPublishTicket(ticketId, {
          origin: 'extension',
          principal: authority.principal,
          ...(hostExtension === undefined ? {} : { hostExtension }),
        });
  if (consumed === null) {
    discardRequest(request);
    sendJson(response, 401, { error: 'unauthorized' });
    return;
  }
  const contentLength = exactContentLength(request);
  const digest = inboundDigestFromRequest(request);
  const mediaFamily = inboundMediaFamilyFromRequest(request);
  if (
    contentLength === null ||
    contentLength !== consumed.binding.declaredByteLength ||
    digest === null ||
    mediaFamily === 'invalid' ||
    (mediaFamily !== null && mediaFamily !== consumed.binding.declaredMediaFamily)
  ) {
    discardRequest(request);
    sendJson(response, 400, { error: 'invalid_publish_headers' });
    return;
  }
  const deadline = setTimeout(() => request.destroy(), 60_000);
  deadline.unref?.();
  try {
    const result = await options.store.publishInboundImage({
      identity: {
        hostId: options.hostId,
        workspaceRef: options.workspaceRef,
        sessionId: consumed.binding.sessionId,
      },
      epoch: authority.epoch,
      expectedTranscriptRevision: consumed.binding.expectedTranscriptRevision,
      blockId: consumed.binding.blockId,
      submissionId: consumed.binding.submissionId,
      runId: consumed.binding.runId,
      turnId: consumed.binding.turnId,
      mediaClass: consumed.binding.declaredMediaFamily,
      source: 'extension',
      ownerPrincipal: consumed.principal,
      ownerDeviceId: authority.deviceId ?? 'extension',
      declaredByteLength: contentLength,
      expectedDigest: digest,
      ...(singleHeader(request.headers['content-type']) === null
        ? {}
        : { claimedMediaType: singleHeader(request.headers['content-type']) as string }),
      body: request,
      ...(options.inboundScanner === undefined ? {} : { scanner: options.inboundScanner }),
      publish: (candidate) => options.syncHub.publish(candidate),
    });
    if (result.status === 'conflict') {
      sendJson(response, 409, { error: 'publish_conflict' });
    } else {
      sendJson(response, 201, { status: result.status, block: result.block });
    }
  } catch {
    sendJson(response, 503, { error: 'publish_unavailable' });
  } finally {
    clearTimeout(deadline);
  }
}

function parseArtifactPublishTicketRequest(
  value: unknown,
): { readonly binding: ArtifactPublishTicketBinding } | null {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 2 ||
    value.action !== 'artifact:publish' ||
    !isArtifactPublishBinding(value.binding)
  ) {
    return null;
  }
  return { binding: value.binding };
}

function isArtifactPublishBinding(value: unknown): value is ArtifactPublishTicketBinding {
  if (!isRecord(value)) return false;
  const allowed = new Set([
    'hostExtension',
    'sessionId',
    'runId',
    'turnId',
    'blockId',
    'submissionId',
    'expectedTranscriptRevision',
    'declaredByteLength',
    'declaredMediaFamily',
    'principal',
  ]);
  if (Object.keys(value).some((key) => !allowed.has(key))) return false;
  return (
    isOpaqueId(value.hostExtension) &&
    isOpaqueId(value.sessionId) &&
    isOpaqueId(value.runId) &&
    isOpaqueId(value.turnId) &&
    isOpaqueId(value.blockId) &&
    isOpaqueId(value.submissionId) &&
    isSafeNonNegativeInteger(value.expectedTranscriptRevision) &&
    typeof value.declaredByteLength === 'number' &&
    Number.isSafeInteger(value.declaredByteLength) &&
    value.declaredByteLength > 0 &&
    value.declaredByteLength <= 15 * 1024 * 1024 &&
    isInboundMediaClassValue(value.declaredMediaFamily) &&
    (value.principal === undefined || safePrincipal(value.principal))
  );
}

function isInboundMediaClassValue(value: unknown): value is 'screenshot' | 'raster' | 'generated' {
  return value === 'screenshot' || value === 'raster' || value === 'generated';
}

function inboundPublishTicketFromRequest(request: IncomingMessage): string | null {
  const explicit =
    singleHeader(request.headers['x-artifact-publish-ticket']) ??
    singleHeader(request.headers['x-pi-artifact-publish-ticket']);
  if (explicit !== null && isOpaqueId(explicit)) return explicit;
  const authorization = singleHeader(request.headers.authorization);
  for (const prefix of ['ArtifactPublishTicket ', 'PublishTicket ']) {
    if (authorization?.startsWith(prefix)) {
      const token = authorization.slice(prefix.length);
      return isOpaqueId(token) ? token : null;
    }
  }
  return null;
}

function inboundHostExtensionFromRequest(request: IncomingMessage): string | null {
  return (
    singleHeader(request.headers['x-pi-host-extension']) ??
    singleHeader(request.headers['x-host-extension'])
  );
}

function inboundMediaFamilyFromRequest(
  request: IncomingMessage,
): 'screenshot' | 'raster' | 'generated' | 'invalid' | null {
  const value = singleHeader(request.headers['x-pi-media-family']);
  return value !== null && isInboundMediaClassValue(value) ? value : value === null ? null : 'invalid';
}

function inboundDigestFromRequest(request: IncomingMessage): string | null {
  const direct =
    singleHeader(request.headers['x-artifact-sha256']) ??
    singleHeader(request.headers['x-pi-artifact-digest']) ??
    singleHeader(request.headers['x-content-sha256']);
  if (direct !== null && (/^[a-f0-9]{64}$/u.test(direct) || /^[A-Za-z0-9_-]{43}$/u.test(direct))) {
    return direct;
  }
  const digestHeader = singleHeader(request.headers.digest);
  const match = digestHeader === null ? null : /^sha-256=([A-Za-z0-9_-]{43}|[a-f0-9]{64})$/u.exec(digestHeader);
  return match?.[1] ?? null;
}

function safePrincipal(value: unknown): value is string {
  // Ingress principals reject C0 controls before entering the auth boundary.
  // eslint-disable-next-line no-control-regex
  return typeof value === 'string' && value.length > 0 && value.length <= 320 && !/[\u0000-\u001f]/u.test(value);
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

function actionForRequest(path: string, mediaEnabled = false): string | null {
  if (isAttachmentRoute(path)) {
    if (!mediaEnabled) return null;
    if (path === '/api/attachment-sets') return 'attachment:reserve';
    if (/^\/api\/attachment-sets\/[^/]+\/parts\/[^/]+$/.test(path)) {
      return 'attachment:upload';
    }
    if (/^\/api\/attachment-sets\/[^/]+\/status$/.test(path)) {
      return 'attachment:status';
    }
    if (/^\/api\/attachment-sets\/[^/]+\/cancel$/.test(path)) {
      return 'attachment:cancel';
    }
    return null;
  }
  if (path === '/health') return 'health:read';
  if (path === '/api/sessions') return 'sessions:list';
  if (path === '/api/attention' || path === '/api/attention/open') return 'attention:read';
  if (path.startsWith('/api/push/')) return 'push:manage';
  if (/^\/api\/sessions\/[^/]+\/transcript$/.test(path)) return 'transcript:read';
  if (path === '/api/artifacts/read') return 'artifact:read';
  if (/^\/api\/sessions\/[^/]+\/artifacts\/[^/]+\/revisions\/[^/]+$/.test(path)) {
    return 'artifact:read';
  }
  if (path === '/api/auth/ticket') return 'ticket:create';
  if (path === '/api/auth/logout') return 'session:revoke';
  if (path === '/api/auth/revoke-device') return 'device:revoke';
  if (path === '/api/approvals') return 'approvals:list';
  if (path === '/api/approval/decide') return 'approval:decide';
  if (path === '/api/prompt/submit') return 'prompt:submit';
  if (path === '/api/prompt/abort') return 'prompt:abort';
  if (
    path === '/api/ask-question/display' ||
    path === '/api/ask-question/ticket' ||
    path === '/api/ask-question/answer'
  ) {
    return 'ask-question.answer';
  }
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
  if (path === '/api/plan/control') return 'plan:control';
  if (path === '/api/plan/binding') return 'plan:control';
  if (path === '/api/commands/list') return 'commands:list';
  return null;
}

function statusForAskQuestionReason(reason: string | undefined): number {
  if (reason === 'invalid-ticket') {
    return 401;
  }
  if (reason === 'revision-mismatch' || reason === 'question-withdrawn' || reason === 'question-already-answered') {
    return 409;
  }
  if (reason === 'plan-mode-blocked' || reason === 'redaction-policy-blocked') return 403;
  if (reason === 'delivery-unknown' || reason === 'host-unavailable') return 503;
  return 422;
}

function isAttachmentRoute(path: string): boolean {
  return (
    path === '/api/attachment-sets' ||
    /^\/api\/attachment-sets\/[^/]+\/parts\/[^/]+$/.test(path) ||
    /^\/api\/attachment-sets\/[^/]+\/status$/.test(path) ||
    /^\/api\/attachment-sets\/[^/]+\/cancel$/.test(path)
  );
}

function isInboundPublishRoute(path: string): boolean {
  return (
    path === '/api/extension/artifacts/publish-ticket' ||
    path === '/api/extension/artifacts/publish'
  );
}

function parseAttachmentRoute(path: string): AttachmentRoute | null {
  if (path === '/api/attachment-sets') return { operation: 'reserve' };
  const upload = /^\/api\/attachment-sets\/([^/]+)\/parts\/([^/]+)$/u.exec(path);
  if (upload !== null && isOpaqueId(upload[1]) && isOpaqueId(upload[2])) {
    return { operation: 'upload', setId: upload[1], partId: upload[2] };
  }
  const status = /^\/api\/attachment-sets\/([^/]+)\/status$/u.exec(path);
  if (status !== null && isOpaqueId(status[1])) {
    return { operation: 'status', setId: status[1] };
  }
  const cancel = /^\/api\/attachment-sets\/([^/]+)\/cancel$/u.exec(path);
  if (cancel !== null && isOpaqueId(cancel[1])) {
    return { operation: 'cancel', setId: cancel[1] };
  }
  return null;
}

function statusForControlOutcome(result: RuntimeControlResponse | PlanControlResponse): number {
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

interface ArtifactRoute {
  readonly sessionId: string;
  readonly artifactId: string;
  readonly revision: string;
}

function parseArtifactRoute(path: string): ArtifactRoute | null {
  const match = /^\/api\/sessions\/([^/]+)\/artifacts\/([^/]+)\/revisions\/([^/]+)$/.exec(path);
  if (match === null) return null;
  try {
    const sessionId = decodeURIComponent(match[1] ?? '');
    const artifactId = decodeURIComponent(match[2] ?? '');
    const revision = decodeURIComponent(match[3] ?? '');
    if (!isOpaqueId(sessionId) || !isOpaqueId(artifactId) || !isArtifactRevision(revision)) {
      return null;
    }
    return { sessionId, artifactId, revision };
  } catch {
    return null;
  }
}

function parseInboundArtifactReadRequest(value: unknown): InboundArtifactReadRequest | null {
  if (!isRecord(value)) return null;
  const fields = ['sessionId', 'artifactId', 'revision', 'variant'];
  if (
    Object.keys(value).length !== fields.length ||
    Object.keys(value).some((key) => !fields.includes(key))
  ) {
    return null;
  }
  if (
    !isInboundReadToken(value.sessionId) ||
    !isInboundReadToken(value.artifactId) ||
    !isInboundReadToken(value.revision) ||
    (value.variant !== 'thumbnail' && value.variant !== 'full')
  ) {
    return null;
  }
  return {
    sessionId: value.sessionId,
    artifactId: value.artifactId,
    revision: value.revision,
    variant: value.variant,
  };
}

function isInboundReadToken(value: unknown): value is string {
  return isOpaqueId(value) && value !== 'latest' && !/[/:\\]/u.test(value);
}

function isSessionMember(catalog: SessionCatalog, sessionId: string): boolean {
  return catalog.list().some((session) => session.id === sessionId);
}

function isJsonContentType(value: string | null): boolean {
  return value?.split(';', 1)[0]?.trim().toLowerCase() === 'application/json';
}

function contentDigestHeader(digest: string): string {
  return `sha-256=:${Buffer.from(digest, 'hex').toString('base64')}:`;
}

function previewFilename(mediaType: 'image/png' | 'image/jpeg'): string {
  return mediaType === 'image/jpeg' ? 'pi-preview.jpg' : 'pi-preview.png';
}

function parseArtifactRange(
  value: string,
): { readonly start: number; readonly end: number } | null {
  const match = /^bytes=(\d+)-(\d*)$/u.exec(value.trim());
  if (match === null) return null;
  const start = Number(match[1]);
  const endText = match[2] ?? '';
  const end = endText.length === 0 ? Number.MAX_SAFE_INTEGER : Number(endText);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start) {
    return null;
  }
  return { start, end };
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

function retryAfterHeaders(retryAfterSeconds: number): Readonly<Record<string, string>> {
  return { 'retry-after': String(Math.max(1, retryAfterSeconds)) };
}

function sendArtifactFailure(
  response: ServerResponse,
  statusCode: number,
  retryAfterSeconds?: number,
): void {
  sendJson(
    response,
    statusCode,
    { error: 'artifact_unavailable' },
    {
      'cross-origin-resource-policy': 'same-origin',
      ...(retryAfterSeconds === undefined ? {} : retryAfterHeaders(retryAfterSeconds)),
    },
  );
}

function sendInboundArtifactReadFailure(
  response: ServerResponse,
  statusCode: number,
  retryAfterSeconds?: number,
): void {
  sendJson(
    response,
    statusCode,
    { error: statusCode === 429 ? 'rate_limited' : 'artifact_unavailable' },
    retryAfterSeconds === undefined ? {} : retryAfterHeaders(retryAfterSeconds),
  );
}

function rejectUpgrade(
  socket: NodeJS.WritableStream & { destroy: () => void },
  status: number,
  retryAfterSeconds?: number,
): void {
  const reason =
    status === 401
      ? 'Unauthorized'
      : status === 429
        ? 'Too Many Requests'
        : status === 404
          ? 'Not Found'
          : 'Forbidden';
  const retryAfterHeader =
    retryAfterSeconds === undefined
      ? ''
      : `retry-after: ${retryAfterHeaders(retryAfterSeconds)['retry-after']}\r\n`;
  socket.write(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\n${retryAfterHeader}\r\n`);
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

function hasBody(request: IncomingMessage): boolean {
  const contentLength = singleHeader(request.headers['content-length']);
  if (contentLength !== null) return contentLength !== '0';
  return request.headers['transfer-encoding'] !== undefined;
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

function isSafeNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isArtifactRevision(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value !== 'latest' &&
    value !== '.' &&
    value !== '..' &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(value)
  );
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
