// ───────────────────────────────────────────────────────────────────
// MODULE: Catalog Render CDP Gate
// ───────────────────────────────────────────────────────────────────

// Render every Storybook story in light and dark; build-only checks miss runtime throws.
// Usage:
//   node scripts/catalog-smoke-cdp.mjs [--filter <substr>] [--static <dir>]
// Exit 0 = clean; 2 = story threw; 1 = harness could not run.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, normalize, extname } from 'node:path';
import WebSocket from 'ws';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const HOST = '127.0.0.1';
const args = process.argv.slice(2);
const filterArg = args.includes('--filter') ? args[args.indexOf('--filter') + 1] : null;
const STATIC = args.includes('--static')
  ? args[args.indexOf('--static') + 1]
  : 'app-mobile/storybook-static';
const THEMES = ['light', 'dark'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CONTENT_TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ttf': 'font/ttf', '.map': 'application/json',
};

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function findChrome() {
  const p = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  return existsSync(p) ? p : null;
}

// Minimal static server; Storybook iframe needs absolute /assets URLs, not file://.
function serveStatic(root) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        let path = decodeURIComponent((req.url || '/').split('?')[0]);
        if (path === '/') path = '/index.html';
        const full = normalize(join(root, path));
        if (!full.startsWith(normalize(root))) { res.writeHead(403).end(); return; }
        if (!existsSync(full) || !statSync(full).isFile()) { res.writeHead(404).end(); return; }
        const body = await readFile(full);
        res.writeHead(200, { 'content-type': CONTENT_TYPES[extname(full)] ?? 'application/octet-stream' });
        res.end(body);
      } catch { res.writeHead(500).end(); }
    });
    server.listen(0, HOST, () => resolve({ server, port: server.address().port }));
  });
}

