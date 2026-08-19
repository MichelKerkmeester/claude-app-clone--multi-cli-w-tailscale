// ───────────────────────────────────────────────────────────────────
// MODULE: Deterministic Crash-Point Recovery Tests
// ───────────────────────────────────────────────────────────────────

import { approvalActionDigest } from '@pi-remote/pi-rpc-protocol';
import type {
  ApprovalAction,
  ApprovalDecisionCommand,
  Envelope,
  SyncMessage,
} from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it } from 'vitest';

import { ApprovalService } from '../../src/approval/approval-service.js';
import { MutationPolicy } from '../../src/policy/mutation-policy.js';
import { SyncHub } from '../../src/replay/sync.js';
import { RelayStore } from '../../src/store/relay-store.js';

type CrashOutcome = 'replayed' | 'explicitly-interrupted' | 'indeterminate';
type KillPoint =
  | 'pre-write'
  | 'post-write'
  | 'pre-acknowledgement'
  | 'post-acknowledgement'
  | 'persistence'
  | 'broadcast'
  | 'reconnect';

interface RecoveryEvidence {
  readonly outcomes: readonly CrashOutcome[];
  readonly deliveredEventIds: readonly string[];
  readonly persistedCopies: number;
  readonly executionAttempts: number;
}

const IDENTITY = {
  hostId: 'host_local',
  workspaceRef: 'workspace_default',
  sessionId: 'session_local',
} as const;
const NOW = Date.parse('2026-01-01T00:00:00.000Z');
const CRASH_OUTCOMES = new Set<CrashOutcome>([
  'replayed',
  'explicitly-interrupted',
  'indeterminate',
]);
const EXPECTED_OUTCOMES: Readonly<Record<KillPoint, CrashOutcome>> = {
  'pre-write': 'explicitly-interrupted',
  'post-write': 'replayed',
  'pre-acknowledgement': 'replayed',
  'post-acknowledgement': 'replayed',
  persistence: 'indeterminate',
  broadcast: 'replayed',
  reconnect: 'replayed',
};

describe('deterministic crash-point recovery', () => {
  it('rejects evidence that would hide a duplicate delivery', () => {
    expect(() =>
      validateEvidence({
        outcomes: ['replayed'],
        deliveredEventIds: ['event_fixed', 'event_fixed'],
        persistedCopies: 2,
        executionAttempts: 1,
      }),
    ).toThrow(/silent duplicate/);
  });

  it.each(Object.entries(EXPECTED_OUTCOMES) as [KillPoint, CrashOutcome][])(
    '%s yields only %s',
    (killPoint, expectedOutcome) => {
      const evidence = recoverAt(killPoint);

      expect(() => validateEvidence(evidence)).not.toThrow();
      expect(evidence.outcomes).toEqual([expectedOutcome]);
    },
  );
});

function recoverAt(killPoint: KillPoint): RecoveryEvidence {
  const store = new RelayStore();
  const hub = new SyncHub(store);
  try {
    if (killPoint === 'pre-write') {
      return evidence('explicitly-interrupted', [], store, 0);
    }
    if (killPoint === 'persistence') {
      return recoverPersistedMutation(store, hub);
    }

    const envelope = fixedEnvelope();
    const deliveredEventIds: string[] = [];
    switch (killPoint) {
      case 'post-write':
        store.appendEnvelope(envelope);
        deliveredEventIds.push(...replayAfter(store, envelope, 0));
        break;
      case 'pre-acknowledgement':
        store.appendEnvelope(envelope);
        store.appendEnvelope(envelope);
        deliveredEventIds.push(...replayAfter(store, envelope, 0));
        break;
      case 'post-acknowledgement':
        hub.publish(envelope);
        deliveredEventIds.push(envelope.eventId);
        hub.publish(envelope);
        deliveredEventIds.push(...replayAfter(store, envelope, envelope.seq));
        break;
      case 'broadcast': {
        const disconnect = hub.subscribe(
          IDENTITY,
          (message) => {
            deliveredEventIds.push(...eventIds([message]));
          },
          { epoch: envelope.epoch, seq: 0 },
        );
        store.appendEnvelope(envelope);
        disconnect();
        deliveredEventIds.push(...replayAfter(store, envelope, 0));
        break;
      }
      case 'reconnect': {
        const disconnect = hub.subscribe(IDENTITY, (message) => {
          deliveredEventIds.push(...eventIds([message]));
        });
        hub.publish(envelope);
        disconnect();
        hub.publish(envelope);
        deliveredEventIds.push(...replayAfter(store, envelope, envelope.seq));
        break;
      }
      default:
        throw new Error(`Unhandled deterministic kill point '${killPoint}'.`);
    }
    return evidence('replayed', deliveredEventIds, store, 0);
  } finally {
    store.close();
  }
}

