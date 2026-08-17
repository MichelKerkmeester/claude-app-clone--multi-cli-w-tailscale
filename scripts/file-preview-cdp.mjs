#!/usr/bin/env node

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';

import WebSocket from 'ws';

const HOST = '127.0.0.1';
const DEV_PORT = 4173;
const DEV_URL = `http://${HOST}:${DEV_PORT}`;

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key?.startsWith('--')) continue;
    options[key.slice(2)] = argv[index + 1] ?? '';
    index += 1;
  }
  return options;
}

function requiredOption(options, name) {
  const value = options[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing --${name}`);
  }
  return value;
}

function sleep(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

function httpJson(url) {
  return fetch(url).then(async (response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
    return response.json();
  });
}

async function waitForHttp(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The development server may still be starting.
    }
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter((value) => typeof value === 'string' && value.length > 0);
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  for (const command of ['google-chrome', 'chromium', 'chromium-browser']) {
    try {
      const candidate = execFileSync('which', [command], { encoding: 'utf8' }).trim();
      if (candidate.length > 0) return candidate;
    } catch {
      // Try the next known browser name.
    }
  }
  return null;
}

function launchDevServer(repoRoot) {
  return spawn(
    'npm',
    ['run', 'dev', '-w', '@pi-remote/web', '--', '--host', HOST, '--port', String(DEV_PORT)],
    {
      cwd: repoRoot,
      env: { ...process.env, VITE_PI_DEMO: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
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
  const onData = (chunk) => output.push(String(chunk));
  browser.stdout.on('data', onData);
  browser.stderr.on('data', onData);
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const match = output.join('').match(/DevTools listening on (ws:\/\/[^\s]+)/u);
    if (match?.[1] !== undefined) return { browser, browserWebSocket: match[1] };
    await sleep(100);
  }
  throw new Error(`Chrome did not expose CDP: ${output.join('')}`);
}

class CdpClient {
  constructor(webSocketUrl) {
    this.socket = new WebSocket(webSocketUrl);
    this.nextId = 0;
    this.pending = new Map();
    this.events = new Map();
  }

  async connect() {
    await new Promise((resolvePromise, reject) => {
      const onOpen = () => {
        this.socket.off('error', reject);
        resolvePromise();
      };
      this.socket.once('open', onOpen);
      this.socket.once('error', reject);
    });
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
      const listeners = this.events.get(payload.method) ?? [];
      for (const listener of listeners) listener(payload.params);
    });
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolvePromise, reject) => {
      this.pending.set(id, { resolve: resolvePromise, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  waitForEvent(method, timeoutMs = 10_000) {
    return new Promise((resolvePromise, reject) => {
      const listeners = this.events.get(method) ?? [];
      const timer = setTimeout(() => {
        this.events.set(
          method,
          (this.events.get(method) ?? []).filter((listener) => listener !== onEvent),
        );
        reject(new Error(`Timed out waiting for CDP event ${method}`));
      }, timeoutMs);
      const onEvent = (params) => {
        clearTimeout(timer);
        this.events.set(
          method,
          (this.events.get(method) ?? []).filter((listener) => listener !== onEvent),
        );
        resolvePromise(params);
      };
      listeners.push(onEvent);
      this.events.set(method, listeners);
    });
  }

  close() {
    this.socket.close();
  }
}

async function runtimeEvaluate(client, expression) {
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

async function waitForPage(client, expression, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await runtimeEvaluate(client, expression)) return;
    await sleep(100);
  }
  throw new Error(`Timed out waiting for page condition: ${expression}`);
}

async function navigate(client, url) {
  const loaded = client.waitForEvent('Page.loadEventFired');
  await client.send('Page.navigate', { url });
  await loaded;
}

async function exerciseFixture(client, theme, outputPath, viewportWidth) {
  await navigate(client, `${DEV_URL}/session/demo-session-refactor?demo=1&fixture=diff`);
  await waitForPage(client, 'document.querySelector(".artifact-card") !== null');
  const themeReload = client.waitForEvent('Page.loadEventFired');
  await runtimeEvaluate(
    client,
    `localStorage.setItem('pi-remote.theme', ${JSON.stringify(theme)}); location.reload();`,
  );
  await themeReload;
  await waitForPage(client, 'document.querySelector(".artifact-card") !== null');
  await runtimeEvaluate(client, 'document.querySelector(".artifact-card")?.click()');
  await waitForPage(client, 'document.querySelector("[role=dialog]") !== null');

  const state = await runtimeEvaluate(
    client,
    `(() => {
      const root = document.documentElement;
      const visualWidth = window.visualViewport?.width ?? window.innerWidth;
      return {
        viewportWidth: Math.round(visualWidth),
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        dialog: document.querySelector('[role="dialog"]') !== null,
        close: document.querySelector('[aria-label="Close file diff viewer"]') !== null,
        patch: document.querySelector('.artifact-diff-preview') !== null,
      };
    })()`,
  );
  if (state.viewportWidth !== viewportWidth) {
    throw new Error(`Expected ${viewportWidth} CSS-pixel width, got ${state.viewportWidth}`);
  }
  if (state.clientWidth !== viewportWidth || state.scrollWidth > state.clientWidth) {
    throw new Error(
      `Horizontal overflow at ${viewportWidth}px: client=${state.clientWidth}, scroll=${state.scrollWidth}`,
    );
  }
  if (!state.dialog || !state.close || !state.patch) {
    throw new Error('Diff fixture did not expose the labelled dialog, Close button, and patch.');
  }

  const screenshot = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, Buffer.from(screenshot.data, 'base64'));

  await runtimeEvaluate(
    client,
    `document.querySelector('[aria-label="Close file diff viewer"]')?.click()`,
  );
  await waitForPage(client, 'document.querySelector("[role=dialog]") === null');
  await runtimeEvaluate(client, 'document.querySelector(".artifact-card")?.click()');
  await waitForPage(client, 'document.querySelector("[role=dialog]") !== null');
  await runtimeEvaluate(client, 'history.back()');
  await waitForPage(client, 'document.querySelector("[role=dialog]") === null');

  return state;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const fixture = requiredOption(options, 'fixture');
  const theme = requiredOption(options, 'theme');
  const output = requiredOption(options, 'output');
  const viewportWidth = Number(requiredOption(options, 'viewport-width'));
  if (fixture !== 'diff') throw new Error(`Unsupported fixture: ${fixture}`);
  if (theme !== 'light' && theme !== 'dark') throw new Error(`Unsupported theme: ${theme}`);
  if (!Number.isInteger(viewportWidth) || viewportWidth < 320) {
    throw new Error(`Invalid viewport width: ${viewportWidth}`);
  }

  const repoRoot = process.cwd();
  const outputPath = resolve(output);
  if (outputPath === repoRoot || outputPath.startsWith(`${repoRoot}${sep}`)) {
    throw new Error('Screenshot output must be outside the repository.');
  }
  const chromePath = findChrome();
  if (chromePath === null) {
    console.error(
      'CDP capture operator-required: no supported headless Chrome executable was found.',
    );
    process.exitCode = 2;
    return;
  }

  const server = launchDevServer(repoRoot);
  let browserProcess = null;
  let cdp = null;
  let userDataDir = null;
  try {
    await waitForHttp(`${DEV_URL}/`);
    userDataDir = mkdtempSync(join(tmpdir(), 'pi-remote-file-preview-'));
    const launched = await launchChrome(chromePath, userDataDir);
    browserProcess = launched.browser;
    const browserPort = new URL(launched.browserWebSocket).port;
    const targets = await httpJson(`http://${HOST}:${browserPort}/json/list`).catch(() => null);
    const target = targets?.find((candidate) => candidate.type === 'page');
    if (target?.webSocketDebuggerUrl === undefined) {
      throw new Error('Could not find a Chrome page target for CDP.');
    }
    cdp = new CdpClient(target.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: viewportWidth,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    const state = await exerciseFixture(cdp, theme, outputPath, viewportWidth);
    console.log(
      `CDP passed: ${theme} ${fixture}, ${state.viewportWidth} CSS-pixel width, no horizontal overflow, screenshot ${outputPath}`,
    );
  } finally {
    cdp?.close();
    browserProcess?.kill('SIGKILL');
    server.kill('SIGTERM');
    if (userDataDir !== null) {
      await sleep(200);
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          rmSync(userDataDir, { recursive: true, force: true });
          break;
        } catch {
          await sleep(200);
        }
      }
    }
  }
}

main().catch((error) => {
  console.error(`CDP failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
