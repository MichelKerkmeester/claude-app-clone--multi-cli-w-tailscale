// ───────────────────────────────────────────────────────────────────
// MODULE: Full-Access Runtime Boundary Verifier
// ───────────────────────────────────────────────────────────────────

// Black-box probe of the deployed full-access pi child. It speaks strict
// LF-delimited pi RPC exactly as the relay does, confirms the reads the mobile
// control plane will depend on, and proves that /plan produces a real,
// RPC-visible mode transition. It intentionally lives outside the unit-test
// path because a genuine result requires an installed pi binary and mutates
// live agent state, which it always restores before exit.
//
// Output is deliberately bounded and secret-free: raw model objects, session
// files, command source paths, environment, and prompt content never reach
// stdout. A final self-scan refuses to print anything that still looks like a
// secret or absolute path, so a leak fails the run instead of leaking.

import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { fullAccessPiArguments } from '../src/relay/dist/index.js';

const REQUEST_TIMEOUT_MS = numberFromEnv('PI_REMOTE_VERIFY_TIMEOUT_MS', 20_000);
const PLAN_SMOKE = process.argv.includes('--no-plan-smoke') ? false : true;
const MAX_LISTED = 100;

// A response that echoes any of these tells us the child leaked something the
// browser boundary must never carry. Presence is a hard failure, not a warning.
const FORBIDDEN_OUTPUT = [
  '/Users/',
  '/home/',
  'sessionFile',
  'session_file',
  'apiKey',
  'api_key',
  'authorization',
  'secret',
  'password',
  '-----BEGIN',
];

const PLAN_MODES = new Set(['build', 'plan', 'executing-plan', 'unknown']);

// The runtime reads and the /plan transition are observable without full access.
// The safe posture proves the RPC capability surface without launching the
// desktop-parity (all-tools, no-gate) child; full access stays operator-run.
const SAFE_POSTURE_ARGS = ['--mode', 'rpc', '--no-session', '--no-tools', '--no-extensions'];
const POSTURE = process.env.PI_REMOTE_VERIFY_POSTURE === 'safe' ? 'safe' : 'full-access';

async function main() {
  const args = POSTURE === 'safe' ? [...SAFE_POSTURE_ARGS] : [...fullAccessPiArguments()];
  const client = new PiRpcProbe('pi', args, REQUEST_TIMEOUT_MS);

  const report = {
    posture: POSTURE,
    piArgs: args,
    reads: {},
    plan: { present: false, smokeRun: false, transitionObserved: false, restored: null },
    ok: false,
  };

  try {
    await client.start();

    const state = await client.request('get_state');
    report.reads.get_state = projectState(state);

    const models = await client.request('get_available_models');
    report.reads.get_available_models = projectModels(models);

    const levels = await client.request('get_available_thinking_levels');
    report.reads.get_available_thinking_levels = projectLevels(levels);

    const commands = await client.request('get_commands');
    const commandView = projectCommands(commands);
    report.reads.get_commands = commandView;
    report.plan.present = commandView.hasPlan;

    if (PLAN_SMOKE && commandView.hasPlan) {
      report.plan.smokeRun = true;
      const initialMode = safeMode(report.reads.get_state.mode);
      const smoke = await runPlanSmoke(client, initialMode);
      report.plan.transitionObserved = smoke.transitionObserved;
      report.plan.observedSignal = smoke.observedSignal;
      report.plan.restored = smoke.restored;
      report.plan.finalMode = smoke.finalMode;
    }
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
  } finally {
    await client.stop();
  }

  report.ok = isPass(report);
  emit(report);
  process.exitCode = report.ok ? 0 : 1;
}

// ── /plan smoke: enter plan, observe an RPC-visible signal, restore mode ──────

