// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote One-Command Boot
// ───────────────────────────────────────────────────────────────────
// Durable WHY: a fresh agent must boot the whole deployment from one
// command and hand the user a complete download and install message.
// This file preflights the host, builds the app, starts the supervised
// relay through the Serve deployment script, captures the one-time
// enrollment payload the relay prints at startup, asserts the
// tailnet-only posture, and prints the handoff. Re-runs converge on
// the live deployment instead of duplicating relays, Serve routes,
// or enrollment payloads.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_RELAY_PORT = 4310;
const DEFAULT_WEB_PORT = 4173;
// The relay speaks the pi RPC protocol, which stays stable across the 0.84 patch line.
// Accept any 0.84.x at or above the tested baseline so routine pi patch updates do not
// block boot, while a major or minor change that can move the RPC contract still halts.
const PINNED_PI_LINE = '0.84';
const MIN_PI_PATCH = 1;
const COMMAND_TIMEOUT_MS = 15_000;
const PORT_PROBE_TIMEOUT_MS = 1_500;
const READINESS_TIMEOUT_MS = 120_000;
const LONG_COMMAND_TIMEOUT_MS = 600_000;
// `tailscale serve --bg` acknowledges before `serve status --json` publishes the routes, so
// boot polls the status up to this budget before verifying the tailnet boundary.
const SERVE_STATUS_TIMEOUT_MS = 15_000;
const SERVE_STATUS_POLL_MS = 500;
const MUTATION_FAMILIES = ['filesystem', 'process', 'network'];
const PUSH_VARIABLES = [
  'PI_REMOTE_PUSH_ENCRYPTION_KEY',
  'PI_REMOTE_VAPID_PUBLIC_KEY',
  'PI_REMOTE_VAPID_PRIVATE_KEY',
  'PI_REMOTE_VAPID_SUBJECT',
];
const DIVIDER = '='.repeat(64);

class BootError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BootError';
  }
}

function fail(message) {
  throw new BootError(message);
}

function step(label, detail) {
  process.stdout.write(`[boot] ${label}${detail === undefined ? '' : `: ${detail}`}\n`);
}

function note(message) {
  process.stdout.write(`[boot] ${message}\n`);
}

function runTool(command, args, options) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    timeout: COMMAND_TIMEOUT_MS,
    ...options,
  });
}

