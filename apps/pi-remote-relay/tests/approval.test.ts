// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Approval Service Tests
// ───────────────────────────────────────────────────────────────────

import {
  approvalActionDigest,
  type ApprovalAction,
  type ApprovalDecisionCommand,
} from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it } from 'vitest';

import { ApprovalService } from '../src/approval/approval-service.js';
import { verifyFinalGate } from '../src/approval/final-gate.js';
import { MutationPolicy } from '../src/policy/mutation-policy.js';
import { SyncHub } from '../src/replay/sync.js';
import { RelayStore } from '../src/store/relay-store.js';

const IDENTITY = { hostId: 'host_local', workspaceRef: 'workspace_default' } as const;
const PRINCIPAL = 'operator@example.com';

describe('exact-action approval', () => {
  it('recomputes the digest and fails closed for changed bytes and lifecycle states', () => {
    const action = makeAction();
    const lease = {
      principal: action.principal,
      sessionId: action.sessionId,
      epoch: action.epoch,
      digest: approvalActionDigest(action),
      policyVersion: 1,
      expiresAt: '2026-01-01T00:01:00.000Z',
      status: 'approved',
    };
    const check = (overrides: Partial<Parameters<typeof verifyFinalGate>[0]> = {}) =>
      verifyFinalGate({
        action,
        lease,
        currentEpoch: action.epoch,
        currentPolicyVersion: 1,
        policyAllows: true,
        now: Date.parse('2026-01-01T00:00:00.000Z'),
        ...overrides,
      });

    expect(check()).toEqual({ allowed: true, digest: lease.digest });
    expect(
      check({ action: { ...action, arguments: { path: 'safe.txt', content: 'altered' } } }),
    ).toEqual({ allowed: false, reason: 'digest-mismatch' });
    expect(check({ currentEpoch: 'epoch_new' })).toEqual({ allowed: false, reason: 'stale-epoch' });
    expect(check({ now: Date.parse(lease.expiresAt) })).toEqual({
      allowed: false,
      reason: 'expired',
    });
    expect(check({ lease: { ...lease, status: 'consumed' } })).toEqual({
      allowed: false,
      reason: 'duplicate',
    });
    expect(check({ lease: { ...lease, status: 'restart-invalidated' } })).toEqual({
      allowed: false,
      reason: 'restart-invalidated',
    });
    expect(check({ lease: { ...lease, status: 'revoked' } })).toEqual({
      allowed: false,
      reason: 'revoked',
    });
    expect(check({ policyAllows: false })).toEqual({ allowed: false, reason: 'policy-disabled' });
  });

  it('accepts one CAS decision and rejects a second device, stale preconditions, and replay', () => {
    const harness = createHarness();
    try {
      const card = harness.service.request(makeAction());
      const command = decision(card);
      expect(harness.service.decide(command, 'device_one', PRINCIPAL).accepted).toBe(true);
      expect(
        harness.service.decide(
          { ...command, idempotencyKey: 'decision_device_two' },
          'device_two',
          PRINCIPAL,
        ),
      ).toMatchObject({ accepted: false, result: { status: 'raced' } });
      expect(harness.service.decide(command, 'device_one', PRINCIPAL)).toMatchObject({
        accepted: false,
        result: { status: 'duplicate' },
      });

      const stale = harness.service.request(makeAction());
      expect(
        harness.service.decide({ ...decision(stale), epoch: 'epoch_old' }, 'device_one', PRINCIPAL),
      ).toMatchObject({ accepted: false, result: { status: 'stale', reason: 'epoch-mismatch' } });
      expect(
        harness.service.decide(
          { ...decision(stale), digest: 'f'.repeat(64) },
          'device_one',
          PRINCIPAL,
        ),
      ).toMatchObject({ accepted: false, result: { status: 'stale', reason: 'digest-mismatch' } });
    } finally {
      harness.close();
    }
  });

  it('expires and drains in-flight work, revokes, and invalidates stale epochs', async () => {
    const harness = createHarness();
    try {
      const card = harness.service.request({ ...makeAction(), ttlMs: 100 });
      expect(harness.service.decide(decision(card), 'device_one', PRINCIPAL).accepted).toBe(true);
      const consumed = harness.service.consume({
        approvalId: card.approvalId,
        action: makeAction(),
        currentEpoch: 'epoch_one',
      });
      expect(consumed.allowed).toBe(true);
      if (consumed.allowed) {
        await new Promise((resolve) => setTimeout(resolve, 120));
        expect(consumed.signal.aborted).toBe(true);
        expect(consumed.signal.reason).toBe('lease-expired');
      }

      const revocable = harness.service.request(makeAction());
      expect(harness.service.decide(decision(revocable), 'device_one', PRINCIPAL).accepted).toBe(
        true,
      );
      const running = harness.service.consume({
        approvalId: revocable.approvalId,
        action: makeAction(),
        currentEpoch: 'epoch_one',
      });
      expect(running.allowed).toBe(true);
      expect(harness.service.revoke(revocable.approvalId)).toBe(true);
      if (running.allowed) {
        expect(running.signal.aborted).toBe(true);
        expect(running.signal.reason).toBe('lease-revoked');
      }
      const expiring = harness.service.request({ ...makeAction(), ttlMs: 10 });
      harness.setNow(Date.parse(expiring.expiresAt));
      expect(harness.service.expireOutstanding()).toBe(1);

      const revoked = harness.service.request(makeAction());
      expect(harness.service.revoke(revoked.approvalId)).toBe(true);
      expect(harness.service.decide(decision(revoked), 'device_one', PRINCIPAL)).toMatchObject({
        accepted: false,
        result: { status: 'raced' },
      });

      const epochLease = harness.service.request(makeAction());
      expect(harness.service.decide(decision(epochLease), 'device_one', PRINCIPAL).accepted).toBe(
        true,
      );
      const epochRunning = harness.service.consume({
        approvalId: epochLease.approvalId,
        action: makeAction(),
        currentEpoch: 'epoch_one',
      });
      expect(harness.service.request(makeAction())).toBeDefined();
      expect(harness.service.invalidateEpoch('session_local', 'epoch_two')).toBe(2);
      if (epochRunning.allowed) expect(epochRunning.signal.reason).toBe('epoch-invalidated');
    } finally {
      harness.close();
    }
  });

  it('invalidates pending and approved leases after relay restart', () => {
    const harness = createHarness();
    const pending = harness.service.request(makeAction());
    const approved = harness.service.request(makeAction());
    expect(harness.service.decide(decision(approved), 'device_one', PRINCIPAL).accepted).toBe(true);
    const restarted = new ApprovalService({
      store: harness.store,
      syncHub: new SyncHub(harness.store),
      policy: harness.policy,
      identity: IDENTITY,
      now: () => harness.now(),
    });
    try {
      expect(restarted.list('session_local', PRINCIPAL)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            approvalId: pending.approvalId,
            status: 'restart-invalidated',
          }),
          expect.objectContaining({
            approvalId: approved.approvalId,
            status: 'restart-invalidated',
          }),
        ]),
      );
      expect(
        restarted.consume({
          approvalId: approved.approvalId,
          action: makeAction(),
          currentEpoch: 'epoch_one',
        }),
      ).toEqual({ allowed: false, reason: 'restart-invalidated' });
    } finally {
      restarted.close();
      harness.close();
    }
  });

  it('invalidates grants from an old epoch', () => {
    const harness = createHarness();
    try {
      const grant = createGrant(harness.service);
      expect(harness.service.invalidateEpoch('session_local', 'epoch_two')).toBe(1);
      expect(harness.service.getGrantDto(grant.grantId)).toMatchObject({ status: 'revoked' });
      expect(() => harness.service.requestFromGrant(grant.grantId, makeAction())).toThrow(/denied/);
    } finally {
      harness.close();
    }
  });

  it('restart-invalidates active grants', () => {
    const harness = createHarness();
    const grant = createGrant(harness.service);
    const restarted = new ApprovalService({
      store: harness.store,
      syncHub: new SyncHub(harness.store),
      policy: harness.policy,
      identity: IDENTITY,
      now: () => harness.now(),
    });
    try {
      expect(restarted.getGrantDto(grant.grantId)).toMatchObject({ status: 'restart-invalidated' });
      expect(() => restarted.requestFromGrant(grant.grantId, makeAction())).toThrow(/denied/);
    } finally {
      restarted.close();
      harness.close();
    }
  });

  it('revokes active grants when the service closes', () => {
    const harness = createHarness();
    const grant = createGrant(harness.service);
    try {
      harness.service.close();
      expect(harness.service.getGrantDto(grant.grantId)).toMatchObject({ status: 'revoked' });
    } finally {
      harness.close();
    }
  });

  it('uses a bounded accept-edits grant once per exact action with deny precedence', () => {
    const harness = createHarness();
    try {
      const grant = harness.service.createAcceptEditsGrant({
        principal: PRINCIPAL,
        sessionId: 'session_local',
        epoch: 'epoch_one',
        allowedTools: ['edit'],
        remainingActions: 2,
        ttlMs: 1_000,
      });
      const first = harness.service.requestFromGrant(grant.grantId, makeAction());
      expect(first).toMatchObject({ status: 'approved', source: 'accept-edits' });
      expect(harness.service.getGrantDto(grant.grantId)).toMatchObject({
        remainingActions: 1,
        status: 'active',
      });
      expect(() =>
        harness.service.requestFromGrant(grant.grantId, { ...makeAction(), tool: 'bash' }),
      ).toThrow(/denied/);
      harness.service.requestFromGrant(grant.grantId, {
        ...makeAction(),
        arguments: { path: 'second.txt' },
      });
      expect(harness.service.getGrantDto(grant.grantId)).toMatchObject({
        remainingActions: 0,
        status: 'exhausted',
      });
      expect(() => harness.service.requestFromGrant(grant.grantId, makeAction())).toThrow(/denied/);
      expect(() =>
        harness.service.createAcceptEditsGrant({
          principal: PRINCIPAL,
          sessionId: 'session_local',
          epoch: 'epoch_one',
          allowedTools: ['*'],
          remainingActions: 1,
          ttlMs: 1_000,
        }),
      ).toThrow(/must name enabled tools/);

      const deniedAction = { ...makeAction(), arguments: { path: 'denied.txt' } };
      const deniedCard = harness.service.request(deniedAction);
      expect(
        harness.service.decide(
          { ...decision(deniedCard), decision: 'deny' },
          'device_one',
          PRINCIPAL,
        ).accepted,
      ).toBe(true);
      const denyGrant = harness.service.createAcceptEditsGrant({
        principal: PRINCIPAL,
        sessionId: 'session_local',
        epoch: 'epoch_one',
        allowedTools: ['edit'],
        remainingActions: 1,
        ttlMs: 1_000,
      });
      expect(() => harness.service.requestFromGrant(denyGrant.grantId, deniedAction)).toThrow(
        /denied/,
      );
    } finally {
      harness.close();
    }
  });

  it('keeps mutation off by default and drains authority when the kill switch changes', () => {
    const store = new RelayStore();
    const policy = new MutationPolicy();
    const service = new ApprovalService({
      store,
      syncHub: new SyncHub(store),
      policy,
      identity: IDENTITY,
    });
    try {
      expect(policy.status()).toEqual({ enabled: false, family: null });
      expect(() => service.request(makeAction())).toThrow(/disabled/);
      policy.enableFamily('filesystem');
      policy.setEnabled(true);
      const pending = service.request(makeAction());
      const approved = service.request({ ...makeAction(), arguments: { path: 'approved.txt' } });
      expect(service.decide(decision(approved), 'device_one', PRINCIPAL).accepted).toBe(true);
      const grant = createGrant(service);
      policy.setEnabled(false);
      expect(service.list('session_local', PRINCIPAL)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ approvalId: pending.approvalId, status: 'revoked' }),
          expect.objectContaining({ approvalId: approved.approvalId, status: 'revoked' }),
        ]),
      );
      expect(service.getGrantDto(grant.grantId)).toMatchObject({ status: 'revoked' });
      expect(policy.isAllowed('read')).toBe(false);
    } finally {
      service.close();
      store.close();
    }
  });

  it('replaces the enabled command family when another family is enabled', () => {
    const policy = new MutationPolicy();
    policy.enableFamily('filesystem');
    policy.setEnabled(true);

    expect(policy.status()).toEqual({ enabled: true, family: 'filesystem' });
    expect(policy.isAllowed('edit')).toBe(true);

    policy.enableFamily('process');

    expect(policy.status()).toEqual({ enabled: true, family: 'process' });
    expect(policy.isAllowed('edit')).toBe(false);
    expect(policy.isAllowed('bash')).toBe(true);
  });

  it('drains pending, approved, and grant authority when the enabled family changes', () => {
    const harness = createHarness();
    try {
      const pending = harness.service.request(makeAction());
      const approved = harness.service.request({
        ...makeAction(),
        arguments: { path: 'approved.txt' },
      });
      expect(harness.service.decide(decision(approved), 'device_one', PRINCIPAL).accepted).toBe(
        true,
      );
      const grant = createGrant(harness.service);

      harness.policy.enableFamily('process');

      expect(harness.service.list('session_local', PRINCIPAL)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ approvalId: pending.approvalId, status: 'revoked' }),
          expect.objectContaining({ approvalId: approved.approvalId, status: 'revoked' }),
        ]),
      );
      expect(harness.service.getGrantDto(grant.grantId)).toMatchObject({ status: 'revoked' });
    } finally {
      harness.close();
    }
  });

  it('rechecks current policy before using a persisted active grant', () => {
    const harness = createHarness();
    try {
      const grant = createGrant(harness.service);
      harness.policy.enableFamily('process');
      harness.store
        .databaseHandle()
        .prepare(
          `
        UPDATE accept_edits_grants SET status = 'active' WHERE grant_id = ?
      `,
        )
        .run(grant.grantId);

      expect(() => harness.service.requestFromGrant(grant.grantId, makeAction())).toThrow(/denied/);
      expect(harness.service.list('session_local', PRINCIPAL)).toEqual([]);
      expect(harness.service.getGrantDto(grant.grantId)).toMatchObject({ remainingActions: 2 });
    } finally {
      harness.close();
    }
  });

  it('redacts secrets before replay, snapshots, catalog, audit, and approval cards', () => {
    const harness = createHarness();
    const canary = 'CANARY_SECRET_93ae4d218';
    const hostPath = '/Users/alice/private/canary.txt';
    try {
      const card = harness.service.request({
        ...makeAction(),
        arguments: {
          path: hostPath,
          authorization: `Bearer ${canary}`,
          password: canary,
          content: `token=${canary}`,
        },
      });
      const replay = harness.store.createSyncPlan({ ...IDENTITY, sessionId: 'session_local' });
      const surfaces = JSON.stringify({
        replay,
        snapshot: replay.messages,
        catalog: harness.store.listSessions(),
        audit: harness.store.databaseHandle().prepare('SELECT * FROM approval_audit').all(),
        cache: harness.service.list('session_local', PRINCIPAL),
        logs: [card.digest, card.approvalId],
      });
      expect(surfaces).not.toContain(canary);
      expect(surfaces).not.toContain(hostPath);
      expect(surfaces).not.toContain(PRINCIPAL);
      expect(surfaces).not.toContain('approval.decide');
      expect(surfaces).toContain('[REDACTED_SECRET]');
      expect(surfaces).toContain('[REDACTED_PATH]');
    } finally {
      harness.close();
    }
  });
});

function createHarness() {
  let now = Date.parse('2026-01-01T00:00:00.000Z');
  const store = new RelayStore();
  const policy = new MutationPolicy();
  policy.enableFamily('filesystem');
  policy.setEnabled(true);
  const service = new ApprovalService({
    store,
    syncHub: new SyncHub(store),
    policy,
    identity: IDENTITY,
    now: () => now,
  });
  return {
    store,
    policy,
    service,
    now: () => now,
    setNow: (value: number) => {
      now = value;
    },
    close: () => {
      service.close();
      store.close();
    },
  };
}

function makeAction(): ApprovalAction {
  return {
    principal: PRINCIPAL,
    sessionId: 'session_local',
    epoch: 'epoch_one',
    tool: 'edit',
    arguments: { path: 'safe.txt', content: 'hello' },
    policyVersion: 1,
  };
}

function createGrant(service: ApprovalService) {
  return service.createAcceptEditsGrant({
    principal: PRINCIPAL,
    sessionId: 'session_local',
    epoch: 'epoch_one',
    allowedTools: ['edit'],
    remainingActions: 2,
    ttlMs: 1_000,
  });
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