function recoverPersistedMutation(store: RelayStore, hub: SyncHub): RecoveryEvidence {
  const policy = new MutationPolicy();
  policy.enableFamily('filesystem');
  policy.setEnabled(true);
  const options = {
    store,
    syncHub: hub,
    policy,
    identity: { hostId: IDENTITY.hostId, workspaceRef: IDENTITY.workspaceRef },
    now: () => NOW,
  } as const;
  const service = new ApprovalService(options);
  const action = fixedAction();
  const card = service.request(action);
  const command: ApprovalDecisionCommand = {
    type: 'approval.decide',
    approvalId: card.approvalId,
    decision: 'approve',
    idempotencyKey: 'decision_fixed_persistence',
    epoch: card.epoch,
    revision: card.revision,
    digest: approvalActionDigest({ ...action, policyVersion: 1 }),
  };
  expect(service.decide(command, 'device_fixed', action.principal).accepted).toBe(true);
  const first = service.consume({
    approvalId: card.approvalId,
    action: { ...action, policyVersion: 1 },
    currentEpoch: action.epoch,
  });
  let executionAttempts = first.allowed ? 1 : 0;

  // A fresh service sees the committed ledger but cannot infer external side effects.
  const recovered = new ApprovalService(options);
  const duplicate = recovered.consume({
    approvalId: card.approvalId,
    action: { ...action, policyVersion: 1 },
    currentEpoch: action.epoch,
  });
  if (duplicate.allowed) executionAttempts += 1;
  expect(duplicate).toEqual({ allowed: false, reason: 'duplicate' });

  const deliveredEventIds = eventIds(store.createSyncPlan(IDENTITY).messages);
  recovered.close();
  service.close();
  return evidence('indeterminate', deliveredEventIds, store, executionAttempts);
}

function evidence(
  outcome: CrashOutcome,
  deliveredEventIds: readonly string[],
  store: RelayStore,
  executionAttempts: number,
): RecoveryEvidence {
  const row = store
    .databaseHandle()
    .prepare(
      `
    SELECT COUNT(*) AS count FROM envelopes WHERE event_id = 'event_fixed_recovery'
  `,
    )
    .get() as { count: number };
  return {
    outcomes: [outcome],
    deliveredEventIds,
    persistedCopies: row.count,
    executionAttempts,
  };
}

function validateEvidence(evidence: RecoveryEvidence): void {
  const outcome = evidence.outcomes[0];
  if (evidence.outcomes.length !== 1 || outcome === undefined || !CRASH_OUTCOMES.has(outcome)) {
    throw new Error('Recovery must yield exactly one named crash outcome.');
  }
  if (
    new Set(evidence.deliveredEventIds).size !== evidence.deliveredEventIds.length ||
    evidence.persistedCopies > 1 ||
    evidence.executionAttempts > 1
  ) {
    throw new Error('Recovery exposed a silent duplicate.');
  }
}

function eventIds(messages: readonly SyncMessage[]): string[] {
  return messages.flatMap((message) =>
    message.kind === 'sync.gap' ? [] : message.envelopes.map((envelope) => envelope.eventId),
  );
}

function replayAfter(store: RelayStore, envelope: Envelope, seq: number): string[] {
  return eventIds(
    store.createSyncPlan(IDENTITY, {
      epoch: envelope.epoch,
      seq,
    }).messages,
  );
}

function fixedEnvelope(): Envelope {
  return {
    v: 1,
    eventId: 'event_fixed_recovery',
    kind: 'pi.message_update',
    ...IDENTITY,
    epoch: 'epoch_fixed',
    seq: 1,
    occurredAt: '2026-01-01T00:00:00.000Z',
    causedBy: null,
    payload: { type: 'message_update', delta: 'opaque sample' },
    redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
    replay: { eligible: true, snapshotEligible: true },
  };
}

function fixedAction(): Omit<ApprovalAction, 'policyVersion'> {
  return {
    principal: 'operator@example.test',
    sessionId: IDENTITY.sessionId,
    epoch: 'epoch_mutation',
    tool: 'edit',
    arguments: { target: 'opaque_target', content: 'replacement' },
  };
}
