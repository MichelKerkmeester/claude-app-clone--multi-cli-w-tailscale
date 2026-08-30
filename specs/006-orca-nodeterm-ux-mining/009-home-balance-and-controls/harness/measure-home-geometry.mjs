// Home-screen geometry measurement. Turns "badly aligned" into numbers, so the
// work can be delegated and then checked by someone other than its author.
//
// Measured per committed home state and per theme at the archive's 402x874:
//   1. column fit    - does a session card span the row it sits in, and share a
//                      left edge with the section heading above it?
//   2. toolbar rhythm- do the controls above the list share a left edge with the
//                      column, a height, and a baseline with their row peers?
//   3. filter fit    - does the chip row use the column, or strand dead space?
//   4. theme control - are the three options comparable in weight, and does each
//                      carry a visible label?
//   5. overflow      - does anything push a surface past its own column?
//
// Selectors are the real ones read out of the rendered DOM, not guesses. Every
// tolerance is stated inline so a reader can argue with the number.
import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.argv[2] ?? 'app-mobile/storybook-static';
const FRAME = { width: 402, height: 874 };
// Port 0 lets the OS pick a free one. A fixed port is unsafe: binding the
// wildcard address succeeds even while another process holds 127.0.0.1 on the
// same port, so the browser reaches THAT server and the probe measures the
// wrong application.
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

// Tolerances. A card may fall short of its row by this much before it reads as
// a half-width card in a full-width column.
const CARD_WIDTH_TOLERANCE = 8;
const EDGE_TOLERANCE = 1;
const ROW_HEIGHT_TOLERANCE = 4;
const ROW_BASELINE_TOLERANCE = 2;
const THEME_WIDTH_SPREAD = 0.25;
const CHIP_ROW_MIN_FILL = 0.75;

const measureHome = () => {
  const box = (el) => {
    const b = el.getBoundingClientRect();
    return { left: b.left, right: b.right, top: b.top, width: b.width, height: b.height };
  };
  const vis = (sel, scope = document) =>
    [...scope.querySelectorAll(sel)].filter((el) => el.getBoundingClientRect().width > 0);

  const rows = vis('.roster--row');
  const cards = rows.map((row) => {
    const card = row.querySelector('.session--card');
    return card === null ? null : { row: box(row), card: box(card) };
  }).filter((x) => x !== null);

  const headings = vis('.status--heading');

  // A card should fill the row it lives in; the row IS the column.
  const cardFit = cards.map(({ row, card }) => ({
    rowWidth: row.width,
    cardWidth: card.width,
    shortfall: row.width - card.width,
    leftDelta: Math.abs(row.left - card.left),
  }));

  // Heading left edge versus the card beneath it.
  const headingLeft = headings.length > 0 ? box(headings[0]).left : null;
  const headingWidth = headings.length > 0 ? box(headings[0]).width : null;

  // The toolbar holds the controls above the list.
  const toolbar = document.querySelector('.roster--toolbar');
  const toolbarBox = toolbar === null ? null : box(toolbar);
  const toolbarKids = toolbar === null ? [] : [...toolbar.children]
    .filter((el) => el.getBoundingClientRect().width > 0)
    .map((el) => ({
      cls: typeof el.className === 'string' ? el.className.split(' ').filter((c) => !c.startsWith('svelte-'))[0] : '',
      ...box(el),
    }));

  const section = document.querySelector('.session--section');
  const columnBox = section === null ? null : box(section);

  // The pin affordance acts on one session, so it must sit inside that
  // session's card rather than beside it in the empty half of the column.
  const pins = vis('.roster--favorite');
  const pinsOutside = pins.filter((pin) => {
    const owner = pin.closest('.roster--row');
    const card = owner?.querySelector('.session--card') ?? null;
    if (card === null) return true;
    const p = box(pin);
    const c = box(card);
    return p.left < c.left - 1 || p.right > c.right + 1;
  }).length;

  const chipRow = document.querySelector('.roster--chips');
  const chipFill = chipRow === null || columnBox === null
    ? null
    : box(chipRow).width / columnBox.width;

  return {
    cardFit,
    headingLeft,
    headingWidth,
    columnBox,
    toolbarBox,
    toolbarKids,
    chipFill,
    pinCount: pins.length,
    pinsOutside,
    scrollWidth: document.documentElement.scrollWidth,
  };
};

