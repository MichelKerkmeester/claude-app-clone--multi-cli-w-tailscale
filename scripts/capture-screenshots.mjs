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

// The page paints a full-frame surface from the theme tokens. Left in place it
// becomes an opaque rectangle behind every shot, so a small control ends up as a
// speck on a large empty field. Dropping it lets the component be cropped to
// itself and composited onto any background later.
const TRANSPARENT_PAGE_CSS = `
  html, body, #storybook-root, #root {
    background: transparent !important;
    background-color: transparent !important;
  }
`;

/** Breathing room around the crop so a shadow, ring or outline is not sliced off. */
const CROP_PADDING = 12;

/** How many times a frame may be re-taken while trying to get two that agree. */
const SHOT_RETRIES = 3;

/** Below this the story drew nothing a person could see, so there is no shot to take. */
const MIN_VISIBLE_PX = 4;

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
// 5. CONTENT BOUNDS
// ───────────────────────────────────────────────────────────────────

// Runs in the page. Walks what the story actually rendered — the story root's
// children plus anything portaled to body, since sheets and dialogs escape the
// root — and returns the union of the boxes that paint something. Measuring the
// root itself would just return the full frame every time.
const MEASURE_CONTENT = `(() => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, hits = 0;

  const consider = (element) => {
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;
    // A screen-reader-only node is deliberately clipped to a 1px box; counting it
    // would report content where a sighted person sees none.
    if (element.classList.contains('sr-only')) return;

    const rect = element.getBoundingClientRect();
    const paints =
      rect.width > 0 &&
      rect.height > 0 &&
      ((style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') ||
        style.backgroundImage !== 'none' ||
        style.borderTopWidth !== '0px' ||
        style.borderBottomWidth !== '0px' ||
        style.boxShadow !== 'none' ||
        // Native-shadow controls paint through the user agent, not through any
        // style this walk can read, so they are matched by tag or missed entirely.
        ['IMG', 'SVG', 'CANVAS', 'VIDEO', 'AUDIO', 'IFRAME', 'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'PATH', 'OBJECT', 'EMBED'].includes(element.tagName) ||
        [...element.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim()));

    if (paints) {
      hits += 1;
      minX = Math.min(minX, rect.left);
      minY = Math.min(minY, rect.top);
      maxX = Math.max(maxX, rect.right);
      maxY = Math.max(maxY, rect.bottom);
    }
    for (const child of element.children) consider(child);
  };

  const root = document.querySelector('#storybook-root') || document.querySelector('#root');
  for (const child of root ? root.children : []) consider(child);
  for (const child of document.body.children) if (child !== root) consider(child);

  if (hits === 0 || maxX <= minX || maxY <= minY) return { empty: true };
  return { empty: false, x: minX, y: minY, width: maxX - minX, height: maxY - minY };
})()`;

// Fonts and images finish asynchronously. Under concurrent workers a shot could
// land microseconds before the last glyph or image decoded, which made a random
// couple of stories differ on every run. Waiting for both removes that race.
const AWAIT_ASSETS = `(async () => {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  const pending = [...document.images].filter((image) => !image.complete);
  await Promise.all(pending.map((image) => image.decode().catch(() => undefined)));
  return true;
})()`;

/** Content can overflow the device frame, so the crop needs the real page height. */
const MEASURE_PAGE_HEIGHT = `Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)`;

// ───────────────────────────────────────────────────────────────────
// 6. CAPTURE
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
  let skipped = 0;
  let unstable = 0;
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
        await page.addStyleTag({ content: `${FREEZE_MOTION_CSS}\n${TRANSPARENT_PAGE_CSS}` });
        await page.evaluate(AWAIT_ASSETS);
        await page.waitForTimeout(SETTLE_MS);

        const bounds = await page.evaluate(MEASURE_CONTENT);

        // A story that paints nothing visible — an sr-only live region, say — has
        // no picture to take. Emitting a blank frame would read as "this is how it
        // looks" instead of "there is nothing to see", so record it and move on.
        if (bounds.empty || bounds.width < MIN_VISIBLE_PX || bounds.height < MIN_VISIBLE_PX) {
          skipped += 1;
          results.push({
            id: story.id,
            title: story.title,
            name: story.name,
            ok: true,
            visuallyEmpty: true,
            note: 'Renders nothing a sighted person can see; no screenshot taken.',
          });
          continue;
        }

        // Crop to what the story drew rather than the device frame, so a small
        // control is its own size instead of a speck on an empty field. Content
        // can overflow the viewport, so the page is grown to fit before clipping.
        const pageHeight = await page.evaluate(MEASURE_PAGE_HEIGHT);
        const clip = {
          x: Math.max(0, Math.floor(bounds.x - CROP_PADDING)),
          y: Math.max(0, Math.floor(bounds.y - CROP_PADDING)),
          width: Math.ceil(Math.min(bounds.width + CROP_PADDING * 2, VIEWPORT.width - Math.max(0, bounds.x - CROP_PADDING))),
          height: Math.ceil(Math.min(bounds.height + CROP_PADDING * 2, pageHeight - Math.max(0, bounds.y - CROP_PADDING))),
        };

        // Always full-page: the clip is then in document coordinates either way,
        // and branching on whether content happens to exceed the viewport made the
        // same story render differently between runs when it landed on the boundary.
        const shoot = () => page.screenshot({ clip, fullPage: true, omitBackground: true });

        // Under concurrent workers a story occasionally rendered one way and then
        // another, which put a spurious diff in the archive. Rather than trust a
        // single frame, shoot twice and accept only a frame that reproduces; a shot
        // that never settles is written anyway but flagged, so it is visible rather
        // than quietly flapping in every future diff.
        let buffer = await shoot();
        let stable = false;
        for (let attempt = 0; attempt < SHOT_RETRIES && !stable; attempt += 1) {
          const confirm = await shoot();
          if (confirm.equals(buffer)) stable = true;
          else buffer = confirm;
        }
        writeFileSync(file, buffer);

        captured += 1;
        if (!stable) unstable += 1;
        results.push({
          id: story.id,
          title: story.title,
          name: story.name,
          ok: true,
          rel,
          size: `${clip.width}x${clip.height}`,
          ...(stable ? {} : { unstable: true }),
        });
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

      if ((captured + failed + skipped) % 25 === 0) {
        console.log(`  ${captured + failed + skipped}/${stories.length} (ok ${captured}, empty ${skipped}, fail ${failed})`);
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
        cropsToContent: true,
        transparentBackground: true,
        total: stories.length,
        captured,
        visuallyEmpty: skipped,
        unstable,
        failed,
        entries: results.sort((a, b) => (a.rel || '').localeCompare(b.rel || '')),
      },
      null,
      2,
    )}\n`,
  );

  console.log(`\nDONE: ${captured} captured (${unstable} unstable), ${skipped} visually empty, ${failed} failed, of ${stories.length}`);
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
