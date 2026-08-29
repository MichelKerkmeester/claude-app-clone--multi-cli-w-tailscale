// AC-001 reproduction harness v2: test all three close paths + probe what intercepts input.
import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'app-mobile/storybook-static';
const PORT = 4175;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.mjs': 'text/javascript', '.map': 'application/json',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = join(ROOT, urlPath);
  if (!existsSync(file) || file.endsWith('/')) file = join(ROOT, urlPath, 'index.html');
  if (!existsSync(file)) { res.writeHead(404); res.end('nf'); return; }
  try {
    const data = readFileSync(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(500); res.end(); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1 });

await page.goto(`http://127.0.0.1:${PORT}/iframe.html?id=views-chat--default&viewMode=story`, { waitUntil: 'networkidle' });
await page.waitForSelector('.session--view', { timeout: 30_000 });
await page.waitForTimeout(500);

function probe() {
  return window.__sheetProbe();
}
await page.evaluate(() => {
  window.__sheetProbe = () => {
    const de = document.documentElement;
    const body = document.body;
    const sheets = [...document.querySelectorAll('[data-dialog-content]')].map((el) => ({
      state: el.getAttribute('data-state'),
      attached: document.contains(el),
    }));
    const overlays = [...document.querySelectorAll('.model-sheet--overlay')].map((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { attached: document.contains(el), display: cs.display, pointerEvents: cs.pointerEvents, opacity: cs.opacity, rect: `${Math.round(r.width)}x${Math.round(r.height)}@${Math.round(r.x)},${Math.round(r.y)}` };
    });
    const bodyCs = getComputedStyle(body);
    // what element would receive a click at center / upper area?
    const center = document.elementFromPoint(201, 300);
    return {
      bodyStyleAttr: body.getAttribute('style'),
      bodyPointerEvents: bodyCs.pointerEvents,
      bodyOverflow: bodyCs.overflow,
      sheets, overlays,
      inertCount: document.querySelectorAll('[inert]').length,
      ariaHiddenCount: document.querySelectorAll('[aria-hidden="true"]').length,
      scrollY: window.scrollY,
      scrollHeight: de.scrollHeight,
      hitAtCenter: center ? `${center.tagName}.${(center.className?.baseVal ?? center.className ?? '').toString().split(' ').slice(0,2).join('.')}` : null,
    };
  };
});

async function openSheet(how = 'trigger') {
  if (how === 'trigger') await page.locator('.runtime--effort-trigger').click();
  await page.waitForSelector('#model-effort-dialog[data-state="open"]', { timeout: 10_000 });
  await page.waitForTimeout(300);
}
async function closeAndWait(how) {
  if (how === 'button') await page.locator('.model-sheet--close').click();
  else if (how === 'escape') await page.keyboard.press('Escape');
  else if (how === 'overlay') await page.mouse.click(201, 60); // top area outside the modal
  await page.waitForFunction(() => document.querySelector('#model-effort-dialog') === null, null, { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(800);
}

for (const path of ['button', 'escape', 'overlay']) {
  console.log(`\n########## CLOSE PATH: ${path} ##########`);
  await openSheet();
  const openState = await page.evaluate(probe);
  console.log('OPEN :', JSON.stringify(openState, null, 1));
  await closeAndWait(path);
  const closed = await page.evaluate(probe);
  console.log('CLOSE:', JSON.stringify(closed, null, 1));

  // input acceptance: wheel scroll + trigger click
  await page.mouse.move(200, 400);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(250);
  const wheelY = await page.evaluate(() => window.scrollY);
  let reopen = false;
  try {
    await page.locator('.runtime--effort-trigger').click({ timeout: 3000 });
    await page.waitForSelector('#model-effort-dialog[data-state="open"]', { timeout: 3000 });
    reopen = true;
    await closeAndWait('button');
  } catch { reopen = false; }
  console.log('INPUT:', JSON.stringify({ wheelY, reopen }));
}

await browser.close();
server.close();