const measureTheme = () => {
  const box = (el) => {
    const b = el.getBoundingClientRect();
    return { left: b.left, width: b.width, height: b.height };
  };
  const control = document.querySelector('.theme--control');
  const options = [...document.querySelectorAll('.theme--option')]
    .filter((el) => el.getBoundingClientRect().width > 0);
  return {
    controlWidth: control === null ? null : box(control).width,
    options: options.map((el) => ({
      ...box(el),
      text: (el.textContent ?? '').trim(),
      label: el.getAttribute('aria-label') ?? '',
      selected: el.getAttribute('data-selected') === 'true',
      // Text in the DOM is not text on the screen. This control hides its
      // labels at phone width and marks each option with a ::before glyph, so
      // a legible option is one that renders EITHER real text or a mark.
      // Checking textContent alone passes a control that shows nothing.
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      clipped: el.scrollWidth > el.clientWidth + 1,
      textRendered: Number.parseFloat(getComputedStyle(el).fontSize) > 0,
      mark: (() => {
        const c = getComputedStyle(el, '::before').content;
        return c === 'none' || c === 'normal' ? '' : c.replace(/^"|"$/g, '');
      })(),
    })),
    optionsWidth: options.reduce((sum, el) => sum + box(el).width, 0),
  };
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const findings = [];

async function open(id, theme) {
  const page = await browser.newPage({ viewport: FRAME, deviceScaleFactor: 1, colorScheme: theme });
  await page.goto(
    `http://127.0.0.1:${PORT}/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`,
    { waitUntil: 'networkidle' },
  );
  await page.waitForTimeout(700);
  return page;
}

for (const theme of ['light', 'dark']) {
  for (const story of ['ready', 'empty', 'loading', 'error', 'stale']) {
    const page = await open(`views-home--${story}`, theme);
    const m = await page.evaluate(measureHome);
    console.log(`\n=== home/${story}/${theme} ===`);
    console.log(JSON.stringify(m, null, 1));
    const tag = `home/${story}/${theme}`;

    for (const fit of m.cardFit) {
      if (fit.shortfall > CARD_WIDTH_TOLERANCE) {
        findings.push(`${tag}: card is ${fit.cardWidth.toFixed(0)}px inside a ${fit.rowWidth.toFixed(0)}px row — ${fit.shortfall.toFixed(0)}px of the column is empty (max ${CARD_WIDTH_TOLERANCE})`);
      }
      if (fit.leftDelta > EDGE_TOLERANCE) {
        findings.push(`${tag}: card left edge differs from its row by ${fit.leftDelta.toFixed(1)}px (max ${EDGE_TOLERANCE})`);
      }
    }
    if (m.headingLeft !== null && m.cardFit.length > 0) {
      const d = Math.abs(m.headingLeft - (m.columnBox?.left ?? m.headingLeft));
      if (d > EDGE_TOLERANCE) findings.push(`${tag}: heading left edge differs from the column by ${d.toFixed(1)}px (max ${EDGE_TOLERANCE})`);
    }
    if (m.toolbarBox !== null && m.columnBox !== null) {
      for (const kid of m.toolbarKids) {
        if (kid.left < m.columnBox.left - EDGE_TOLERANCE || kid.left + kid.width > m.columnBox.left + m.columnBox.width + EDGE_TOLERANCE) {
          findings.push(`${tag}: toolbar control .${kid.cls} at ${kid.left.toFixed(0)}..${(kid.left + kid.width).toFixed(0)} escapes the column ${m.columnBox.left.toFixed(0)}..${(m.columnBox.left + m.columnBox.width).toFixed(0)}`);
        }
      }
      // Group toolbar children into visual rows and check their rhythm.
      const byRow = new Map();
      for (const kid of m.toolbarKids) {
        const key = Math.round(kid.top / 24);
        if (!byRow.has(key)) byRow.set(key, []);
        byRow.get(key).push(kid);
      }
      for (const row of byRow.values()) {
        if (row.length < 2) continue;
        const hSpread = Math.max(...row.map((k) => k.height)) - Math.min(...row.map((k) => k.height));
        const tSpread = Math.max(...row.map((k) => k.top)) - Math.min(...row.map((k) => k.top));
        if (hSpread > ROW_HEIGHT_TOLERANCE) {
          findings.push(`${tag}: toolbar row [${row.map((k) => '.' + k.cls).join(', ')}] varies ${hSpread.toFixed(0)}px in height (max ${ROW_HEIGHT_TOLERANCE})`);
        }
        if (tSpread > ROW_BASELINE_TOLERANCE) {
          findings.push(`${tag}: toolbar row [${row.map((k) => '.' + k.cls).join(', ')}] varies ${tSpread.toFixed(0)}px off baseline (max ${ROW_BASELINE_TOLERANCE})`);
        }
      }
    }
    if (m.pinsOutside > 0) {
      findings.push(`${tag}: ${m.pinsOutside} pin affordance(s) sit outside the card they act on`);
    }
    if (m.chipFill !== null && m.chipFill < CHIP_ROW_MIN_FILL) {
      findings.push(`${tag}: filter chips use ${(m.chipFill * 100).toFixed(0)}% of the column (min ${CHIP_ROW_MIN_FILL * 100}%)`);
    }
    await page.close();
  }

  for (const story of ['system', 'light', 'dark']) {
    const page = await open(`views-themecontrol--${story}`, theme);
    const m = await page.evaluate(measureTheme);
    console.log(`\n=== theme/${story}/${theme} ===`);
    console.log(JSON.stringify(m, null, 1));
    const tag = `theme/${story}/${theme}`;

    if (m.options.length !== 3) {
      findings.push(`${tag}: expected 3 theme options, measured ${m.options.length}`);
    } else {
      const widths = m.options.map((o) => o.width);
      const spread = (Math.max(...widths) - Math.min(...widths)) / Math.max(...widths);
      if (spread > THEME_WIDTH_SPREAD) {
        findings.push(`${tag}: theme options differ in width by ${(spread * 100).toFixed(0)}% — ${widths.map((w) => w.toFixed(0)).join('/')} (max ${THEME_WIDTH_SPREAD * 100}%)`);
      }
      for (const o of m.options) {
        if (o.text.length === 0) findings.push(`${tag}: a theme option carries no label at all (aria-label "${o.label}")`);
        if (!o.textRendered && o.mark.length === 0) {
          findings.push(`${tag}: theme option "${o.text}" renders nothing — its label is hidden and it carries no mark, so the reader sees an empty box`);
        }
        if (o.clipped) {
          findings.push(`${tag}: theme option "${o.text}" is clipped — ${o.scrollWidth}px of label in a ${o.clientWidth}px button, so the reader sees a fragment`);
        }
      }
      // One vocabulary, not three: a distinct mark per option, none repeated.
      const marks = m.options.map((o) => o.mark).filter((x) => x.length > 0);
      if (marks.length > 0 && new Set(marks).size !== marks.length) {
        findings.push(`${tag}: theme options repeat a mark (${marks.join(' ')}) — two states look the same`);
      }
      if (m.controlWidth !== null && m.optionsWidth / m.controlWidth < 0.6) {
        findings.push(`${tag}: options fill ${((m.optionsWidth / m.controlWidth) * 100).toFixed(0)}% of the control — the rest is dead space (min 60%)`);
      }
    }
    await page.close();
  }
}

console.log('\n=== FINDINGS ===');
if (findings.length === 0) console.log('none');
for (const f of findings) console.log('  -', f);
console.log('\n=== VERDICT ===', findings.length === 0 ? 'PASS' : `FAIL (${findings.length})`);

await browser.close();
server.close();
process.exit(findings.length === 0 ? 0 : 1);
