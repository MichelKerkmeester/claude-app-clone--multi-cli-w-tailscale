// ───────────────────────────────────────────────────────────────────
// MODULE: UI AUDIT
// ───────────────────────────────────────────────────────────────────
// Renders every built story at the phone viewport and reports layout
// defects a person cannot reliably see in a downscaled contact sheet:
// clipped content, colliding controls, unreadable text, and layouts
// that break the device width.
//
// Each check reports only what it can measure from computed style and
// geometry, so a finding is evidence rather than an impression. Checks
// that a component uses deliberately — a pan-scrolled well, a chip that
// is not a touch target — are excluded by construction, not by triage.

import http from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '..');
const APP = path.join(REPO, 'app-mobile');
const STATIC = path.join(APP, 'storybook-static');
const OUT = path.join(REPO, 'ui-audit.json');

const VIEWPORT = { width: 402, height: 874 };
const SETTLE_MS = 450;
const WORKERS = 4;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
  '.pdf': 'application/pdf',
};

const require = createRequire(path.join(APP, 'package.json'));
const { chromium } = require('playwright');

// ───────────────────────────────────────────────────────────────────
// 1. IN-PAGE AUDIT
// ───────────────────────────────────────────────────────────────────
// Serialized into the page; it may not close over module scope.

const AUDIT = () => {
  const AA_NORMAL = 4.5;
  const AA_LARGE = 3.0;
  const TARGET_MIN = 44;
  const OVERLAP_MIN = 4;
  const CLIP_SLACK = 2;

  const findings = [];
  const add = (check, severity, detail, node) => {
    findings.push({ check, severity, detail, node });
  };

  const describe = (el) => {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/u)[0] : '';
    const id = el.id ? `#${el.id}` : '';
    return `${el.tagName.toLowerCase()}${id}${cls ? `.${cls}` : ''}`;
  };

  const channel = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  // The stylesheet uses oklch() with `none` components, which no hand-written
  // regex resolves correctly — scraping its numerals yields a colour that is
  // not merely imprecise but inverted. Painting the value and reading the
  // pixel back delegates parsing to the engine, so any CSS Color 4 syntax
  // resolves exactly as it renders.
  const probe = document.createElement('canvas');
  probe.width = 1;
  probe.height = 1;
  const ctx = probe.getContext('2d', { willReadFrequently: true });
  const parseRgb = (value) => {
    if (typeof value !== 'string' || value.length === 0) return null;
    if (value === 'transparent' || value === 'none') return { r: 0, g: 0, b: 0, a: 0 };
    ctx.clearRect(0, 0, 1, 1);
    // An unparseable value leaves fillStyle untouched, so a sentinel that the
    // colour under test can never equal makes rejection detectable.
    ctx.fillStyle = '#ff00ff';
    ctx.fillStyle = value;
    const accepted = ctx.fillStyle;
    ctx.fillStyle = '#00ff00';
    ctx.fillStyle = value;
    if (ctx.fillStyle !== accepted) return null;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return { r, g, b, a: a / 255 };
  };
  const luminance = (c) => 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
  const contrast = (a, b) => {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });

  // The ground the story composites onto. The story root is transparent, so the
  // page tone is the real backstop and it flips with the theme; assuming the
  // light tone under a dark theme would invent contrast that is not there.
  const PAGE_BG = parseRgb(getComputedStyle(document.documentElement).backgroundColor) ?? {
    r: 248,
    g: 248,
    b: 246,
    a: 1,
  };

  const effectiveBg = (el) => {
    let node = el;
    let acc = null;
    while (node && node.nodeType === 1) {
      const bg = parseRgb(getComputedStyle(node).backgroundColor);
      if (bg && bg.a > 0) {
        acc = acc === null ? bg : over(acc, bg);
        if (acc.a >= 0.999) return acc;
      }
      node = node.parentElement;
    }
    return acc === null ? PAGE_BG : over(acc, PAGE_BG);
  };

  const root = document.querySelector('#storybook-root') || document.body;

  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    // Screen-reader-only text is positioned out of the flow on purpose.
    if (r.width <= 2 && r.height <= 2) return false;
    if (cs.clipPath === 'inset(50%)' || el.classList.contains('sr-only')) return false;
    return true;
  };

  const all = [...root.querySelectorAll('*')].filter(visible);

  // ── Clipped content ──────────────────────────────────────────────
  // Only `hidden` counts: `auto`/`scroll` is a deliberate pan affordance,
  // and a clip on a one-line ellipsis is an intended truncation.
  //
  // Two more shapes are excluded because they overflow by design. A form
  // control scrolls its own value natively, so its scrollWidth always exceeds
  // its box once the value is long enough. And a box whose overflow comes only
  // from absolutely positioned children is a decorative bleed — a motif laid
  // over the panel and trimmed at its edge — not content put out of reach.
  const bleedsDecoratively = (el) => {
    const rect = el.getBoundingClientRect();
    const out = [...el.querySelectorAll('*')].filter((child) => {
      const r = child.getBoundingClientRect();
      return r.right > rect.right + 1 || r.bottom > rect.bottom + 1;
    });
    return out.length > 0 && out.every((child) => getComputedStyle(child).position === 'absolute');
  };

  for (const el of all) {
    if (el.matches('input, textarea, select')) continue;
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const clipsX = cs.overflowX === 'hidden' || cs.overflowX === 'clip';
    const clipsY = cs.overflowY === 'hidden' || cs.overflowY === 'clip';
    const ellipsis = cs.textOverflow === 'ellipsis';
    if ((clipsX || clipsY) && bleedsDecoratively(el)) continue;
    if (clipsX && !ellipsis && el.scrollWidth > Math.ceil(rect.width) + CLIP_SLACK) {
      add('CLIP_X', 'high', `${el.scrollWidth}px of content in a ${Math.round(rect.width)}px box`, describe(el));
    }
    if (clipsY && el.scrollHeight > Math.ceil(rect.height) + CLIP_SLACK) {
      // An authored max-height is a deliberate peek — a card showing the first
      // few lines of a file is doing its job. A vertical clip only indicates a
      // defect when nothing asked for the ceiling that is cutting the content.
      const clamped = cs.maxHeight !== 'none' || cs.maxBlockSize !== 'none';
      add(
        clamped ? 'CLIP_Y_CLAMPED' : 'CLIP_Y',
        clamped ? 'low' : 'medium',
        `${el.scrollHeight}px of content in a ${Math.round(rect.height)}px box${clamped ? ' (authored clamp)' : ''}`,
        describe(el),
      );
    }
  }

  // ── Colliding controls ───────────────────────────────────────────
  // Deliberate layering — a sticky composer over a scrolling transcript, a
  // remove badge on its own thumbnail — overlaps by design. Only controls that
  // are both in normal flow can collide by accident, so a positioned ancestor
  // takes the pair out of scope. The suppressed count is reported rather than
  // dropped, so the narrowing stays visible instead of reading as "none found".
  const layered = (el) => {
    let node = el;
    while (node && node !== root) {
      const position = getComputedStyle(node).position;
      if (position === 'absolute' || position === 'fixed' || position === 'sticky') return true;
      node = node.parentElement;
    }
    return false;
  };

  const CONTROL = 'button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="menuitem"]';
  const controls = all.filter((el) => el.matches(CONTROL));
  let layeredPairs = 0;
  for (let i = 0; i < controls.length; i += 1) {
    for (let j = i + 1; j < controls.length; j += 1) {
      const a = controls[i];
      const b = controls[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const dx = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const dy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (dx <= OVERLAP_MIN || dy <= OVERLAP_MIN) continue;
      if (layered(a) || layered(b)) {
        layeredPairs += 1;
        continue;
      }
      add('OVERLAP', 'high', `${describe(a)} overlaps ${describe(b)} by ${Math.round(dx)}x${Math.round(dy)}px`, describe(a));
    }
  }
  if (layeredPairs > 0) {
    add('OVERLAP_LAYERED', 'info', `${layeredPairs} overlapping pair(s) skipped as deliberate layering`, 'root');
  }

  // ── Unreadable text ──────────────────────────────────────────────
  for (const el of all) {
    const text = [...el.childNodes]
      .filter((n) => n.nodeType === 3 && n.textContent.trim())
      .map((n) => n.textContent.trim())
      .join(' ');
    if (!text) continue;
    const cs = getComputedStyle(el);
    const fg = parseRgb(cs.color);
    if (!fg) continue;
    // A fully transparent glyph is a selectable text layer drawn over its own
    // rendering (pdf.js does this); it is invisible on purpose, not unreadable.
    if (fg.a === 0) continue;
    const bg = effectiveBg(el);
    const ink = fg.a < 1 ? over(fg, bg) : fg;
    const ratio = contrast(ink, bg);
    const px = parseFloat(cs.fontSize);
    const bold = Number(cs.fontWeight) >= 700;
    const large = px >= 24 || (bold && px >= 18.66);
    const need = large ? AA_LARGE : AA_NORMAL;
    if (ratio < need) {
      add(
        'CONTRAST',
        ratio < need - 1 ? 'high' : 'medium',
        `${ratio.toFixed(2)}:1 needs ${need}:1 — ${cs.color} on rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)}) at ${cs.fontSize} — "${text.slice(0, 48)}"`,
        describe(el),
      );
    }
  }

  // ── Touch targets ────────────────────────────────────────────────
  for (const el of controls) {
    if (el.matches('a[href]') && getComputedStyle(el).display.startsWith('inline') && !el.matches('[role="button"]')) {
      continue; // A link inside running prose is not a discrete target.
    }
    const r = el.getBoundingClientRect();
    if (r.height < TARGET_MIN || r.width < TARGET_MIN) {
      add('TOUCH_TARGET', 'low', `${Math.round(r.width)}x${Math.round(r.height)}px is under ${TARGET_MIN}px`, describe(el));
    }
  }

  // ── Layout wider than the device ─────────────────────────────────
  if (document.documentElement.scrollWidth > window.innerWidth + CLIP_SLACK) {
    add('PAGE_HSCROLL', 'high', `document is ${document.documentElement.scrollWidth}px wide in a ${window.innerWidth}px viewport`, 'html');
  }

  // ── Reserved-but-unused space ────────────────────────────────────
  // A panel that claims most of the screen while its own content fills a
  // sliver of it reads as broken even though every rule applied cleanly.
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.height < window.innerHeight * 0.6) continue;
    // A modal scrim covers the whole screen on purpose; that is the entire job
    // of a backdrop, so its unused area is not reserved space going to waste.
    const position = getComputedStyle(el).position;
    if (position === 'fixed' || position === 'absolute') continue;
    const kids = [...el.children].filter(visible);
    if (kids.length === 0) continue;
    const bottom = Math.max(...kids.map((k) => k.getBoundingClientRect().bottom));
    const used = bottom - r.top;
    if (used < r.height * 0.35) {
      add(
        'EMPTY_SPACE',
        'medium',
        `${describe(el)} reserves ${Math.round(r.height)}px but its content ends after ${Math.round(used)}px`,
        describe(el),
      );
    }
  }

  return findings;
};

