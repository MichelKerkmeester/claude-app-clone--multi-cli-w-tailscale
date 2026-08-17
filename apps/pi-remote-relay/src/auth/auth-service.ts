// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Application Session Service
// ───────────────────────────────────────────────────────────────────

import { randomBytes } from 'node:crypto';

import {
  sessionProof,
  type EnrollmentRequest,
  type EnrollmentResponse,
  type SessionChallengeResponse,
  type RuntimeControlCommand,
  type RuntimeModelTicketRequest,
  type RuntimeModelTicketResponse,
  type WebSocketTicketResponse,
  type InboundImageMediaClass,
} from '@pi-remote/pi-rpc-protocol';

import { EnrollmentRegistry, verifyDeviceSignature } from './enrollment.js';
import {
  authorizeAction,
  isAttachmentAction,
  type AttachmentAction,
  type AuthorizedAction,
} from './policy.js';
import {
  attachmentTicketBindingsEqual,
  isAttachmentTicketBinding,
  type AttachmentTicketBinding,
  type AttachmentTicketDto,
} from '../attachments/attachment-types.js';

const DEFAULT_SESSION_TTL_MS = 15 * 60_000;
const DEFAULT_TICKET_TTL_MS = 20_000;
const DEFAULT_RUNTIME_TICKET_TTL_MS = 10_000;
const DEFAULT_CHALLENGE_TTL_MS = 60_000;
const DEFAULT_ARTIFACT_PUBLISH_TICKET_TTL_MS = 90_000;
const MAX_ARTIFACT_PUBLISH_BYTES = 15 * 1024 * 1024;

interface PendingSessionChallenge extends SessionChallengeResponse {
  readonly deviceId: string;
  readonly principal: string;
  readonly origin: string;
  consumed: boolean;
}

export interface ApplicationSession {
  readonly token: string;
  readonly deviceId: string;
  readonly principal: string;
  readonly origin: string;
  readonly expiresAt: string;
  revoked: boolean;
}

interface WebSocketTicket extends WebSocketTicketResponse {
  readonly sessionToken: string;
  readonly deviceId: string;
  readonly principal: string;
  readonly origin: string;
  consumed: boolean;
}

interface RuntimeModelTicket extends RuntimeModelTicketResponse {
  readonly sessionToken: string;
  readonly deviceId: string;
  readonly principal: string;
  readonly origin: string;
  readonly action: 'runtime:control';
  readonly binding: RuntimeModelTicketRequest;
  consumed: boolean;
}

interface AttachmentTicket extends AttachmentTicketDto {
  readonly sessionToken: string;
  readonly deviceId: string;
  readonly principal: string;
  readonly origin: string;
  readonly action: AttachmentAction;
  readonly binding: AttachmentTicketBinding;
  consumed: boolean;
}

export interface ArtifactPublishTicketBinding {
  readonly hostExtension: string;
  readonly sessionId: string;
  readonly runId: string;
  readonly turnId: string;
  readonly blockId: string;
  readonly submissionId: string;
  readonly expectedTranscriptRevision: number;
  readonly declaredByteLength: number;
  readonly declaredMediaFamily: InboundImageMediaClass;
  readonly principal?: string;
}

export interface ArtifactPublishTicketDto {
  readonly ticket: string;
  readonly expiresAt: string;
  readonly startDeadline: string;
}

interface ArtifactPublishTicket extends ArtifactPublishTicketDto {
  readonly sessionToken: string | null;
  readonly deviceId: string | null;
  readonly principal: string;
  readonly origin: string;
  readonly binding: ArtifactPublishTicketBinding;
  readonly extensionOnly: boolean;
  consumed: boolean;
}

export interface ConsumedArtifactPublishTicket {
  readonly session: ApplicationSession | null;
  readonly binding: ArtifactPublishTicketBinding;
  readonly principal: string;
  readonly extensionOnly: boolean;
}

export interface ArtifactPublishTicketConsumeRequest {
  readonly origin?: string;
  readonly principal: string;
  readonly hostExtension?: string;
  readonly expectedBinding?: ArtifactPublishTicketBinding;
  readonly session?: ApplicationSession;
}

export interface ConsumedAttachmentTicket {
  readonly session: ApplicationSession;
  readonly binding: AttachmentTicketBinding;
}

export interface AuthMetrics {
  bootstrap: number;
  sessionsCreated: number;
  ticketsIssued: number;
  ticketsConsumed: number;
  connectionsAccepted: number;
  policyDenied: number;
  rateLimited: number;
  revocations: number;
}

