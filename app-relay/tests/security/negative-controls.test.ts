// ───────────────────────────────────────────────────────────────────
// MODULE: Consolidated Fail-Closed Negative Controls
// ───────────────────────────────────────────────────────────────────

import { createHash, generateKeyPairSync, sign, type KeyObject } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

import {
  DEFAULT_MEDIA_POLICY,
  approvalActionDigest,
  enrollmentProof,
  isPiRpcCommand,
  sessionProof,
  isTodoProjectionDeltaV1,
  isTodoProjectionV1,
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
import { AuthService, type ArtifactPublishTicketBinding } from '../../src/auth/auth-service.js';
import {
  authorizeAction,
  isHostAuthoritativeAction,
  isPhoneGrantableAction,
} from '../../src/auth/policy.js';
import type {
  AttachmentOwner,
  AttachmentStatusDto,
} from '../../src/attachments/attachment-types.js';
import {
  PiImageBridge,
  type PiImageAttachmentSource,
} from '../../src/attachments/pi-image-bridge.js';
import { CommandService } from '../../src/commands/command-service.js';
import { MutationPolicy } from '../../src/policy/mutation-policy.js';
import { serializePushHint } from '../../src/push/push-service.js';
import { SyncHub } from '../../src/replay/sync.js';
import type { RpcSupervisor } from '../../src/rpc/supervisor.js';
import { RelayStore } from '../../src/store/relay-store.js';
import { sanitizeInboundImage } from '../../src/store/artifact-sanitizer.js';
import { projectCommandCatalog } from '../../src/store/redaction.js';
import {
  applyTodoProjectionDelta,
  projectTodoSnapshot,
} from '../../src/store/todo-projector.js';
import { publishApprovedImage } from '../../../extensions/pi-remote-inbound-media/src/index.js';

const ORIGIN = 'https://pi-remote.example.test';
const PRINCIPAL = 'operator@example.test';
const NOW = Date.parse('2026-01-01T00:00:00.000Z');
const IDENTITY = { hostId: 'host_local', workspaceRef: 'workspace_default' } as const;
const INBOUND_BINDING: ArtifactPublishTicketBinding = {
  hostExtension: 'host_extension_security',
  sessionId: 'session_security',
  runId: 'run_security',
  turnId: 'turn_security',
  blockId: 'block_security',
  submissionId: 'submission_security',
  expectedTranscriptRevision: 0,
  declaredByteLength: 128,
  declaredMediaFamily: 'screenshot',
};
const READ_ONLY_SERVER_SOURCE = readFileSync(
  new URL('../../src/http/server.ts', import.meta.url),
  'utf8',
);
const READ_ONLY_RICH_SOURCES = [
  '../../../app-mobile/src/rich-content/CodeCard.tsx',
  '../../../app-mobile/src/rich-content/CommandOutputCard.tsx',
  '../../../app-mobile/src/rich-content/F6ViewerAdapter.tsx',
  '../../../app-mobile/src/rich-content/SafeMarkdown.tsx',
  '../../../app-mobile/src/rich-content/highlight.worker.ts',
  '../../../app-mobile/src/rich-content/useHighlightedCode.ts',
  '../../../app-mobile/src/artifacts/ArtifactViewerProvider.tsx',
  '../../../app-mobile/src/artifacts/CodePreview.tsx',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'));

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

  it('keeps todo strictly read-only and rejects unknown phone commands', () => {
    for (const forbidden of [
      'todo.complete',
      'todo.update',
      'todo.reorder',
      'todo.create',
      'todo.delete',
      'todo.cancel',
      'todo.check',
      'todo.edit',
      'todo.abort',
      'todo.ticket',
      'todo.approval',
      '/api/todo',
      'todo:control',
    ]) {
      expect(READ_ONLY_SERVER_SOURCE).not.toContain(forbidden);
    }
    expect(READ_ONLY_SERVER_SOURCE).toContain('TODO_PROJECTION_CAPABILITY');
    expect(isPiRpcCommand({ type: 'todo.complete', taskId: 'task_001' })).toBe(false);
    expect(isPiRpcCommand({ type: 'todo.update', taskId: 'task_001' })).toBe(false);
    expect(isPiRpcCommand({ type: 'todo.reorder', taskId: 'task_001' })).toBe(false);
  });

  it('preserves the last valid todo view on an invalid or mismatched revision chain', () => {
    const current = projectTodoSnapshot({
      planId: 'plan_security_001',
      revision: 1,
      updatedAt: null,
      tasks: [
        {
          id: 'task_security_001',
          title: 'Safe title',
          state: 'pending',
          group: null,
          order: 0,
          revision: 1,
          updatedAt: null,
        },
      ],
    });
    expect(current).not.toBeNull();
    if (current === null) throw new Error('Security projection fixture was rejected.');
    const malformed = {
      planId: current.planId,
      baseRevision: 9,
      revision: 10,
      upsertedTasks: [
        {
          ...current.tasks[0],
          title: 'Raw /Users/private/title',
          detail: 'detail-canary',
        },
      ],
      removedTaskIds: [],
      updatedAt: 'not-a-timestamp',
    };
    expect(isTodoProjectionV1(current)).toBe(true);
    expect(isTodoProjectionDeltaV1(malformed)).toBe(false);
    expect(applyTodoProjectionDelta(current, malformed)).toBe(current);
  });

  it('keeps publication host-authoritative across origin, principal, device, revision, replay, and expiry checks', () => {
    let now = NOW;
    const auth = new AuthService({
      origin: ORIGIN,
      hostId: IDENTITY.hostId,
      now: () => now,
    });
    const issued = auth.issueArtifactPublishTicketForExtension(
      PRINCIPAL,
      INBOUND_BINDING.hostExtension,
      INBOUND_BINDING.sessionId,
      INBOUND_BINDING,
    );

    expect(
      auth.consumeArtifactPublishTicket(issued.ticket, {
        origin: ORIGIN,
        principal: PRINCIPAL,
        hostExtension: 'device_other',
        expectedBinding: INBOUND_BINDING,
      }),
    ).toBeNull();
    expect(
      auth.consumeArtifactPublishTicket(issued.ticket, {
        origin: ORIGIN,
        principal: 'spoofed@example.test',
        hostExtension: INBOUND_BINDING.hostExtension,
        expectedBinding: INBOUND_BINDING,
      }),
    ).toBeNull();
    expect(
      auth.consumeArtifactPublishTicket(issued.ticket, {
        origin: 'https://wrong.example.test',
        principal: PRINCIPAL,
        hostExtension: INBOUND_BINDING.hostExtension,
        expectedBinding: INBOUND_BINDING,
      }),
    ).toBeNull();
    const stale = auth.issueArtifactPublishTicketForExtension(
      PRINCIPAL,
      INBOUND_BINDING.hostExtension,
      INBOUND_BINDING.sessionId,
      INBOUND_BINDING,
    );
    expect(
      auth.consumeArtifactPublishTicket(stale.ticket, {
        origin: 'extension',
        principal: PRINCIPAL,
        hostExtension: INBOUND_BINDING.hostExtension,
        expectedBinding: { ...INBOUND_BINDING, expectedTranscriptRevision: 1 },
      }),
    ).toBeNull();

    expect(
      auth.consumeArtifactPublishTicket(stale.ticket, {
        origin: 'extension',
        principal: PRINCIPAL,
        hostExtension: INBOUND_BINDING.hostExtension,
        expectedBinding: INBOUND_BINDING,
      }),
    ).toBeNull();

    const exact = auth.issueArtifactPublishTicketForExtension(
      PRINCIPAL,
      INBOUND_BINDING.hostExtension,
      INBOUND_BINDING.sessionId,
      INBOUND_BINDING,
    );
    const consumed = auth.consumeArtifactPublishTicket(exact.ticket, {
      origin: 'extension',
      principal: PRINCIPAL,
      hostExtension: INBOUND_BINDING.hostExtension,
      expectedBinding: INBOUND_BINDING,
    });
    expect(consumed).toMatchObject({ binding: INBOUND_BINDING, extensionOnly: true });
    expect(
      auth.consumeArtifactPublishTicket(exact.ticket, {
        origin: 'extension',
        principal: PRINCIPAL,
        hostExtension: INBOUND_BINDING.hostExtension,
        expectedBinding: INBOUND_BINDING,
      }),
    ).toBeNull();

    const expired = auth.issueArtifactPublishTicketForExtension(
      PRINCIPAL,
      INBOUND_BINDING.hostExtension,
      INBOUND_BINDING.sessionId,
      INBOUND_BINDING,
    );
    now += 90_001;
    expect(
      auth.consumeArtifactPublishTicket(expired.ticket, {
        origin: 'extension',
        principal: PRINCIPAL,
        hostExtension: INBOUND_BINDING.hostExtension,
        expectedBinding: INBOUND_BINDING,
      }),
    ).toBeNull();

    expect(isHostAuthoritativeAction('artifact:publish')).toBe(true);
    expect(isPhoneGrantableAction('artifact:publish')).toBe(false);
    expect(isPhoneGrantableAction('artifact:read')).toBe(false);
    expect(authorizeAction('artifact:publish')).toBe(true);
  });

  it('clears mutation authority on emergency disable and leaves no fallback family', () => {
    const policy = new MutationPolicy();
    const reasons: string[] = [];
    policy.onDisable((reason) => reasons.push(reason));
    policy.enableFamily('filesystem');
    policy.setEnabled(true);
    expect(policy.isAllowed('edit')).toBe(true);

    policy.setEnabled(false);

    expect(policy.status()).toEqual({ enabled: false, family: null });
    expect(policy.isAllowed('edit')).toBe(false);
    expect(policy.isAllowed('bash')).toBe(false);
    expect(reasons).toContain('kill-switch');
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

  it('keeps the transcript and sync transports read-only with no rich endpoint or host operation', () => {
    expect(READ_ONLY_SERVER_SOURCE).toContain("ingress.path !== '/api/sync'");
    expect(READ_ONLY_SERVER_SOURCE).toContain(
      'const transcriptMatch = /^\\/api\\/sessions\\/([^/]+)\\/transcript$/.exec',
    );
    expect(READ_ONLY_SERVER_SOURCE).not.toMatch(
      /\/api\/rich|rich-content|host-file|mutation-ticket/u,
    );
    expect(READ_ONLY_SERVER_SOURCE).not.toMatch(
      /(?:writeFile|appendFile|unlink|mkdir|execFile|spawn|child_process)/u,
    );
  });

  it('keeps rich rendering read-only with no forbidden action, HTML, filesystem, or fetch path', () => {
    const source = READ_ONLY_RICH_SOURCES.join('\n');
    for (const forbidden of [
      /\bRun\b/u,
      /\bRetry\b/u,
      /\bEdit\b/u,
      /\bApprove\b/u,
      /\bApply\b/u,
      /\bDownload\b/u,
      /\bPublish\b/u,
      /Open-on-host/u,
      /Share-file/u,
      /dangerouslySetInnerHTML/u,
      /\binnerHTML\b/u,
      /\b(?:readFile|writeFile|appendFile|unlink|mkdir|readdir)\b/u,
      /\bmutation-ticket\b/u,
      /\brich-content-fetch\b/u,
      /\bfetch\s*\(/u,
      /\bXMLHttpRequest\b/u,
    ]) {
      expect(source).not.toMatch(forbidden);
    }
    expect(source).toContain('postMessage');
    expect(source).toContain('worker.terminate()');
    expect(source).toContain('sourceState');
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

  it('rejects path and symlink injection, polyglot bytes, scanner timeout, and forced byte flips', async () => {
    const publish = vi.fn();
    for (const output of [
      { source: 'extension', mediaClass: 'raster', capabilityHandle: 'opaque_security_handle_001', path: '/private/image.png' },
      { source: 'extension', mediaClass: 'raster', capabilityHandle: 'opaque_security_handle_001', symlink: '/private/image.png' },
    ]) {
      await expect(publishApprovedImage(output, { publish })).rejects.toThrow();
    }
    expect(publish).not.toHaveBeenCalled();

    const source = securityPngFixture();
    const clearScanner = { scan: () => ({ status: 'clear' as const, matches: [] }) };
    const polyglot = Buffer.concat([source, Buffer.from('<script>opaque</script>', 'utf8')]);
    const polyglotResult = await sanitizeInboundImage(polyglot, {
      declaredByteLength: polyglot.byteLength,
      scanner: clearScanner,
    });
    expect(polyglotResult.status).toBe('withheld');

    const originalDigest = createHash('sha256').update(source).digest('hex');
    const flipped = Buffer.from(source);
    flipped[flipped.byteLength - 1] = (flipped[flipped.byteLength - 1] ?? 0) ^ 1;
    const flippedResult = await sanitizeInboundImage(flipped, {
      declaredByteLength: flipped.byteLength,
      expectedDigest: originalDigest,
      scanner: clearScanner,
    });
    expect(flippedResult).toEqual({ status: 'withheld', reason: 'policy' });

    const timeoutResult = await sanitizeInboundImage(source, {
      declaredByteLength: source.byteLength,
      deadlineMs: 1,
      scanner: { scan: () => new Promise<never>(() => undefined) },
    });
    expect(timeoutResult).toEqual({ status: 'withheld', reason: 'redaction-unavailable' });

    const root = mkdtempSync(join(tmpdir(), 'pi-remote-negative-'));
    const link = `${root}-link`;
    symlinkSync(root, link, 'dir');
    try {
      const symlinkResult = await sanitizeInboundImage(source, {
        declaredByteLength: source.byteLength,
        quarantineRoot: link,
        scanner: clearScanner,
      });
      expect(symlinkResult).toEqual({ status: 'withheld', reason: 'policy' });
    } finally {
      rmSync(link, { force: true });
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('keeps normalized bytes inside the Pi request and out of durable outbound surfaces', async () => {
    const pixelCanary = 'PIXEL_CANARY_SECURITY';
    const owner: AttachmentOwner = {
      sessionToken: 'session_token_security',
      sessionId: 'session_local',
      sessionEpoch: 'epoch_security',
      deviceId: 'device_security',
      principal: PRINCIPAL,
      origin: ORIGIN,
    };
    const reservation = {
      setId: 'set_security_image',
      owner,
      binding: {
        sessionId: 'session_local',
        sessionEpoch: 'epoch_security',
        expectedPromptRevision: 0,
        submissionId: 'submission_security_image',
      },
      manifest: {
        submissionId: 'submission_security_image',
        sessionId: 'session_local',
        ticket: 'ticket_security_image',
        expiresAt: '2026-01-01T00:01:00.000Z',
      },
      modelId: 'model_label_must_not_be_used_as_gate',
      policyVersion: 1,
      expiresAt: NOW + 60_000,
    };
    const part = {
      setId: reservation.setId,
      attachmentId: 'attachment_security_image',
      partId: 'part_security_image',
      item: {
        clientId: 'client_security_image',
        ordinal: 1,
        declaredType: 'image/png' as const,
        byteLength: pixelCanary.length,
        sha256: 'c'.repeat(43),
      },
    };
    const status: AttachmentStatusDto = {
      attachmentSetId: reservation.setId,
      revision: 0,
      status: 'ready',
      expiresAt: reservation.manifest.expiresAt,
      parts: [
        {
          attachmentSetId: reservation.setId,
          attachmentId: part.attachmentId,
          partId: part.partId,
          ordinal: 1,
          status: 'ready',
        },
      ],
    };
    let piRequest: PiRpcCommand | undefined;
    const send = vi.fn(async (command: PiRpcCommand): Promise<PiRpcResponse> => {
      piRequest = command;
      return { id: command.id, type: 'response', command: command.type, success: true };
    });
    const source: PiImageAttachmentSource = {
      getReservation: () => reservation,
      getPartRecords: () => [part],
      status: () => status,
      loadNormalizedDerivative: async () => ({
        bytes: new Uint8Array(Buffer.from(pixelCanary, 'utf8')),
        mimeType: 'image/png',
      }),
      acknowledgeDelivered: async () => undefined,
      markDeliveryUnknown: async () => undefined,
    };
    const bridge = new PiImageBridge({
      supervisor: { send },
      attachments: source,
      getRuntimeSnapshot: () => securityRuntimeSnapshot(),
      currentPromptRevision: () => 0,
      planPolicy: () => true,
      now: () => new Date(NOW),
    });

    await bridge.submit(
      {
        type: 'prompt.submit',
        submissionId: 'submission_security_image',
        sessionId: 'session_local',
        message: '',
        ticket: 'ticket_security_image',
        expectedPromptRevision: 0,
        attachmentSetId: reservation.setId,
        attachmentIds: [part.attachmentId],
      },
      owner,
    );
    expect(piRequest).toBeDefined();
    expect(isPiRpcCommand(piRequest)).toBe(true);
    expect(JSON.stringify(piRequest)).not.toContain(pixelCanary);

    const attachmentEnvelope = {
      v: 1 as const,
      eventId: 'event_security_attachment',
      kind: 'transcript.block',
      hostId: IDENTITY.hostId,
      workspaceRef: IDENTITY.workspaceRef,
      sessionId: 'session_local',
      epoch: 'epoch_security',
      seq: 1,
      occurredAt: '2026-01-01T00:00:00.000Z',
      causedBy: null,
      payload: {
        kind: 'attachment',
        id: 'attachment_card_security',
        revision: 1,
        seq: 1,
        occurredAt: '2026-01-01T00:00:00.000Z',
        role: 'user',
        mediaKind: 'image',
        ordinal: 1,
        status: 'delivered',
        previewRetained: false,
        filename: 'private.png',
        path: '/Users/private.png',
        hash: 'private-hash',
        url: 'https://private.example/image',
        providerPayload: { data: pixelCanary },
      },
      redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
      replay: { eligible: true, snapshotEligible: true },
    } as const;
    const store = new RelayStore();
    try {
      const committed = store.appendEnvelope(attachmentEnvelope);
      const pushBytes = Buffer.from(
        serializePushHint({
          lookupId: 'hint_security_image',
          attentionClass: 'needs_input',
          generation: 1,
          nonce: 'nonce_security_image',
          transcript: pixelCanary,
        }),
      );
      const surfaces = JSON.stringify({
        committed,
        page: store.getTranscriptPage({
          hostId: IDENTITY.hostId,
          workspaceRef: IDENTITY.workspaceRef,
          sessionId: 'session_local',
        }),
        sync: store.createSyncPlan({
          hostId: IDENTITY.hostId,
          workspaceRef: IDENTITY.workspaceRef,
          sessionId: 'session_local',
        }),
        push: pushBytes.toString('utf8'),
      });
      expect(surfaces).not.toContain(pixelCanary);
      expect(surfaces).not.toContain('private.png');
      expect(surfaces).not.toContain('private-hash');
      expect(surfaces).not.toContain('https://private.example/image');

      const bridgeSource = readFileSync(
        new URL('../../src/attachments/pi-image-bridge.ts', import.meta.url),
        'utf8',
      );
      expect(bridgeSource).not.toContain("from 'node:fs'");
      expect(bridgeSource).not.toContain('writeFile');
      expect(bridgeSource).not.toContain('process.cwd');
    } finally {
      store.close();
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

function securityPngFixture(width = 2, height = 2): Buffer {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = y * (width * 4 + 1) + 1 + x * 4;
      raw[offset] = 210;
      raw[offset + 1] = 170;
      raw[offset + 2] = 140;
      raw[offset + 3] = 255;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    securityPngChunk('IHDR', header),
    securityPngChunk('IDAT', deflateSync(raw)),
    securityPngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function securityPngChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.byteLength);
  chunk.writeUInt32BE(data.byteLength, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(securityCrc32(Buffer.concat([typeBytes, data])), 8 + data.byteLength);
  return chunk;
}

function securityCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function securityRuntimeSnapshot() {
  return {
    sessionId: 'session_local',
    state: {
      sessionId: 'session_local',
      revision: 0,
      model: null,
      thinkingLevel: 'unknown',
      availableThinkingLevels: [],
      mode: 'build' as const,
      streaming: false,
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    models: {
      sessionId: 'session_local',
      catalogRevision: 1,
      runtimeRevision: 0,
      currentModel: null,
      streaming: false,
      canSetModelWhileStreaming: false,
      models: [],
    },
    media: { enabled: true, imageIn: true, policy: DEFAULT_MEDIA_POLICY },
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
