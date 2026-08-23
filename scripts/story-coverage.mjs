// Story-coverage gate: every renderable Svelte component must have a co-located
// *.stories.ts (or *.stories.svelte), so the catalog stays complete as the app
// grows. Intentional exceptions live in story-coverage-allowlist.json, each with
// a reason — nothing is silently skipped. Exit 1 on any uncovered component or a
// stale allowlist entry, so the gate can sit on the board.
//
// Usage: node scripts/story-coverage.mjs [--json]
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'app-mobile', 'src');
const ALLOWLIST = join(ROOT, 'scripts', 'story-coverage-allowlist.json');
const jsonMode = process.argv.includes('--json');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const all = walk(SRC);
const components = all
  .filter((p) => p.endsWith('.svelte') && !p.endsWith('.stories.svelte'))
  .map((p) => relative(SRC, p).split('\\').join('/'));

function hasStory(relComponent) {
  const abs = join(SRC, relComponent);
  const dir = dirname(abs);
  const stem = basename(abs, '.svelte');
  return existsSync(join(dir, `${stem}.stories.ts`)) || existsSync(join(dir, `${stem}.stories.svelte`));
}

const allow = JSON.parse(readFileSync(ALLOWLIST, 'utf8')).allow;
const allowMap = new Map(allow.map((a) => [a.path, a.reason]));

const covered = [];
const missing = [];
const allowlisted = [];
for (const c of components) {
  if (hasStory(c)) covered.push(c);
  else if (allowMap.has(c)) allowlisted.push(c);
  else missing.push(c);
}

// A stale allowlist entry (component gone, or now has a story) must be pruned so
// the allowlist never hides a real gap.
const stale = allow
  .map((a) => a.path)
  .filter((p) => !existsSync(join(SRC, p)) || hasStory(p));

const result = {
  total: components.length,
  covered: covered.length,
  allowlisted: allowlisted.length,
  missing,
  staleAllowlist: stale,
  pass: missing.length === 0 && stale.length === 0,
};

if (jsonMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Story coverage: ${covered.length}/${components.length - allowlisted.length} renderable components have a story (${allowlisted.length} allowlisted).`);
  if (allowlisted.length) {
    console.log(`\nAllowlisted (intentional, no story):`);
    for (const p of allowlisted) console.log(`  - ${p}  — ${allowMap.get(p)}`);
  }
  if (stale.length) {
    console.log(`\n❌ STALE allowlist entries (component gone or now has a story — prune them):`);
    for (const p of stale) console.log(`  - ${p}`);
  }
  if (missing.length) {
    console.log(`\n❌ MISSING a story (${missing.length}) — run: npm run story:new app-mobile/src/<path>`);
    for (const p of missing) console.log(`  - ${p}`);
  }
  console.log(`\n${result.pass ? '✅ PASS' : '❌ FAIL'}: story coverage.`);
}

process.exit(result.pass ? 0 : 1);
