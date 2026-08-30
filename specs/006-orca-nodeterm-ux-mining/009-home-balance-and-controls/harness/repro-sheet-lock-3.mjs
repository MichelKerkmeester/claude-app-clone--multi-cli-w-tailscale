// Sheet-dismissal reproduction: the close paths a PHONE actually uses.
//
// The first probe proved the close button restores the surface exactly. The
// Escape leg is a dead end by design -- this sheet sets
// escapeKeydownBehavior="ignore" on purpose, and a phone has no Escape key
// anyway. What remains untested is how a person on a device dismisses a bottom
// sheet: tapping the backdrop, and swiping it down. The swipe path is bespoke
// pointer code rather than the dialog primitive, so it is the one most likely
// to leak.
//
// Every verdict is measured against the BASELINE captured before the sheet ever
// opened. Absolute literals lie here: the app's resting body overflow is
// `hidden auto`, not `visible`.
import { chromium, devices } from 'playwright';
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.argv[2] ?? 'app-mobile/storybook-static';
// Port 0 lets the OS pick a free one. A fixed port is unsafe: binding the
// wildcard address succeeds even while another process holds 127.0.0.1 on the
// same port, so the browser reaches THAT server and the probe silently measures
// the wrong application.
let PORT = 0;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.mjs': 'text/javascript',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = join(ROOT, urlPath);
  if (!existsSync(file) || file.endsWith('/')) file = join(ROOT, urlPath, 'index.html');
  if (!existsSync(file)) file = join(ROOT, 'index.html');
  try {
    const data = readFileSync(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
PORT = server.address().port;

const probe = () => {
  const bs = getComputedStyle(document.body);
  const openSheets = [...document.querySelectorAll('[data-dialog-content][data-state="open"]')];
  const inside = (el) => openSheets.some((s) => s.contains(el) || el === s);
  const hiddenOutside = [...document.querySelectorAll('[aria-hidden="true"]')].filter((el) => !inside(el));
  const mid = document.elementFromPoint(201, 500);
  return {
    bodyStyleAttr: document.body.getAttribute('style'),
    bodyOverflow: bs.overflow,
    bodyPointerEvents: bs.pointerEvents,
    openSheets: openSheets.length,
    inertCount: document.querySelectorAll('[inert]').length,
    ariaHiddenOutside: hiddenOutside.length,
    hitAtMid: mid ? mid.tagName + (typeof mid.className === 'string' && mid.className ? '.' + mid.className.split(' ')[0] : '') : null,
  };
};

// A surface is restored when every observable matches the baseline and no
// inline overflow/pointer-events override survives on <body>.
const restored = (base, after) =>
  after.bodyPointerEvents === base.bodyPointerEvents &&
  after.bodyOverflow === base.bodyOverflow &&
  after.ariaHiddenOutside === base.ariaHiddenOutside &&
  after.inertCount === base.inertCount &&
  after.openSheets === 0 &&
  !/pointer-events|overflow/.test(after.bodyStyleAttr ?? '');

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({
  ...devices['iPhone 14 Pro'],
  viewport: { width: 402, height: 874 },
  deviceScaleFactor: 1,
  hasTouch: true,
  isMobile: true,
});
const page = await context.newPage();
page.on('pageerror', (err) => console.log('[pageerror]', String(err).slice(0, 200)));
await page.goto(`http://127.0.0.1:${PORT}/iframe.html?id=views-chat--default&viewMode=story`, { waitUntil: 'networkidle' });
await page.waitForSelector('.session--view', { timeout: 30_000 });
await page.waitForTimeout(800);

const baseline = await page.evaluate(probe);
console.log('BASELINE:', JSON.stringify(baseline));

async function openSheet() {
  await page.locator('.runtime--effort-trigger').click({ timeout: 8000 });
  await page.waitForSelector('#model-effort-dialog[data-state="open"]', { timeout: 8000 });
  await page.waitForTimeout(400);
}

async function settle() {
  await page.waitForFunction(() => document.querySelector('#model-effort-dialog') === null, null, { timeout: 8000 })
    .catch(() => {});
  await page.waitForTimeout(700); // cover the primitive's cleanup timer + exit transition
}

// Swipe the drag region far enough down to clear the dismiss ratio.
async function swipeDismiss() {
  const box = await page.locator('[data-testid="model-sheet--drag-region"]').boundingBox();
  if (box === null) throw new Error('drag region not found');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let step = 1; step <= 12; step += 1) {
    await page.mouse.move(x, y + step * 60);
    await page.waitForTimeout(12);
  }
  await page.mouse.up();
  await settle();
}

// Tap the backdrop well above the modal panel.
async function backdropTap() {
  await page.mouse.click(201, 12);
  await settle();
}

const results = [];
for (const [name, close] of [['swipe-dismiss', swipeDismiss], ['backdrop-tap', backdropTap]]) {
  await openSheet();
  const opened = await page.evaluate(probe);
  await close();
  const after = await page.evaluate(probe);

  // Can the surface still be driven? Re-open through the same trigger.
  let reopen = false;
  try {
    await page.locator('.runtime--effort-trigger').click({ timeout: 4000 });
    await page.waitForSelector('#model-effort-dialog[data-state="open"]', { timeout: 4000 });
    reopen = true;
    await page.locator('.model-sheet--close').click();
    await settle();
  } catch { /* reopen stays false — the surface is stuck */ }

  const ok = restored(baseline, after) && reopen;
  results.push({ name, ok, reopen, after });
  console.log(`\n########## ${name} ##########`);
  console.log('OPEN :', JSON.stringify(opened));
  console.log('AFTER:', JSON.stringify(after));
  console.log('REOPEN:', reopen, '| RESTORED:', restored(baseline, after));
}

const pass = results.every((r) => r.ok);
console.log('\n=== VERDICT ===', pass ? 'PASS' : 'FAIL');
for (const r of results) if (!r.ok) console.log(`  FAILED: ${r.name} (reopen=${r.reopen})`);

await browser.close();
server.close();
process.exit(pass ? 0 : 1);