export interface AuthServiceOptions {
  readonly origin: string;
  readonly hostId: string;
  readonly now?: () => number;
  readonly enrollmentTtlMs?: number;
  readonly sessionChallengeTtlMs?: number;
  readonly sessionTtlMs?: number;
  readonly ticketTtlMs?: number;
  readonly runtimeTicketTtlMs?: number;
  readonly attachmentTicketTtlMs?: number;
  readonly artifactPublishTicketTtlMs?: number;
}

/** Coordinate device proof, short sessions, one-use tickets and revocation. */
export class AuthService {
  private readonly now: () => number;
  private readonly sessionChallengeTtlMs: number;
  private readonly sessionTtlMs: number;
  private readonly ticketTtlMs: number;
  private readonly runtimeTicketTtlMs: number;
  private readonly attachmentTicketTtlMs: number;
  private readonly artifactPublishTicketTtlMs: number;
  private readonly sessionChallenges = new Map<string, PendingSessionChallenge>();
  private readonly sessions = new Map<string, ApplicationSession>();
  private readonly tickets = new Map<string, WebSocketTicket>();
  private readonly runtimeTickets = new Map<string, RuntimeModelTicket>();
  private readonly attachmentTickets = new Map<string, AttachmentTicket>();
  private readonly artifactPublishTickets = new Map<string, ArtifactPublishTicket>();
  private readonly revocationListeners = new Set<
    (deviceId: string, sessionToken?: string) => void
  >();
  public readonly enrollment: EnrollmentRegistry;
  public readonly metrics: AuthMetrics = {
    bootstrap: 0,
    sessionsCreated: 0,
    ticketsIssued: 0,
    ticketsConsumed: 0,
    connectionsAccepted: 0,
    policyDenied: 0,
    rateLimited: 0,
    revocations: 0,
  };

  public constructor(private readonly options: AuthServiceOptions) {
    this.now = options.now ?? Date.now;
    this.sessionChallengeTtlMs = options.sessionChallengeTtlMs ?? DEFAULT_CHALLENGE_TTL_MS;
    this.sessionTtlMs = options.sessionTtlMs ?? DEFAULT_SESSION_TTL_MS;
    this.ticketTtlMs = options.ticketTtlMs ?? DEFAULT_TICKET_TTL_MS;
    this.runtimeTicketTtlMs = options.runtimeTicketTtlMs ?? DEFAULT_RUNTIME_TICKET_TTL_MS;
    this.attachmentTicketTtlMs = options.attachmentTicketTtlMs ?? 90_000;
    this.artifactPublishTicketTtlMs = Math.min(
      Math.max(options.artifactPublishTicketTtlMs ?? DEFAULT_ARTIFACT_PUBLISH_TICKET_TTL_MS, 1),
      DEFAULT_ARTIFACT_PUBLISH_TICKET_TTL_MS,
    );
    this.enrollment = new EnrollmentRegistry({
      origin: options.origin,
      hostId: options.hostId,
      now: this.now,
      ...(options.enrollmentTtlMs === undefined ? {} : { challengeTtlMs: options.enrollmentTtlMs }),
    });
  }

  public enroll(
    request: EnrollmentRequest,
    origin: string,
    principal: string,
  ): EnrollmentResponse | null {
    if (origin !== this.options.origin) return null;
    const device = this.enrollment.enroll(request, principal);
    if (device === null) return null;
    this.metrics.bootstrap += 1;
    return { deviceId: device.id, hostFingerprint: this.enrollment.hostFingerprint };
  }

  public createSessionChallenge(
    deviceId: string,
    origin: string,
    principal: string,
  ): SessionChallengeResponse | null {
    this.prune();
    const device = this.enrollment.getActiveDevice(deviceId);
    if (device === null || device.origin !== origin || device.principal !== principal) return null;
    const challenge: PendingSessionChallenge = {
      challengeId: opaqueId('proof'),
      challenge: opaqueId('challenge'),
      expiresAt: new Date(this.now() + this.sessionChallengeTtlMs).toISOString(),
      deviceId,
      principal,
      origin,
      consumed: false,
    };
    this.sessionChallenges.set(challenge.challengeId, challenge);
    return publicChallenge(challenge);
  }

