// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Approval Lease Service
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { createHash, randomBytes } from 'node:crypto';

import {
  approvalActionDigest,
  canonicalizeJson,
  type AcceptEditsGrantDto,
  type ApprovalAction,
  type ApprovalCardDto,
  type ApprovalDecisionCommand,
  type ApprovalDecisionResponse,
  type ApprovalRequestedPayload,
  type ApprovalResultPayload,
} from '@pi-remote/pi-rpc-protocol';
import Database from 'better-sqlite3';

import type { MutationPolicy } from '../policy/mutation-policy.js';
import type { SyncHub } from '../replay/sync.js';
import type { RelayStore } from '../store/relay-store.js';
import { redactJson } from '../store/redaction.js';
import { verifyFinalGate } from './final-gate.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface LeaseRow {
  readonly approvalId: string;
  readonly principalRef: string;
  readonly sessionId: string;
  readonly epoch: string;
  readonly tool: string;
  readonly digest: string;
  readonly policyVersion: number;
  readonly revision: number;
  readonly source: 'explicit' | 'accept-edits';
  readonly requestedAt: string;
  readonly expiresAt: string;
  readonly status: string;
  readonly decision: 'approve' | 'deny' | null;
  readonly decidedByDevice: string | null;
  readonly idempotencyKey: string | null;
  readonly settledAt: string | null;
  readonly reason: string | null;
}

interface GrantRow {
  readonly grantId: string;
  readonly principalRef: string;
  readonly sessionId: string;
  readonly epoch: string;
  readonly allowedToolsJson: string;
  readonly remainingActions: number;
  readonly expiresAt: string;
  readonly status: AcceptEditsGrantDto['status'];
}

interface InFlightExecution {
  readonly controller: AbortController;
  readonly sessionId: string;
  readonly epoch: string;
}

type GrantTerminalStatus = 'expired' | 'revoked' | 'restart-invalidated';

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const MAX_GRANT_ACTIONS = 10;
const MAX_GRANT_TTL_MS = 10 * 60_000;

export interface ApprovalIdentity {
  readonly hostId: string;
  readonly workspaceRef: string;
}

export interface ApprovalServiceOptions {
  readonly store: RelayStore;
  readonly syncHub: SyncHub;
  readonly policy: MutationPolicy;
  readonly identity: ApprovalIdentity;
  readonly policyVersion?: number;
  readonly now?: () => number;
  readonly defaultTtlMs?: number;
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/** Own one-decision approval state and one-shot execution authority. */
export class ApprovalService {
  private readonly database: Database.Database;
  private readonly now: () => number;
  private readonly defaultTtlMs: number;
  private readonly policyVersion: number;
  private readonly displayArguments = new Map<string, string>();
  private readonly inFlight = new Map<string, InFlightExecution>();
  private readonly revokedPrincipalRefs = new Set<string>();
  private readonly stopPolicyListener: () => void;

  public constructor(private readonly options: ApprovalServiceOptions) {
    this.database = options.store.databaseHandle();
    this.now = options.now ?? Date.now;
    this.defaultTtlMs = options.defaultTtlMs ?? 60_000;
    this.policyVersion = options.policyVersion ?? 1;
    this.reconcileRestart();
    this.stopPolicyListener = options.policy.onDisable((reason) => this.revokeAll(reason));
  }

  public request(
    input: Omit<ApprovalAction, 'policyVersion'> & { readonly ttlMs?: number },
  ): ApprovalCardDto {
    if (this.revokedPrincipalRefs.has(principalRef(input.principal))) {
      throw new Error('Mutation authority for this principal is revoked.');
    }
    if (!this.options.policy.isAllowed(input.tool)) {
      throw new Error('Mutation command family is disabled.');
    }
    return this.createLease(
      { ...input, policyVersion: this.policyVersion },
      'explicit',
      input.ttlMs,
    );
  }

