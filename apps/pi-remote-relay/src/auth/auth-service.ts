// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Application Session Service
// ───────────────────────────────────────────────────────────────────

import { randomBytes } from 'node:crypto';

import {
  sessionProof,
  type EnrollmentRequest,
  type EnrollmentResponse,
  type SessionChallengeResponse,
  type WebSocketTicketResponse,
} from '@pi-remote/pi-rpc-protocol';

import { EnrollmentRegistry, verifyDeviceSignature } from './enrollment.js';
import { authorizeAction, type AuthorizedAction } from './policy.js';

const DEFAULT_SESSION_TTL_MS = 15 * 60_000;
const DEFAULT_TICKET_TTL_MS = 20_000;
const DEFAULT_CHALLENGE_TTL_MS = 60_000;

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
}

/** Coordinate device proof, short sessions, one-use tickets and revocation. */
export class AuthService {
  private readonly now: () => number;
  private readonly sessionChallengeTtlMs: number;
  private readonly sessionTtlMs: number;
  private readonly ticketTtlMs: number;
  private readonly sessionChallenges = new Map<string, PendingSessionChallenge>();
  private readonly sessions = new Map<string, ApplicationSession>();
  private readonly tickets = new Map<string, WebSocketTicket>();
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
    for (const [id, session] of this.sessions) {
      if (session.revoked || Date.parse(session.expiresAt) <= now) this.sessions.delete(id);
    }
  }
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
