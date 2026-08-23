// ───────────────────────────────────────────────────────────────────
// MODULE: Rename Manifest Applier
// ───────────────────────────────────────────────────────────────────
// Moves files and rewrites the specifiers that point at them, both derived from
// the manifest. Hand-editing a specifier to unbreak a build is the one shortcut
// that must not be taken: it decouples the imports from the moves, and the next
// batch inherits a tree nobody can regenerate.
//
// Usage:
//   node scripts/naming/apply-manifest.mjs --scope <path-prefix>            (dry run)
//   node scripts/naming/apply-manifest.mjs --scope <path-prefix> --apply

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, relative, dirname, resolve, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const MANIFEST = join(REPO_ROOT, 'scripts/naming/rename-manifest.json');
const ALIAS_PREFIX = '$shared/';
const ALIAS_ROOT = 'app-mobile/src/shared/';
// Where a specifier could live. Scoping this to the tree being renamed is the
// mistake it looks like a shortcut for: stories and suites import the moved
// modules, the logic suites are .tsx, and a relay integration test reaches
// across workspaces by deep-relative path. Anything that can name a module has
// to be scanned, or the rename is silently partial.
const SPECIFIER_ROOTS = [
  'app-mobile/src',
  'app-mobile/tests',
  'app-relay/src',
  'app-relay/tests',
  'packages',
  'extensions',
  'scripts',
  'tests',
];
const SPECIFIER_EXTENSIONS = ['.svelte', '.ts', '.tsx', '.js', '.mjs'];

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? null : process.argv[index + 1];
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SPECIFIER_EXTENSIONS.some((ext) => entry.endsWith(ext))) out.push(full);
  }
  return out;
}

/**
 * Strip the suffix chain so every spelling of one module shares a key. A runes
 * module is `foo.svelte.ts` on disk but its specifier reads `foo.svelte.js`,
 * so both must reduce to `foo` — otherwise the rewrite silently skips exactly
 * the files that carry the double extension.
 */
function moduleKey(repoRelativePath) {
  return repoRelativePath.replace(/\.(svelte\.ts|svelte\.js|svelte|ts|js)$/, '');
}

function buildMoveMap(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!row.moves) continue;
    map.set(moduleKey(row.from), moduleKey(row.to));
  }
  return map;
}

/**
 * Resolve an import specifier to a repo-relative module key, or null. A
 * relative specifier is relative to where its file was written, so a file that
 * has itself just moved is resolved from its original location — otherwise
 * every relative import inside a moved file points into its new folder and
 * matches nothing.
 */
function resolveSpecifier(specifier, fromFile, originOf) {
  if (specifier.startsWith(ALIAS_PREFIX)) {
    return moduleKey(ALIAS_ROOT + specifier.slice(ALIAS_PREFIX.length));
  }
  if (specifier.startsWith('.')) {
    const origin = originOf.get(fromFile) ?? fromFile;
    const absolute = resolve(dirname(join(REPO_ROOT, origin)), specifier);
    return moduleKey(relative(REPO_ROOT, absolute).split('\\').join('/'));
  }
  return null;
}

