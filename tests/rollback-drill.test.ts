// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Release Rollback Drill Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { runRollbackDrill } from '../app-relay/src/release/rollback-drill.js';

// ───────────────────────────────────────────────────────────────────
// 2. TESTS
// ───────────────────────────────────────────────────────────────────

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
    // Full-access rollback relaunches desktop-parity vector without a schema migration.
    expect(report.fullAccessRelaunchArgs).toEqual(['--mode', 'rpc', '--no-session', '--approve']);
  });
});