  public createSession(
    deviceId: string,
    challengeId: string,
    signature: string,
    origin: string,
    principal: string,
  ): ApplicationSession | null {
    this.prune();
    const device = this.enrollment.getActiveDevice(deviceId);
    const challenge = this.sessionChallenges.get(challengeId);
    if (
      device === null ||
      challenge === undefined ||
      challenge.consumed ||
      challenge.deviceId !== deviceId ||
      challenge.origin !== origin ||
      challenge.principal !== principal ||
      device.origin !== origin ||
      device.principal !== principal ||
      Date.parse(challenge.expiresAt) <= this.now() ||
      !verifyDeviceSignature(
        device.publicKey,
        sessionProof(origin, deviceId, publicChallenge(challenge)),
        signature,
      )
    ) {
      return null;
    }
    challenge.consumed = true;
    this.sessionChallenges.delete(challengeId);
    const session: ApplicationSession = {
      token: opaqueId('session'),
      deviceId,
      principal,
      origin,
      expiresAt: new Date(this.now() + this.sessionTtlMs).toISOString(),
      revoked: false,
    };
    this.sessions.set(session.token, session);
    this.metrics.sessionsCreated += 1;
    return session;
  }

  public authenticate(
    token: string | null,
    origin: string,
    principal: string,
    action: string,
  ): ApplicationSession | null {
    this.prune();
    if (!authorizeAction(action)) {
      this.metrics.policyDenied += 1;
      return null;
    }
    const session = token === null ? undefined : this.sessions.get(token);
    if (
      session === undefined ||
      session.revoked ||
      Date.parse(session.expiresAt) <= this.now() ||
      session.origin !== origin ||
      session.principal !== principal ||
      this.enrollment.getActiveDevice(session.deviceId) === null
    ) {
      return null;
    }
    return session;
  }

  public issueTicket(session: ApplicationSession): WebSocketTicketResponse {
    this.prune();
    const ticket: WebSocketTicket = {
      ticket: opaqueId('ticket'),
      expiresAt: new Date(this.now() + this.ticketTtlMs).toISOString(),
      sessionToken: session.token,
      deviceId: session.deviceId,
      principal: session.principal,
      origin: session.origin,
      consumed: false,
    };
    this.tickets.set(ticket.ticket, ticket);
    this.metrics.ticketsIssued += 1;
    return { ticket: ticket.ticket, expiresAt: ticket.expiresAt };
  }

  public consumeTicket(
    ticketId: string,
    origin: string,
    principal: string,
    action: AuthorizedAction = 'sync:read',
  ): ApplicationSession | null {
    this.prune();
    if (isAttachmentAction(action)) return null;
    const ticket = this.tickets.get(ticketId);
    if (
      ticket === undefined ||
      ticket.consumed ||
      Date.parse(ticket.expiresAt) <= this.now() ||
      ticket.origin !== origin ||
      ticket.principal !== principal
    ) {
      return null;
    }
    const session = this.authenticate(ticket.sessionToken, origin, principal, action);
    if (session === null || session.deviceId !== ticket.deviceId) return null;
    ticket.consumed = true;
    this.tickets.delete(ticketId);
    this.metrics.ticketsConsumed += 1;
    return session;
  }

  /** Issue a ticket whose operation and all client-visible bindings are immutable. */
  public issueAttachmentTicket(
    session: ApplicationSession,
    binding: AttachmentTicketBinding,
  ): AttachmentTicketDto {
    this.prune();
    if (!isAttachmentTicketBinding(binding)) {
      throw new Error('Invalid attachment ticket binding.');
    }
    const ticket: AttachmentTicket = {
      ticket: opaqueId('attachment_ticket'),
      expiresAt: new Date(this.now() + this.attachmentTicketTtlMs).toISOString(),
      sessionToken: session.token,
      deviceId: session.deviceId,
      principal: session.principal,
      origin: session.origin,
      action: attachmentAction(binding.operation),
      binding,
      consumed: false,
    };
    this.attachmentTickets.set(ticket.ticket, ticket);
    this.metrics.ticketsIssued += 1;
    return { ticket: ticket.ticket, expiresAt: ticket.expiresAt };
  }

  /** Consume attachment authority before the caller reads any request body. */
  public consumeAttachmentTicket(
    ticketId: string,
    origin: string,
    principal: string,
    action: AttachmentAction,
    expectedBinding?: AttachmentTicketBinding,
  ): ConsumedAttachmentTicket | null {
    this.prune();
    const ticket = this.attachmentTickets.get(ticketId);
    if (
      ticket === undefined ||
      ticket.consumed ||
      Date.parse(ticket.expiresAt) <= this.now() ||
      ticket.origin !== origin ||
      ticket.principal !== principal
    ) {
      return null;
    }
    const session = this.authenticate(ticket.sessionToken, origin, principal, action);
    if (session === null || session.deviceId !== ticket.deviceId || ticket.action !== action) {
      return null;
    }
    ticket.consumed = true;
    this.attachmentTickets.delete(ticketId);
    this.metrics.ticketsConsumed += 1;
    if (
      expectedBinding !== undefined &&
      !attachmentTicketBindingsEqual(ticket.binding, expectedBinding)
    ) {
      return null;
    }
    return { session, binding: ticket.binding };
  }