async function launchChrome(path, dir) {
  const proc = spawn(path, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--no-sandbox', '--disable-dev-shm-usage', '--remote-allow-origins=*',
    '--remote-debugging-port=0', `--user-data-dir=${dir}`, 'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  const out = [];
  proc.stdout.on('data', (d) => out.push(String(d)));
  proc.stderr.on('data', (d) => out.push(String(d)));
  const end = Date.now() + 20000;
  while (Date.now() < end) {
    const m = out.join('').match(/DevTools listening on (ws:\/\/[^\s]+)/u);
    if (m) return { proc, ws: m[1] };
    await sleep(100);
  }
  throw new Error('Chrome CDP endpoint never appeared');
}

class Cdp {
  constructor(url) { this.s = new WebSocket(url); this.i = 0; this.p = new Map(); this.events = []; }
  connect() {
    return new Promise((res, rej) => {
      this.s.once('open', () => { this.s.off('error', rej); res(); });
      this.s.once('error', rej);
      this.s.on('message', (m) => {
        const q = JSON.parse(String(m));
        if (typeof q.id === 'number') {
          const r = this.p.get(q.id);
          if (r) { this.p.delete(q.id); q.error ? r.reject(new Error(JSON.stringify(q.error))) : r.resolve(q.result); }
          return;
        }
        this.events.push(q);
      });
    });
  }
  send(method, params = {}) {
    const id = ++this.i;
    return new Promise((res, rej) => { this.p.set(id, { resolve: res, reject: rej }); this.s.send(JSON.stringify({ id, method, params })); });
  }
}

async function ev(c, expression) {
  const r = await c.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result?.value;
}

async function navigate(c, url) {
  await c.send('Page.navigate', { url });
  const end = Date.now() + 15000;
  while (Date.now() < end) {
    if (await ev(c, 'document.readyState==="complete"')) return;
    await sleep(100);
  }
}

// Wait for story content or Storybook's error overlay, not a blank frame.
async function waitForStory(c) {
  // Tight blank-frame cap; only thrown errors fail the gate.
  const end = Date.now() + 2500;
  while (Date.now() < end) {
    const state = await ev(c, `(() => {
      // Storybook keeps hidden error shells in the DOM; only a VISIBLE one is a
      // real failure. offsetParent===null when the node (or an ancestor) is
      // display:none, so it is the reliable "actually shown" test.
      const errEl = document.querySelector('.sb-errordisplay') || document.querySelector('.sb-nopreview');
      const errVisible = !!errEl && errEl.offsetParent !== null && errEl.getBoundingClientRect().height > 4;
      const root = document.querySelector('#storybook-root') || document.querySelector('#root');
      const mounted = !!root && root.children.length > 0;
      return JSON.stringify({ err: errVisible, mounted });
    })()`);
    const { err, mounted } = JSON.parse(state);
    if (err) return 'error-overlay';
    if (mounted) return 'mounted';
    await sleep(120);
  }
  return 'timeout';
}

function collectErrors(c) {
  const consoleErrors = c.events.filter(
    (e) => e.method === 'Runtime.consoleAPICalled' && e.params?.type === 'error',
  );
  const exceptions = c.events.filter((e) => e.method === 'Runtime.exceptionThrown');
  const sample = exceptions[0]
    ? String(exceptions[0].params?.exceptionDetails?.exception?.description || '').slice(0, 200)
    : consoleErrors[0]
      ? (consoleErrors[0].params.args || []).map((a) => a.value || a.description || '').join(' ').slice(0, 200)
      : '';
  return { consoleErrors: consoleErrors.length, exceptions: exceptions.length, sample };
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function main() {
  const staticDir = STATIC;
  if (!existsSync(join(staticDir, 'index.json'))) {
    console.log(`FAIL(harness): no ${staticDir}/index.json — run 'npm run build-storybook -w @pi-remote/web' first.`);
    process.exit(1);
  }
  const chrome = findChrome();
  if (!chrome) { console.log('FAIL(harness): Google Chrome not found.'); process.exit(1); }

  const index = JSON.parse(await readFile(join(staticDir, 'index.json'), 'utf8'));
  let stories = Object.values(index.entries || {}).filter((e) => e.type === 'story');
  if (filterArg) stories = stories.filter((e) => e.id.includes(filterArg) || e.title.includes(filterArg));
  if (stories.length === 0) { console.log('FAIL(harness): no stories matched.'); process.exit(1); }

  const { server, port } = await serveStatic(staticDir);
  const dir = mkdtempSync(join(tmpdir(), 'catalog-smoke-'));
  let browser;
  const failures = [];
  try {
    const { proc, ws } = await launchChrome(chrome, dir);
    browser = proc;
    const target = (await fetch(`http://${HOST}:${new URL(ws).port}/json/list`).then((r) => r.json())).find((t) => t.type === 'page');
    const c = new Cdp(target.webSocketDebuggerUrl);
    await c.connect();
    await c.send('Page.enable');
    await c.send('Runtime.enable');
    await c.send('Log.enable');
    await c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

    console.log(`Rendering ${stories.length} stories × ${THEMES.length} themes (${stories.length * THEMES.length} frames)...`);
    for (const story of stories) {
      for (const theme of THEMES) {
        c.events.length = 0;
        const url = `http://${HOST}:${port}/iframe.html?viewMode=story&id=${encodeURIComponent(story.id)}&globals=theme:${theme}`;
        await navigate(c, url);
        const outcome = await waitForStory(c);
        const { consoleErrors, exceptions, sample } = collectErrors(c);
        const bad = outcome === 'error-overlay' || exceptions > 0 || consoleErrors > 0;
        if (bad) {
          failures.push({ id: story.id, theme, outcome, exceptions, consoleErrors, sample });
          console.log(`  ✗ ${story.id} [${theme}] — ${outcome}, exc:${exceptions} err:${consoleErrors} ${sample ? '| ' + sample : ''}`);
        }
      }
    }
  } catch (e) {
    console.log('FAIL(harness):', e.message);
    try { browser?.kill('SIGKILL'); } catch {}
    server.close();
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
    process.exit(1);
  }

  try { browser?.kill('SIGKILL'); } catch {}
  server.close();
  try { rmSync(dir, { recursive: true, force: true }); } catch {}

  const frames = stories.length * THEMES.length;
  if (failures.length === 0) {
    console.log(`PASS: ${stories.length} stories × ${THEMES.length} themes = ${frames} frames, 0 throws.`);
    process.exit(0);
  }
  console.log(`\nFAIL: ${failures.length}/${frames} frames threw or showed an error overlay.`);
  process.exit(2);
}

main();
