#!/usr/bin/env node

// ───────────────────────────────────────────────────────────────────
// MODULE: Token Override Check
// ───────────────────────────────────────────────────────────────────
// Proves the catalog's token playground actually retunes the whole catalog
// rather than only the page that set the value.
//
// The mechanism is one line in the Storybook preview: a hook that re-applies
// the stored overrides before each story renders. Nothing else in the repo
// fails if that hook is deleted — typecheck, the suites, story coverage and
// the token gate all stay green while a designer's retune silently stops
// reaching every surface. This check is the thing that goes red.
//
// It is deliberately end-to-end: it stores an override the way the playground
// does, loads a DIFFERENT story, and reads the computed value there. Asserting
// on the helper's own return would prove nothing about whether the retune
// survives a navigation.
//
// Usage: node scripts/token-override-check.mjs   (needs a built storybook-static)
// Exit 0 = the override applied and cleared; exit 1 = it did not.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import http from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(REPO, 'app-mobile');
const STATIC = path.join(APP, 'storybook-static');

const require = createRequire(path.join(APP, 'package.json'));
const { chromium } = require('playwright');

/** Must match the key the playground writes; a rename here silently passes. */
const STORAGE_KEY = 'pi-catalog-token-overrides';

/** A plain surface that is NOT the playground, so navigation is part of the test. */
const PROBE_STORY = 'views-header--default';
const TOKEN = '--accent';
const SENTINEL = '#00ff00';

const VIEWPORT = { width: 402, height: 874 };
const SETTLE_MS = 500;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
};

// ───────────────────────────────────────────────────────────────────
// 3. RUN
// ───────────────────────────────────────────────────────────────────

if (!existsSync(STATIC)) {
  console.error(`No built Storybook at ${STATIC}. Run: npm run build-storybook -w @pi-remote/web`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  let route = decodeURIComponent((req.url || '/').split('?')[0]);
  if (route === '/') route = '/index.html';
  const file = path.join(STATIC, route);
  if (!file.startsWith(STATIC) || !existsSync(file)) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext({ viewport: VIEWPORT });
const page = await context.newPage();

const readToken = async () => {
  await page.goto(`${base}/iframe.html?id=${PROBE_STORY}&viewMode=story`, { waitUntil: 'load' });
  await page.waitForSelector('#storybook-root', { state: 'attached' });
  await page.waitForTimeout(SETTLE_MS);
  return page.evaluate(
    (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
    TOKEN,
  );
};

const baseline = await readToken();

await page.evaluate(
  ([key, token, value]) => {
    window.localStorage.setItem(key, JSON.stringify({ [token]: value }));
  },
  [STORAGE_KEY, TOKEN, SENTINEL],
);
const overridden = await readToken();

await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
const restored = await readToken();

await browser.close();
server.close();

const normalise = (value) => value.replace(/\s/gu, '').toLowerCase();
const applied = normalise(overridden) === normalise(SENTINEL) || normalise(overridden) === 'rgb(0,255,0)';
const cleared = normalise(restored) === normalise(baseline);

console.log(`story         : ${PROBE_STORY}`);
console.log(`token         : ${TOKEN}`);
console.log(`baseline      : ${baseline}`);
console.log(`with override : ${overridden}   ${applied ? 'APPLIED' : 'NOT APPLIED'}`);
console.log(`after clear   : ${restored}   ${cleared ? 'RESTORED' : 'NOT RESTORED'}`);

if (applied && cleared) {
  console.log('\ntoken-override-check PASS');
  process.exit(0);
}
console.log('\ntoken-override-check FAIL: the playground no longer retunes other stories');
process.exit(1);