// ───────────────────────────────────────────────────────────────────
// 2. HARNESS
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

const index = JSON.parse(readFileSync(path.join(STATIC, 'index.json'), 'utf8'));
const stories = Object.values(index.entries ?? {})
  .filter((entry) => entry.type === 'story')
  .map((entry) => ({ id: entry.id, title: entry.title, name: entry.name }))
  .sort((a, b) => a.id.localeCompare(b.id));

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const targets = only.length > 0 ? stories.filter((s) => only.some((f) => s.id.includes(f))) : stories;

console.log(`Auditing ${targets.length} stories at ${VIEWPORT.width}x${VIEWPORT.height}\n`);

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const results = [];
let done = 0;

// Both themes are audited: the palette flips role tokens independently, so a
// pairing that contrasts in one theme can collapse to a single colour in the
// other, and auditing one theme would call that surface clean.
const THEMES = ['light', 'dark'];

const runOne = async (page, story) => {
  for (const theme of THEMES) {
    try {
      await page.goto(`${base}/iframe.html?id=${story.id}&viewMode=story`, { waitUntil: 'load', timeout: 30_000 });
      await page.waitForSelector('#storybook-root', { state: 'attached', timeout: 15_000 });
      // The app's theme controller stamps its own value on mount, so a theme set
      // before that lands is silently reverted. Settle first, then stamp, then
      // read the attribute back — an audit that cannot prove which theme it
      // measured would report the default palette under both labels.
      await page.waitForTimeout(SETTLE_MS);
      const applied = await page.evaluate((value) => {
        document.documentElement.setAttribute('data-theme', value);
        return document.documentElement.getAttribute('data-theme');
      }, theme);
      if (applied !== theme) throw new Error(`theme did not stick: asked ${theme}, got ${applied}`);
      await page.waitForTimeout(120);
      const findings = await page.evaluate(AUDIT);
      results.push({ ...story, theme, findings });
    } catch (error) {
      results.push({ ...story, theme, error: String(error).split('\n')[0] });
    }
  }
  done += 1;
  if (done % 25 === 0) console.log(`  ${done}/${targets.length}`);
};

