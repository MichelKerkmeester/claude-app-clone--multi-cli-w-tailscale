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
const SHOT_RETRIES = 4;

/** Gap before the confirming frame, so a late paint shows up as a disagreement. */
const CONFIRM_GAP_MS = 400;

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

  // A sandboxed frame paints on its own schedule and its document is opaque to
  // this page, so there is nothing to await from the outside. Waiting on the load
  // event and then giving the frame a moment is what stops a diagram being shot
  // before it has drawn - which produced two different renderings of the same story.
  // Wait for two composited frames. Under concurrent workers a shot could be taken
  // between layout and paint, so the pixels lagged the DOM; a double rAF guarantees
  // the browser has actually painted at least one full frame before the capture.
  const painted = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
  await painted();

  // Native audio and video controls draw a different width once metadata lands,
  // so a player shot before that renders one way and after it another. In
  // isolation the element is always ready in time and the story looks perfectly
  // stable; only under concurrent workers does one run lose the race, which is
  // exactly how it produced a diff that meant nothing.
  const media = [...document.querySelectorAll('audio, video')].filter((element) => element.readyState < 1);
  if (media.length > 0) {
    await Promise.all(media.map((element) => new Promise((resolve) => {
      const done = () => resolve(undefined);
      element.addEventListener('loadedmetadata', done, { once: true });
      element.addEventListener('error', done, { once: true });
      setTimeout(done, 2000);
    })));
    await painted();
  }

  const frames = [...document.querySelectorAll('iframe')];
  if (frames.length > 0) {
    await Promise.all(frames.map((frame) => new Promise((resolve) => {
      const done = () => resolve(undefined);
      frame.addEventListener('load', done, { once: true });
      setTimeout(done, 2000);
    })));
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  await painted();
  return true;
})()`;

/** Content can overflow the device frame, so the crop needs the real page height. */
const MEASURE_PAGE_HEIGHT = `Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)`;

// Share of the measured content an opaque element must span before the shot is
// left transparent. A card covers essentially all of it; a bare control covers
// none, and nothing real sits near the line.
const BACKDROP_COVERAGE = 0.8;

/**
 * Whether the story paints its own ground.
 *
 * A card brings a surface with it and reads correctly on transparency. A
 * component that draws only text — a label, a bare control, a headless
 * primitive — brings none, so a transparent shot of it is legible only if the
 * viewer happens to have a pale backdrop and vanishes on a dark one.
 *
 * This compares rectangles rather than hit-testing sample points. Sampling was
 * the first attempt and it flapped: a point on an element boundary picks a
 * different owner when sub-pixel layout or a late image decode shifts things,
 * so four shots changed their own answer between runs. Geometry has no such
 * knife edge.
 */
const MEASURE_BACKDROP = ({ x, y, width, height }) => {
  const probe = document.createElement('canvas');
  probe.width = 1;
  probe.height = 1;
  const context = probe.getContext('2d', { willReadFrequently: true });
  const opaque = (value) => {
    if (typeof value !== 'string' || value.length === 0) return false;
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = '#ff00ff';
    context.fillStyle = value;
    const accepted = context.fillStyle;
    context.fillStyle = '#00ff00';
    context.fillStyle = value;
    if (context.fillStyle !== accepted) return false;
    context.fillRect(0, 0, 1, 1);
    return context.getImageData(0, 0, 1, 1).data[3] > 200;
  };

  const area = Math.max(1, width * height);
  const root = document.querySelector('#storybook-root') || document.body;
  let best = 0;
  for (const element of [root, ...root.querySelectorAll('*')]) {
    // html and body are forced transparent for the capture, so a ground found
    // there is the capture's own doing and must not count as the story's.
    if (element === document.body || element === document.documentElement) continue;
    if (!opaque(getComputedStyle(element).backgroundColor)) continue;
    const rect = element.getBoundingClientRect();
    const overlap =
      Math.max(0, Math.min(x + width, rect.right) - Math.max(x, rect.left)) *
      Math.max(0, Math.min(y + height, rect.bottom) - Math.max(y, rect.top));
    if (overlap > best) best = overlap;
  }
  return { ratio: best / area };
};

/** The app's own page tone, so a composited shot matches how the app renders it. */
const READ_CANVAS = `getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim() || '#f8f8f6'`;

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

        // A story that brings no surface of its own would otherwise be captured
        // onto nothing, which reads only against a pale viewer background and
        // disappears against a dark one. Where the crop is mostly unpainted, the
        // app's own page tone goes behind it so the shot shows what the app shows.
        // Measured against the content, not the padded crop: the padding is the
        // capture's own margin and would push every card under the threshold.
        const backdrop = await page.evaluate(MEASURE_BACKDROP, {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        });
        const needsBackdrop = backdrop.ratio < BACKDROP_COVERAGE;

        // The ground is restated and repainted for EVERY shot, not only the ones
        // that need a backdrop. Doing this work conditionally gave the two paths
        // different timing, which pushed image-bearing stories across a settle
        // boundary and made five of them disagree with themselves between runs.
        // The ground is painted as a real element behind the story rather than as
        // the page background, so `omitBackground` stays true for every shot.
        // Flipping that option per shot was what made six image-bearing stories
        // disagree with themselves between runs; the capture call is now identical
        // for all of them and only the page content differs.
        await page.evaluate((colour) => {
          const existing = document.getElementById('pi-capture-ground');
          if (existing !== null) existing.remove();
          if (colour === null) return;
          const ground = document.createElement('div');
          ground.id = 'pi-capture-ground';
          ground.style.cssText = `position:fixed;inset:0;z-index:-1;background:${colour};`;
          document.body.prepend(ground);
        }, needsBackdrop ? await page.evaluate(READ_CANVAS) : null);
        await page.evaluate(
          () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        );

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
          // Space the confirming frame rather than taking it immediately. Back to
          // back, both shots can capture the same not-yet-painted state and agree,
          // which is how a sandboxed diagram slipped through as "stable" and then
          // rendered differently on the next run.
          await page.waitForTimeout(CONFIRM_GAP_MS);
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
          // Named so a reader can tell a shot that carries its own surface from
          // one standing on the app's page tone.
          ...(needsBackdrop ? { backdrop: 'canvas' } : {}),
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
        // Sort on the story id as well as the path. Entries with no image share an
        // empty path, so a path-only sort left them tied and their order fell out of
        // whichever worker happened to finish first - a manifest that reordered
        // between runs while every image stayed identical.
        entries: results.sort(
          (a, b) => (a.rel || '').localeCompare(b.rel || '') || a.id.localeCompare(b.id),
        ),
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
