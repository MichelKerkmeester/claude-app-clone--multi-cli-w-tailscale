// ───────────────────────────────────────────────────────────────────
// MODULE: Consolidated Fail-Closed Negative Controls
// ───────────────────────────────────────────────────────────────────

import { generateKeyPairSync, sign, type KeyObject } from 'node:crypto';

import {
  approvalActionDigest,
  enrollmentProof,
  sessionProof,
  type ApprovalAction,
  type ApprovalDecisionCommand,
  type CommandBindingDto,
  type DevicePublicKeyJwk,
  type EnrollmentQr,
  type PiRpcCommand,
  type PiRpcResponse,
} from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it, vi } from 'vitest';

import { ApprovalService } from '../../src/approval/approval-service.js';
import { verifyFinalGate } from '../../src/approval/final-gate.js';
import { AuthService } from '../../src/auth/auth-service.js';
import { CommandService } from '../../src/commands/command-service.js';
import { MutationPolicy } from '../../src/policy/mutation-policy.js';
import { serializePushHint } from '../../src/push/push-service.js';
import { SyncHub } from '../../src/replay/sync.js';
import type { RpcSupervisor } from '../../src/rpc/supervisor.js';
import { RelayStore } from '../../src/store/relay-store.js';
import { projectCommandCatalog } from '../../src/store/redaction.js';

const ORIGIN = 'https://pi-remote.example.test';
const PRINCIPAL = 'operator@example.test';
const NOW = Date.parse('2026-01-01T00:00:00.000Z');
const IDENTITY = { hostId: 'host_local', workspaceRef: 'workspace_default' } as const;