  /** Issue extension-scoped publication authority with the exact ingest context. */
  public issueArtifactPublishTicket(
    session: ApplicationSession,
    binding: ArtifactPublishTicketBinding,
  ): ArtifactPublishTicketDto {
    this.prune();
    if (!isArtifactPublishTicketBinding(binding) ||
      (binding.principal !== undefined && binding.principal !== session.principal)) {
      throw new Error('Invalid artifact publication binding.');
    }
    return this.storeArtifactPublishTicket({
      sessionToken: session.token,
      deviceId: session.deviceId,
      principal: session.principal,
      origin: session.origin,
      binding: { ...binding, principal: session.principal },
      extensionOnly: false,
    });
  }

  /** Issue publication authority for an authenticated host extension without a browser session. */
  public issueArtifactPublishTicketForExtension(
    principal: string,
    hostExtension: string,
    sessionId: string,
    binding: ArtifactPublishTicketBinding,
  ): ArtifactPublishTicketDto {
    this.prune();
    if (
      !isArtifactPublishTicketBinding(binding) ||
      binding.hostExtension !== hostExtension ||
      binding.sessionId !== sessionId ||
      (binding.principal !== undefined && binding.principal !== principal)
    ) {
      throw new Error('Invalid artifact publication binding.');
    }
    return this.storeArtifactPublishTicket({
      sessionToken: null,
      deviceId: null,
      principal,
      origin: 'extension',
      binding: { ...binding, principal },
      extensionOnly: true,
    });
  }

  private storeArtifactPublishTicket(input: {
    readonly sessionToken: string | null;
    readonly deviceId: string | null;
    readonly principal: string;
    readonly origin: string;
    readonly binding: ArtifactPublishTicketBinding;
    readonly extensionOnly: boolean;
  }): ArtifactPublishTicketDto {
    if (!isSafePrincipal(input.principal)) throw new Error('Invalid artifact publisher principal.');
    const startDeadline = new Date(this.now() + this.artifactPublishTicketTtlMs).toISOString();
    const ticket: ArtifactPublishTicket = {
      ticket: opaqueId('artifact_publish_ticket'),
      expiresAt: startDeadline,
      startDeadline,
      sessionToken: input.sessionToken,
      deviceId: input.deviceId,
      principal: input.principal,
      origin: input.origin,
      binding: input.binding,
      extensionOnly: input.extensionOnly,
      consumed: false,
    };
    this.artifactPublishTickets.set(ticket.ticket, ticket);
    this.metrics.ticketsIssued += 1;
    return {
      ticket: ticket.ticket,
      expiresAt: ticket.expiresAt,
      startDeadline: ticket.startDeadline,
    };
  }

  /** Consume publication authority before the binary request body is touched. */
  public consumeArtifactPublishTicket(
    ticketId: string,
    requestOrOrigin: ArtifactPublishTicketConsumeRequest | string,
    principal?: string,
    expectedBinding?: ArtifactPublishTicketBinding,
    hostExtension?: string,
  ): ConsumedArtifactPublishTicket | null {
    this.prune();
    const request: ArtifactPublishTicketConsumeRequest =
      typeof requestOrOrigin === 'string'
        ? {
            origin: requestOrOrigin,
            principal: principal ?? '',
            ...(hostExtension === undefined ? {} : { hostExtension }),
            ...(expectedBinding === undefined ? {} : { expectedBinding }),
          }
        : requestOrOrigin;
    const ticket = this.artifactPublishTickets.get(ticketId);
    if (
      ticket === undefined ||
      ticket.consumed ||
      Date.parse(ticket.expiresAt) <= this.now() ||
      ticket.principal !== request.principal ||
      (request.hostExtension !== undefined && ticket.binding.hostExtension !== request.hostExtension)
    ) {
      return null;
    }
    let session: ApplicationSession | null = null;
    if (ticket.extensionOnly) {
      if (request.origin !== undefined && request.origin !== 'extension') return null;
    } else {
      if (request.origin === undefined) return null;
      session = this.authenticate(
        request.session?.token ?? ticket.sessionToken,
        request.origin,
        request.principal,
        'artifact:publish',
      );
      if (
        session === null ||
        session.deviceId !== ticket.deviceId ||
        session.token !== ticket.sessionToken
      ) {
        return null;
      }
    }
    ticket.consumed = true;
    this.artifactPublishTickets.delete(ticketId);
    this.metrics.ticketsConsumed += 1;
    if (
      request.expectedBinding !== undefined &&
      !artifactPublishTicketBindingsEqual(ticket.binding, request.expectedBinding)
    ) {
      return null;
    }
    return {
      session,
      binding: ticket.binding,
      principal: ticket.principal,
      extensionOnly: ticket.extensionOnly,
    };
  }

