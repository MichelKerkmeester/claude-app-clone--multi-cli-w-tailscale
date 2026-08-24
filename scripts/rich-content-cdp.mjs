#!/usr/bin/env node

// ───────────────────────────────────────────────────────────────────
// MODULE: Rich Content CDP Gate
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

async function scrollUntilSelector(client, selector, text = null, requireNoActions = false) {
  return waitForPage(
    client,
    `(() => {
      const scroll = document.querySelector('.transcript-scroll');
      const target = [...document.querySelectorAll(${JSON.stringify(selector)})]
        .find((node) => ${JSON.stringify(text)} === null || node.textContent?.includes(${JSON.stringify(text)}));
      if (
        target !== undefined &&
        (!${JSON.stringify(requireNoActions)} || target.querySelectorAll('.rich-block-action').length === 0)
      ) return true;
      if (scroll === null) return false;
      scroll.scrollTop = Math.min(
        scroll.scrollHeight,
        scroll.scrollTop + Math.max(220, scroll.clientHeight * 0.75),
      );
      return false;
    })()`,
  );
}

async function scrollUntilCommandStatus(client, status, direction) {
  await waitForPage(
    client,
    `(() => {
      const scroll = document.querySelector('.transcript-scroll');
      const hasStatus = [...document.querySelectorAll('.rich-command-card .rich-block-status')]
        .some((node) => node.textContent?.includes(${JSON.stringify(status)}));
      if (hasStatus) return true;
      if (scroll === null) return false;
      scroll.scrollTop = ${direction === 'up' ? 'Math.max(0, scroll.scrollTop - Math.max(220, scroll.clientHeight * 0.75))' : `Math.min(scroll.scrollHeight, scroll.scrollTop + Math.max(220, scroll.clientHeight * 0.75))`};
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

async function exerciseLegacyActivity(client, theme, outputPath, viewportWidth) {
  await navigate(client, `${DEV_URL}/session/demo-session-refactor?demo=1`);
  await waitForPage(client, 'document.querySelector(".transcript-scroll") !== null');
  await evaluate(
    client,
    `localStorage.removeItem('pi-remote.read-only.v1'); localStorage.setItem('pi-remote.theme', ${JSON.stringify(theme)}); location.reload();`,
  );
  await waitForPage(client, 'document.querySelector(".transcript-scroll") !== null');
  await waitForPage(
    client,
    'document.querySelector(".activity-group") !== null && document.querySelector(".block-text") !== null',
  );

  const state = await evaluate(
    client,
    `(() => {
      const root = document.documentElement;
      const scroll = document.querySelector('.transcript-scroll');
      return {
        viewportWidth: Math.round(window.visualViewport?.width ?? window.innerWidth),
        theme: root.dataset.theme,
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        activity: document.querySelectorAll('.activity-group').length,
        prose: document.querySelectorAll('.transcript-block.block-text .block-copy').length,
        evidence: document.querySelectorAll('.evidence-trigger').length,
        composer: document.querySelector('[aria-label="Message Pi"]') !== null,
        legacyRichCards: document.querySelectorAll('.block-text_artifact, [data-rich-content], .file-preview-card').length,
        transcriptScroll: scroll !== null,
      };
    })()`,
  );
  if (state.viewportWidth !== viewportWidth) {
    throw new Error(`Expected ${viewportWidth} CSS-pixel width, got ${state.viewportWidth}`);
  }
  if (state.theme !== theme) {
    throw new Error(`Expected ${theme} theme, got ${state.theme ?? 'unset'}`);
  }
  if (state.clientWidth !== viewportWidth || state.scrollWidth > state.clientWidth) {
    throw new Error(
      `Horizontal overflow at ${viewportWidth}px: client=${state.clientWidth}, scroll=${state.scrollWidth}`,
    );
  }
  if (
    !state.transcriptScroll ||
    state.activity < 1 ||
    state.prose < 1 ||
    state.evidence < 1 ||
    !state.composer ||
    state.legacyRichCards !== 0
  ) {
    throw new Error(
      'Legacy activity fixture did not preserve the Activity disclosure/prose/composer path without rich cards.',
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

async function exerciseRichCore(client, theme, outputPath, viewportWidth) {
  await navigate(client, `${DEV_URL}/session/demo-session-refactor?demo=1&fixture=rich-core`);
  await waitForPage(client, 'document.querySelector(".transcript-scroll") !== null');
  await evaluate(
    client,
    `localStorage.removeItem('pi-remote.read-only.v1'); localStorage.setItem('pi-remote.theme', ${JSON.stringify(theme)}); location.reload();`,
  );
  await waitForPage(client, 'document.querySelector(".transcript-scroll") !== null');
  await scrollUntilCommandStatus(client, 'Running', 'up');

  const initial = await evaluate(
    client,
    `(() => {
      const scroll = document.querySelector('.transcript-scroll');
      const actions = [...document.querySelectorAll('.rich-block-action')];
      const bounds = actions.map((action) => {
        const rect = action.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });
      return {
        viewportWidth: Math.round(window.visualViewport?.width ?? window.innerWidth),
        theme: document.documentElement.dataset.theme,
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        running: document.body.textContent?.includes('Running') ?? false,
        completed: document.body.textContent?.includes('Completed') ?? false,
        malformedFallback: document.querySelector('.block-tool_call') !== null,
        actionCount: actions.length,
        bounds,
      };
    })()`,
  );
  if (initial.viewportWidth !== viewportWidth || initial.clientWidth !== viewportWidth) {
    throw new Error(
      `Expected ${viewportWidth} CSS-pixel width, got viewport=${initial.viewportWidth}, client=${initial.clientWidth}`,
    );
  }
  if (initial.theme !== theme)
    throw new Error(`Expected ${theme} theme, got ${initial.theme ?? 'unset'}`);
  if (initial.scrollWidth > initial.clientWidth) {
    throw new Error(
      `Horizontal overflow at ${viewportWidth}px: client=${initial.clientWidth}, scroll=${initial.scrollWidth}`,
    );
  }
  if (!initial.running) {
    throw new Error('Rich core fixture did not expose the running command state.');
  }
  if (initial.bounds.some((bound) => bound.width < 44 || bound.height < 44)) {
    throw new Error('Rich core action is smaller than 44 CSS pixels.');
  }

  const copied = await evaluate(
    client,
    `(() => {
      const button = [...document.querySelectorAll('.rich-command-card button')].find(
        (candidate) => candidate.textContent?.includes('Copy command'),
      );
      if (!(button instanceof HTMLElement)) return false;
      button.click();
      return true;
    })()`,
  );
  if (!copied) throw new Error('Rich core Copy command action was not found.');
  await waitForPage(client, 'typeof window.__richCopied === "string"');

  await scrollUntilCommandStatus(client, 'Completed', 'down');
  await scrollUntilSelector(client, '.rich-code-card');
  const opened = await evaluate(
    client,
    `(() => {
      const button = [...document.querySelectorAll('.rich-code-card button')].find(
        (candidate) => candidate.textContent?.includes('Open full screen'),
      );
      if (!(button instanceof HTMLElement)) return false;
      button.click();
      return true;
    })()`,
  );
  if (!opened) throw new Error('Rich core Open full screen action was not found.');
  await waitForPage(client, 'document.querySelector(".artifact-viewer-dialog") !== null');
  const openedState = await evaluate(
    client,
    `window.history.state?.__piRemoteArtifactBlockId ?? null`,
  );
  if (typeof openedState !== 'string' || openedState.length === 0) {
    throw new Error('F6 history did not contain the opaque rich block id.');
  }
  await evaluate(client, `document.querySelector('.artifact-viewer-close')?.click()`);
  await waitForPage(client, 'document.querySelector(".artifact-viewer-dialog") === null');

  await evaluate(
    client,
    `document.querySelectorAll('.evidence-trigger').forEach((trigger) => {
      if (trigger.getAttribute('aria-expanded') !== 'true') trigger.click();
    })`,
  );
  const malformedLegacyFound = await scrollUntilSelector(
    client,
    '.rich-activity-card',
    'legacy content remains read-only',
    true,
  );
  const finalLayout = await evaluate(
    client,
    `(() => {
      const root = document.documentElement;
      const actions = [...document.querySelectorAll('.rich-block-action')];
      return {
        viewportWidth: Math.round(window.visualViewport?.width ?? window.innerWidth),
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        malformedFallback: ${JSON.stringify(malformedLegacyFound === true)},
        malformedActions: 0,
        bounds: actions.map((action) => {
          const rect = action.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        }),
      };
    })()`,
  );
  if (!finalLayout.malformedFallback || finalLayout.malformedActions !== 0) {
    throw new Error('Rich core fixture did not expose the malformed legacy fallback.');
  }
  if (
    finalLayout.viewportWidth !== viewportWidth ||
    finalLayout.clientWidth !== viewportWidth ||
    finalLayout.scrollWidth > finalLayout.clientWidth
  ) {
    throw new Error(
      `Horizontal overflow at ${viewportWidth}px: client=${finalLayout.clientWidth}, scroll=${finalLayout.scrollWidth}`,
    );
  }
  if (finalLayout.bounds.some((bound) => bound.width < 44 || bound.height < 44)) {
    throw new Error('Rich core action is smaller than 44 CSS pixels.');
  }

  const screenshot = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, Buffer.from(screenshot.data, 'base64'));
  return {
    ...initial,
    ...finalLayout,
    copied,
    opened,
    historyBlockId: openedState,
  };
}

async function exerciseRichRelease(client, theme, outputPath, viewportWidth) {
  await navigate(client, `${DEV_URL}/session/demo-session-refactor?demo=1&fixture=rich-release`);
  await waitForPage(client, 'document.querySelector(".transcript-scroll") !== null');
  await evaluate(
    client,
    `localStorage.removeItem('pi-remote.read-only.v1'); localStorage.setItem('pi-remote.theme', ${JSON.stringify(theme)}); location.reload();`,
  );
  await waitForPage(client, 'document.querySelector(".transcript-scroll") !== null');
  await scrollUntilCommandStatus(client, 'Connection lost', 'down');
  await waitForPage(
    client,
    'document.body.textContent?.includes("Upstream truncated") && document.body.textContent?.includes("RTL prose")',
  );

  const matrix = await evaluate(
    client,
    `(() => {
      const root = document.documentElement;
      const actions = [...document.querySelectorAll('.rich-block-action')];
      const rows = [...document.querySelectorAll('.transcript-block')];
      return {
        viewportWidth: Math.round(window.visualViewport?.width ?? window.innerWidth),
        theme: root.dataset.theme,
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        commandCards: document.querySelectorAll('.rich-command-card').length,
        codeCards: document.querySelectorAll('.rich-code-card').length,
        textCards: document.querySelectorAll('.rich-text-artifact-card, .rich-prose-block').length,
        hasFailure: document.body.textContent?.includes('Failed') ?? false,
        hasTruncation: document.body.textContent?.includes('Upstream truncated') ?? false,
        hasStaleCache: document.body.textContent?.includes('Stale cache') ?? false,
        hasConnectionLoss: document.body.textContent?.includes('Connection lost') ?? false,
        hasBidiMarker: document.body.textContent?.includes('⟦RLO⟧') ?? false,
        actions: actions.map((action) => {
          const rect = action.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        }),
        rowHeights: rows.map((row) => row.getBoundingClientRect().height).filter((height) => height > 0),
      };
    })()`,
  );
  if (matrix.viewportWidth !== viewportWidth || matrix.clientWidth !== viewportWidth) {
    throw new Error(
      `Expected ${viewportWidth} CSS-pixel width, got viewport=${matrix.viewportWidth}, client=${matrix.clientWidth}`,
    );
  }
  if (matrix.theme !== theme)
    throw new Error(`Expected ${theme} theme, got ${matrix.theme ?? 'unset'}`);
  if (matrix.scrollWidth > matrix.clientWidth) {
    throw new Error(
      `Horizontal overflow at ${viewportWidth}px: client=${matrix.clientWidth}, scroll=${matrix.scrollWidth}`,
    );
  }
  if (
    matrix.commandCards < 4 ||
    matrix.codeCards < 1 ||
    matrix.textCards < 2 ||
    !matrix.hasFailure ||
    !matrix.hasTruncation ||
    !matrix.hasStaleCache ||
    !matrix.hasConnectionLoss ||
    !matrix.hasBidiMarker
  ) {
    throw new Error('Rich release fixture did not expose the complete state matrix.');
  }
  if (
    matrix.actions.some((bound) => bound.width < 44 || bound.height < 44) ||
    matrix.rowHeights.some((height) => height <= 0)
  ) {
    throw new Error('Rich release fixture has an invalid action hit box or row height.');
  }

  const opened = await evaluate(
    client,
    `(() => {
      const card = [...document.querySelectorAll('.rich-command-card')]
        .find((candidate) => candidate.textContent?.includes('Connection lost'));
      const button = [...(card?.querySelectorAll('button') ?? [])].find((candidate) =>
        candidate.textContent?.includes('Open full screen'),
      );
      if (!(button instanceof HTMLElement)) return false;
      button.click();
      return true;
    })()`,
  );
  if (!opened) throw new Error('Rich release running-tail viewer action was not found.');
  await waitForPage(client, 'document.querySelector(".artifact-viewer-dialog") !== null');
  const viewerState = await evaluate(
    client,
    `(() => {
      const dialog = document.querySelector('.artifact-viewer-dialog');
      const viewer = document.querySelector('.artifact-code-preview');
      const activeInside = dialog?.contains(document.activeElement) ?? false;
      if (!(viewer instanceof HTMLElement)) return { activeInside, scrollHeight: 0, clientHeight: 0 };
      viewer.scrollTop = 0;
      viewer.dispatchEvent(new Event('scroll', { bubbles: true }));
      return {
        activeInside,
        scrollHeight: viewer.scrollHeight,
        clientHeight: viewer.clientHeight,
      };
    })()`,
  );
  if (!viewerState.activeInside) throw new Error('Rich release viewer did not contain focus.');
  if (viewerState.scrollHeight <= viewerState.clientHeight) {
    throw new Error('Rich release running-tail viewer was not scrollable.');
  }
  await waitForPage(client, 'document.querySelector(".artifact-jump-latest") !== null');
  await evaluate(client, `document.querySelector('.artifact-jump-latest')?.click()`);
  await waitForPage(
    client,
    'document.querySelector(".artifact-code-viewer")?.getAttribute("data-live-edge") === "true"',
  );
  await evaluate(client, `document.querySelector('.artifact-viewer-close')?.click()`);
  await waitForPage(client, 'document.querySelector(".artifact-viewer-dialog") === null');

  const scaled = await evaluate(
    client,
    `(() => {
      document.documentElement.style.fontSize = '200%';
      const root = document.documentElement;
      const actionBounds = [...document.querySelectorAll('.rich-block-action')].map((action) => {
        const rect = action.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });
      const reducedMotionDuration = getComputedStyle(document.querySelector('.rich-block-action') ?? root).transitionDuration;
      return {
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        actionBounds,
        reducedMotionDuration,
      };
    })()`,
  );
  if (scaled.scrollWidth > scaled.clientWidth) {
    throw new Error(
      `200% text overflow at ${viewportWidth}px: client=${scaled.clientWidth}, scroll=${scaled.scrollWidth}`,
    );
  }
  if (scaled.actionBounds.some((bound) => bound.width < 44 || bound.height < 44)) {
    throw new Error('200% rich release action is smaller than 44 CSS pixels.');
  }
  if (scaled.reducedMotionDuration !== '0s' && scaled.reducedMotionDuration !== '0.1s') {
    throw new Error(`Reduced-motion transition exceeded 100ms: ${scaled.reducedMotionDuration}`);
  }

  const screenshot = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, Buffer.from(screenshot.data, 'base64'));
  return {
    ...matrix,
    ...scaled,
    opened,
    viewer: viewerState,
  };
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const fixture = requiredOption(options, 'fixture');
  const theme = requiredOption(options, 'theme');
  const output = requiredOption(options, 'output');
  const viewportWidth = Number(requiredOption(options, 'viewport-width'));
  if (fixture !== 'legacy-activity' && fixture !== 'rich-core' && fixture !== 'rich-release') {
    throw new Error(`Unsupported fixture: ${fixture}`);
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
    userDataDir = mkdtempSync(join(tmpdir(), 'pi-remote-rich-content-'));
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
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source:
        "Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value) => { window.__richCopied = value; } } });",
    });
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: viewportWidth,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    if (fixture === 'rich-release') {
      await cdp.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      });
    }
    const state =
      fixture === 'rich-core'
        ? await exerciseRichCore(cdp, theme, outputPath, viewportWidth)
        : fixture === 'rich-release'
          ? await exerciseRichRelease(cdp, theme, outputPath, viewportWidth)
          : await exerciseLegacyActivity(cdp, theme, outputPath, viewportWidth);
    console.log(
      fixture === 'rich-core'
        ? `CDP passed: ${theme} rich-core, ${state.viewportWidth} CSS-pixel width, no horizontal overflow, 44px actions, Copy/Open/Close and malformed fallback exercised, screenshot ${outputPath}`
        : fixture === 'rich-release'
          ? `CDP passed: ${theme} rich-release, ${state.viewportWidth} CSS-pixel width, state matrix, bounded viewer, reduced motion, 200% text, and screenshot ${outputPath}`
          : `CDP passed: ${theme} legacy-activity, ${state.viewportWidth} CSS-pixel width, no horizontal overflow, Activity/prose/composer unchanged, screenshot ${outputPath}`,
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
