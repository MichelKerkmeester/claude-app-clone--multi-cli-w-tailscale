// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Threshold Evaluator
// ───────────────────────────────────────────────────────────────────

import { gzipSync } from 'node:zlib';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

export const REQUIRED_METRICS = [
  'foregroundP95LatencyMs',
  'streamingCadenceMs',
  'queueMemoryBytes',
  'replaySnapshotBytes',
  'storageGrowthBytes',
  'restartRecoveryMs',
  'wcagConformanceLevel',
  'bundleGzipBytes',
];

export function evaluateThresholds(config, measurements) {
  const failures = [];
  const results = {};
  if (
    config?.schemaVersion !== 1 ||
    typeof config.metrics !== 'object' ||
    config.metrics === null
  ) {
    return {
      machineStatus: 'FAIL',
      failures: ['Threshold configuration must use schemaVersion 1.'],
      results,
    };
  }

  for (const metric of REQUIRED_METRICS) {
    if (!(metric in config.metrics)) failures.push(`Missing required threshold '${metric}'.`);
  }
  for (const metric of Object.keys(measurements)) {
    if (!(metric in config.metrics))
      failures.push(`Measured metric '${metric}' has no declared threshold.`);
  }

  for (const [metric, declaration] of Object.entries(config.metrics)) {
    const validDeclaration =
      declaration !== null &&
      typeof declaration === 'object' &&
      Number.isFinite(declaration.threshold) &&
      (declaration.comparison === 'max' || declaration.comparison === 'min') &&
      (declaration.source === 'machine' || declaration.source === 'operator');
    if (!validDeclaration) {
      failures.push(`Threshold '${metric}' must declare a finite number, comparison, and source.`);
      results[metric] = { status: 'FAIL', reason: 'invalid-threshold' };
      continue;
    }

    const measurement = measurements[metric];
    if (measurement === undefined) {
      const status = declaration.source === 'operator' ? 'PENDING' : 'FAIL';
      results[metric] = { status, reason: `${declaration.source}-measurement-missing` };
      if (status === 'FAIL') failures.push(`Machine metric '${metric}' was not measured.`);
      continue;
    }
    if (
      measurement === null ||
      typeof measurement !== 'object' ||
      !Number.isFinite(measurement.value)
    ) {
      failures.push(`Measurement '${metric}' must contain a finite numeric value.`);
      results[metric] = { status: 'FAIL', reason: 'invalid-measurement' };
      continue;
    }

    const passed =
      declaration.comparison === 'max'
        ? measurement.value <= declaration.threshold
        : measurement.value >= declaration.threshold;
    results[metric] = {
      status: passed ? 'PASS' : 'FAIL',
      value: measurement.value,
      threshold: declaration.threshold,
      comparison: declaration.comparison,
      unit: declaration.unit,
      source: declaration.source,
      ...(measurement.details === undefined ? {} : { details: measurement.details }),
    };
    if (!passed) {
      failures.push(
        `Measurement '${metric}' (${measurement.value}) violated ${declaration.comparison} threshold ${declaration.threshold}.`,
      );
    }
  }

  return {
    machineStatus: failures.length === 0 ? 'PASS' : 'FAIL',
    failures,
    results,
  };
}

export async function collectMachineMeasurements(appRoot) {
  const webDist = path.join(appRoot, 'apps/pi-remote-web/dist');
  const bundleFiles = listFiles(webDist).filter((file) => /\.(?:css|html|js)$/.test(file));
  if (bundleFiles.length === 0) throw new Error('Web build output is missing.');
  const bundleGzipBytes = bundleFiles.reduce(
    (total, file) => total + gzipSync(readFileSync(file)).byteLength,
    0,
  );

  const releaseRoot = path.join(appRoot, 'release');
  const tempRoot = mkdtempSync(path.join(releaseRoot, '.tmp-threshold-'));
  const databasePath = path.join(tempRoot, 'threshold.db');
  try {
    const { RelayStore } = await import('../apps/pi-remote-relay/dist/store/relay-store.js');
    const identity = {
      hostId: 'host_release',
      workspaceRef: 'workspace_release',
      sessionId: 'session_release',
    };
    const store = new RelayStore({ filename: databasePath, retentionEvents: 1_000 });
    store.databaseHandle().pragma('wal_checkpoint(TRUNCATE)');
    const baselineBytes = statSync(databasePath).size;
    for (let seq = 1; seq <= 1_001; seq += 1) {
      store.appendEnvelope({
        v: 1,
        eventId: `event_release_${seq}`,
        kind: 'pi.message_update',
        ...identity,
        epoch: 'epoch_release',
        seq,
        occurredAt: new Date(1_767_225_600_000 + seq).toISOString(),
        causedBy: null,
        payload: { type: 'message_update', delta: 'x'.repeat(128) },
        redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
        replay: { eligible: true, snapshotEligible: true },
      });
    }
    const snapshot = store.createSyncPlan(identity);
    const retained = store
      .databaseHandle()
      .prepare('SELECT COUNT(*) AS count FROM envelopes')
      .get().count;
    if (retained !== 1_000 || snapshot.messages[0]?.kind !== 'sync.snapshot') {
      throw new Error('Retention or snapshot recovery did not produce the declared bounded state.');
    }
    const replaySnapshotBytes = Buffer.byteLength(JSON.stringify(snapshot));
    store.databaseHandle().pragma('wal_checkpoint(TRUNCATE)');
    const storageGrowthBytes = statSync(databasePath).size - baselineBytes;
    store.close();

    const restartStarted = performance.now();
    const restarted = new RelayStore({ filename: databasePath, retentionEvents: 1_000 });
    const databaseReopenMs = Number((performance.now() - restartStarted).toFixed(3));
    const reconnectStarted = performance.now();
    const recovered = restarted.createSyncPlan(identity);
    const reconnectSnapshotMs = Number((performance.now() - reconnectStarted).toFixed(3));
    const restartRecoveryMs = Number((performance.now() - restartStarted).toFixed(3));
    restarted.close();
    if (
      recovered.messages[0]?.kind !== 'sync.snapshot' ||
      recovered.messages[0].envelopes.length !== 1_000
    ) {
      throw new Error('Restart recovery did not restore the retained snapshot.');
    }

    return {
      bundleGzipBytes: {
        value: bundleGzipBytes,
        details: { files: bundleFiles.length },
      },
      replaySnapshotBytes: {
        value: replaySnapshotBytes,
        details: { retainedEnvelopes: retained },
      },
      storageGrowthBytes: {
        value: storageGrowthBytes,
        details: { insertedEnvelopes: 1_001, retainedEnvelopes: retained },
      },
      restartRecoveryMs: {
        value: restartRecoveryMs,
        details: {
          databaseReopenMs,
          reconnectSnapshotMs,
          recoveredEnvelopes: 1_000,
        },
      },
    };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(target) : [target];
  });
}
