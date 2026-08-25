#!/usr/bin/env node

// ───────────────────────────────────────────────────────────────────
// MODULE: Inbound Media CDP Gate
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';

import WebSocket from 'ws';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const HOST = '127.0.0.1';
const DEV_PORT = 4173;
const DEV_URL = `http://${HOST}:${DEV_PORT}`;

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

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
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Missing --${name}`);
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
      // Keep the harness portable across developer machines.
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
  throw new Error('Timed out waiting for the demo server.');
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
  throw new Error('Chrome did not expose CDP.');
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
      if (payload.error !== undefined) request.reject(new Error('CDP request failed.'));
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
    throw new Error('Page evaluation failed.');
  }
  return result.result?.value;
}

async function waitForPage(client, expression) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (await evaluate(client, expression)) return;
    await sleep(100);
  }
  throw new Error('Timed out waiting for a page condition.');
}

async function waitForUnsupportedRow(client) {
  await waitForPage(
    client,
    `(() => {
      const target = document.querySelector('[data-unsupported-kind="inbound_image"]');
      if (target !== null) return true;
      const scroll = document.querySelector('.transcript--scroll');
      if (scroll === null) return false;
      scroll.scrollTop = Math.min(
        scroll.scrollHeight,
        scroll.scrollTop + Math.max(220, scroll.clientHeight * 0.75),
      );
      return false;
    })()`,
  );
}

async function waitForInboundCard(client) {
  await waitForPage(
    client,
    `(() => {
      const target = document.querySelector('[data-inbound-image-card="true"]');
      if (target !== null) return true;
      const scroll = document.querySelector('.transcript--scroll');
      if (scroll === null) return false;
      scroll.scrollTop = Math.min(
        scroll.scrollHeight,
        scroll.scrollTop + Math.max(220, scroll.clientHeight * 0.75),
      );
      return false;
    })()`,
  );
}

async function waitForProcessExit(process) {
  if (process.exitCode !== null || process.signalCode !== null) return;
  await Promise.race([
    new Promise((resolvePromise) => process.once('exit', resolvePromise)),
    sleep(2_000),
  ]);
}

async function exercise(client, theme, fixture, requestedState, outputPath, viewportWidth) {
  if (fixture === 'end-to-end') {
    return exerciseEndToEnd(client, theme, outputPath, viewportWidth);
  }
  const demoFixture = fixture === 'viewer-ready' ? 'inline-card' : fixture;
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewportWidth,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await client.send('Page.navigate', {
    url: `${DEV_URL}/session/demo-session-refactor?demo=1&fixture=${encodeURIComponent(demoFixture)}${requestedState === null ? '' : `&state=${encodeURIComponent(requestedState)}`}`,
  });
  await waitForPage(client, 'document.readyState === "complete"');
  await waitForPage(client, 'document.querySelector(".transcript--scroll") !== null');
  await evaluate(
    client,
    `localStorage.setItem('pi-remote.theme', ${JSON.stringify(theme)}); location.reload();`,
  );
  await waitForPage(client, 'document.querySelector(".transcript--scroll") !== null');
  if (fixture === 'inbound-media') await waitForUnsupportedRow(client);
  else await waitForInboundCard(client);
  if (fixture === 'viewer-ready') {
    await evaluate(
      client,
      `document.querySelector('[data-inbound-image-card="true"] button, [data-inbound-image-card="true"] [role="button"]')?.click()`,
    );
    await waitForPage(client, 'document.querySelector(".artifact-viewer--dialog") !== null');
  }

  const state = await evaluate(
    client,
    `(() => {
      const root = document.documentElement;
      const scroll = document.querySelector('.transcript--scroll');
      const controls = [...document.querySelectorAll('button, [role="button"]')]
        .map((node) => node.textContent ?? '')
        .filter((text) => /enable.*inbound|inbound.*enable|capture image|publish image|view inbound image|share inbound image/i.test(text));
      const unsupported = document.querySelector('[data-unsupported-kind="inbound_image"]');
      const card = document.querySelector('[data-inbound-image-card="true"]');
      const cardButton = card?.querySelectorAll('button, [role="button"]') ?? [];
      return {
        viewportWidth: Math.round(window.visualViewport?.width ?? window.innerWidth),
        theme: root.dataset.theme,
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        transcript: scroll !== null,
        activity: document.querySelectorAll('.activity--group').length,
        disclosures: document.querySelectorAll('.evidence--trigger').length,
        unsupported: unsupported !== null,
        unsupportedText: unsupported?.textContent ?? '',
        cardState: card?.getAttribute('data-image-state'),
        cardText: card?.textContent ?? '',
        cardButtonCount: cardButton.length,
        cardHasVerifiedImage: card?.querySelector('[data-verified-image="true"]') !== null,
        viewerOpen: document.querySelector('.artifact-viewer--dialog') !== null,
        viewerState: document.querySelector('.artifact-viewer--overlay')?.getAttribute('data-artifact-state'),
        viewerHasClose: [...document.querySelectorAll('.artifact-viewer--dialog button, .artifact-viewer--dialog [role="button"]')]
          .some((node) => /close/i.test(node.getAttribute('aria-label') ?? node.textContent ?? '')),
        viewerForbiddenControls: [...document.querySelectorAll('.artifact-viewer--dialog button, .artifact-viewer--dialog a')]
          .map((node) => node.getAttribute('aria-label') ?? node.textContent ?? '')
          .filter((text) => /export|capture|re-send|share|save|copy|download|public url/i.test(text)),
        imageElements: document.querySelectorAll('img, canvas, video, audio').length,
        enablingControls: controls,
      };
    })()`,
  );
  if (state.viewportWidth !== viewportWidth || state.clientWidth !== viewportWidth) {
    throw new Error(
      `Expected ${viewportWidth} CSS-pixel width, got viewport=${state.viewportWidth}, client=${state.clientWidth}`,
    );
  }
  if (state.theme !== theme)
    throw new Error(`Expected ${theme} theme, got ${state.theme ?? 'unset'}`);
  if (state.scrollWidth > state.clientWidth) {
    throw new Error(
      `Horizontal overflow at ${viewportWidth}px: client=${state.clientWidth}, scroll=${state.scrollWidth}`,
    );
  }
  if (
    !state.transcript ||
    state.activity < 1 ||
    state.disclosures < 1 ||
    state.enablingControls.length !== 0
  ) {
    throw new Error('Transcript boundary fixture failed.');
  }
  if (fixture === 'inbound-media') {
    if (
      !state.unsupported ||
      !state.unsupportedText.includes('inbound_image') ||
      !state.unsupportedText.includes('cannot be displayed') ||
      state.imageElements !== 0
    ) {
      throw new Error('Disabled inbound-media fixture failed.');
    }
  } else if (fixture === 'viewer-ready') {
    if (
      !state.viewerOpen ||
      !state.viewerHasClose ||
      state.viewerForbiddenControls.length !== 0 ||
      state.viewerState === 'privacy-covered'
    ) {
      throw new Error('Viewer-ready fixture failed.');
    }
  } else {
    const expectedCopy = {
      processing: 'Preparing preview',
      'inline-ready': '',
      withheld: 'Preview withheld by relay policy.',
      corrupt: 'This image couldn’t be verified.',
    }[state.cardState ?? ''];
    const cardButtonShapeValid =
      requestedState === 'inline-ready' ? state.cardButtonCount === 1 : state.cardButtonCount <= 2;
    if (
      state.cardState !== requestedState ||
      !cardButtonShapeValid ||
      (expectedCopy !== undefined && !state.cardText.includes(expectedCopy))
    ) {
      throw new Error('Inline image card fixture failed.');
    }
  }

  const screenshot = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, Buffer.from(screenshot.data, 'base64'));
  return { ...state, expectedState: requestedState };
}

async function exerciseEndToEnd(client, theme, outputPath, viewportWidth) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewportWidth,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  const states = ['processing', 'inline-ready', 'withheld', 'expired', 'revoked'];
  for (const requestedState of states) {
    await navigateDemo(client, theme, requestedState);
    await waitForInboundCard(client);
    await waitForPage(
      client,
      `document.querySelector('[data-inbound-image-card="true"]')?.getAttribute('data-image-state') === ${JSON.stringify(requestedState)}`,
    );
    const card = await evaluate(
      client,
      `(() => {
        const root = document.documentElement;
        const scroll = document.querySelector('.transcript--scroll');
        const imageCard = document.querySelector('[data-inbound-image-card="true"]');
        return {
          viewportWidth: Math.round(window.visualViewport?.width ?? window.innerWidth),
          theme: root.dataset.theme,
          clientWidth: root.clientWidth,
          scrollWidth: root.scrollWidth,
          transcript: scroll !== null,
          activity: document.querySelectorAll('.activity--group').length,
          disclosures: document.querySelectorAll('.evidence--trigger').length,
          state: imageCard?.getAttribute('data-image-state'),
          cardPixels: imageCard?.querySelectorAll('img, canvas, video, audio').length ?? 0,
          enablingControls: [...document.querySelectorAll('button, [role="button"]')]
            .map((node) => node.textContent ?? '')
            .filter((text) => /enable.*inbound|inbound.*enable|capture image|publish image|share inbound image/i.test(text)),
        };
      })()`,
    );
    if (
      card.viewportWidth !== viewportWidth ||
      card.clientWidth !== viewportWidth ||
      card.scrollWidth > card.clientWidth ||
      card.theme !== theme ||
      !card.transcript ||
      card.activity < 1 ||
      card.disclosures < 1 ||
      card.state !== requestedState ||
      card.enablingControls.length !== 0
    ) {
      throw new Error('End-to-end card boundary fixture failed.');
    }
    if (requestedState !== 'processing' && requestedState !== 'inline-ready' && card.cardPixels !== 0) {
      throw new Error('Terminal inbound-media state exposed pixels.');
    }

    if (requestedState === 'inline-ready') {
      await evaluate(
        client,
        `document.querySelector('[data-inbound-image-card="true"] button, [data-inbound-image-card="true"] [role="button"]')?.click()`,
      );
      await waitForPage(client, 'document.querySelector(".artifact-viewer--dialog") !== null');
      await evaluate(client, "window.dispatchEvent(new Event('pi-remote:privacy-cover'))");
      await waitForPage(
        client,
        `document.documentElement.dataset.artifactViewerPrivacy === 'covered' && document.querySelector('#artifact-viewer--privacy-curtain') !== null`,
      );
      const privacy = await evaluate(
        client,
        `(() => ({
          covered: document.documentElement.dataset.artifactViewerPrivacy === 'covered',
          curtain: document.querySelector('#artifact-viewer--privacy-curtain') !== null,
          viewerCovered: document.querySelector('.artifact-viewer--overlay')?.getAttribute('data-privacy-covered') === 'true',
          imageSources: [...document.querySelectorAll('.artifact-viewer--dialog img, [data-verified-image="true"]')]
            .some((image) => image.hasAttribute('src') || image.hasAttribute('srcset')),
        }))()`,
      );
      if (privacy.imageSources || !privacy.covered || !privacy.curtain || !privacy.viewerCovered) {
        throw new Error('Privacy cover did not purge the viewer.');
      }
    }
  }

  const screenshot = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, Buffer.from(screenshot.data, 'base64'));
  return { viewportWidth, stateCount: states.length };
}

async function navigateDemo(client, theme, state) {
  await client.send('Page.navigate', {
    url: `${DEV_URL}/session/demo-session-refactor?demo=1&fixture=inline-card&state=${encodeURIComponent(state)}`,
  });
  await waitForPage(client, 'document.readyState === "complete"');
  await waitForPage(client, 'document.querySelector(".transcript--scroll") !== null');
  await evaluate(
    client,
    `localStorage.setItem('pi-remote.theme', ${JSON.stringify(theme)}); location.reload();`,
  );
  await waitForPage(client, 'document.querySelector(".transcript--scroll") !== null');
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const fixture = options.fixture ?? 'inbound-media';
  const state = options.state ?? null;
  const theme = requiredOption(options, 'theme');
  const output =
    options.screenshot ?? join(tmpdir(), `pi-remote-inbound-${fixture}-${theme}.png`);
  const viewportWidth = Number(options['viewport-width'] ?? '390');
  if (
    fixture !== 'inbound-media' &&
    fixture !== 'inline-card' &&
    fixture !== 'viewer-ready' &&
    fixture !== 'end-to-end'
  ) {
    throw new Error(`Unsupported fixture: ${fixture}`);
  }
  if (
    fixture === 'inline-card' &&
    !['processing', 'inline-ready', 'withheld', 'corrupt'].includes(state ?? '')
  ) {
    throw new Error(
      `Inline card capture requires --state processing|inline-ready|withheld|corrupt`,
    );
  }
  if (theme !== 'light' && theme !== 'dark') throw new Error(`Unsupported theme: ${theme}`);
  if (!Number.isInteger(viewportWidth) || viewportWidth !== 390) {
    throw new Error(`This harness requires exactly 390 CSS pixels, got ${viewportWidth}`);
  }

  const repoRoot = process.cwd();
  const outputPath = resolve(output);
  if (outputPath === repoRoot || outputPath.startsWith(`${repoRoot}${sep}`)) {
    throw new Error('Screenshot output must be outside the repository.');
  }
  const chromePath = findChrome();
  if (chromePath === null) {
    console.error('CDP capture unavailable: no supported headless Chrome executable was found.');
    process.exitCode = 2;
    return;
  }

  const server = launchDevServer(repoRoot);
  let browserProcess = null;
  let cdp = null;
  let userDataDir = null;
  try {
    await waitForHttp(`${DEV_URL}/`);
    userDataDir = mkdtempSync(join(tmpdir(), 'pi-remote-inbound-media-'));
    const launched = await launchChrome(chromePath, userDataDir);
    browserProcess = launched.browser;
    const browserPort = new URL(launched.browserWebSocket).port;
    const targets = await fetch(`http://${HOST}:${browserPort}/json/list`).then((response) =>
      response.json(),
    );
    const target = targets.find((candidate) => candidate.type === 'page');
    if (target?.webSocketDebuggerUrl === undefined)
      throw new Error('Could not find a Chrome page target.');
    cdp = new CdpClient(target.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    const capture = await exercise(cdp, theme, fixture, state, outputPath, viewportWidth);
    console.log(`CDP passed: ${theme} ${fixture}, ${capture.viewportWidth} CSS-pixel width.`);
  } finally {
    cdp?.close();
    if (browserProcess !== null) {
      browserProcess.kill('SIGKILL');
      await waitForProcessExit(browserProcess);
    }
    server.kill('SIGTERM');
    if (userDataDir !== null) rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch(() => {
  console.error('CDP verification failed.');
  process.exitCode = 1;
});
