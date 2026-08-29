#!/usr/bin/env node

// ───────────────────────────────────────────────────────────────────
// MODULE: Catalog State Visibility
// ───────────────────────────────────────────────────────────────────
// Catches the defect class no other gate can express: a surface that renders
// a state the viewer cannot see. Typecheck, the suites, story coverage and the
// render gate all stay green while two states paint identically, a control
// changes nothing, or a fixture drifts away from the pinned capture clock and
// starts reporting an age no running system could have.
//
// Every check here exists because that happened. A passing and a failing check
// summary were identical in background, border and ink in both themes, with the
// classification published only as an unread data attribute. A streaming-state
// control rendered no difference at its own story's block count. A todo panel
// reported "Updated 243 hours ago" because its fixture was never migrated when
// the capture clock was pinned.
//
// Usage: node scripts/catalog-state-visibility.mjs [--quick]
//   needs a built storybook-static; --quick skips the archive-wide age sweep.
// Exit 0 = every state is visible and every age is plausible; 1 = it is not.

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

/** Must match the capture's pin, or every age this gate reads is measured from the wrong now. */
const FIXED_CLOCK = new Date('2026-08-28T12:00:00.000Z');

const VIEWPORT = { width: 402, height: 874 };
const SETTLE_MS = 450;

/** A classification is visible only if its border and its value ink both carry it. */
const CLASSIFIED = {
  story: (name) => `source-control-checksummary--${name}`,
  distinct: ['passing', 'failing', 'pending'],
  neutral: 'unknown',
  selector: '.source-control-check-summary',
};

// A control is real only when two of its values render differently — and the
// comparison has to be made where the control is USED. The streaming state was
// inert at exactly the block count every story sets, while differing at smaller
// counts no story uses, so a check pointed at a small count reported green over
// a control that did nothing.
const CONTROLS = [
  {
    label: 'streamingState token vs fixture at the default block count',
    story: 'transcript-transcriptlist--live-edge',
    a: 'streamingState:token',
    b: 'streamingState:fixture',
  },
];

// An age is implausible when no running system could have produced it. The
// bounds are deliberately loose: this catches a fixture stranded ten days from
// the clock, not a fixture that is merely a little older than its neighbours.
const AGE_RULES = [
  { re: /(\d+)\s+hours?\s+ago/gu, max: 24, unit: 'hours' },
  { re: /(\d+)h ago/gu, max: 24, unit: 'h' },
  { re: /(\d+)d ago/gu, max: 30, unit: 'd' },
  { re: /(\d+):\d\d remaining/gu, max: 180, unit: 'min remaining' },
];

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.png': 'image/png', '.ico': 'image/x-icon', '.map': 'application/json',
};

// ───────────────────────────────────────────────────────────────────
// 3. HARNESS
// ───────────────────────────────────────────────────────────────────

if (!existsSync(STATIC)) {
  console.error(`No built Storybook at ${STATIC}. Run: npm run build-storybook -w @pi-remote/web`);
  process.exit(1);
}

const quick = process.argv.includes('--quick');

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
const failures = [];

async function withPage(theme, run) {
  const context = await browser.newContext({ viewport: VIEWPORT });
  await context.clock.setFixedTime(FIXED_CLOCK);
  const page = await context.newPage();
  const open = async (id, args) => {
    const query = args === undefined ? '' : `&args=${encodeURIComponent(args)}`;
    const globals = theme === undefined ? '' : `&globals=theme:${theme}`;
    await page.goto(`${base}/iframe.html?id=${id}&viewMode=story${globals}${query}`, {
      waitUntil: 'load',
      timeout: 20000,
    });
    await page.waitForSelector('#storybook-root', { state: 'attached', timeout: 10000 });
    await page.waitForTimeout(SETTLE_MS);
  };
  try {
    await run(page, open);
  } finally {
    await context.close();
  }
}

// ───────────────────────────────────────────────────────────────────
// 4. CHECK — A CLASSIFICATION MUST BE VISIBLE, NOT JUST PUBLISHED
// ───────────────────────────────────────────────────────────────────