async function runPlanSmoke(client, initialMode) {
  const result = {
    transitionObserved: false,
    observedSignal: null,
    restored: false,
    finalMode: initialMode,
  };

  // A leading-slash message is routed to the command, exactly as the phone's
  // prompt path will forward it. Bare /plan toggles the installed extension.
  client.clearEvents();
  await client.request('prompt', { message: '/plan' });
  const signal = await client.waitForEvent('extension_ui_request', 4_000);
  if (signal !== null) {
    result.observedSignal = 'extension_ui_request';
  }

  const afterEnter = safeMode(projectState(await client.request('get_state')).mode);
  if (signal !== null || (afterEnter !== initialMode && PLAN_MODES.has(afterEnter))) {
    result.transitionObserved = true;
  }

  // Restore the exact starting mode. A failed restore is reported and fails the
  // run; it is never retried in a loop, because delivery here is not idempotent.
  if (afterEnter !== initialMode) {
    await client.request('prompt', { message: '/plan' });
  }
  const finalMode = safeMode(projectState(await client.request('get_state')).mode);
  result.finalMode = finalMode;
  result.restored = finalMode === initialMode;
  return result;
}

// ── Safe projectors: emit only bounded, non-sensitive fields ──────────────────

function projectState(response) {
  const data = dataOf(response);
  const view = { ok: successOf(response) };
  const mode = typeof data.mode === 'string' && PLAN_MODES.has(data.mode) ? data.mode : 'unknown';
  view.mode = mode;
  if (typeof data.streaming === 'boolean') view.streaming = data.streaming;
  view.hasModel = data.model !== undefined && data.model !== null;
  return view;
}

function projectModels(response) {
  const list = listOf(dataOf(response), 'models');
  const providers = new Set();
  for (const item of list) {
    if (item && typeof item === 'object' && typeof item.provider === 'string') {
      providers.add(shortToken(item.provider));
    }
  }
  return { ok: successOf(response), count: list.length, providers: [...providers].slice(0, 40) };
}

function projectLevels(response) {
  const list = listOf(dataOf(response), 'levels', 'thinkingLevels');
  const levels = list
    .map((item) => (typeof item === 'string' ? shortToken(item) : null))
    .filter((value) => value !== null)
    .slice(0, 16);
  return { ok: successOf(response), count: list.length, levels };
}

function projectCommands(response) {
  const list = listOf(dataOf(response), 'commands');
  const names = [];
  let hasPlan = false;
  for (const item of list) {
    const name = commandName(item);
    if (name === null) continue;
    if (name === 'plan') hasPlan = true;
    if (names.length < MAX_LISTED) names.push(name);
  }
  return { ok: successOf(response), count: list.length, hasPlan, names };
}

// ── Minimal strict-LF pi RPC probe ────────────────────────────────────────────

class PiRpcProbe {
  constructor(command, args, timeoutMs) {
    this.command = command;
    this.args = args;
    this.timeoutMs = timeoutMs;
    this.child = null;
    this.buffer = '';
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    this.eventWaiters = [];
    this.decodeErrors = 0;
  }

