// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Release Rollback Drill
// ───────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { approvalActionDigest } from '@pi-remote/pi-rpc-protocol';
import type { ApprovalAction, ApprovalDecisionCommand } from '@pi-remote/pi-rpc-protocol';
import Database from 'better-sqlite3';

import { ApprovalService } from '../approval/approval-service.js';
import { fullAccessPiArguments } from '../index.js';
import { MutationPolicy } from '../policy/mutation-policy.js';
import { SyncHub } from '../replay/sync.js';
import { MigrationRunner } from '../store/migrations.js';
import { RelayStore } from '../store/relay-store.js';

export interface RollbackDrillReport {
  readonly schemaVersion: 1;
  readonly status: 'PASS';
  readonly mutationDisabled: true;
  readonly drainedApprovalRows: number;
  readonly restoredMigrationVersion: number;
  readonly relaySessionsPreserved: number;
  readonly indeterminateRowsPreserved: number;
  readonly nativeSessionSentinelPreserved: true;
  readonly fullAccessRelaunchArgs: readonly string[];
  readonly fullAccessRelaunchNeedsMigration: false;
}

/** Exercise authority drain, backup restore and down-migration on app-local disposable state. */
export function runRollbackDrill(releaseRoot = defaultReleaseRoot()): RollbackDrillReport {
  const migrationDirectory = fileURLToPath(new URL('../../migrations/', import.meta.url));
  const tempRoot = mkdtempSync(path.join(releaseRoot, '.tmp-rollback-'));
  const databasePath = path.join(tempRoot, 'relay.db');
  const backupPath = path.join(tempRoot, 'relay.backup.db');
  const nativeSessionPath = path.join(tempRoot, 'pi-native-sessions', 'history.json');
  mkdirSync(path.dirname(nativeSessionPath), { recursive: true });
  writeFileSync(nativeSessionPath, '{"session":"native-history-sentinel"}\n', 'utf8');
  const nativeHash = hashFile(nativeSessionPath);

  try {
    const store = new RelayStore({ filename: databasePath, migrationDirectory });
    store.upsertSession({
      id: 'session_release_drill',
      status: 'interrupted',
      updatedAt: '2026-01-01T00:00:00.000Z',
      messageCount: 7,
    });
    const policy = new MutationPolicy();
    policy.enableFamily('filesystem');
    policy.setEnabled(true);
    const service = new ApprovalService({
      store,
      syncHub: new SyncHub(store),
      policy,
      identity: { hostId: 'host_release', workspaceRef: 'workspace_release' },
      now: () => Date.parse('2026-01-01T00:00:00.000Z'),
    });

    service.request(action('pending'));
    const consumedAction = action('indeterminate');
    const consumedCard = service.request(consumedAction);
    const decision: ApprovalDecisionCommand = {
      type: 'approval.decide',
      approvalId: consumedCard.approvalId,
      decision: 'approve',
      idempotencyKey: 'decision_release_drill',
      epoch: consumedCard.epoch,
      revision: consumedCard.revision,
      digest: approvalActionDigest({ ...consumedAction, policyVersion: 1 }),
    };
    if (!service.decide(decision, 'device_release', consumedAction.principal).accepted) {
      throw new Error('Rollback drill could not approve its disposable action.');
    }
    const consumed = service.consume({
      approvalId: consumedCard.approvalId,
      action: { ...consumedAction, policyVersion: 1 },
      currentEpoch: consumedAction.epoch,
    });
    if (!consumed.allowed)
      throw new Error('Rollback drill could not consume its disposable lease.');
    store
      .databaseHandle()
      .prepare(
        `
      UPDATE approval_leases SET reason = 'external-outcome-indeterminate'
      WHERE approval_id = ? AND status = 'consumed'
    `,
      )
      .run(consumedCard.approvalId);

    policy.setEnabled(false);
    if (policy.status().enabled || !consumed.signal.aborted) {
      throw new Error('Mutation disablement did not abort in-flight authority.');
    }
    const drained = store
      .databaseHandle()
      .prepare(
        `
      SELECT COUNT(*) AS count FROM approval_leases
      WHERE status = 'revoked' AND reason = 'kill-switch'
    `,
      )
      .get() as { count: number };
    if (drained.count < 1) throw new Error('Approval drain did not revoke outstanding authority.');

    service.close();
    store.databaseHandle().pragma('wal_checkpoint(TRUNCATE)');
    store.close();
    copyFileSync(databasePath, backupPath);

    const damaged = new Database(databasePath);
    damaged.exec('DELETE FROM session_catalog; DELETE FROM approval_leases;');
    damaged.close();
    copyFileSync(backupPath, databasePath);

    const restored = new Database(databasePath);
    restored.pragma('foreign_keys = ON');
    const restoredMigrationVersion = new MigrationRunner(
      restored,
      migrationDirectory,
    ).migrateDown();
    const sessions = restored
      .prepare(
        `
      SELECT COUNT(*) AS count FROM session_catalog WHERE id = 'session_release_drill'
    `,
      )
      .get() as { count: number };
    const indeterminate = restored
      .prepare(
        `
      SELECT COUNT(*) AS count FROM approval_leases
      WHERE status = 'consumed' AND reason = 'external-outcome-indeterminate'
    `,
      )
      .get() as { count: number };
    restored.close();

    if (restoredMigrationVersion !== 6 || sessions.count !== 1 || indeterminate.count !== 1) {
      throw new Error('Restore or down-migration silently lost release state.');
    }
    if (hashFile(nativeSessionPath) !== nativeHash) {
      throw new Error('Rollback touched the native-session preservation boundary.');
    }

    // The full-access runtime posture adds no schema, so a rollback that redeploys the
    // prior build relaunches it against the already-restored database with no further
    // migration. Prove the restored state reads back exactly as a fresh full-access
    // process would open it.
    const fullAccessRelaunchArgs = [...fullAccessPiArguments()];
    const relaunch = new Database(databasePath);
    relaunch.pragma('foreign_keys = ON');
    const relaunchSessions = relaunch
      .prepare(`SELECT COUNT(*) AS count FROM session_catalog WHERE id = 'session_release_drill'`)
      .get() as { count: number };
    relaunch.close();
    if (relaunchSessions.count !== 1) {
      throw new Error('Full-access relaunch could not read restored session state.');
    }

    return {
      schemaVersion: 1,
      status: 'PASS',
      mutationDisabled: true,
      drainedApprovalRows: drained.count,
      restoredMigrationVersion,
      relaySessionsPreserved: sessions.count,
      indeterminateRowsPreserved: indeterminate.count,
      nativeSessionSentinelPreserved: true,
      fullAccessRelaunchArgs,
      fullAccessRelaunchNeedsMigration: false,
    };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function action(suffix: string): Omit<ApprovalAction, 'policyVersion'> {
  return {
    principal: 'operator@example.test',
    sessionId: 'session_release_drill',
    epoch: 'epoch_release_drill',
    tool: 'edit',
    arguments: { target: `opaque_${suffix}`, content: 'disposable' },
  };
}

function defaultReleaseRoot(): string {
  return fileURLToPath(new URL('../../../release/', import.meta.url));
}

function hashFile(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}
