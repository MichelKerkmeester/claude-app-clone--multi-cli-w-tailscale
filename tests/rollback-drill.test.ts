// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Release Rollback Drill Tests
// ───────────────────────────────────────────────────────────────────

import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { runRollbackDrill } from '../app-relay/src/release/rollback-drill.js';

describe('executable rollback drill', () => {
  it('executes restore and down-migration without losing sessions or uncertainty', () => {
    const releaseRoot = fileURLToPath(new URL('../release/', import.meta.url));
    const report = runRollbackDrill(releaseRoot);

    expect(report).toMatchObject({
      status: 'PASS',
      mutationDisabled: true,
      restoredMigrationVersion: 6,
      relaySessionsPreserved: 1,
      indeterminateRowsPreserved: 1,
      nativeSessionSentinelPreserved: true,
      fullAccessRelaunchNeedsMigration: false,
    });
    expect(report.drainedApprovalRows).toBeGreaterThanOrEqual(1);
    // The full-access rollback path relaunches the verified desktop-parity vector and
    // never depends on a schema migration to restore runtime state.
    expect(report.fullAccessRelaunchArgs).toEqual(['--mode', 'rpc', '--no-session', '--approve']);
  });
});
