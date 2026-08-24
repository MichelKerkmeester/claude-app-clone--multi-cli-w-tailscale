// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Rollout Checker
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateRollout, validateOperatorEvidence } from '../release/rollout-gate.mjs';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const appRoot = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

try {
  const evidencePath = valueAfter('--evidence') ?? latestEvidencePath();
  if (evidencePath === undefined || !existsSync(evidencePath)) {
    throw new Error('No release evidence exists. Run npm run release:verify first.');
  }
  const evidenceDocument = JSON.parse(readFileSync(evidencePath, 'utf8'));
  const operatorPath = valueAfter('--operator-evidence');
  const operator =
    operatorPath === undefined ? undefined : JSON.parse(readFileSync(operatorPath, 'utf8'));
  const claims = {
    ...(evidenceDocument.claims ?? {}),
    ...validateOperatorEvidence(operator),
  };
  const config = JSON.parse(
    readFileSync(new URL('../release/rollout.json', import.meta.url), 'utf8'),
  );
  const result = evaluateRollout(config, claims);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  const requiredStage = valueAfter('--require-ready');
  if (
    result.machineStatus !== 'PASS' ||
    (requiredStage !== undefined &&
      result.stages.find((stage) => stage.id === requiredStage)?.status !== 'READY')
  ) {
    process.exitCode = 1;
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

function latestEvidencePath() {
  const directory = path.join(appRoot, 'release/evidence');
  if (!existsSync(directory)) return undefined;
  const files = readdirSync(directory)
    .filter((file) => /^release-verify-v1-.*\.json$/.test(file))
    .sort()
    .reverse();
  return files[0] === undefined ? undefined : path.join(directory, files[0]);
}