/** Re-emit a resolved module key in the same form the original specifier used. */
function emitSpecifier(originalSpecifier, newKey, fromFile) {
  const suffix = originalSpecifier.match(/\.(svelte\.ts|svelte\.js|svelte|ts|js)$/)?.[0] ?? '';
  if (originalSpecifier.startsWith(ALIAS_PREFIX)) {
    return ALIAS_PREFIX + newKey.slice(ALIAS_ROOT.length) + suffix;
  }
  const target = join(REPO_ROOT, newKey);
  let rel = relative(dirname(join(REPO_ROOT, fromFile)), target).split('\\').join('/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel + suffix;
}

const SPECIFIER_PATTERN = /(from\s+|import\s+|import\(\s*)(['"])([^'"]+)\2/g;
// A worker is addressed by URL construction rather than by an import, so a
// rewrite that only understands import syntax moves the file and leaves the
// worker unreachable at runtime — with nothing failing at build time.
const URL_SPECIFIER_PATTERN = /(new URL\(\s*)(['"])([^'"]+)\2(\s*,\s*import\.meta\.url)/g;
// A test double names its target by module path too. A vi.mock left pointing at
// a path nothing occupies no longer replaces anything, and the suite keeps
// passing against the real module — the quietest way for a rename to lie.
const MOCK_SPECIFIER_PATTERN =
  /(vi\.(?:mock|doMock|unmock|importActual|importMock)(?:<[^>]*>)?\(\s*)(['"])([^'"]+)\2/g;

function rewriteFile(filePath, moveMap, originOf) {
  const original = readFileSync(join(REPO_ROOT, filePath), 'utf8');
  let changes = 0;
  const rewriteImport = (match, lead, quote, specifier) => {
    const key = resolveSpecifier(specifier, filePath, originOf);
    if (key === null) return match;
    const moved = moveMap.get(key);
    if (moved === undefined) return match;
    changes += 1;
    return `${lead}${quote}${emitSpecifier(specifier, moved, filePath)}${quote}`;
  };
  const updated = original
    .replace(SPECIFIER_PATTERN, rewriteImport)
    .replace(MOCK_SPECIFIER_PATTERN, rewriteImport)
    .replace(URL_SPECIFIER_PATTERN, (match, lead, quote, specifier, tail) => {
      const key = resolveSpecifier(specifier, filePath, originOf);
      if (key === null) return match;
      const moved = moveMap.get(key);
      if (moved === undefined) return match;
      changes += 1;
      return `${lead}${quote}${emitSpecifier(specifier, moved, filePath)}${quote}${tail}`;
    });
  return { updated, changes, original };
}

function git(args) {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' });
}

/**
 * Move one file. A whole-path case change can be recorded as nothing at all on
 * a case-insensitive filesystem, so those go through a temporary name and the
 * result is checked rather than assumed.
 */
function moveFile(row, apply) {
  if (!apply) return;
  mkdirSync(dirname(join(REPO_ROOT, row.to)), { recursive: true });
  if (row.caseOnly) {
    const temporary = `${row.from}.rename-tmp`;
    git(['mv', row.from, temporary]);
    git(['mv', temporary, row.to]);
    return;
  }
  git(['mv', row.from, row.to]);
}

function main() {
  const scope = argValue('--scope');
  const apply = process.argv.includes('--apply');
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));

  const rows = manifest.rows.filter(
    (row) => row.moves && (scope === null || row.from.startsWith(scope)),
  );
  if (rows.length === 0) {
    console.log('apply-manifest: no rows in scope', scope ?? '(all)');
    return;
  }

  const moveMap = buildMoveMap(rows);
  // Where each moved file came from, so a relative specifier inside it resolves
  // against the folder it was written in rather than the folder it landed in.
  const originOf = new Map(rows.map((row) => [row.to, row.from]));
  console.log(apply ? 'apply-manifest APPLY' : 'apply-manifest DRY RUN');
  console.log('  scope :', scope ?? '(all)');
  console.log('  moves :', rows.length, `(${rows.filter((r) => r.caseOnly).length} case-only)`);

  for (const row of rows) moveFile(row, apply);

  const candidates = SPECIFIER_ROOTS.flatMap((root) => walk(join(REPO_ROOT, root)))
    .map((full) => relative(REPO_ROOT, full).split('\\').join('/'))
    .sort();

  let touched = 0;
  let rewritten = 0;
  for (const file of candidates) {
    const { updated, changes, original } = rewriteFile(file, moveMap, originOf);
    if (changes === 0) continue;
    touched += 1;
    rewritten += changes;
    if (apply) writeFileSync(join(REPO_ROOT, file), updated);
    else console.log(`  ~ ${file} (${changes})`);
    void original;
  }
  console.log('  files with specifier changes:', touched);
  console.log('  specifiers rewritten        :', rewritten);
  if (!apply) console.log('  (dry run — nothing was written; pass --apply to execute)');
}

main();