// This suite keeps the fail-closed boundary visible in one machine-checkable module.
describe('consolidated fail-closed negative controls', () => {
  it('rejects unauthenticated, wrong-origin, replayed-ticket, revoked, and spoofed identity access', () => {
    const auth = new AuthService({
      origin: ORIGIN,
      hostId: IDENTITY.hostId,
      now: () => NOW,
    });
    const keys = deviceKeys();
    const enrollment = auth.enrollment.createChallenge();
    const enrolled = auth.enroll(enrollmentBody(enrollment, keys), ORIGIN, PRINCIPAL);
    expect(enrolled).not.toBeNull();
    if (enrolled === null) throw new Error('Test device enrollment failed.');
    const challenge = auth.createSessionChallenge(enrolled.deviceId, ORIGIN, PRINCIPAL);
    expect(challenge).not.toBeNull();
    if (challenge === null) throw new Error('Test session challenge failed.');
    const session = auth.createSession(
      enrolled.deviceId,
      challenge.challengeId,
      signStatement(keys.privateKey, sessionProof(ORIGIN, enrolled.deviceId, challenge)),
      ORIGIN,
      PRINCIPAL,
    );
    expect(session).not.toBeNull();
    if (session === null) throw new Error('Test application session failed.');

    expect(auth.authenticate(null, ORIGIN, PRINCIPAL, 'sessions:list')).toBeNull();
    expect(
      auth.authenticate(session.token, 'https://wrong.example.test', PRINCIPAL, 'sessions:list'),
    ).toBeNull();
    expect(
      auth.authenticate(session.token, ORIGIN, 'spoofed@example.test', 'sessions:list'),
    ).toBeNull();

    const ticket = auth.issueTicket(session);
    expect(auth.consumeTicket(ticket.ticket, ORIGIN, PRINCIPAL)).toMatchObject({
      token: session.token,
    });
    expect(auth.consumeTicket(ticket.ticket, ORIGIN, PRINCIPAL)).toBeNull();

    const revokedTicket = auth.issueTicket(session);
    expect(auth.revokeSession(session.token)).toBe(true);
    expect(auth.authenticate(session.token, ORIGIN, PRINCIPAL, 'sessions:list')).toBeNull();
    expect(auth.consumeTicket(revokedTicket.ticket, ORIGIN, PRINCIPAL)).toBeNull();
  });

  it('binds runtime tickets to one exact model command and consumes substitutions', () => {
    let now = NOW;
    const auth = new AuthService({
      origin: ORIGIN,
      hostId: IDENTITY.hostId,
      now: () => now,
      runtimeTicketTtlMs: 5,
    });
    const keys = deviceKeys();
    const enrollment = auth.enrollment.createChallenge();
    const enrolled = auth.enroll(enrollmentBody(enrollment, keys), ORIGIN, PRINCIPAL);
    if (enrolled === null) throw new Error('Test device enrollment failed.');
    const challenge = auth.createSessionChallenge(enrolled.deviceId, ORIGIN, PRINCIPAL);
    if (challenge === null) throw new Error('Test session challenge failed.');
    const session = auth.createSession(
      enrolled.deviceId,
      challenge.challengeId,
      signStatement(keys.privateKey, sessionProof(ORIGIN, enrolled.deviceId, challenge)),
      ORIGIN,
      PRINCIPAL,
    );
    if (session === null) throw new Error('Test application session failed.');
    const binding = {
      sessionId: 'session_local',
      expectedRevision: 2,
      expectedCatalogRevision: 5,
      operation: { type: 'set_model', provider: 'openai', modelId: 'gpt-5' },
    } as const;
    const ticket = auth.issueRuntimeModelTicket(session, binding);
    const substituted = {
      type: 'runtime.control',
      controlId: 'control_substitute',
      ...binding,
      operation: { ...binding.operation, modelId: 'gpt-5-mini' },
      ticket: ticket.ticket,
    } as const;
    expect(auth.consumeRuntimeModelTicket(ticket.ticket, session, substituted)).toBe(false);
    expect(auth.consumeRuntimeModelTicket(ticket.ticket, session, substituted)).toBe(false);

    const exactTicket = auth.issueRuntimeModelTicket(session, binding);
    const exact = {
      type: 'runtime.control',
      controlId: 'control_exact',
      ...binding,
      ticket: exactTicket.ticket,
    } as const;
    expect(auth.consumeRuntimeModelTicket(exactTicket.ticket, session, exact)).toBe(true);
    expect(auth.consumeRuntimeModelTicket(exactTicket.ticket, session, exact)).toBe(false);

    const sessionBoundTicket = auth.issueRuntimeModelTicket(session, binding);
    expect(
      auth.consumeRuntimeModelTicket(
        sessionBoundTicket.ticket,
        { ...session, token: 'session_other' },
        { ...exact, ticket: sessionBoundTicket.ticket },
      ),
    ).toBe(false);
    expect(
      auth.consumeRuntimeModelTicket(sessionBoundTicket.ticket, session, {
        ...exact,
        ticket: sessionBoundTicket.ticket,
      }),
    ).toBe(true);

    const expiredTicket = auth.issueRuntimeModelTicket(session, binding);
    now += 6;
    expect(
      auth.consumeRuntimeModelTicket(expiredTicket.ticket, session, {
        ...exact,
        ticket: expiredTicket.ticket,
      }),
    ).toBe(false);
    expect(
      auth.authenticate(session.token, ORIGIN, PRINCIPAL, 'runtime-ticket:create'),
    ).not.toBeNull();
    expect(auth.authenticate(session.token, ORIGIN, PRINCIPAL, 'runtime:full-access')).toBeNull();
  });

  it('rejects stale, duplicate, expired, revoked, raced, and digest-altered approvals', () => {
    const action = fixedAction();
    const digest = approvalActionDigest(action);
    const lease = {
      principal: action.principal,
      sessionId: action.sessionId,
      epoch: action.epoch,
      digest,
      policyVersion: action.policyVersion,
      expiresAt: '2026-01-01T00:01:00.000Z',
      status: 'approved',
    };
    const check = (overrides: Partial<Parameters<typeof verifyFinalGate>[0]> = {}) =>
      verifyFinalGate({
        action,
        lease,
        currentEpoch: action.epoch,
        currentPolicyVersion: action.policyVersion,
        policyAllows: true,
        now: NOW,
        ...overrides,
      });

    expect(check({ currentEpoch: 'epoch_stale' })).toEqual({
      allowed: false,
      reason: 'stale-epoch',
    });
    expect(check({ lease: { ...lease, status: 'consumed' } })).toEqual({
      allowed: false,
      reason: 'duplicate',
    });
    expect(check({ now: Date.parse(lease.expiresAt) })).toEqual({
      allowed: false,
      reason: 'expired',
    });
    expect(check({ lease: { ...lease, status: 'revoked' } })).toEqual({
      allowed: false,
      reason: 'revoked',
    });
    expect(check({ action: { ...action, arguments: { target: 'altered' } } })).toEqual({
      allowed: false,
      reason: 'digest-mismatch',
    });

    const store = new RelayStore();
    const policy = new MutationPolicy();
    policy.enableFamily('filesystem');
    policy.setEnabled(true);
    const service = new ApprovalService({
      store,
      syncHub: new SyncHub(store),
      policy,
      identity: IDENTITY,
      now: () => NOW,
    });
    try {
      const card = service.request(action);
      const command = decision(card);
      expect(service.decide(command, 'device_one', PRINCIPAL).accepted).toBe(true);
      expect(
        service.decide({ ...command, idempotencyKey: 'decision_racer' }, 'device_two', PRINCIPAL),
      ).toMatchObject({ accepted: false, result: { status: 'raced' } });
    } finally {
      service.close();
      store.close();
    }
  });

  it('mints no lease when an accept-edits decrement loses its CAS', () => {
    const store = new RelayStore();
    const policy = new MutationPolicy();
    policy.enableFamily('filesystem');
    policy.setEnabled(true);
    const service = new ApprovalService({
      store,
      syncHub: new SyncHub(store),
      policy,
      identity: IDENTITY,
      now: () => NOW,
    });
    try {
      const grant = service.createAcceptEditsGrant({
        principal: PRINCIPAL,
        sessionId: 'session_local',
        epoch: 'epoch_security',
        allowedTools: ['edit'],
        remainingActions: 1,
        ttlMs: 1_000,
      });
      store.databaseHandle().exec(`
        CREATE TRIGGER reject_grant_decrement
        BEFORE UPDATE OF remaining_actions ON accept_edits_grants
        BEGIN
          SELECT RAISE(IGNORE);
        END;
      `);

      expect(() => service.requestFromGrant(grant.grantId, fixedAction())).toThrow(/denied/);
      expect(service.list('session_local', PRINCIPAL)).toEqual([]);
      expect(service.getGrantDto(grant.grantId)).toMatchObject({
        remainingActions: 1,
        status: 'active',
      });
    } finally {
      service.close();
      store.close();
    }
  });

  it('removes a secret canary and host-shaped path before durable replay', () => {
    const canary = 'CANARY_SECRET_opaque_42';
    const hostShapedPath = '/Users/example/private/sample.txt';
    const store = new RelayStore();
    try {
      store.appendEnvelope({
        v: 1,
        eventId: 'event_redaction_canary',
        kind: 'pi.tool_execution_end',
        ...IDENTITY,
        sessionId: 'session_local',
        epoch: 'epoch_security',
        seq: 1,
        occurredAt: '2026-01-01T00:00:00.000Z',
        causedBy: null,
        payload: {
          path: hostShapedPath,
          authorization: `Bearer ${canary}`,
          output: `token=${canary}`,
        },
        redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
        replay: { eligible: true, snapshotEligible: true },
      });
      const durable = JSON.stringify(
        store.createSyncPlan({
          ...IDENTITY,
          sessionId: 'session_local',
        }),
      );
      expect(durable).not.toContain(canary);
      expect(durable).not.toContain(hostShapedPath);
      expect(durable).toContain('[REDACTED_SECRET]');
      expect(durable).toContain('[REDACTED_PATH]');
    } finally {
      store.close();
    }
  });

  it('projects command catalogs without host internals or unsafe names', () => {
    const canary = 'CANARY_COMMAND_SECRET_opaque_7';
    const catalog = projectCommandCatalog(
      {
        commands: [
          {
            name: 'plan',
            description: 'Toggle plan',
            source: 'extension',
            path: '/Users/example/private/plan.ts',
            filename: 'plan.ts',
            location: '/src/plan.ts:12',
            prompt: 'secret prompt body',
          },
          { name: 'compact', description: `token=${canary}`, source: 'prompt' },
          { name: 'admin', description: 'Admin', source: 'prompt', apiKey: `sk-${canary}` },
          { name: '/usr/bin/evil', description: 'path name', source: 'prompt' },
          { name: 'bidi\u202e', description: 'bidi', source: 'prompt' },
          { name: 'ctl\u0007', description: 'control', source: 'prompt' },
          { name: '!bash', description: 'bang', source: 'prompt' },
        ],
      },
      'session_local',
      1,
      { hostEpoch: 'epoch_security', sessionRevision: 0 },
    );
    expect(catalog).not.toBeNull();
    const serialized = JSON.stringify(catalog);
    for (const forbidden of [
      '/Users/',
      'plan.ts',
      'location',
      '/src/plan.ts',
      'prompt body',
      canary,
      'sk-',
      '/usr/bin/evil',
      'bidi',
      'ctl',
      '!bash',
      'filename',
      'apiKey',
      'path',
    ]) {
      expect(serialized.includes(forbidden)).toBe(false);
    }
    // Only canonical, safe descriptors survive; secrets and paths never become copy.
    expect(catalog?.commands.map((command) => command.name)).toEqual(['plan', 'compact', 'admin']);
    expect(catalog?.commands[0]).toMatchObject({
      description: 'Toggle plan',
      enabled: true,
      requiresConfirmation: false,
    });
    // The secret-bearing description is redacted to null rather than leaked.
    expect(catalog?.commands[1]?.description).toBeNull();
    expect(catalog?.commands[2]).toMatchObject({ name: 'admin', description: 'Admin' });
  });

  it('keeps push bytes content-free even when the source object carries forbidden fields', () => {
    const canary = 'CANARY_PUSH_CONTENT_opaque_19';
    const payload = {
      lookupId: 'hint_security',
      attentionClass: 'needs_input',
      generation: 1,
      nonce: 'nonce_security',
      transcript: canary,
      path: '/Users/example/private/sample.txt',
      decision: 'approve',
    } as const;
    const bytes = Buffer.from(serializePushHint(payload));
    const decoded = JSON.parse(bytes.toString('utf8')) as object;

    expect(Object.keys(decoded).sort()).toEqual(['attentionClass', 'lookupId']);
    for (const forbidden of [canary, '/Users/', 'transcript', 'path', 'decision', 'approve']) {
      expect(bytes.includes(Buffer.from(forbidden))).toBe(false);
    }
  });

  it('revalidates slash bindings fail-closed on every identity or availability mismatch', async () => {
    const supervisor = new FakeCommandSupervisor();
    const service = new CommandService(supervisor as unknown as RpcSupervisor, {
      sessionId: 'session_local',
      hostEpoch: 'epoch_security',
    });
    const snapshot = await service.listCommands();
    const binding: CommandBindingDto = {
      hostEpoch: snapshot.hostEpoch,
      name: 'compact',
      sessionRevision: snapshot.sessionRevision,
      catalogRevision: snapshot.catalogRevision,
    };

    expect(await service.revalidateSlashSubmission(binding)).toBe('allowed');

    // A different host generation can never authorize a submission.
    expect(await service.revalidateSlashSubmission({ ...binding, hostEpoch: 'epoch_other' })).toBe(
      'stale_catalog',
    );
    // A settled-availability transition ages out the session revision.
    service.setAvailability('running');
    service.setAvailability('idle');
    expect(await service.revalidateSlashSubmission(binding)).toBe('stale_catalog');
    // A running turn denies even a binding re-read under the running
    // revision (an older binding would already be stale).
    service.setAvailability('running');
    const runningBinding = await currentBinding(service);
    expect(await service.revalidateSlashSubmission(runningBinding)).toBe('command_denied');
    // Hidden and unknown names are denied.
    service.setAvailability('idle');
    const idleBinding = await currentBinding(service);
    expect(await service.revalidateSlashSubmission({ ...idleBinding, name: 'login' })).toBe(
      'command_denied',
    );
    expect(await service.revalidateSlashSubmission({ ...idleBinding, name: 'nope' })).toBe(
      'command_denied',
    );
    // A catalog that changed between binding and submission is stale.
    supervisor.rawCommands = [{ name: 'compact', description: 'Compact', source: 'prompt' }];
    expect(await service.revalidateSlashSubmission(idleBinding)).toBe('stale_catalog');
    // Host invalidation kills every prior binding outright.
    service.invalidate();
    expect(await service.revalidateSlashSubmission(idleBinding)).toBe('stale_catalog');
    // None of the denials ever forwarded a prompt: only catalog reads ran.
    expect(supervisor.send.mock.calls.every(([command]) => command.type === 'get_commands')).toBe(
      true,
    );
  });
});

/** One raw host command set behind a catalog-only supervisor. */
class FakeCommandSupervisor {
  public rawCommands: readonly unknown[] = [
    { name: 'plan', description: 'Toggle plan mode', source: 'extension' },
    { name: 'compact', description: 'Compact context', source: 'prompt' },
    { name: 'login', description: 'Authenticate', source: 'prompt' },
  ];

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

async function currentBinding(service: CommandService): Promise<CommandBindingDto> {
  const fresh = await service.listCommands();
  return {
    hostEpoch: fresh.hostEpoch,
    name: 'compact',
    sessionRevision: fresh.sessionRevision,
    catalogRevision: fresh.catalogRevision,
  };
}

function fixedAction(): ApprovalAction {
  return {
    principal: PRINCIPAL,
    sessionId: 'session_local',
    epoch: 'epoch_security',
    tool: 'edit',
    arguments: { target: 'opaque_target', content: 'replacement' },
    policyVersion: 1,
  };
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
    idempotencyKey: 'decision_primary',
    epoch: card.epoch,
    revision: card.revision,
    digest: card.digest,
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
