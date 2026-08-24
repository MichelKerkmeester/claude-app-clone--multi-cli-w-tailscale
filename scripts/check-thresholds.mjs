// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Threshold Checker
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectMachineMeasurements, evaluateThresholds } from '../release/threshold-gate.mjs';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const appRoot = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const measurementsFlag = args.indexOf('--measurements');

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

try {
  const config = JSON.parse(
    readFileSync(new URL('../release/thresholds.json', import.meta.url), 'utf8'),
  );
  const measurements = await collectMachineMeasurements(appRoot);
  if (measurementsFlag !== -1) {
    const suppliedPath = args[measurementsFlag + 1];
    if (
      suppliedPath === undefined ||
      path.isAbsolute(suppliedPath) ||
      suppliedPath.startsWith('..') ||
      !existsSync(suppliedPath)
    ) {
      throw new Error('--measurements must name an existing app-relative JSON file.');
    }
    Object.assign(measurements, JSON.parse(readFileSync(suppliedPath, 'utf8')));
  }
  const result = evaluateThresholds(config, measurements);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (result.machineStatus !== 'PASS') process.exitCode = 1;
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