  public issueRuntimeModelTicket(
    session: ApplicationSession,
    binding: RuntimeModelTicketRequest,
  ): RuntimeModelTicketResponse {
    this.prune();
    const ticket: RuntimeModelTicket = {
      ticket: opaqueId('runtime_ticket'),
      expiresAt: new Date(this.now() + this.runtimeTicketTtlMs).toISOString(),
      sessionToken: session.token,
      deviceId: session.deviceId,
      principal: session.principal,
      origin: session.origin,
      action: 'runtime:control',
      binding: {
        sessionId: binding.sessionId,
        expectedRevision: binding.expectedRevision,
        expectedCatalogRevision: binding.expectedCatalogRevision,
        operation: {
          type: 'set_model',
          provider: binding.operation.provider,
          modelId: binding.operation.modelId,
        },
      },
      consumed: false,
    };
    this.runtimeTickets.set(ticket.ticket, ticket);
    this.metrics.ticketsIssued += 1;
    return { ticket: ticket.ticket, expiresAt: ticket.expiresAt };
  }

  public consumeRuntimeModelTicket(
    ticketId: string,
    session: ApplicationSession,
    command: RuntimeControlCommand,
  ): boolean {
    this.prune();
    const ticket = this.runtimeTickets.get(ticketId);
    if (
      ticket === undefined ||
      ticket.consumed ||
      Date.parse(ticket.expiresAt) <= this.now() ||
      ticket.sessionToken !== session.token ||
      ticket.deviceId !== session.deviceId ||
      ticket.origin !== session.origin ||
      ticket.principal !== session.principal ||
      ticket.action !== 'runtime:control'
    ) {
      return false;
    }
    ticket.consumed = true;
    this.runtimeTickets.delete(ticketId);
    this.metrics.ticketsConsumed += 1;
    return (
      command.operation.type === 'set_model' &&
      command.sessionId === ticket.binding.sessionId &&
      command.expectedRevision === ticket.binding.expectedRevision &&
      command.expectedCatalogRevision === ticket.binding.expectedCatalogRevision &&
      command.operation.provider === ticket.binding.operation.provider &&
      command.operation.modelId === ticket.binding.operation.modelId
    );
  }

  public revokeSession(sessionToken: string): boolean {
    const session = this.sessions.get(sessionToken);
    if (session === undefined || session.revoked) return false;
    session.revoked = true;
    this.invalidateTickets(session.deviceId, sessionToken);
    this.metrics.revocations += 1;
    this.emitRevocation(session.deviceId, sessionToken);
    return true;
  }

  public revokeDevice(deviceId: string): boolean {
    if (!this.enrollment.revoke(deviceId)) return false;
    for (const session of this.sessions.values()) {
      if (session.deviceId === deviceId) session.revoked = true;
    }
    for (const [id, challenge] of this.sessionChallenges) {
      if (challenge.deviceId === deviceId) this.sessionChallenges.delete(id);
    }
    this.invalidateTickets(deviceId);
    this.metrics.revocations += 1;
    this.emitRevocation(deviceId);
    return true;
  }

  public onRevocation(listener: (deviceId: string, sessionToken?: string) => void): () => void {
    this.revocationListeners.add(listener);
    return () => this.revocationListeners.delete(listener);
  }

  public isAllowed(action: AuthorizedAction): boolean {
    return authorizeAction(action);
  }

