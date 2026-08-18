// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Release Verification Runner
// ───────────────────────────────────────────────────────────────────

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

const boundaryGates = [
  runBoundaryGate('boundary-default-deny', () => {
    const host = readSource('extensions/pi-remote-inbound-media/src/index.ts');
    const plan = readSource('extensions/pi-remote-plan/src/index.ts');
    const auth = readSource('apps/pi-remote-relay/src/auth/policy.ts');
    const mutation = readSource('apps/pi-remote-relay/src/policy/mutation-policy.ts');
    return [
      host.includes('runtimeSnapshot') && host.includes('isRuntimeMediaCapabilityEnabled'),
      host.includes('capability === undefined'),
      host.includes('ALLOWLISTED_INBOUND_MEDIA_SOURCES'),
      plan.includes("'artifact:read'") && plan.includes("'artifact:publish'"),
      plan.includes('isHostAuthoritativeMediaTool'),
      auth.includes('HOST_AUTHORITATIVE_ACTIONS') && auth.includes('READ_ONLY_ACTIONS'),
      auth.includes('isPhoneGrantableAction'),
      mutation.includes('private enabled = false') && mutation.includes("'kill-switch'"),
      mutation.includes('this.families.clear()'),
    ];
  }),
  runBoundaryGate('boundary-publication-read-split', () => {
    const server = readSource('apps/pi-remote-relay/src/http/server.ts');
    const sanitizer = readSource('apps/pi-remote-relay/src/store/artifact-sanitizer.ts');
    const store = readSource('apps/pi-remote-relay/src/store/artifact-store.ts');
    return [
      server.includes("path === '/api/extension/artifacts/publish'"),
      server.includes('auth.consumeArtifactPublishTicket'),
      server.includes("path === '/api/artifacts/read'"),
      server.includes("'cache-control': 'private, no-store, max-age=0'"),
      sanitizer.includes('INBOUND_IMAGE_DECODE_DEADLINE_MS'),
      sanitizer.includes("'redaction-unavailable'"),
      sanitizer.includes('matchesInboundDigest'),
      sanitizer.includes('lstatSync(root).isSymbolicLink()'),
      store.includes('readInboundVariant'),
      store.includes('revokeInboundArtifact'),
      store.includes('purgeInboundExpired'),
      store.includes('writeAtomicInboundFile'),
      store.includes('mode: 0o600'),
    ];
  }),
  runBoundaryGate('boundary-release-hygiene', () => {
    const host = readSource('extensions/pi-remote-inbound-media/src/index.ts');
    const release = readSource('scripts/release-verify.mjs');
    const cdp = readSource('scripts/inbound-media-cdp.mjs');
    const indexHtml = readSource('apps/pi-remote-web/index.html');
    const serviceWorker = readSource('apps/pi-remote-web/public/service-worker.js');
    return [
      !host.includes('options.stdout') && !host.includes('options.session'),
      !host.includes('console.') && !host.includes('base64'),
      !release.includes(['output', 'Sha256'].join('')) &&
        !release.includes(['Evid', 'ence:'].join('')),
      release.includes("PI_REMOTE_MEDIA_ENABLED: '0'"),
      cdp.includes("fixture === 'end-to-end'"),
      cdp.includes("'pi-remote:privacy-cover'"),
      cdp.includes("artifact-viewer-privacy-curtain"),
      indexHtml.includes("img-src 'self' blob:") && indexHtml.includes("connect-src 'self'"),
      indexHtml.includes("object-src 'none'"),
      serviceWorker.includes("url.pathname.startsWith('/api/artifacts/')"),
      serviceWorker.includes("cache: 'no-store'"),
      noScopedMediaResidue(),
    ];
  }),
];

const gates = [
  ...boundaryGates,
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
    `node scripts/check-thresholds.mjs${measurementsPath === undefined ? '' : ' --measurements <app-relative>'}`,
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
    env: {
      ...process.env,
      NO_COLOR: '1',
      FORCE_COLOR: '0',
      PI_REMOTE_MEDIA_ENABLED: '0',
      PI_REMOTE_MUTATION_ENABLED: '0',
    },
    timeout: 120_000,
  });
  const gate = {
    id,
    command,
    startedAt: gateStartedAt,
    completedAt: new Date().toISOString(),
    toolVersions: Object.fromEntries(toolNames.map((name) => [name, tools[name]])),
    exitStatus: result.status ?? 1,
    signal: result.signal,
    result: result.status === 0 ? 'completed' : 'failed',
  };
  Object.defineProperty(gate, 'parsedJson', {
    value: parseJsonLine(`${result.stdout ?? ''}`),
    enumerable: false,
  });
  return gate;
}

function parseGateJson(gate) {
  return gate?.exitStatus === 0 ? gate.parsedJson : undefined;
}

function parseJsonLine(output) {
  const last = output.trim().split('\n').at(-1);
  if (last === undefined) return undefined;
  try {
    return JSON.parse(last);
  } catch {
    return undefined;
  }
}

function runBoundaryGate(id, check) {
  let checks;
  try {
    checks = check();
  } catch {
    checks = [false];
  }
  const failureCount = checks.filter((passed) => passed !== true).length;
  return {
    id,
    command: 'in-repo boundary assertions',
    startedAt: startedAt,
    completedAt: new Date().toISOString(),
    toolVersions: { node: tools.node },
    exitStatus: failureCount === 0 ? 0 : 1,
    signal: null,
    result: failureCount === 0 ? 'completed' : 'failed',
    checkCount: checks.length,
    failureCount,
  };
}

function readSource(relativePath) {
  return readFileSync(path.join(appRoot, relativePath), 'utf8');
}

function noScopedMediaResidue() {
  const scopedPaths = [
    'extensions/pi-remote-inbound-media',
    'extensions/pi-remote-plan/src/index.ts',
    'apps/pi-remote-relay/src/policy/mutation-policy.ts',
    'apps/pi-remote-relay/src/auth/policy.ts',
    'apps/pi-remote-relay/tests/inbound-media-publish.test.ts',
    'apps/pi-remote-relay/tests/security/negative-controls.test.ts',
    'scripts/release-verify.mjs',
    'scripts/inbound-media-cdp.mjs',
  ];
  const result = spawnSync('git', ['status', '--short', '--untracked-files=all', '--', ...scopedPaths], {
    cwd: appRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) return false;
  return String(result.stdout ?? '')
    .split('\n')
    .filter((line) => line.length > 0)
    .every((line) => !/\.(?:png|jpe?g|gif|webp|avif|bin)$/iu.test(line));
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
