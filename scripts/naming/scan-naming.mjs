// ───────────────────────────────────────────────────────────────────
// MODULE: Naming Completeness Scan
// ───────────────────────────────────────────────────────────────────

// List in-scope files whose names violate the grammar; SvelteKit reserved names are excluded by design.
// Usage: node scripts/naming/scan-naming.mjs [--scope <path-prefix>]
// Exit 0 = every in-scope name matches; exit 2 = offenders listed.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { readdirSync, statSync } from 'node:fs';
import { join, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import { kebabBasename, isReservedName, isRouteParameterSegment, RESERVED_SVELTEKIT } from './naming-rules.mjs';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SOURCE_ROOT = 'app-mobile/src';
const EXCLUDED_DIRS = new Set(['routes']);
const SOURCE_EXTENSIONS = ['.svelte', '.ts'];

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (EXCLUDED_DIRS.has(entry)) continue;
      walk(full, out);
      continue;
    }
    if (SOURCE_EXTENSIONS.some((ext) => entry.endsWith(ext))) out.push(full);
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

function main() {
  const scopeIndex = process.argv.indexOf('--scope');
  const scope = scopeIndex === -1 ? null : process.argv[scopeIndex + 1];

  const files = walk(join(REPO_ROOT, SOURCE_ROOT))
    .map((full) => relative(REPO_ROOT, full).split('\\').join('/'))
    .filter((path) => scope === null || path.startsWith(scope))
    .sort();

  const offenders = [];
  let reserved = 0;
  for (const path of files) {
    const name = basename(path);
    if (isReservedName(name)) {
      reserved += 1;
      continue;
    }
    if (path.split('/').some(isRouteParameterSegment)) {
      reserved += 1;
      continue;
    }
    if (kebabBasename(name) !== name) offenders.push(path);
  }

  console.log('naming scan');
  console.log('  scope            :', scope ?? SOURCE_ROOT);
  console.log('  files scanned    :', files.length);
  console.log('  reserved skipped :', reserved, `(${RESERVED_SVELTEKIT.join(', ')} and [param] segments)`);
  console.log('  offenders        :', offenders.length);
  for (const path of offenders) console.log('   !', path);
  process.exit(offenders.length === 0 ? 0 : 2);
}

main();
