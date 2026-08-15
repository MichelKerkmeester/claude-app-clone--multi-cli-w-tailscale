// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Release Verification Runner
// ───────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { evaluateRollout, validateOperatorEvidence } from '../release/rollout-gate.mjs';

const appRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const args = process.argv.slice(2);
const measurementsPath = relativeInputAfter('--measurements');
const operatorEvidencePath = relativeInputAfter('--operator-evidence');
const evidenceDirectory = path.join(appRoot, 'release/evidence');
mkdirSync(evidenceDirectory, { recursive: true });
const startedAt = new Date().toISOString();
const evidencePath = path.join(
  evidenceDirectory,
  `release-verify-v1-${startedAt.replaceAll(':', '-').replaceAll('.', '-')}.json`,
);
const packageLock = JSON.parse(readFileSync(path.join(appRoot, 'package-lock.json'), 'utf8'));
const tools = {
  node: process.version,
  npm: runVersion('npm', ['--version']),
  eslint: packageVersion('node_modules/eslint'),
  prettier: packageVersion('node_modules/prettier'),
  typescript: packageVersion('node_modules/typescript'),
  typescriptEslint: packageVersion('node_modules/typescript-eslint'),
  vitest: packageVersion('node_modules/vitest'),
  vite: packageVersion('node_modules/vite'),
  jsdom: packageVersion('node_modules/jsdom'),
  testingLibraryReact: packageVersion('node_modules/@testing-library/react'),
};

const gates = [
  runGate(
    'typecheck',
    'npm run typecheck',
    'npm',
    ['run', 'typecheck'],
    ['node', 'npm', 'typescript'],
  ),
  runGate(
    'lint',
    'npm run lint',
    'npm',
    ['run', 'lint'],
    ['node', 'npm', 'eslint', 'typescriptEslint'],
  ),
  runGate(
    'format-check',
    'npm run format:check',
    'npm',
    ['run', 'format:check'],
    ['node', 'npm', 'prettier'],
  ),
  runGate('tests', 'npm test', 'npm', ['test'], ['node', 'npm', 'vitest']),
  runGate(
    'web-tests',
    'npm run test:web',
    'npm',
    ['run', 'test:web'],
    ['node', 'npm', 'vitest', 'jsdom', 'testingLibraryReact'],
  ),
  runGate(
    'web-build',
    'npm run build -w @pi-remote/web',
    'npm',
    ['run', 'build', '-w', '@pi-remote/web'],
    ['node', 'npm', 'typescript', 'vite'],
  ),
  runGate(
    'workspace-build',
    'npm run build',
    'npm',
    ['run', 'build'],
    ['node', 'npm', 'typescript', 'vite'],
  ),
  runGate(
    'rollback-drill',
    'node scripts/rollback-drill.mjs',
    process.execPath,
    ['scripts/rollback-drill.mjs'],
    ['node'],
  ),
  runGate(
    'thresholds',
    `node scripts/check-thresholds.mjs${measurementsPath === undefined ? '' : ` --measurements ${measurementsPath}`}`,
    process.execPath,
    [
      'scripts/check-thresholds.mjs',
      ...(measurementsPath === undefined ? [] : ['--measurements', measurementsPath]),
    ],
    ['node'],
  ),
];

const rollback = parseGateJson(gates.find((gate) => gate.id === 'rollback-drill'));
const thresholds = parseGateJson(gates.find((gate) => gate.id === 'thresholds'));
const coreGates = gates.filter((gate) => gate.id !== 'thresholds');
const claims = {
  'machine:whole-gate': {
    status: coreGates.every((gate) => gate.exitStatus === 0) ? 'PASS' : 'FAIL',
  },
  'machine:rollback-drill': { status: rollback?.status === 'PASS' ? 'PASS' : 'FAIL' },
};
for (const [metric, result] of Object.entries(thresholds?.results ?? {})) {
  claims[`threshold:${metric}`] = { status: result.status };
}
if (operatorEvidencePath !== undefined) {
  Object.assign(
    claims,
    validateOperatorEvidence(
      JSON.parse(readFileSync(path.join(appRoot, operatorEvidencePath), 'utf8')),
    ),
  );
}
const rolloutConfig = JSON.parse(readFileSync(path.join(appRoot, 'release/rollout.json'), 'utf8'));
const rollout = evaluateRollout(rolloutConfig, claims);
const machineStatus =
  gates.every((gate) => gate.exitStatus === 0) && rollout.machineStatus === 'PASS'
    ? 'PASS'
    : 'FAIL';
const stageReadiness = {
  ready: rollout.stages.filter((stage) => stage.status === 'READY').map((stage) => stage.id),
  notReady: rollout.stages.filter((stage) => stage.status !== 'READY').map((stage) => stage.id),
};
const evidence = {
  schemaVersion: 1,
  kind: 'pi-remote-release-verification',
  startedAt,
  completedAt: new Date().toISOString(),
  machineStatus,
  stageReadiness,
  environment: {
    platform: process.platform,
    architecture: process.arch,
    node: process.version,
  },
  tools,
  gates,
  thresholds,
  rollback,
  claims,
  rollout,
};
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');

process.stdout.write(`Release verification: ${machineStatus}\n`);
process.stdout.write(`Evidence: ${path.relative(appRoot, evidencePath)}\n`);
for (const stage of rollout.stages) {
  const blocked = stage.evidence.filter((item) => item.status !== 'PASS').map((item) => item.id);
  process.stdout.write(
    `${stage.id}: ${stage.status}${blocked.length === 0 ? '' : ` (${blocked.join(', ')})`}\n`,
  );
}
if (machineStatus !== 'PASS') process.exitCode = 1;

function runGate(id, command, executable, args, toolNames) {
  const gateStartedAt = new Date().toISOString();
  const result = spawnSync(executable, args, {
    cwd: appRoot,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
    timeout: 120_000,
  });
  const output = sanitize(`${result.stdout ?? ''}${result.stderr ?? ''}`);
  return {
    id,
    command,
    startedAt: gateStartedAt,
    completedAt: new Date().toISOString(),
    toolVersions: Object.fromEntries(toolNames.map((name) => [name, tools[name]])),
    exitStatus: result.status ?? 1,
    signal: result.signal,
    output,
    outputSha256: createHash('sha256').update(output).digest('hex'),
  };
}

function parseGateJson(gate) {
  if (gate?.exitStatus !== 0) return undefined;
  const lines = gate.output.trim().split('\n');
  const last = lines.at(-1);
  if (last === undefined) return undefined;
  try {
    return JSON.parse(last);
  } catch {
    return undefined;
  }
}

function sanitize(output) {
  return output
    .replaceAll('\u001b', '')
    .replaceAll(appRoot, '<APP_ROOT>')
    .replaceAll(os.homedir(), '<HOME>')
    .replace(/[A-Za-z0-9_-]{32,}/g, '<REDACTED_LONG_VALUE>')
    .trim();
}

function relativeInputAfter(flag) {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (value === undefined || path.isAbsolute(value) || value.startsWith('..')) {
    throw new Error(`${flag} must name an app-relative JSON file.`);
  }
  return value;
}

function runVersion(executable, args) {
  const result = spawnSync(executable, args, { cwd: appRoot, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : 'unavailable';
}

function packageVersion(packagePath) {
  return packageLock.packages?.[packagePath]?.version ?? 'unavailable';
}
