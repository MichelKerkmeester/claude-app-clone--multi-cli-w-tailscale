#!/usr/bin/env node

// ───────────────────────────────────────────────────────────────────
// MODULE: Docgen Coverage Audit
// ───────────────────────────────────────────────────────────────────

// Every component tagged for docs gets a generated page. Nothing said which of
// those pages are worth reading. A component whose props are a typed interface
// produces a real table; one that spreads `...rest`, takes a single opaque
// object, or renders entirely from context produces a table that says almost
// nothing — and no amount of writing prose elsewhere fixes that.
//
// This ranks the pages by how little a reader gets, so prose is spent where the
// generator falls short rather than wherever someone happens to look.
//
// It measures the RENDERED page rather than the docgen payload behind it. What
// reaches the reader is the point, and a payload that never renders is worth
// knowing about — which is why this also records page errors and answers, with
// evidence, whether docs pages need a render gate of their own. No existing gate
// sweeps them: all four filter `entry.type === 'story'`.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(REPO, 'app-mobile');
const STATIC = path.join(APP, 'storybook-static');
const OUT_JSON = path.join(REPO, 'scripts', 'docgen-coverage.json');

const require = createRequire(path.join(APP, 'package.json'));
const { chromium } = require('playwright');

const CONCURRENCY = 4;
const VIEWPORT = { width: 1200, height: 900 };

// A page needs long enough for the args table to swap its loading skeleton for
// real rows. Sampling early reads placeholder text as content.
const SETTLE_MS = 1200;
const SKELETON = 'This is a short description';

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png',
  '.ico': 'image/x-icon', '.map': 'application/json',
};

// ───────────────────────────────────────────────────────────────────
// 3. STATIC SERVER
// ───────────────────────────────────────────────────────────────────

// Port 0: binding a fixed port succeeds on the wildcard address even while
// another process holds 127.0.0.1, which silently points the browser at that
// other server and measures the wrong application.
function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        let requested = decodeURIComponent(req.url.split('?')[0]);
        if (requested === '/') requested = '/index.html';
        const filePath = path.join(STATIC, requested);
        if (!filePath.startsWith(STATIC) || !existsSync(filePath)) {
          res.writeHead(404); res.end('not found'); return;
        }
        res.writeHead(200, { 'content-type': MIME[path.extname(filePath)] ?? 'application/octet-stream' });
        res.end(readFileSync(filePath));
      } catch {
        res.writeHead(500); res.end('error');
      }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

// ───────────────────────────────────────────────────────────────────
// 4. MEASUREMENT
// ───────────────────────────────────────────────────────────────────

// Runs in the page. Reads the args table the way a reader sees it: a row counts
// as described only when its description cell holds real prose, and a type is
// opaque when it conveys nothing a reader could act on.
const MEASURE = `(() => {
  const OPAQUE = new Set(['any', 'object', 'unknown', '{}', '-', '']);

  // The Description column holds EITHER a prop's JSDoc prose OR, when there is
  // none, its bare type. Counting a non-empty cell as "described" therefore
  // marks every prop documented and makes the whole ranking meaningless. These
  // two shapes are mutually exclusive, so the cell is classified rather than
  // measured for length.
  const isProse = (text) => {
    const value = text.trim();
    if (value.length === 0) return false;
    if (/=>|<[A-Za-z]|\\|\\s*(null|undefined)/.test(value)) return false;
    if (/^[A-Z][A-Za-z0-9_]*$/.test(value)) return false;
    const words = value.split(/\\s+/);
    if (words.length < 4) return false;
    if (words.every((word) => /^["'\`]/.test(word))) return false;
    return /[a-z]{3,}\\s+[a-z]{2,}/.test(value);
  };

  const rows = [...document.querySelectorAll('.docblock-argstable-body tr')];
  const props = [];
  for (const row of rows) {
    const cells = [...row.querySelectorAll('td, th')].map((c) => c.innerText.trim());
    if (cells.length < 2) continue;
    const name = (cells[0] || '').replace(/\\*$/, '').trim();
    if (!name || /^(hide|show) properties/i.test(name)) continue;
    const description = (cells[1] || '').trim();
    props.push({
      name,
      required: (cells[0] || '').includes('*'),
      described: isProse(description),
      opaque: OPAQUE.has(description.toLowerCase().split('\\n')[0].trim()),
    });
  }
  return {
    props,
    storyCount: document.querySelectorAll('.docs-story').length,
    hasDescription: [...document.querySelectorAll('.sbdocs-content p')]
      .some((p) => p.innerText.trim().length > 40),
  };
})()`;