const readPaint = (selector) => {
  const el = document.querySelector(selector);
  if (el === null) return null;
  const style = getComputedStyle(el);
  const value = el.querySelector(`${selector}--value`);
  return {
    border: style.borderColor,
    background: style.backgroundColor,
    ink: value === null ? style.color : getComputedStyle(value).color,
  };
};

for (const theme of ['light', 'dark']) {
  await withPage(theme, async (page, open) => {
    const paints = new Map();
    for (const name of [...CLASSIFIED.distinct, CLASSIFIED.neutral]) {
      await open(CLASSIFIED.story(name));
      const paint = await page.evaluate(readPaint, CLASSIFIED.selector);
      if (paint === null) {
        failures.push(`[${theme}] ${CLASSIFIED.story(name)} did not render ${CLASSIFIED.selector}`);
        continue;
      }
      paints.set(name, paint);
    }
    // Each classification the design distinguishes must differ from every other
    // one, in something a viewer can actually see.
    for (const a of CLASSIFIED.distinct) {
      for (const b of CLASSIFIED.distinct) {
        if (a >= b) continue;
        const pa = paints.get(a);
        const pb = paints.get(b);
        if (pa === undefined || pb === undefined) continue;
        if (pa.border === pb.border && pa.ink === pb.ink && pa.background === pb.background) {
          failures.push(`[${theme}] '${a}' and '${b}' paint identically (${pa.border} / ${pa.ink})`);
        }
      }
    }
    console.log(`  classification paints [${theme}]: ${[...paints.entries()]
      .map(([k, v]) => `${k}=${v.border}`)
      .join('  ')}`);
  });
}

// ───────────────────────────────────────────────────────────────────
// 5. CHECK — A CONTROL MUST CHANGE WHAT RENDERS
// ───────────────────────────────────────────────────────────────────

await withPage(undefined, async (page, open) => {
  for (const control of CONTROLS) {
    const read = async (args) => {
      await open(control.story, args);
      return page.evaluate(() => document.querySelector('#storybook-root')?.innerHTML ?? '');
    };
    const a = await read(control.a);
    const b = await read(control.b);
    if (a === b) {
      failures.push(`control '${control.label}' renders no difference on ${control.story}`);
    }
    console.log(`  control ${control.label}: ${a === b ? 'INERT' : 'renders a difference'}`);
  }
});

// ───────────────────────────────────────────────────────────────────
// 6. CHECK — AN AGE MUST BE PLAUSIBLE AGAINST THE PINNED CLOCK
// ───────────────────────────────────────────────────────────────────

const index = JSON.parse(readFileSync(path.join(STATIC, 'index.json'), 'utf8'));
const ids = Object.keys(index.entries);
const sweep = quick ? ids.slice(0, 40) : ids;

let scanned = 0;
await withPage(undefined, async (page, open) => {
  for (const id of sweep) {
    try {
      await open(id);
    } catch {
      continue;
    }
    const text = await page.evaluate(() => document.querySelector('#storybook-root')?.innerText ?? '');
    scanned += 1;
    for (const rule of AGE_RULES) {
      for (const match of text.matchAll(rule.re)) {
        const amount = Number(match[1]);
        if (amount > rule.max) {
          failures.push(`${id} reports "${match[0].trim()}" (over ${rule.max} ${rule.unit})`);
        }
      }
    }
  }
});

await browser.close();
server.close();

// ───────────────────────────────────────────────────────────────────
// 7. REPORT
// ───────────────────────────────────────────────────────────────────

console.log(`\nclock pinned  : ${FIXED_CLOCK.toISOString()}`);
console.log(`stories swept : ${scanned}${quick ? ' (--quick)' : ''}`);

if (failures.length === 0) {
  console.log('\ncatalog-state-visibility PASS');
  process.exit(0);
}
console.log(`\ncatalog-state-visibility FAIL: ${failures.length} problem(s)`);
for (const failure of failures) console.log(`  - ${failure}`);
process.exit(1);