  start() {
    return new Promise((resolve, reject) => {
      let child;
      try {
        child = spawn(this.command, this.args, { stdio: ['pipe', 'pipe', 'pipe'] });
      } catch (error) {
        reject(new Error(`could not launch pi: ${error instanceof Error ? error.message : error}`));
        return;
      }
      this.child = child;
      child.on('error', (error) => {
        const message =
          error && error.code === 'ENOENT'
            ? 'pi binary not found on PATH; install pi, then re-run.'
            : `pi process error: ${error instanceof Error ? error.message : error}`;
        this.failAll(new Error(message));
        reject(new Error(message));
      });
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk) => this.onStdout(chunk));
      child.on('spawn', () => resolve());
    });
  }

  onStdout(chunk) {
    this.buffer += chunk;
    let index = this.buffer.indexOf('\n');
    while (index !== -1) {
      const line = this.buffer.slice(0, index);
      this.buffer = this.buffer.slice(index + 1);
      if (line.length > 0) this.onLine(line);
      index = this.buffer.indexOf('\n');
    }
  }

  onLine(line) {
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      this.decodeErrors += 1;
      return;
    }
    if (record && record.type === 'response' && typeof record.id === 'string') {
      const waiter = this.pending.get(record.id);
      if (waiter) {
        this.pending.delete(record.id);
        clearTimeout(waiter.timer);
        waiter.resolve(record);
      }
      return;
    }
    if (record && typeof record.type === 'string') {
      this.events.push(record.type);
      const stillWaiting = [];
      for (const waiter of this.eventWaiters) {
        if (waiter.type === record.type) {
          clearTimeout(waiter.timer);
          waiter.resolve(record);
        } else {
          stillWaiting.push(waiter);
        }
      }
      this.eventWaiters = stillWaiting;
    }
  }

  request(type, extra = {}) {
    const id = `verify_${this.nextId++}`;
    const payload = { id, type, ...extra };
    return new Promise((resolve, reject) => {
      if (this.child === null) {
        reject(new Error('probe is not started'));
        return;
      }
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`no response to '${type}' within ${this.timeoutMs}ms`));
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.child.stdin.write(`${JSON.stringify(payload)}\n`);
    });
  }

  waitForEvent(type, timeoutMs) {
    if (this.events.includes(type)) return Promise.resolve({ type });
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.eventWaiters = this.eventWaiters.filter((waiter) => waiter.timer !== timer);
        resolve(null);
      }, timeoutMs);
      this.eventWaiters.push({ type, resolve, timer });
    });
  }

  clearEvents() {
    this.events = [];
  }

  failAll(error) {
    for (const waiter of this.pending.values()) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
    this.pending.clear();
  }

  async stop() {
    if (this.child === null) return;
    const child = this.child;
    this.child = null;
    try {
      child.stdin.end();
    } catch {
      // best-effort; the kill below is the real teardown.
    }
    child.kill('SIGTERM');
  }
}

// ── Pass criteria and bounded, self-scanned emit ──────────────────────────────

function isPass(report) {
  if (report.error) return false;
  const reads = report.reads;
  const readsOk =
    reads.get_state?.ok === true &&
    reads.get_available_models?.ok === true &&
    reads.get_available_thinking_levels?.ok === true &&
    reads.get_commands?.ok === true;
  if (!readsOk) return false;
  if (!report.plan.present) return false;
  if (report.plan.smokeRun) {
    return report.plan.transitionObserved === true && report.plan.restored === true;
  }
  return true;
}

function emit(report) {
  const serialized = JSON.stringify(report, null, 2);
  const leak = FORBIDDEN_OUTPUT.find((needle) => serialized.includes(needle));
  if (leak !== undefined) {
    process.stderr.write(
      `FAIL: verifier output contained a forbidden token ('${leak}'); refusing to print it.\n`,
    );
    report.ok = false;
    process.exitCode = 1;
    return;
  }
  const status = report.ok ? 'PASS' : 'FAIL';
  process.stdout.write(`${serialized}\n`);
  process.stdout.write(`runtime-boundary: ${status}\n`);
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function dataOf(response) {
  return response && typeof response.data === 'object' && response.data !== null
    ? response.data
    : {};
}

function successOf(response) {
  return Boolean(response && response.success === true);
}

function listOf(data, ...keys) {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data[key])) return data[key];
  }
  return [];
}

function commandName(item) {
  if (typeof item === 'string') return sanitizeName(item);
  if (item && typeof item === 'object' && typeof item.name === 'string') {
    return sanitizeName(item.name);
  }
  return null;
}

function sanitizeName(name) {
  // Command names are safe; paths are not. Drop anything that looks like a path.
  if (name.includes('/') || name.includes('\\')) return null;
  return shortToken(name);
}

function shortToken(value) {
  return value.length > 40 ? `${value.slice(0, 40)}…` : value;
}

function safeMode(mode) {
  return typeof mode === 'string' && PLAN_MODES.has(mode) ? mode : 'unknown';
}

function numberFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const entryPath = process.argv[1];
if (entryPath !== undefined && import.meta.url === pathToFileURL(entryPath).href) {
  void main();
}

export { isPass, projectState, projectModels, projectLevels, projectCommands };