  private invalidateTickets(deviceId: string, sessionToken?: string): void {
    for (const [id, ticket] of this.tickets) {
      if (
        ticket.deviceId === deviceId &&
        (sessionToken === undefined || ticket.sessionToken === sessionToken)
      ) {
        this.tickets.delete(id);
      }
    }
    for (const [id, ticket] of this.runtimeTickets) {
      if (
        ticket.deviceId === deviceId &&
        (sessionToken === undefined || ticket.sessionToken === sessionToken)
      ) {
        this.runtimeTickets.delete(id);
      }
    }
    for (const [id, ticket] of this.attachmentTickets) {
      if (
        ticket.deviceId === deviceId &&
        (sessionToken === undefined || ticket.sessionToken === sessionToken)
      ) {
        this.attachmentTickets.delete(id);
      }
    }
    for (const [id, ticket] of this.artifactPublishTickets) {
      if (
        ticket.deviceId === deviceId &&
        (sessionToken === undefined || ticket.sessionToken === sessionToken)
      ) {
        this.artifactPublishTickets.delete(id);
      }
    }
  }

  private emitRevocation(deviceId: string, sessionToken?: string): void {
    for (const listener of this.revocationListeners) listener(deviceId, sessionToken);
  }

  private prune(): void {
    const now = this.now();
    for (const [id, challenge] of this.sessionChallenges) {
      if (challenge.consumed || Date.parse(challenge.expiresAt) <= now) {
        this.sessionChallenges.delete(id);
      }
    }
    for (const [id, ticket] of this.tickets) {
      if (ticket.consumed || Date.parse(ticket.expiresAt) <= now) this.tickets.delete(id);
    }
    for (const [id, ticket] of this.runtimeTickets) {
      if (ticket.consumed || Date.parse(ticket.expiresAt) <= now) this.runtimeTickets.delete(id);
    }
    for (const [id, ticket] of this.attachmentTickets) {
      if (ticket.consumed || Date.parse(ticket.expiresAt) <= now) {
        this.attachmentTickets.delete(id);
      }
    }
    for (const [id, ticket] of this.artifactPublishTickets) {
      if (ticket.consumed || Date.parse(ticket.expiresAt) <= now) {
        this.artifactPublishTickets.delete(id);
      }
    }
    for (const [id, session] of this.sessions) {
      if (session.revoked || Date.parse(session.expiresAt) <= now) this.sessions.delete(id);
    }
  }
}

function isArtifactPublishTicketBinding(
  value: unknown,
): value is ArtifactPublishTicketBinding {
  if (!isRecord(value)) return false;
  const keys = [
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
  ];
  if (Object.keys(value).some((key) => !keys.includes(key))) return false;
  if (
    !isOpaqueToken(value.hostExtension) ||
    !isOpaqueToken(value.sessionId) ||
    !isOpaqueToken(value.runId) ||
    !isOpaqueToken(value.turnId) ||
    !isOpaqueToken(value.blockId) ||
    !isOpaqueToken(value.submissionId) ||
    !isNonNegativeInteger(value.expectedTranscriptRevision) ||
    !isPositiveInteger(value.declaredByteLength) ||
    value.declaredByteLength > MAX_ARTIFACT_PUBLISH_BYTES ||
    (value.declaredMediaFamily !== 'screenshot' &&
      value.declaredMediaFamily !== 'raster' &&
      value.declaredMediaFamily !== 'generated')
  ) {
    return false;
  }
  return value.principal === undefined || isSafePrincipal(value.principal);
}

export function artifactPublishTicketBindingsEqual(
  left: ArtifactPublishTicketBinding,
  right: ArtifactPublishTicketBinding,
): boolean {
  return (
    left.hostExtension === right.hostExtension &&
    left.sessionId === right.sessionId &&
    left.runId === right.runId &&
    left.turnId === right.turnId &&
    left.blockId === right.blockId &&
    left.submissionId === right.submissionId &&
    left.expectedTranscriptRevision === right.expectedTranscriptRevision &&
    left.declaredByteLength === right.declaredByteLength &&
    left.declaredMediaFamily === right.declaredMediaFamily &&
    (left.principal === undefined ||
      right.principal === undefined ||
      left.principal === right.principal)
  );
}

function isOpaqueToken(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/u.test(value);
}

function isSafePrincipal(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 320 && !/[\u0000-\u001f]/u.test(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function attachmentAction(operation: AttachmentTicketBinding['operation']): AttachmentAction {
  return `attachment:${operation}` as AttachmentAction;
}

function publicChallenge(challenge: PendingSessionChallenge): SessionChallengeResponse {
  return {
    challengeId: challenge.challengeId,
    challenge: challenge.challenge,
    expiresAt: challenge.expiresAt,
  };
}

function opaqueId(prefix: string): string {
  return `${prefix}_${randomBytes(24).toString('base64url')}`;
}
