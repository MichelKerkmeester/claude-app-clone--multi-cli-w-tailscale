// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Release Rollback Drill Tests
// ───────────────────────────────────────────────────────────────────

import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { runRollbackDrill } from '../apps/pi-remote-relay/src/release/rollback-drill.js';

describe('executable rollback drill', () => {
  it('executes restore and down-migration without losing sessions or uncertainty', () => {
    const releaseRoot = fileURLToPath(new URL('../release/', import.meta.url));
    const report = runRollbackDrill(releaseRoot);

    expect(report).toMatchObject({
      status: 'PASS',
      mutationDisabled: true,
      restoredMigrationVersion: 4,
      relaySessionsPreserved: 1,
      indeterminateRowsPreserved: 1,
      nativeSessionSentinelPreserved: true,
    });
    expect(report.drainedApprovalRows).toBeGreaterThanOrEqual(1);
  });
});