async function audit(page, url) {
  const errors = [];
  const onError = (err) => errors.push(String(err).slice(0, 160));
  page.on('pageerror', onError);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
    await page.waitForFunction(
      `!document.body.innerText.includes(${JSON.stringify(SKELETON)})`,
      null,
      { timeout: 20_000 },
    ).catch(() => {});
    await page.waitForTimeout(SETTLE_MS);
    const measured = await page.evaluate(MEASURE);
    return { ...measured, errors };
  } catch (err) {
    return { props: [], storyCount: 0, hasDescription: false, errors: [...errors, String(err).slice(0, 160)] };
  } finally {
    page.off('pageerror', onError);
  }
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

function scoreOf(entry) {
  // What a reader gets: a described prop is worth more than a bare one, and an
  // opaque type is worth nothing regardless of whether it has a description.
  const useful = entry.props.filter((p) => p.described && !p.opaque).length;
  return useful * 2 + entry.props.length;
}

async function main() {
  if (!existsSync(path.join(STATIC, 'index.json'))) {
    console.log(`FAIL(harness): no ${STATIC}/index.json — run 'npm run build-storybook -w @pi-remote/web' first.`);
    process.exit(1);
  }

  const index = JSON.parse(readFileSync(path.join(STATIC, 'index.json'), 'utf8'));
  const docsEntries = Object.values(index.entries ?? {})
    .filter((entry) => entry.type === 'docs')
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  if (docsEntries.length === 0) {
    console.log('FAIL(harness): the catalog has no docs entries. Is addon-docs registered in main.ts?');
    process.exit(1);
  }

  const server = await serve();
  const port = server.address().port;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];

  try {
    const queue = [...docsEntries];
    const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      const page = await browser.newPage({ viewport: VIEWPORT });
      while (queue.length > 0) {
        const entry = queue.shift();
        if (entry === undefined) break;
        const url = `http://127.0.0.1:${port}/iframe.html?id=${encodeURIComponent(entry.id)}&viewMode=docs`;
        const measured = await audit(page, url);
        results.push({ id: entry.id, title: entry.title, ...measured });
        if (results.length % 20 === 0) console.log(`  ${results.length}/${docsEntries.length}`);
      }
      await page.close();
    });
    await Promise.all(workers);
  } finally {
    await browser.close();
    server.close();
  }

  // Deterministic: score, then prop count, then id. Two runs must agree, or the
  // ranking cannot be argued with.
  const ranked = results
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      score: scoreOf(entry),
      props: entry.props.length,
      described: entry.props.filter((p) => p.described && !p.opaque).length,
      opaque: entry.props.filter((p) => p.opaque).length,
      stories: entry.storyCount,
      hasProse: entry.hasDescription,
      errors: entry.errors.length,
      errorSample: entry.errors[0] ?? null,
    }))
    .sort((a, b) => a.score - b.score || a.props - b.props || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const erroring = ranked.filter((entry) => entry.errors > 0);
  const thin = ranked.filter((entry) => entry.described === 0);

  writeFileSync(OUT_JSON, `${JSON.stringify({ total: ranked.length, ranked }, null, 2)}\n`);

  console.log(`\ndocs pages audited : ${ranked.length}`);
  console.log(`pages with a page error : ${erroring.length}`);
  console.log(`pages whose table conveys nothing a reader can act on : ${thin.length}`);
  console.log(`\nthinnest 15:`);
  for (const entry of ranked.slice(0, 15)) {
    console.log(`  ${String(entry.score).padStart(3)}  ${entry.id}  (props ${entry.props}, described ${entry.described}, opaque ${entry.opaque})`);
  }
  if (erroring.length > 0) {
    console.log(`\npages that threw — evidence a render gate is warranted:`);
    for (const entry of erroring.slice(0, 10)) console.log(`  ${entry.id}: ${entry.errorSample}`);
  } else {
    console.log(`\nNo docs page threw. A render gate would currently protect against nothing observed.`);
  }
  console.log(`\nwrote ${path.relative(REPO, OUT_JSON)}`);

  // Exits on its own failure only. A low score is the finding, not an error.
  process.exit(0);
}

await main();
