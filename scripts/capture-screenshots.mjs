#!/usr/bin/env node

// ───────────────────────────────────────────────────────────────────
// MODULE: Storybook Screenshot Archive
// ───────────────────────────────────────────────────────────────────

// Capture every Storybook story at a fixed mobile frame into repo-root
// screenshots/, so a visual change to any component is reviewable as a diff.
// A mechanical class rename once broke rendering four ways while every suite
// stayed green; only a before/after image diff surfaced it.

// The archive is rebuilt whole rather than patched: a stale shot for a story
// that no longer exists is worse than no shot, because it reads as current.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import http from 'node:http';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(REPO, 'app-mobile');
const STATIC = path.join(APP, 'storybook-static');
const OUT = path.join(REPO, 'screenshots');

const require = createRequire(path.join(APP, 'package.json'));
const { chromium } = require('playwright');

const CONCURRENCY = 4;

/** iPhone 16 Pro logical size; scale factor 1 keeps output exactly this many pixels. */
const VIEWPORT = { width: 402, height: 874 };
const DEVICE_SCALE_FACTOR = 1;

/** Let fonts settle and any mount transition finish before the shot. */
const SETTLE_MS = 500;

// Components that print a clock re-rendered a different second on every run, so
// their diff was noise rather than change. Pinning the clock makes those shots
// comparable. It must sit AFTER the demo fixture timestamps: pinned before them,
// every relative label inverts into the future and reads "in 5,493 hours".
const FIXED_CLOCK = new Date('2026-08-28T12:00:00.000Z');

// Spinners and pulses land on a different frame every run, so an animated
// component produced a different PNG each time and its diff meant nothing.
// Freezing motion is what makes this archive comparable at all: the app's own
// reduced-motion path is emulated first, and anything still moving — including
// third-party primitives that ignore the media query — is pinned to its final
// frame. The caret is hidden for the same reason: it blinks.
const FREEZE_MOTION_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    animation-iteration-count: 1 !important;
    animation-play-state: paused !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
  }
`;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
};

// ───────────────────────────────────────────────────────────────────
// 3. NAMING
// ───────────────────────────────────────────────────────────────────

/** Fold camelCase, separators and digit boundaries into one kebab token. */
function kebab(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Za-z])([0-9])/g, '$1-$2')
    .replace(/([0-9])([A-Za-z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

/** "Chrome/DictationOverlay" + "Open" becomes chrome/dictation-overlay--open.png. */
function relPath(title, name) {
  const segments = String(title).split('/').map(kebab).filter(Boolean);
  const group = segments[0] || 'misc';
  const component = segments.slice(1).join('-');
  const state = kebab(name || 'story') || 'story';
  return `${group}/${component ? `${component}--${state}` : state}.png`;
}

// ───────────────────────────────────────────────────────────────────
// 4. STATIC SERVER
// ───────────────────────────────────────────────────────────────────

// Storybook's built output needs an origin; serving from disk keeps the run
// self-contained rather than depending on a dev server someone remembered to start.
function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        let requested = decodeURIComponent(req.url.split('?')[0]);
        if (requested === '/') requested = '/index.html';
        const filePath = path.join(STATIC, requested);
        if (!filePath.startsWith(STATIC) || !existsSync(filePath)) {
          res.writeHead(404);
          res.end('not found');
          return;
        }
        res.writeHead(200, {
          'content-type': MIME[path.extname(filePath)] || 'application/octet-stream',
        });
        res.end(readFileSync(filePath));
      } catch {
        res.writeHead(500);
        res.end('error');
      }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

// ───────────────────────────────────────────────────────────────────
// 5. CAPTURE
// ───────────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(path.join(STATIC, 'index.json'))) {
    console.error('No storybook-static build found. Run: npm run build-storybook -w @pi-remote/web');
    process.exit(1);
  }

  const index = JSON.parse(readFileSync(path.join(STATIC, 'index.json'), 'utf8'));
  const stories = Object.values(index.entries || index.stories || {}).filter(
    (entry) => entry.type === 'story' || entry.type === undefined,
  );

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });

  let captured = 0;
  let failed = 0;
  const results = [];
  const seen = new Map();
  const queue = [...stories];

  async function worker() {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
      reducedMotion: 'reduce',
    });
    await context.clock.setFixedTime(FIXED_CLOCK);
    const page = await context.newPage();

    while (queue.length) {
      const story = queue.shift();
      let rel = relPath(story.title, story.name);
      // One story per component state, so a collision means two stories share a
      // name; suffix rather than let the later shot silently overwrite the earlier.
      if (seen.has(rel)) rel = rel.replace(/\.png$/, `-${seen.get(rel)}.png`);
      seen.set(rel, (seen.get(rel) || 0) + 1);

      const file = path.join(OUT, rel);
      mkdirSync(path.dirname(file), { recursive: true });

      try {
        await page.goto(`${base}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`, {
          waitUntil: 'load',
          timeout: 20_000,
        });
        await page.waitForSelector('#storybook-root, #root', { state: 'attached', timeout: 12_000 });
        await page.addStyleTag({ content: FREEZE_MOTION_CSS });
        await page.waitForTimeout(SETTLE_MS);
        // A viewport shot rather than a full-page one, so fixed-position sheets,
        // dialogs and announcers land in frame the way a person would see them.
        await page.screenshot({ path: file });
        captured += 1;
        results.push({ id: story.id, title: story.title, name: story.name, ok: true, rel });
      } catch (error) {
        failed += 1;
        results.push({
          id: story.id,
          title: story.title,
          name: story.name,
          ok: false,
          err: String(error).split('\n')[0],
        });
      }

      if ((captured + failed) % 25 === 0) {
        console.log(`  ${captured + failed}/${stories.length} (ok ${captured}, fail ${failed})`);
      }
    }

    await context.close();
  }

  console.log(
    `Capturing ${stories.length} stories @ ${VIEWPORT.width}x${VIEWPORT.height} with ${CONCURRENCY} workers...`,
  );
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  await browser.close();
  server.close();

  writeFileSync(
    path.join(OUT, 'MANIFEST.json'),
    `${JSON.stringify(
      {
        generatedFrom: 'storybook-static',
        frame: `${VIEWPORT.width}x${VIEWPORT.height}`,
        deviceScaleFactor: DEVICE_SCALE_FACTOR,
        total: stories.length,
        captured,
        failed,
        entries: results.sort((a, b) => (a.rel || '').localeCompare(b.rel || '')),
      },
      null,
      2,
    )}\n`,
  );

  console.log(`\nDONE: ${captured} captured, ${failed} failed, of ${stories.length}`);
  if (failed > 0) {
    console.log('FAILURES:');
    for (const result of results.filter((entry) => !entry.ok).slice(0, 20)) {
      console.log(`  ${result.id} — ${result.err}`);
    }
  }

  // A partial archive must not read as a complete one, so a failed story fails the run.
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('FATAL', error);
  process.exit(1);
});
