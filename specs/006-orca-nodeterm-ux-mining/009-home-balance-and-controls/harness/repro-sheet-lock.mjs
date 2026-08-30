// AC-001 reproduction harness: drive the chat story's model picker open->close
// at 402x874 and measure what residue remains. Playwright real input only.
import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.argv[2] ?? 'app-mobile/storybook-static';
// Port 0 lets the OS pick a free one. A fixed port is unsafe here: binding the
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

async function snapshot(page, label) {
  const s = await page.evaluate(() => {
    const bodyStyle = document.body.getAttribute('style');
    const bs = getComputedStyle(document.body);
    const sheets = [...document.querySelectorAll('[data-dialog-content][data-state="open"]')];
    const inertCount = document.querySelectorAll('[inert]').length;
    const ariaHiddenAll = [...document.querySelectorAll('[aria-hidden="true"]')];
    const insideOpenSheet = (el) => sheets.some((sheet) => sheet.contains(el) || el === sheet);
    // aria-hidden carriers outside any open sheet
    const ariaHiddenOutside = ariaHiddenAll.filter((el) => !insideOpenSheet(el)).map((el) =>
      el.tagName + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 2).join('.') : ''));
    const htmlStyle = document.documentElement.getAttribute('style');
    const de = document.documentElement;
    return {
      bodyStyleAttr: bodyStyle,
      bodyOverflow: bs.overflow,
      bodyPointerEvents: bs.pointerEvents,
      bodyPosition: bs.position,
      htmlStyleAttr: htmlStyle,
      openSheets: sheets.length,
      inertCount,
      ariaHiddenOutsideCount: ariaHiddenOutside.length,
      ariaHiddenOutsideSample: ariaHiddenOutside.slice(0, 6),
      scrollHeight: de.scrollHeight,
      innerHeight: window.innerHeight,
      scrollY: window.scrollY,
    };
  });
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(s, null, 2));
  return s;
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1 });

page.on('console', (msg) => { if (msg.type() === 'error') console.log('[console.error]', msg.text().slice(0, 300)); });
page.on('pageerror', (err) => console.log('[pageerror]', String(err).slice(0, 300)));
await page.goto(`http://127.0.0.1:${PORT}/iframe.html?id=views-chat--default&viewMode=story`, { waitUntil: 'networkidle' });

// Wait for the chat surface to mount
try {
  await page.waitForSelector('.session--view', { timeout: 30_000 });
} catch (e) {
  await page.screenshot({ path: '/tmp/story-fail.png' });
  const html = await page.content();
  console.log('[page body head]', html.slice(0, 1200));
  throw e;
}
await page.waitForTimeout(800);

const before = await snapshot(page, 'BEFORE OPEN (baseline)');

// ---- open the model picker through the real effort trigger ----
const trigger = page.locator('.runtime--effort-trigger');
if ((await trigger.count()) === 0) throw new Error('effort trigger not found');
await trigger.click();
await page.waitForSelector('#model-effort-dialog[data-state="open"]', { timeout: 10_000 });
await page.waitForTimeout(500);

const open = await snapshot(page, 'SHEET OPEN');

// ---- close through the sheet's own close control ----
await page.locator('.model-sheet--close').click();
// wait for content unmount (exit transition done)
await page.waitForFunction(() => document.querySelector('#model-effort-dialog') === null, null, { timeout: 10_000 });
await page.waitForTimeout(700); // generous: cover bits-ui's 24ms cleanup timer + any exit animation

const afterClose = await snapshot(page, 'AFTER CLOSE');

// ---- AC-001 assertions: scroll + click ----
const scrollProbe = await page.evaluate(() => {
  window.scrollTo(0, 500);
  const programmaticY = window.scrollY;
  return { programmaticY, scrollable: document.documentElement.scrollHeight > window.innerHeight };
});
console.log('\n=== SCROLL PROBE ===', JSON.stringify(scrollProbe));

// real mouse wheel over the transcript area
await page.mouse.move(200, 400);
await page.mouse.wheel(0, 600);
await page.waitForTimeout(300);
const wheelY = await page.evaluate(() => window.scrollY);
console.log('=== WHEEL SCROLL ===', { wheelY });

// click test: does a control still accept clicks? (re-open the sheet through the trigger)
let clickOpensSheet = false;
try {
  await trigger.click({ timeout: 4000 });
  await page.waitForSelector('#model-effort-dialog[data-state="open"]', { timeout: 4000 });
  clickOpensSheet = true;
  // close again and re-measure (second close, in case first close is the leaky one)
  await page.locator('.model-sheet--close').click();
  await page.waitForFunction(() => document.querySelector('#model-effort-dialog') === null, null, { timeout: 10_000 });
  await page.waitForTimeout(700);
} catch (e) {
  console.log('CLICK TEST FAILED:', String(e).split('\n')[0]);
}
console.log('=== CLICK TEST ===', { clickOpensSheet });

const secondClose = await snapshot(page, 'AFTER SECOND CLOSE');

// Compare against the BASELINE, never against absolute literals. The app's own
// resting body overflow is `hidden auto`, so asserting `visible` fails a healthy
// surface and hides whether anything actually leaked.
const restored = (after) =>
  after.bodyPointerEvents === before.bodyPointerEvents &&
  after.bodyOverflow === before.bodyOverflow &&
  after.ariaHiddenOutsideCount === before.ariaHiddenOutsideCount &&
  after.inertCount === before.inertCount &&
  !/pointer-events|overflow/.test(after.bodyStyleAttr ?? '');

const pass =
  clickOpensSheet &&
  (wheelY > 0 || scrollProbe.programmaticY > 0) &&
  restored(afterClose) &&
  restored(secondClose);

console.log('\n=== VERDICT (pre-fix expected FAIL) ===', pass ? 'PASS' : 'FAIL');

await browser.close();
server.close();
process.exit(pass ? 0 : 1);