  public decide(
    command: ApprovalDecisionCommand,
    deviceId: string,
    principal: string,
  ): ApprovalDecisionResponse {
    const now = this.now();
    const transaction = this.database.transaction((): ApprovalDecisionResponse => {
      const lease = this.getLease(command.approvalId);
      if (lease === null) return this.rejected(command, 'stale', 'approval-not-found', now);
      const repeated = this.findByIdempotency(command.idempotencyKey);
      if (repeated !== null)
        return {
          accepted: false,
          result: this.result(repeated, 'duplicate', 'idempotency-key-replayed', now),
        };
      const failure = this.decisionFailure(lease, command, principal, now);
      if (failure !== null) return { accepted: false, result: failure };
      const status = command.decision === 'approve' ? 'approved' : 'denied';
      const reason = command.decision === 'approve' ? 'operator-approved' : 'operator-denied';
      const changed = this.database
        .prepare(
          `
        UPDATE approval_leases
        SET status = ?, decision = ?, decided_by_device = ?, idempotency_key = ?,
            settled_at = ?, reason = ?, revision = revision + 1
        WHERE approval_id = ? AND status = 'pending' AND revision = ?
      `,
        )
        .run(
          status,
          command.decision,
          deviceId,
          command.idempotencyKey,
          new Date(now).toISOString(),
          reason,
          lease.approvalId,
          command.revision,
        );
      if (changed.changes !== 1) {
        return { accepted: false, result: this.result(lease, 'raced', 'decision-race-lost', now) };
      }
      const settled = this.requiredLease(lease.approvalId);
      this.audit(settled, status, reason, now);
      return { accepted: true, result: this.result(settled, status, reason, now) };
    });
    const response = transaction();
    if (response.accepted) this.publishResult(response.result);
    return response;
  }