function runBuildStep(command, args, label) {
  step(label, `${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: APP_ROOT,
    encoding: 'utf8',
    timeout: LONG_COMMAND_TIMEOUT_MS,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    fail(
      `Command failed with exit code ${result.status ?? 'unknown'}: ${command} ${args.join(' ')}`,
    );
  }
}

function parseArgs(argv) {
  const options = { help: false, mutationFamily: null, fullAccess: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--enable-mutation') {
      const family = argv[index + 1];
      if (family === undefined || !MUTATION_FAMILIES.includes(family)) {
        fail(`--enable-mutation requires one of ${MUTATION_FAMILIES.join(', ')}.`);
      }
      options.mutationFamily = family;
      index += 1;
    } else if (arg === '--full-access') {
      options.fullAccess = true;
    } else {
      fail(`Unknown argument: ${arg}. Run node scripts/boot.mjs --help for usage.`);
    }
  }
  if (options.fullAccess && options.mutationFamily !== null) {
    fail(
      '--full-access and --enable-mutation are mutually exclusive. Pass one posture for the local pi agent, not both.',
    );
  }
  return options;
}

function printHelp() {
  process.stdout.write(`Usage: node scripts/boot.mjs [options]

Boots the Pi Remote deployment for this Mac and prints the handoff for a phone.

Options:
  --help                     Show this help and exit.
  --enable-mutation <family> Enable remote mutation for one family: filesystem, process, or network.
                             Requires PI_REMOTE_OPERATOR_PRINCIPAL in the environment.
                             Default: mutation stays OFF (read-only).
  --full-access              Run the local pi agent with every built-in tool and no approval gate.
                             Mutually exclusive with --enable-mutation.
                             Default: OFF (read-only unless mutation is enabled).

Stages: preflight, build, ingress (tailnet-only Serve), enrollment, handoff.
The deployment stays supervised by this process. Stop it with Ctrl-C.
`);
}

function commandExists(command) {
  const result = runTool('sh', ['-c', `command -v ${command}`]);
  return result.status === 0 && result.stdout.trim().length > 0;
}

function readVersion(command) {
  const result = runTool(command, ['--version']);
  if (result.status !== 0) {
    return null;
  }
  return result.stdout.trim();
}

function parseMajor(version) {
  const match = /^v?(\d+)/.exec(version);
  return match === null ? 0 : Number.parseInt(match[1], 10);
}

function isPinnedPi(version) {
  const match = /(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (match === null) {
    return false;
  }
  const [, major, minor, patch] = match;
  return `${major}.${minor}` === PINNED_PI_LINE && Number.parseInt(patch, 10) >= MIN_PI_PATCH;
}

function preflight() {
  step('preflight', 'checking node, npm, pi, and tailscale');
  const checks = [
    { command: 'node', label: 'Node.js' },
    { command: 'npm', label: 'npm' },
    { command: 'pi', label: 'the pi binary' },
    { command: 'tailscale', label: 'the Tailscale CLI' },
  ];
  for (const check of checks) {
    if (!commandExists(check.command)) {
      fail(`Preflight failed: ${check.label} is missing from PATH. Install it, then re-run boot.`);
    }
  }
  const nodeVersion = readVersion('node');
  if (nodeVersion === null || parseMajor(nodeVersion) < 22) {
    fail(`Preflight failed: Node.js 22 or newer is required (found ${nodeVersion ?? 'none'}).`);
  }
  const npmVersion = readVersion('npm');
  if (npmVersion === null || parseMajor(npmVersion) < 10) {
    fail(`Preflight failed: npm 10 or newer is required (found ${npmVersion ?? 'none'}).`);
  }
  const piVersion = readVersion('pi');
  if (piVersion === null || !isPinnedPi(piVersion)) {
    fail(
      `Preflight failed: pi ${PINNED_PI_LINE}.x (${PINNED_PI_LINE}.${MIN_PI_PATCH} or newer patch) is required (found ${piVersion ?? 'none'}). Install a supported pi, then re-run boot.`,
    );
  }
  const tailscaleStatus = runTool('tailscale', ['status']);
  if (tailscaleStatus.status !== 0) {
    fail(
      'Preflight failed: Tailscale is not connected. Sign in with `tailscale up` or the Tailscale app, join the tailnet, then re-run boot.',
    );
  }
  step('preflight', 'ok');
}

function loadServeEnv() {
  const file = path.join(APP_ROOT, 'deploy/serve.env');
  if (!existsSync(file)) {
    fail(
      'deploy/serve.env is missing. Copy deploy/serve.env.example to deploy/serve.env and set PI_REMOTE_PUBLIC_ORIGIN to the exact HTTPS origin shown by `tailscale serve status`.',
    );
  }
  const values = {};
  for (const rawLine of readFileSync(file, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#')) {
      continue;
    }
    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }
    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function parsePort(value, fallback, name) {
  if (value === undefined || value.trim().length === 0) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    fail(`${name} in deploy/serve.env must be an integer from 1 through 65535.`);
  }
  return parsed;
}

function resolveConfig(envValues) {
  const origin = envValues.PI_REMOTE_PUBLIC_ORIGIN?.trim();
  if (origin === undefined || origin.length === 0) {
    fail(
      'PI_REMOTE_PUBLIC_ORIGIN is empty in deploy/serve.env. Set it to the exact HTTPS origin shown by `tailscale serve status`.',
    );
  }
  let originUrl;
  try {
    originUrl = new URL(origin);
  } catch {
    fail(
      'PI_REMOTE_PUBLIC_ORIGIN in deploy/serve.env is not a valid URL. Set it to the exact HTTPS origin shown by `tailscale serve status`.',
    );
  }
  if (originUrl.protocol !== 'https:') {
    fail(
      'PI_REMOTE_PUBLIC_ORIGIN in deploy/serve.env must be an https URL. Set it to the exact HTTPS origin shown by `tailscale serve status`.',
    );
  }
  const printEnrollment = envValues.PI_REMOTE_PRINT_ENROLLMENT?.trim();
  if (printEnrollment !== undefined && printEnrollment !== '' && printEnrollment !== '1') {
    fail(
      'PI_REMOTE_PRINT_ENROLLMENT in deploy/serve.env must stay 1. Boot needs the enrollment payload the relay prints at startup.',
    );
  }
  return {
    origin,
    relayPort: parsePort(
      envValues.PI_REMOTE_RELAY_PORT,
      DEFAULT_RELAY_PORT,
      'PI_REMOTE_RELAY_PORT',
    ),
    webPort: parsePort(envValues.PI_REMOTE_WEB_PORT, DEFAULT_WEB_PORT, 'PI_REMOTE_WEB_PORT'),
  };
}

function pushIsConfigured(envValues) {
  const merged = { ...process.env, ...envValues };
  return PUSH_VARIABLES.every((name) => {
    const value = merged[name];
    return value !== undefined && value.length > 0;
  });
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    const finish = (open) => {
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(PORT_PROBE_TIMEOUT_MS);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

function readServeStatusJson() {
  const result = runTool('tailscale', ['serve', 'status', '--json']);
  if (result.status !== 0) {
    fail(
      'Could not read `tailscale serve status --json`. Run `tailscale serve status` to inspect the current routes, then re-run boot.',
    );
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    fail(
      'Could not parse `tailscale serve status --json`. Run `tailscale serve status` to inspect the current routes, then re-run boot.',
    );
  }
}

function readServeStatusRaw() {
  // A non-failing read used while polling for freshly registered routes. A transient empty
  // or unreadable status returns null so the caller can retry instead of aborting the boot.
  const result = runTool('tailscale', ['serve', 'status', '--json']);
  if (result.status !== 0) {
    return null;
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpsHandlers(serveStatus) {
  // Route handlers live under Web["<host>:443"].Handlers in `tailscale serve status --json`.
  // TCP["443"].HTTPS only flags that HTTPS is enabled, not the proxy targets, so read the
  // handler map directly and let callers confirm the individual routes.
  const config = serveStatus.ServeConfig ?? serveStatus;
  const web = typeof config.Web === 'object' && config.Web !== null ? config.Web : {};
  for (const [host, value] of Object.entries(web)) {
    if (!host.endsWith(':443') || typeof value !== 'object' || value === null) {
      continue;
    }
    if (typeof value.Handlers === 'object' && value.Handlers !== null) {
      return value.Handlers;
    }
  }
  return null;
}

function funnelIsOn(serveStatus) {
  // Funnel is exposed as AllowFunnel, a map of "<host>:443" -> true. Treat any true entry as
  // a public listener so boot refuses to proceed. A boolean form is handled for safety.
  const config = serveStatus.ServeConfig ?? serveStatus;
  const allow = config.AllowFunnel;
  if (allow === true) {
    return true;
  }
  if (typeof allow === 'object' && allow !== null) {
    for (const value of Object.values(allow)) {
      if (value === true) {
        return true;
      }
    }
  }
  return false;
}

function verifyServeRoutes(config, serveStatus) {
  if (funnelIsOn(serveStatus)) {
    fail(
      'Tailscale Funnel is enabled for this host. Boot refuses to expose a public listener. Run `tailscale funnel --https=443 off`, confirm with `tailscale funnel status`, then re-run boot.',
    );
  }
  const handlers = httpsHandlers(serveStatus);
  if (handlers === null) {
    fail(
      'Tailscale Serve has no HTTPS route on port 443. Run the deployment script, confirm `tailscale serve status`, then re-run boot.',
    );
  }
  let rootPath = null;
  if ('/' in handlers) {
    rootPath = '/';
  } else if ('' in handlers) {
    rootPath = '';
  }
  if (rootPath === null) {
    fail(
      'Tailscale Serve has no route for the PWA root. Boot expects HTTPS routes for /, /api and /health.',
    );
  }
  if (!('/api' in handlers) || !('/health' in handlers)) {
    fail(
      'Tailscale Serve routes are incomplete. Boot expects HTTPS routes for /, /api and /health on port 443.',
    );
  }
  const targetOf = (entry) => {
    if (typeof entry !== 'object' || entry === null) {
      return '';
    }
    return typeof entry.Proxy === 'string' ? entry.Proxy : '';
  };
  const rootTarget = targetOf(handlers[rootPath]);
  const apiTarget = targetOf(handlers['/api']);
  const healthTarget = targetOf(handlers['/health']);
  if (!rootTarget.includes(`127.0.0.1:${config.webPort}`)) {
    fail(
      `The Serve route for / does not point at the web preview on 127.0.0.1:${config.webPort}. Reconcile deploy/serve.env or stop the other deployment, then re-run boot.`,
    );
  }
  if (
    !apiTarget.includes(`127.0.0.1:${config.relayPort}`) ||
    !healthTarget.includes(`127.0.0.1:${config.relayPort}`)
  ) {
    fail(
      `The Serve routes for /api and /health do not point at the relay on 127.0.0.1:${config.relayPort}. Reconcile deploy/serve.env or stop the other deployment, then re-run boot.`,
    );
  }
  return { root: rootPath === '' ? '/' : rootPath, api: '/api', health: '/health' };
}

function assertFunnelOff() {
  // Read-only funnel guard. Do NOT run `tailscale funnel --https=443 off` here: on this
  // Tailscale version that command also clears the tailnet-only Serve config the deployment
  // just published. The deployment script disables Funnel before configuring Serve, and
  // verifyServeRoutes re-checks AllowFunnel on the published status, so boot only verifies.
  const serveStatus = readServeStatusRaw() ?? {};
  if (funnelIsOn(serveStatus)) {
    fail(
      'Tailscale Funnel is enabled for this host. Boot refuses to expose a public listener. Run `tailscale funnel --https=443 off`, confirm with `tailscale funnel status`, then re-run boot.',
    );
  }
  step('posture', 'Funnel verified off');
}

async function waitForServeRoutes() {
  // Poll rather than read once: `tailscale serve --bg` acks before the daemon publishes the
  // routes in `serve status --json`, so a single read can miss them and fail a healthy boot.
  const maxPolls = Math.ceil(SERVE_STATUS_TIMEOUT_MS / SERVE_STATUS_POLL_MS) + 1;
  let last = {};
  for (let i = 0; i < maxPolls; i += 1) {
    const status = readServeStatusRaw();
    if (status !== null) {
      last = status;
      const handlers = httpsHandlers(status);
      if (handlers !== null && '/api' in handlers && '/health' in handlers) {
        return status;
      }
    }
    await sleep(SERVE_STATUS_POLL_MS);
  }
  return last;
}

function parseEnrollment(line) {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return null;
  }
  let value;
  try {
    value = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  if (
    typeof value.v !== 'number' ||
    typeof value.origin !== 'string' ||
    typeof value.pairingId !== 'string' ||
    typeof value.hostFingerprint !== 'string' ||
    typeof value.challenge !== 'string' ||
    typeof value.expiresAt !== 'string'
  ) {
    return null;
  }
  return value;
}

function readLines(stream, onLine) {
  stream.setEncoding('utf8');
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk;
    let newlineIndex = buffer.indexOf('\n');
    while (newlineIndex !== -1) {
      onLine(buffer.slice(0, newlineIndex));
      buffer = buffer.slice(newlineIndex + 1);
      newlineIndex = buffer.indexOf('\n');
    }
  });
  stream.on('end', () => {
    if (buffer.length > 0) {
      onLine(buffer);
    }
  });
}

function waitForReadiness(child) {
  return new Promise((resolve, reject) => {
    let enrollment = null;
    let configured = false;
    let settled = false;
    const finish = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (error !== null) {
        reject(error);
      } else {
        resolve(enrollment);
      }
    };
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      finish(
        new BootError(
          'Deployment did not reach readiness within 120 seconds. Confirm deploy/serve.env keeps PI_REMOTE_PRINT_ENROLLMENT set to 1, check the relay and web output above, then re-run boot.',
        ),
      );
    }, READINESS_TIMEOUT_MS);
    child.once('exit', (code) => {
      finish(
        new BootError(
          `Deployment script exited before readiness with code ${code ?? 'unknown'}. Free the relay and web ports if another process holds them, then re-run boot.`,
        ),
      );
    });
    child.once('error', (error) => {
      finish(new BootError(`Failed to start the deployment script: ${error.message}`));
    });
    readLines(child.stdout, (line) => {
      process.stdout.write(`${line}\n`);
      if (line.includes('configured for tailnet-only Serve')) {
        configured = true;
      }
      const parsed = parseEnrollment(line);
      if (parsed !== null) {
        enrollment = parsed;
      }
      if (configured && enrollment !== null) {
        finish(null);
      }
    });
    readLines(child.stderr, (line) => {
      process.stderr.write(`${line}\n`);
    });
  });
}

function waitForChildExit(child) {
  return new Promise((resolve) => {
    child.once('exit', (code) => resolve(code ?? 1));
    child.once('error', () => resolve(1));
  });
}

function supervise(child) {
  let stoppedByOperator = false;
  const stop = () => {
    stoppedByOperator = true;
    process.stdout.write('\n[boot] Stopping the Pi Remote deployment.\n');
    child.kill('SIGTERM');
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  return waitForChildExit(child).then((code) => (stoppedByOperator || code === 0 ? 0 : 1));
}

function buildApp() {
  if (!existsSync(path.join(APP_ROOT, 'node_modules'))) {
    runBuildStep('npm', ['ci'], 'install');
  }
  runBuildStep('npm', ['run', 'build'], 'build');
}

function deploymentEnv(options) {
  const env = { ...process.env, PI_REMOTE_PRINT_ENROLLMENT: '1' };
  if (options.fullAccess) {
    // Full access excludes the mutation family path, so force the mutation env vars off
    // even if the parent shell exports them. The relay reads PI_REMOTE_FULL_ACCESS itself.
    env.PI_REMOTE_FULL_ACCESS = '1';
    env.PI_REMOTE_MUTATION_ENABLED = '0';
    delete env.PI_REMOTE_MUTATION_FAMILY;
  } else if (options.mutationFamily === null) {
    env.PI_REMOTE_MUTATION_ENABLED = '0';
    delete env.PI_REMOTE_MUTATION_FAMILY;
    delete env.PI_REMOTE_FULL_ACCESS;
  } else {
    const principal = env.PI_REMOTE_OPERATOR_PRINCIPAL;
    if (principal === undefined || principal.length === 0) {
      fail(
        '--enable-mutation requires PI_REMOTE_OPERATOR_PRINCIPAL in the environment. The relay refuses to start without it.',
      );
    }
    if (!existsSync(path.join(APP_ROOT, 'extensions/pi-remote-approval/dist/index.js'))) {
      fail(
        '--enable-mutation requires the approval extension build. The build step produces extensions/pi-remote-approval/dist/index.js.',
      );
    }
    env.PI_REMOTE_MUTATION_ENABLED = '1';
    env.PI_REMOTE_MUTATION_FAMILY = options.mutationFamily;
    delete env.PI_REMOTE_FULL_ACCESS;
  }
  return env;
}

function renderQr(payload) {
  if (!commandExists('qrencode')) {
    return null;
  }
  const result = spawnSync('qrencode', ['-t', 'UTF8', '-o', '-'], {
    input: payload,
    encoding: 'utf8',
    timeout: COMMAND_TIMEOUT_MS,
  });
  if (result.status !== 0 || result.stdout.length === 0) {
    return null;
  }
  return result.stdout;
}

function userInstructions(origin) {
  return [
    '1. On the iPhone, install the Tailscale app and sign in to the same tailnet as this Mac.',
    `2. Open the URL above in Safari on the iPhone: ${origin}`,
    '3. Tap Share, then Add to Home Screen, then Add.',
    '4. Launch Pi Remote from the Home Screen.',
    '5. On first launch, paste the enrollment code into Enrollment data, or choose Scan image and scan the QR above.',
    '6. Tap Enroll device before the code expires (five minutes from boot).',
    '7. Confirm the session catalog appears, then use Attention hints for notification hints if you want them.',
    '',
  ].join('\n');
}

function printHandoff(config, options, enrollment, routes, envValues) {
  const nodeVersion = readVersion('node') ?? 'unknown';
  const npmVersion = readVersion('npm') ?? 'unknown';
  const piVersion = readVersion('pi') ?? 'unknown';
  const qr = enrollment === null ? null : renderQr(JSON.stringify(enrollment));
  const mutationLabel = options.fullAccess
    ? 'FULL ACCESS (no approval gate)'
    : options.mutationFamily === null
      ? 'OFF (default posture)'
      : `ON for family ${options.mutationFamily}`;
  const pushLabel = pushIsConfigured(envValues)
    ? 'configured (Attention hints available in the app)'
    : 'off (no VAPID keys in deploy/serve.env)';
  process.stdout.write(`\n${DIVIDER}\n`);
  process.stdout.write('PI REMOTE BOOT COMPLETE\n');
  process.stdout.write(`${DIVIDER}\n`);
  process.stdout.write(`Tailnet HTTPS URL : ${config.origin}\n`);
  process.stdout.write(
    `Relay             : 127.0.0.1:${config.relayPort} (supervises pi --mode rpc)\n`,
  );
  process.stdout.write(`Web preview       : 127.0.0.1:${config.webPort}\n`);
  process.stdout.write('Ingress           : Tailscale Serve, tailnet only\n');
  process.stdout.write(
    `Serve routes      : ${routes.root} ${routes.api} ${routes.health} (Funnel asserted off)\n`,
  );
  process.stdout.write(`Mutation          : ${mutationLabel}\n`);
  process.stdout.write(`Push              : ${pushLabel}\n`);
  process.stdout.write(
    `Versions          : node ${nodeVersion}, npm ${npmVersion}, pi ${piVersion}\n`,
  );
  process.stdout.write(`Platform          : ${process.platform}\n`);
  if (enrollment !== null) {
    process.stdout.write(`Enrollment        : one-time payload, expires ${enrollment.expiresAt}\n`);
    process.stdout.write('\nEnrollment QR\n');
    process.stdout.write(
      qr === null
        ? 'Not rendered. Install qrencode with `brew install qrencode` for a scannable QR, or paste the enrollment code below.\n'
        : `${qr.trimEnd()}\n`,
    );
    process.stdout.write('\nEnrollment code (paste into Enrollment data on the phone)\n');
    process.stdout.write(`${JSON.stringify(enrollment)}\n`);
  } else {
    process.stdout.write(
      '\nEnrollment: a fresh one-time payload is minted only when the relay starts.\n',
    );
    process.stdout.write(
      'Stop this deployment with Ctrl-C and re-run boot to mint a new payload.\n',
    );
  }
  process.stdout.write(`\n${DIVIDER}\n`);
  process.stdout.write('COPY-PASTE USER INSTRUCTIONS\n');
  process.stdout.write(`${DIVIDER}\n`);
  process.stdout.write(userInstructions(config.origin));
  process.stdout.write(`${DIVIDER}\n`);
  process.stdout.write(
    'Operator verification: confirm the boundary with `tailscale serve status` and `tailscale funnel status`.\n',
  );
}

async function detectLiveDeployment(config) {
  const relayOpen = await isPortOpen(config.relayPort);
  if (!relayOpen) {
    return null;
  }
  let serveStatus;
  try {
    serveStatus = readServeStatusJson();
  } catch {
    fail(
      `Port ${config.relayPort} is occupied but Tailscale Serve status could not be read. Identify the listener with \`lsof -nP -iTCP:${config.relayPort} -sTCP:LISTEN\`, stop it if it is not the Pi Remote relay, then re-run boot.`,
    );
  }
  if (httpsHandlers(serveStatus) === null) {
    fail(
      `Port ${config.relayPort} is occupied but Tailscale Serve has no HTTPS route for this host. Identify the listener with \`lsof -nP -iTCP:${config.relayPort} -sTCP:LISTEN\` and stop it if it is not the Pi Remote relay, then re-run boot.`,
    );
  }
  verifyServeRoutes(config, serveStatus);
  step('deployment', 'already live, verifying posture');
  return serveStatus;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return 0;
  }
  step('stage', 'preflight');
  preflight();
  step('stage', 'config');
  const envValues = loadServeEnv();
  const config = resolveConfig(envValues);
  const live = await detectLiveDeployment(config);
  if (live !== null) {
    if (options.mutationFamily !== null) {
      fail(
        'The deployment is already live without remote mutation. Stop it with Ctrl-C on the boot process, then re-run boot with --enable-mutation to restart with mutation enabled.',
      );
    }
    if (options.fullAccess) {
      fail(
        'The deployment is already live without full access. Stop it with Ctrl-C on the boot process, then re-run boot with --full-access to restart with full access.',
      );
    }
    assertFunnelOff();
    const routes = verifyServeRoutes(config, live);
    printHandoff(config, options, null, routes, envValues);
    note('Deployment stays live. Stop it with Ctrl-C on this boot process.');
    return 0;
  }
  step('stage', 'build');
  buildApp();
  step('stage', 'deploy');
  const child = spawn('/bin/sh', ['deploy/setup-tailscale-serve.sh'], {
    cwd: APP_ROOT,
    env: deploymentEnv(options),
    stdio: ['inherit', 'pipe', 'pipe'],
  });
  const enrollment = await waitForReadiness(child);
  step('stage', 'posture');
  assertFunnelOff();
  const serveStatus = await waitForServeRoutes();
  const routes = verifyServeRoutes(config, serveStatus);
  printHandoff(config, options, enrollment, routes, envValues);
  note('Deployment is supervised by this boot process. Stop it with Ctrl-C.');
  return supervise(child);
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    if (error instanceof BootError) {
      process.stderr.write(`[boot] ${error.message}\n`);
    } else {
      process.stderr.write(
        `[boot] Unexpected failure: ${error instanceof Error ? error.message : String(error)}\n`,
      );
    }
    process.exitCode = 1;
  });
