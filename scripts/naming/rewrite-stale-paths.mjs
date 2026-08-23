// ───────────────────────────────────────────────────────────────────
// MODULE: Stale Path Sweep
// ───────────────────────────────────────────────────────────────────
// Rewrites references to files that have already moved, wherever a reference
// can hide. The manifest applier handles the common shapes at move time; this
// is the backstop for the rest, because a path can be named by a bare string
// in an array with no call around it, and nothing resolves it until the line
// that uses it runs.
//
// The rename chain comes from git rather than from the manifest, so a file
// that moved twice still resolves to where it ended up.
//
// Usage: node scripts/naming/rewrite-stale-paths.mjs <since-ref> [--apply]

import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, relative, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SEARCH_ROOTS = [
  'app-mobile/src',
  'app-mobile/tests',
  'app-relay/src',
  'app-relay/tests',
  'packages',
  'extensions',
  'scripts',
  'tests',
];
const SEARCH_EXTENSIONS = ['.svelte', '.ts', '.tsx', '.js', '.mjs', '.cjs'];

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SEARCH_EXTENSIONS.some((ext) => entry.endsWith(ext))) out.push(full);
  }
  return out;
}

/** Chain every rename git recorded since the given ref, so a file moved twice still resolves. */
function renameChain(sinceRef) {
  const raw = execFileSync(
    'git',
    ['log', '--diff-filter=R', '--name-status', '--format=', `${sinceRef}..HEAD`],
    { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  );
  const pairs = raw
    .split('\n')
    .map((line) => line.split('\t'))
    .filter((parts) => parts.length === 3 && parts[0].startsWith('R'))
    .map(([, from, to]) => [from, to])
    .reverse();

  const chain = new Map();
  for (const [from, to] of pairs) {
    for (const [start, dest] of [...chain]) if (dest === from) chain.set(start, to);
    chain.set(from, to);
  }
  return chain;
}

const QUOTED = /(['"])([^'"\n]+)\1/g;

function main() {
  const sinceRef = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (sinceRef === undefined) {
    console.error('usage: rewrite-stale-paths.mjs <since-ref> [--apply]');
    process.exit(2);
  }

  const chain = renameChain(sinceRef);
  const files = SEARCH_ROOTS.flatMap((root) => walk(join(REPO_ROOT, root))).map((full) =>
    relative(REPO_ROOT, full).split('\\').join('/'),
  );

  let touched = 0;
  let rewritten = 0;
  for (const file of files) {
    const original = readFileSync(join(REPO_ROOT, file), 'utf8');
    let changes = 0;
    const updated = original.replace(QUOTED, (match, quote, literal) => {
      // Only a literal that resolves to a file git actually moved is rewritten,
      // which is what makes a sweep this broad safe.
      const candidates = literal.startsWith('.')
        ? [relative(REPO_ROOT, resolve(dirname(join(REPO_ROOT, file)), literal)).split('\\').join('/')]
        : [literal];
      for (const candidate of candidates) {
        const moved = chain.get(candidate);
        if (moved === undefined) continue;
        changes += 1;
        const replacement = literal.startsWith('.')
          ? (() => {
              let rel = relative(dirname(join(REPO_ROOT, file)), join(REPO_ROOT, moved))
                .split('\\')
                .join('/');
              return rel.startsWith('.') ? rel : `./${rel}`;
            })()
          : moved;
        return `${quote}${replacement}${quote}`;
      }
      return match;
    });
    if (changes === 0) continue;
    touched += 1;
    rewritten += changes;
    if (apply) writeFileSync(join(REPO_ROOT, file), updated);
    else console.log(`  ~ ${file} (${changes})`);
  }

  console.log(apply ? 'stale-path sweep APPLY' : 'stale-path sweep DRY RUN');
  console.log('  renames tracked :', chain.size);
  console.log('  files touched   :', touched);
  console.log('  paths rewritten :', rewritten);
  if (!apply) console.log('  (dry run — pass --apply to write)');
}

main();
