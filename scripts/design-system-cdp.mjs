#!/usr/bin/env node

// Durable WHY: proving a token refactor is pixel-identical needs an objective,
// scripted baseline of the app's default surface. This runner boots the web app
// in local demo mode at a true 390 CSS-pixel viewport, asserts that width with
// zero horizontal overflow, and captures a PNG for diffing. It reuses the shared
// Chrome-over-CDP pattern (findChrome + launch + /json/list page target +
// Runtime.evaluate) and the already-declared `ws` dependency.

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
    const argument = argv[index];
    if (!argument?.startsWith('--')) continue;
    options[argument.slice(2)] = argv[index + 1] ?? '';
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

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter((candidate) => typeof candidate === 'string' && candidate.length > 0);
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  for (const command of ['google-chrome', 'chromium', 'chromium-browser']) {
    try {
      const candidate = execFileSync('which', [command], { encoding: 'utf8' }).trim();
      if (candidate.length > 0) return candidate;
    } catch {
      // Keep the CDP harness portable across developer machines.
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

async function waitForHttp(url) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite may still be starting.
    }
    await sleep(100);
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
      if (typeof payload.id !== 'number') return;
      const request = this.pending.get(payload.id);
      if (request === undefined) return;
      this.pending.delete(payload.id);
      if (payload.error !== undefined) request.reject(new Error(JSON.stringify(payload.error)));
      else request.resolve(payload.result);
    });
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolvePromise, reject) => {
      this.pending.set(id, { resolve: resolvePromise, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
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
  await waitForPage(client, 'document.readyState === "complete"');
}

async function waitForPage(client, expression) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (await evaluate(client, expression)) return true;
    await sleep(100);
  }
  let bodyText;
  try {
    bodyText = String((await evaluate(client, 'document.body?.innerText ?? ""')).slice(0, 500));
  } catch {
    bodyText = '<page evaluation unavailable>';
  }
  throw new Error(
    `Timed out waiting for page condition: ${expression}; body=${JSON.stringify(bodyText)}`,
  );
}

function waitForProcessExit(processHandle) {
  return new Promise((resolvePromise) => {
    processHandle.once('exit', (code, signal) => resolvePromise({ code, signal }));
  });
}

async function exerciseDefaultSurface(client, theme, outputPath, viewportWidth) {
  // The demo preview is double-gated: the dev server runs with VITE_PI_DEMO=1
  // and the client opts in with ?demo=1 (persisted in localStorage). Enable it
  // so the default surface has a deterministic, enrolled session list.
  await navigate(client, `${DEV_URL}/?demo=1`);
  // The ?demo=1 opt-in is persisted to localStorage lazily, on the app's first isDemoMode() call
  // (in the auth bootstrap). SvelteKit mounts after readyState 'complete', so wait for the opt-in
  // to land before navigating away to '/' — otherwise the bare-'/' load reads no opt-in, demo mode
  // stays off, and the app sits on the enrollment gate instead of the demo Home surface.
  await waitForPage(client, `localStorage.getItem('pi-remote.demo') === '1'`);
  await evaluate(
    client,
    `localStorage.removeItem('pi-remote.read-only.v1'); localStorage.setItem('pi-remote.theme', ${JSON.stringify(theme)});`,
  );
  await navigate(client, `${DEV_URL}/`);
  await waitForPage(client, 'document.querySelector(".home-view") !== null');
  await waitForPage(client, 'document.querySelector(".session-card") !== null');

  const state = await evaluate(
    client,
    `(() => {
      const root = document.documentElement;
      return {
        viewportWidth: Math.round(window.visualViewport?.width ?? window.innerWidth),
        theme: root.dataset.theme,
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
      };
    })()`,
  );

  if (state.viewportWidth !== viewportWidth || state.clientWidth !== viewportWidth) {
    throw new Error(
      `Expected ${viewportWidth} CSS-pixel width, got viewport=${state.viewportWidth}, client=${state.clientWidth}`,
    );
  }
  if (state.theme !== theme) {
    throw new Error(`Expected ${theme} theme, got ${state.theme ?? 'unset'}`);
  }
  if (state.scrollWidth > state.clientWidth && state.bodyScrollWidth > state.clientWidth) {
    throw new Error(
      `Horizontal overflow at ${viewportWidth}px: client=${state.clientWidth}, scroll=${state.scrollWidth}, body-scroll=${state.bodyScrollWidth}`,
    );
  }

  const screenshot = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, Buffer.from(screenshot.data, 'base64'));
  return state;
}
async function main() {
  const options = parseArgs(process.argv.slice(2));
  const surface = requiredOption(options, 'surface');
  const theme = requiredOption(options, 'theme');
  const output = requiredOption(options, 'output');
  const viewportWidth = Number(requiredOption(options, 'viewport-width'));
  if (surface !== 'app-default') {
    throw new Error(`Unsupported surface: ${surface}`);
  }
  if (theme !== 'light' && theme !== 'dark') {
    throw new Error(`Unsupported theme: ${theme}`);
  }
  if (!Number.isInteger(viewportWidth) || viewportWidth !== 390) {
    throw new Error(`This baseline requires exactly 390 CSS pixels, got ${viewportWidth}`);
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
  let cleanupError = null;
  try {
    await waitForHttp(`${DEV_URL}/`);
    userDataDir = mkdtempSync(join(tmpdir(), 'pi-remote-design-system-'));
    const launched = await launchChrome(chromePath, userDataDir);
    browserProcess = launched.browser;
    const browserPort = new URL(launched.browserWebSocket).port;
    const targets = await fetch(`http://${HOST}:${browserPort}/json/list`).then((response) =>
      response.json(),
    );
    const target = targets.find((candidate) => candidate.type === 'page');
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
    const state = await exerciseDefaultSurface(cdp, theme, outputPath, viewportWidth);
    console.log(
      `CDP passed: ${theme} app-default, ${state.viewportWidth} CSS-pixel width, no horizontal overflow, screenshot ${outputPath}`,
    );
  } finally {
    cdp?.close();
    if (browserProcess !== null) {
      browserProcess.kill('SIGKILL');
      await waitForProcessExit(browserProcess);
    }
    server.kill('SIGTERM');
    if (userDataDir !== null) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          rmSync(userDataDir, { recursive: true, force: true });
          break;
        } catch {
          if (attempt === 4)
            cleanupError = new Error(`Could not remove Chrome profile ${userDataDir}`);
          await sleep(100);
        }
      }
    }
  }
  if (cleanupError !== null) throw cleanupError;
}

main().catch((error) => {
  console.error(`CDP failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
