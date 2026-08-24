#!/usr/bin/env node

// ───────────────────────────────────────────────────────────────────
// MODULE: Runtime Smoke CDP Gate
// ───────────────────────────────────────────────────────────────────

// Durable WHY: the migration's static gates (svelte-check, token-identity) all
// pass on code that CRASHES when actually run — a class of ported React-useEffect -> Svelte-$effect
// self-invalidation (a synchronous dispatch reduces its own $state, so the effect takes that state
// as a dep and re-fires on its own write -> effect_update_depth_exceeded). Static analysis cannot
// see it. This gate boots the app in demo mode under headless Chrome, drives each surface, and
// fails if any surface throws or logs a runtime error. It is the runtime companion to the 390px
// structural gate in design-system-cdp.mjs; both drive the same VITE_PI_DEMO demo preview over CDP.
//
// Usage:  node scripts/runtime-smoke-cdp.mjs [--surface home,session,review,inbox]
// Exit 0 = every exercised surface rendered with zero runtime errors; exit 2 = a crash/error.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import WebSocket from 'ws';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const HOST = '127.0.0.1';
const DEV_PORT = 4173;
const DEV_URL = `http://${HOST}:${DEV_PORT}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i]?.startsWith('--')) {
      options[argv[i].slice(2)] = argv[i + 1] ?? '';
      i += 1;
    }
  }
  return options;
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter((c) => typeof c === 'string' && c.length > 0);
  for (const c of candidates) if (existsSync(c)) return c;
  for (const cmd of ['google-chrome', 'chromium', 'chromium-browser']) {
    try {
      const c = execFileSync('which', [cmd], { encoding: 'utf8' }).trim();
      if (c.length > 0) return c;
    } catch {
      // portable across machines
    }
  }
  return null;
}

function launchDevServer(repoRoot) {
  return spawn(
    'npm',
    ['run', 'dev', '-w', '@pi-remote/web', '--', '--host', HOST, '--port', String(DEV_PORT)],
    { cwd: repoRoot, env: { ...process.env, VITE_PI_DEMO: '1' }, stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

async function waitForHttp(url) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // vite still starting
    }
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function launchChrome(chromePath, userDataDir) {
  const browser = spawn(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--remote-allow-origins=*',
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const output = [];
  browser.stdout.on('data', (c) => output.push(String(c)));
  browser.stderr.on('data', (c) => output.push(String(c)));
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const m = output.join('').match(/DevTools listening on (ws:\/\/[^\s]+)/u);
    if (m?.[1] !== undefined) return { browser, browserWebSocket: m[1] };
    await sleep(100);
  }
  throw new Error(`Chrome did not expose CDP: ${output.join('')}`);
}

class CdpClient {
  constructor(webSocketUrl) {
    this.socket = new WebSocket(webSocketUrl);
    this.nextId = 0;
    this.pending = new Map();
    this.events = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket.once('open', () => {
        this.socket.off('error', reject);
        resolve();
      });
      this.socket.once('error', reject);
      this.socket.on('message', (message) => {
        const payload = JSON.parse(String(message));
        if (typeof payload.id === 'number') {
          const request = this.pending.get(payload.id);
          if (request === undefined) return;
          this.pending.delete(payload.id);
          if (payload.error !== undefined) request.reject(new Error(JSON.stringify(payload.error)));
          else request.resolve(payload.result);
          return;
        }
        this.events.push(payload);
      });
    });
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }

  // Runtime errors observed since the last reset: uncaught exceptions + console.error calls.
  drainErrors() {
    const exceptions = this.events.filter((e) => e.method === 'Runtime.exceptionThrown');
    const consoleErrors = this.events.filter(
      (e) => e.method === 'Runtime.consoleAPICalled' && e.params?.type === 'error',
    );
    const describe = () => {
      if (exceptions.length > 0) {
        const d = exceptions[0].params?.exceptionDetails;
        return String(d?.exception?.description ?? d?.text ?? '').slice(0, 200);
      }
      if (consoleErrors.length > 0) {
        return (consoleErrors[0].params.args ?? [])
          .map((a) => a.value ?? a.description ?? a.type)
          .join(' ')
          .slice(0, 200);
      }
      return '';
    };
    return { exceptions: exceptions.length, consoleErrors: consoleErrors.length, sample: describe() };
  }

  resetErrors() {
    this.events.length = 0;
  }
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails !== undefined) {
    throw new Error(`Page evaluation failed: ${JSON.stringify(result.exceptionDetails)}`);
  }
  return result.result?.value;
}

async function navigate(client, url) {
  await client.send('Page.navigate', { url });
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (await evaluate(client, 'document.readyState === "complete"')) return;
    await sleep(150);
  }
}

// Poll a boolean expression in-page until true or timeout (does not throw on timeout — the caller's
// error assertion is the real gate; a missing selector is reported as a soft render miss).
async function waitFor(client, expression, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate(client, expression)) return true;
    await sleep(80);
  }
  return false;
}

const clickByText = (needle) =>
  `(() => {
    const els = [...document.querySelectorAll('button,[role=button],a')];
    const el = els.find((e) => (e.getAttribute('aria-label') || e.textContent || '')
      .trim().toLowerCase().includes(${JSON.stringify(needle)}));
    if (el) { el.click(); return true; }
    return false;
  })()`;

// Reach the demo Home (persist the ?demo=1 opt-in first — it lands lazily on the app's first
// isDemoMode() call, after SvelteKit mounts, so wait for it before navigating on).
async function gotoDemoHome(client) {
  await navigate(client, `${DEV_URL}/?demo=1`);
  await waitFor(client, `localStorage.getItem('pi-remote.demo') === '1'`, 10_000);
  await navigate(client, `${DEV_URL}/`);
  await waitFor(client, `document.querySelector('.home-view') !== null`);
}

const SURFACES = {
  home: async (client) => {
    await gotoDemoHome(client);
    await sleep(1200);
    return waitFor(client, `document.querySelector('.home-view') !== null`, 500);
  },
  session: async (client) => {
    await gotoDemoHome(client);
    await waitFor(client, `document.querySelector('.session-card') !== null`);
    const sid = await evaluate(
      client,
      `(async () => { try { const m = await import('/src/relay.ts'); const items = await m.fetchSessions(); return items?.[0]?.id ?? null; } catch { return null; } })()`,
    );
    if (sid === null) return false;
    await navigate(client, `${DEV_URL}/session/${encodeURIComponent(sid)}`);
    await sleep(2500);
    return waitFor(client, `document.body.innerText.length > 400`, 500);
  },
  review: async (client) => {
    await gotoDemoHome(client);
    const clicked = await evaluate(client, clickByText('review'));
    await sleep(1800);
    return clicked;
  },
  inbox: async (client) => {
    await gotoDemoHome(client);
    const clicked = await evaluate(client, clickByText('inbox'));
    await sleep(1800);
    return clicked;
  },
};

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const requested = (options.surface ? options.surface.split(',') : Object.keys(SURFACES))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const name of requested) {
    if (!(name in SURFACES)) throw new Error(`Unknown surface: ${name}`);
  }

  const chromePath = findChrome();
  if (chromePath === null) throw new Error('Could not find Chrome/Chromium (set CHROME_PATH).');

  const repoRoot = process.cwd();
  const server = launchDevServer(repoRoot);
  let browserProcess = null;
  let userDataDir = null;
  let cdp = null;
  const results = [];
  try {
    await waitForHttp(`${DEV_URL}/`);
    userDataDir = mkdtempSync(join(tmpdir(), 'pi-remote-runtime-smoke-'));
    const launched = await launchChrome(chromePath, userDataDir);
    browserProcess = launched.browser;
    const browserPort = new URL(launched.browserWebSocket).port;
    const targets = await fetch(`http://${HOST}:${browserPort}/json/list`).then((r) => r.json());
    const target = targets.find((t) => t.type === 'page');
    if (target?.webSocketDebuggerUrl === undefined) throw new Error('No Chrome page target for CDP.');
    cdp = new CdpClient(target.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });

    for (const name of requested) {
      cdp.resetErrors();
      let rendered = false;
      let driveError = null;
      try {
        rendered = await SURFACES[name](cdp);
      } catch (error) {
        driveError = error instanceof Error ? error.message : String(error);
      }
      const errors = cdp.drainErrors();
      const clean = errors.exceptions === 0 && errors.consoleErrors === 0 && driveError === null;
      results.push({ name, rendered, ...errors, driveError, clean });
      const status = clean ? (rendered ? 'PASS' : 'PASS (no render assert)') : 'FAIL';
      const detail = clean
        ? ''
        : ` — exceptions=${errors.exceptions} consoleErrors=${errors.consoleErrors}${driveError ? ` drive=${driveError}` : ''}${errors.sample ? ` :: ${errors.sample}` : ''}`;
      console.log(`  ${name}: ${status}${detail}`);
    }
  } finally {
    cdp?.close();
    if (browserProcess !== null) {
      browserProcess.kill('SIGKILL');
    }
    server.kill('SIGKILL');
    if (userDataDir !== null) {
      try {
        rmSync(userDataDir, { recursive: true, force: true });
      } catch {
        // temp dir best-effort
      }
    }
  }

  const failed = results.filter((r) => !r.clean);
  if (failed.length > 0) {
    console.log(`runtime-smoke FAIL: ${failed.length}/${results.length} surface(s) crashed`);
    process.exit(2);
  }
  console.log(`runtime-smoke PASS: ${results.length}/${results.length} surfaces rendered with 0 runtime errors`);
  // The CDP WebSocket and killed child processes can keep the event loop alive; exit explicitly so
  // the gate returns a clean 0 instead of hanging until an outer timeout.
  process.exit(0);
}

main().catch((error) => {
  console.error(`runtime-smoke error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(2);
});