const queue = [...targets];
await Promise.all(
  Array.from({ length: WORKERS }, async () => {
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await context.newPage();
    for (;;) {
      const story = queue.shift();
      if (story === undefined) break;
      await runOne(page, story);
    }
    await context.close();
  }),
);
await browser.close();
server.close();

results.sort((a, b) => a.id.localeCompare(b.id) || a.theme.localeCompare(b.theme));

// ───────────────────────────────────────────────────────────────────
// 3. REPORT
// ───────────────────────────────────────────────────────────────────

const byCheck = new Map();
let total = 0;
for (const result of results) {
  for (const finding of result.findings ?? []) {
    total += 1;
    if (!byCheck.has(finding.check)) byCheck.set(finding.check, []);
    byCheck.get(finding.check).push({ story: `${result.id} [${result.theme}]`, ...finding });
  }
}

const RANK = { high: 0, medium: 1, low: 2, info: 3 };
const ordered = [...byCheck.entries()].sort(
  (a, b) => RANK[a[1][0].severity] - RANK[b[1][0].severity] || b[1].length - a[1].length,
);

console.log(`\n${'='.repeat(72)}`);
for (const [check, items] of ordered) {
  console.log(`\n${check}  (${items.length})  severity=${items[0].severity}`);
  const shown = items.slice(0, 12);
  for (const item of shown) console.log(`   ${item.story}\n      ${item.detail}`);
  if (items.length > shown.length) console.log(`   ... and ${items.length - shown.length} more`);
}

const failed = results.filter((r) => r.error);
if (failed.length > 0) {
  console.log(`\nFAILED TO RENDER (${failed.length})`);
  for (const f of failed) console.log(`   ${f.id}: ${f.error}`);
}

writeFileSync(OUT, `${JSON.stringify({ viewport: VIEWPORT, stories: results.length, total, results }, null, 2)}\n`);
console.log(`\n${total} findings across ${results.length} stories -> ${path.relative(REPO, OUT)}`);