  public consume(input: {
    readonly approvalId: string;
    readonly action: ApprovalAction;
    readonly currentEpoch: string;
  }):
    | { readonly allowed: true; readonly signal: AbortSignal }
    | { readonly allowed: false; readonly reason: string } {
    this.expireOutstanding();
    const now = this.now();
    const transaction = this.database.transaction(() => {
      const lease = this.getLease(input.approvalId);
      if (lease === null) return { allowed: false, reason: 'approval-not-found' } as const;
      if (lease.principalRef !== principalRef(input.action.principal)) {
        return { allowed: false, reason: 'principal-mismatch' } as const;
      }
      if (lease.status === 'pending') {
        return { allowed: false, reason: 'approval-pending' } as const;
      }
      const verification = verifyFinalGate({
        action: input.action,
        lease: {
          principal: input.action.principal,
          sessionId: lease.sessionId,
          epoch: lease.epoch,
          digest: lease.digest,
          policyVersion: lease.policyVersion,
          expiresAt: lease.expiresAt,
          status: lease.status,
        },
        currentEpoch: input.currentEpoch,
        currentPolicyVersion: this.policyVersion,
        policyAllows: this.options.policy.isAllowed(input.action.tool),
        now,
      });
      if (!verification.allowed) return verification;
      const changed = this.database
        .prepare(
          `
        UPDATE approval_leases
        SET status = 'consumed', settled_at = ?, reason = 'final-gate-consumed', revision = revision + 1
        WHERE approval_id = ? AND status = 'approved' AND revision = ?
      `,
        )
        .run(new Date(now).toISOString(), lease.approvalId, lease.revision);
      if (changed.changes !== 1) return { allowed: false, reason: 'duplicate' } as const;
      const consumed = this.requiredLease(lease.approvalId);
      this.audit(consumed, 'consumed', 'final-gate-consumed', now);
      return { allowed: true } as const;
    })();
    if (!transaction.allowed) return transaction;
    const controller = new AbortController();
    const delay = Math.max(
      0,
      Date.parse(this.requiredLease(input.approvalId).expiresAt) - this.now(),
    );
    const timer = setTimeout(() => controller.abort('lease-expired'), delay);
    timer.unref();
    controller.signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        this.inFlight.delete(input.approvalId);
      },
      { once: true },
    );
    this.inFlight.set(input.approvalId, {
      controller,
      sessionId: input.action.sessionId,
      epoch: input.action.epoch,
    });
    this.displayArguments.delete(input.approvalId);
    this.publishResult(
      this.result(this.requiredLease(input.approvalId), 'consumed', 'final-gate-consumed', now),
    );
    return { allowed: true, signal: controller.signal };
  }

  public finish(approvalId: string): void {
    this.inFlight.get(approvalId)?.controller.abort('execution-settled');
    this.inFlight.delete(approvalId);
  }

  public revoke(approvalId: string, reason = 'lease-revoked'): boolean {
    const terminalChanged = this.setTerminal(approvalId, 'revoked', reason);
    const active = this.inFlight.get(approvalId);
    if (active !== undefined) {
      active.controller.abort(reason);
      this.inFlight.delete(approvalId);
      return true;
    }
    return terminalChanged;
  }

  public invalidateEpoch(sessionId: string, epoch: string): number {
    const leases = this.rows(
      `session_id = ? AND epoch <> ? AND status IN ('pending', 'approved')`,
      sessionId,
      epoch,
    );
    for (const lease of leases) this.setTerminal(lease.approvalId, 'revoked', 'epoch-invalidated');
    const grants = this.grantRows(
      `session_id = ? AND epoch <> ? AND status = 'active'`,
      sessionId,
      epoch,
    );
    for (const grant of grants) this.setGrantTerminal(grant.grantId, 'revoked');
    let invalidated = leases.length + grants.length;
    for (const [approvalId, active] of this.inFlight) {
      if (active.sessionId === sessionId && active.epoch !== epoch) {
        active.controller.abort('epoch-invalidated');
        this.inFlight.delete(approvalId);
        invalidated += 1;
      }
    }
    return invalidated;
  }

  public revokePrincipal(principal: string, reason = 'device-revoked'): number {
    const revokedRef = principalRef(principal);
    this.revokedPrincipalRefs.add(revokedRef);
    const leases = this.rows(`principal_ref = ? AND status IN ('pending', 'approved')`, revokedRef);
    for (const lease of leases) this.setTerminal(lease.approvalId, 'revoked', reason);
    const grants = this.grantRows(`principal_ref = ? AND status = 'active'`, revokedRef);
    for (const grant of grants) this.setGrantTerminal(grant.grantId, 'revoked');
    let revoked = leases.length + grants.length;
    for (const [approvalId, active] of this.inFlight) {
      if (this.requiredLease(approvalId).principalRef === revokedRef) {
        active.controller.abort(reason);
        this.inFlight.delete(approvalId);
        revoked += 1;
      }
    }
    return revoked;
  }

  public expireOutstanding(): number {
    const now = this.now();
    const leases = this.rows(
      `expires_at <= ? AND status IN ('pending', 'approved')`,
      new Date(now).toISOString(),
    );
    for (const lease of leases) this.setTerminal(lease.approvalId, 'expired', 'lease-expired');
    return leases.length;
  }

  public list(sessionId: string, principal: string): readonly ApprovalCardDto[] {
    this.expireOutstanding();
    return this.rows(
      'session_id = ? AND principal_ref = ?',
      sessionId,
      principalRef(principal),
    ).map((lease) => this.card(lease, this.displayArguments.get(lease.approvalId)));
  }

  public createAcceptEditsGrant(input: {
    readonly principal: string;
    readonly sessionId: string;
    readonly epoch: string;
    readonly allowedTools: readonly string[];
    readonly remainingActions: number;
    readonly ttlMs: number;
  }): AcceptEditsGrantDto {
    if (this.revokedPrincipalRefs.has(principalRef(input.principal))) {
      throw new Error('Mutation authority for this principal is revoked.');
    }
    if (
      input.allowedTools.length === 0 ||
      input.allowedTools.includes('*') ||
      input.allowedTools.some((tool) => !this.options.policy.isAllowed(tool)) ||
      !Number.isSafeInteger(input.remainingActions) ||
      input.remainingActions <= 0 ||
      input.remainingActions > MAX_GRANT_ACTIONS ||
      !Number.isSafeInteger(input.ttlMs) ||
      input.ttlMs <= 0 ||
      input.ttlMs > MAX_GRANT_TTL_MS
    ) {
      throw new Error('Accept-edits grant must name enabled tools and a positive bound.');
    }
    const grant: AcceptEditsGrantDto = {
      grantId: opaqueId('grant'),
      sessionId: input.sessionId,
      epoch: input.epoch,
      allowedTools: [...new Set(input.allowedTools)].sort(),
      remainingActions: input.remainingActions,
      expiresAt: new Date(this.now() + input.ttlMs).toISOString(),
      status: 'active',
    };
    this.database
      .prepare(
        `
      INSERT INTO accept_edits_grants (
        grant_id, principal_ref, session_id, epoch, allowed_tools_json,
        remaining_actions, expires_at, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `,
      )
      .run(
        grant.grantId,
        principalRef(input.principal),
        grant.sessionId,
        grant.epoch,
        JSON.stringify(grant.allowedTools),
        grant.remainingActions,
        grant.expiresAt,
        new Date(this.now()).toISOString(),
      );
    return grant;
  }

  public requestFromGrant(
    grantId: string,
    action: Omit<ApprovalAction, 'policyVersion'>,
  ): ApprovalCardDto {
    const transaction = this.database.transaction(() => {
      const grant = this.getGrant(grantId);
      const digest = approvalActionDigest({ ...action, policyVersion: this.policyVersion });
      if (
        grant === null ||
        grant.status !== 'active' ||
        Date.parse(grant.expiresAt) <= this.now() ||
        this.revokedPrincipalRefs.has(principalRef(action.principal)) ||
        !this.options.policy.isAllowed(action.tool) ||
        grant.principalRef !== principalRef(action.principal) ||
        grant.sessionId !== action.sessionId ||
        grant.epoch !== action.epoch ||
        !JSON.parse(grant.allowedToolsJson).includes(action.tool) ||
        this.hasDeniedExactAction(action.sessionId, action.epoch, action.tool, digest)
      ) {
        throw new Error('Accept-edits grant denied this exact action.');
      }
      const remaining = grant.remainingActions - 1;
      const changed = this.database
        .prepare(
          `
        UPDATE accept_edits_grants
        SET remaining_actions = ?, status = ?
        WHERE grant_id = ? AND status = 'active' AND remaining_actions = ?
      `,
        )
        .run(remaining, remaining === 0 ? 'exhausted' : 'active', grantId, grant.remainingActions);
      if (changed.changes !== 1) {
        throw new Error('Accept-edits grant denied this exact action.');
      }
      const card = this.createLease(
        { ...action, policyVersion: this.policyVersion },
        'accept-edits',
        Math.min(this.defaultTtlMs, Date.parse(grant.expiresAt) - this.now()),
        false,
      );
      const command: ApprovalDecisionCommand = {
        type: 'approval.decide',
        approvalId: card.approvalId,
        decision: 'approve',
        idempotencyKey: opaqueId('grant_decision'),
        epoch: card.epoch,
        revision: card.revision,
        digest: card.digest,
      };
      const decided = this.decide(command, grant.grantId, action.principal);
      if (!decided.accepted)
        throw new Error('Accept-edits grant failed to settle its one-action lease.');
      return this.card(this.requiredLease(card.approvalId));
    });
    return transaction();
  }

  public getGrantDto(grantId: string): AcceptEditsGrantDto | null {
    const grant = this.getGrant(grantId);
    if (grant === null) return null;
    const status =
      grant.status === 'active' && Date.parse(grant.expiresAt) <= this.now()
        ? 'expired'
        : grant.status;
    return {
      grantId: grant.grantId,
      sessionId: grant.sessionId,
      epoch: grant.epoch,
      allowedTools: JSON.parse(grant.allowedToolsJson) as string[],
      remainingActions: grant.remainingActions,
      expiresAt: grant.expiresAt,
      status,
    };
  }

  public close(): void {
    this.stopPolicyListener();
    this.revokeAll('service-closed');
  }

  private createLease(
    action: ApprovalAction,
    source: 'explicit' | 'accept-edits',
    ttlMs = this.defaultTtlMs,
    publish = true,
  ): ApprovalCardDto {
    const now = this.now();
    const approvalId = opaqueId('approval');
    const digest = approvalActionDigest(action);
    const requestedAt = new Date(now).toISOString();
    const expiresAt = new Date(now + Math.max(1, ttlMs)).toISOString();
    this.database
      .prepare(
        `
      INSERT INTO approval_leases (
        approval_id, principal_ref, session_id, epoch, tool, digest, policy_version,
        revision, source, requested_at, expires_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 'pending')
    `,
      )
      .run(
        approvalId,
        principalRef(action.principal),
        action.sessionId,
        action.epoch,
        action.tool,
        digest,
        action.policyVersion,
        source,
        requestedAt,
        expiresAt,
      );
    this.displayArguments.set(approvalId, canonicalizeJson(redactJson(action.arguments)));
    const lease = this.requiredLease(approvalId);
    this.audit(lease, 'requested', 'approval-requested', now);
    const card = this.card(lease, this.displayArguments.get(approvalId));
    if (publish) this.publishRequested(card);
    return card;
  }

  private decisionFailure(
    lease: LeaseRow,
    command: ApprovalDecisionCommand,
    principal: string,
    now: number,
  ): ApprovalResultPayload | null {
    if (lease.principalRef !== principalRef(principal))
      return this.result(lease, 'stale', 'principal-mismatch', now);
    if (lease.status !== 'pending')
      return this.result(lease, 'raced', 'lease-already-settled', now);
    if (Date.parse(lease.expiresAt) <= now)
      return this.result(lease, 'expired', 'lease-expired', now);
    if (lease.epoch !== command.epoch) return this.result(lease, 'stale', 'epoch-mismatch', now);
    if (lease.revision !== command.revision)
      return this.result(lease, 'stale', 'revision-mismatch', now);
    if (lease.digest !== command.digest) return this.result(lease, 'stale', 'digest-mismatch', now);
    return null;
  }

  private setTerminal(
    approvalId: string,
    status: 'expired' | 'revoked' | 'restart-invalidated',
    reason: string,
  ): boolean {
    const now = this.now();
    const changed = this.database
      .prepare(
        `
      UPDATE approval_leases SET status = ?, settled_at = ?, reason = ?, revision = revision + 1
      WHERE approval_id = ? AND status IN ('pending', 'approved')
    `,
      )
      .run(status, new Date(now).toISOString(), reason, approvalId);
    if (changed.changes !== 1) return false;
    const lease = this.requiredLease(approvalId);
    this.displayArguments.delete(approvalId);
    this.inFlight.get(approvalId)?.controller.abort(reason);
    this.inFlight.delete(approvalId);
    this.audit(lease, status, reason, now);
    this.publishResult(this.result(lease, status, reason, now));
    return true;
  }

  private reconcileRestart(): void {
    const now = this.now();
    const outstanding = this.rows(`status IN ('pending', 'approved')`);
    for (const lease of outstanding) {
      this.database
        .prepare(
          `
        UPDATE approval_leases SET status = 'restart-invalidated', settled_at = ?,
          reason = 'relay-restarted', revision = revision + 1 WHERE approval_id = ?
      `,
        )
        .run(new Date(now).toISOString(), lease.approvalId);
      this.audit(
        this.requiredLease(lease.approvalId),
        'restart-invalidated',
        'relay-restarted',
        now,
      );
    }
    for (const grant of this.grantRows(`status = 'active'`)) {
      this.setGrantTerminal(grant.grantId, 'restart-invalidated');
    }
  }

  private revokeAll(reason: string): void {
    for (const lease of this.rows(`status IN ('pending', 'approved')`)) {
      this.setTerminal(lease.approvalId, 'revoked', reason);
    }
    for (const grant of this.grantRows(`status = 'active'`)) {
      this.setGrantTerminal(grant.grantId, 'revoked');
    }
    for (const [approvalId, active] of this.inFlight) {
      active.controller.abort(reason);
      this.inFlight.delete(approvalId);
    }
  }

  private publishRequested(card: ApprovalCardDto): void {
    const payload: ApprovalRequestedPayload = card;
    this.publish('approval.requested', card.sessionId, card.epoch, payload);
  }

  private publishResult(payload: ApprovalResultPayload): void {
    this.publish('approval.result', payload.sessionId, payload.epoch, payload);
  }

  private publish(
    kind: string,
    sessionId: string,
    epoch: string,
    payload: ApprovalRequestedPayload | ApprovalResultPayload,
  ): void {
    const identity = { ...this.options.identity, sessionId };
    this.options.syncHub.publish({
      v: 1,
      eventId: opaqueId('event'),
      kind,
      ...identity,
      epoch,
      seq: this.options.store.nextSequence(identity, epoch),
      occurredAt: new Date(this.now()).toISOString(),
      causedBy: null,
      payload,
      redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
      replay: { eligible: true, snapshotEligible: true },
    });
  }

  private card(lease: LeaseRow, canonicalArguments = '[REDACTED_PRIVATE_TEXT]'): ApprovalCardDto {
    const displayedArguments = redactJson(canonicalArguments);
    return {
      approvalId: lease.approvalId,
      sessionId: lease.sessionId,
      epoch: lease.epoch,
      tool: lease.tool,
      canonicalArguments:
        typeof displayedArguments === 'string' ? displayedArguments : '[REDACTED_PRIVATE_TEXT]',
      digest: lease.digest,
      policyVersion: lease.policyVersion,
      revision: lease.revision,
      requestedAt: lease.requestedAt,
      expiresAt: lease.expiresAt,
      source: lease.source,
      status: lease.status as ApprovalCardDto['status'],
      reason: lease.reason,
    };
  }

  private result(
    lease: LeaseRow,
    status: ApprovalResultPayload['status'],
    reason: string,
    now: number,
  ): ApprovalResultPayload {
    return {
      approvalId: lease.approvalId,
      sessionId: lease.sessionId,
      epoch: lease.epoch,
      digest: lease.digest,
      revision: lease.revision + (status === lease.status ? 0 : 1),
      status,
      reason,
      settledAt: new Date(now).toISOString(),
    };
  }

  private rejected(
    command: ApprovalDecisionCommand,
    status: ApprovalResultPayload['status'],
    reason: string,
    now: number,
  ): ApprovalDecisionResponse {
    return {
      accepted: false,
      result: {
        approvalId: command.approvalId,
        sessionId: 'session_unknown',
        epoch: command.epoch,
        digest: command.digest,
        revision: command.revision,
        status,
        reason,
        settledAt: new Date(now).toISOString(),
      },
    };
  }

  private audit(lease: LeaseRow, transition: string, reason: string, now: number): void {
    this.database
      .prepare(
        `
      INSERT INTO approval_audit (
        approval_id, principal_ref, session_id, epoch, tool, digest, policy_version,
        revision, transition, reason, occurred_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        lease.approvalId,
        lease.principalRef,
        lease.sessionId,
        lease.epoch,
        lease.tool,
        lease.digest,
        lease.policyVersion,
        lease.revision,
        transition,
        reason,
        new Date(now).toISOString(),
      );
  }

  private getLease(approvalId: string): LeaseRow | null {
    return (
      (this.database.prepare(`${LEASE_SELECT} WHERE approval_id = ?`).get(approvalId) as
        LeaseRow | undefined) ?? null
    );
  }

  private requiredLease(approvalId: string): LeaseRow {
    const lease = this.getLease(approvalId);
    if (lease === null) throw new Error('Approval lease disappeared during a transaction.');
    return lease;
  }

  private findByIdempotency(key: string): LeaseRow | null {
    return (
      (this.database.prepare(`${LEASE_SELECT} WHERE idempotency_key = ?`).get(key) as
        LeaseRow | undefined) ?? null
    );
  }

  private rows(where: string, ...values: readonly unknown[]): LeaseRow[] {
    return this.database
      .prepare(`${LEASE_SELECT} WHERE ${where} ORDER BY requested_at DESC`)
      .all(...values) as LeaseRow[];
  }

  private getGrant(grantId: string): GrantRow | null {
    return (
      (this.database
        .prepare(
          `
      SELECT grant_id AS grantId, principal_ref AS principalRef, session_id AS sessionId,
        epoch, allowed_tools_json AS allowedToolsJson, remaining_actions AS remainingActions,
        expires_at AS expiresAt, status
      FROM accept_edits_grants WHERE grant_id = ?
    `,
        )
        .get(grantId) as GrantRow | undefined) ?? null
    );
  }

  private grantRows(where: string, ...values: readonly unknown[]): GrantRow[] {
    return this.database
      .prepare(
        `
      SELECT grant_id AS grantId, principal_ref AS principalRef, session_id AS sessionId,
        epoch, allowed_tools_json AS allowedToolsJson, remaining_actions AS remainingActions,
        expires_at AS expiresAt, status
      FROM accept_edits_grants WHERE ${where} ORDER BY created_at DESC
    `,
      )
      .all(...values) as GrantRow[];
  }

  private setGrantTerminal(grantId: string, status: GrantTerminalStatus): boolean {
    return (
      this.database
        .prepare(
          `
      UPDATE accept_edits_grants SET status = ?
      WHERE grant_id = ? AND status = 'active'
    `,
        )
        .run(status, grantId).changes === 1
    );
  }

  private hasDeniedExactAction(
    sessionId: string,
    epoch: string,
    tool: string,
    digest: string,
  ): boolean {
    return (
      this.database
        .prepare(
          `
      SELECT 1 FROM approval_leases
      WHERE session_id = ? AND epoch = ? AND tool = ? AND digest = ? AND status = 'denied'
      LIMIT 1
    `,
        )
        .get(sessionId, epoch, tool, digest) !== undefined
    );
  }
}

const LEASE_SELECT = `
  SELECT approval_id AS approvalId, principal_ref AS principalRef, session_id AS sessionId,
    epoch, tool, digest, policy_version AS policyVersion, revision, source,
    requested_at AS requestedAt, expires_at AS expiresAt, status, decision,
    decided_by_device AS decidedByDevice, idempotency_key AS idempotencyKey,
    settled_at AS settledAt, reason
  FROM approval_leases
`;

// ───────────────────────────────────────────────────────────────────
// 5. HELPERS
// ───────────────────────────────────────────────────────────────────

function opaqueId(prefix: string): string {
  return `${prefix}_${randomBytes(18).toString('base64url')}`;
}

function principalRef(principal: string): string {
  return createHash('sha256').update(principal).digest('hex');
}
