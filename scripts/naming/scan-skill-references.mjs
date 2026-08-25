// ───────────────────────────────────────────────────────────────────
// MODULE: Skill Reference Scan
// ───────────────────────────────────────────────────────────────────

// Resolve skill-named paths against the shipped app tree to catch cross-repo drift.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const APP_ROOT = resolve(import.meta.dirname, '../..');

// Only backticked tokens rooted at a real app top-level entry are path claims.
const APP_ROOTS = new Set(
  readdirSync(APP_ROOT).filter((entry) => !entry.startsWith('.')),
);
// Retired top-level names are the drift this scan exists for.
const RETIRED_ROOTS = new Set(['apps', 'src', 'app']);

const BACKTICKED = /`([^`\s]+)`/g;
// Counter-examples in "not `y`" must not exist either.
const COUNTER_EXAMPLE = /not\s+`([^`\s]+)`/g;
const FILENAME = /^[a-z0-9][a-z0-9.-]*\.(ts|tsx|svelte|css|mjs|cjs|js)$/;

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function indexFilenames(dir, into = new Set(), depth = 0) {
  if (depth > 8) return into;
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.') || entry === 'node_modules') continue;
    const full = join(dir, entry);
    let stats;
    try {
      stats = statSync(full);
    } catch {
      continue;
    }
    if (stats.isDirectory()) indexFilenames(full, into, depth + 1);
    else into.add(entry);
  }
  return into;
}

const shippedFilenames = indexFilenames(APP_ROOT);

function classify(token) {
  const head = token.split('/')[0];
  if (RETIRED_ROOTS.has(head)) return 'app-path';
  if (token.includes('/') && APP_ROOTS.has(head)) return 'app-path';
  if (FILENAME.test(token)) return 'filename';
  return 'ignored';
}

function pathResolves(token) {
  if (token.includes('*')) {
    // A glob resolves when its parent exists and at least one entry matches the stem.
    const [parent, pattern] = [token.slice(0, token.lastIndexOf('/')), token.slice(token.lastIndexOf('/') + 1)];
    const parentPath = resolve(APP_ROOT, parent);
    if (!existsSync(parentPath)) return false;
    const stem = pattern.replace(/\*+/g, '');
    return readdirSync(parentPath).some((entry) => entry.startsWith(stem));
  }
  const cleaned = token.replace(/\/$/, '');
  return cleaned.length === 0 || existsSync(resolve(APP_ROOT, cleaned));
}

const target = process.argv[2];
// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

if (target === undefined) {
  process.stderr.write('usage: scan-skill-references.mjs <skill-file.md>\n');
  process.exit(2);
}

const text = readFileSync(target, 'utf8');
const counterExamples = new Set([...text.matchAll(COUNTER_EXAMPLE)].map(([, token]) => token));
const tokens = new Set([...text.matchAll(BACKTICKED)].map(([, token]) => token));
const broken = [];
const resurrected = [];
let paths = 0;
let filenames = 0;
for (const token of counterExamples) {
  if (shippedFilenames.has(token) || pathResolves(token)) resurrected.push(token);
}
for (const token of tokens) {
  if (counterExamples.has(token)) continue;
  const kind = classify(token);
  if (kind === 'app-path') {
    paths += 1;
    if (!pathResolves(token)) broken.push(token);
  } else if (kind === 'filename') {
    filenames += 1;
    if (!shippedFilenames.has(token)) broken.push(token);
  }
}

process.stdout.write('skill reference scan\n');
process.stdout.write(`  file          : ${target.replace(/^.*\/\.opencode\//, '.opencode/')}\n`);
process.stdout.write(`  path claims   : ${paths}\n`);
process.stdout.write(`  filename refs : ${filenames}\n`);
process.stdout.write(`  counter-refs  : ${counterExamples.size} (must not resolve)\n`);
process.stdout.write(`  broken        : ${broken.length}\n`);
for (const claim of broken.sort()) process.stdout.write(`   - ${claim}\n`);
for (const claim of resurrected.sort()) process.stdout.write(`   - counter-example now resolves: ${claim}\n`);
process.exit(broken.length + resurrected.length === 0 ? 0 : 1);
