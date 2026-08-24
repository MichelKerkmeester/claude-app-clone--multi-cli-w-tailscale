// ───────────────────────────────────────────────────────────────────
// MODULE: Comment-Only Diff Verifier
// ───────────────────────────────────────────────────────────────────

// Proves that a change touched comments and nothing else, which is the whole
// safety argument of a comment pass. Matching changed lines against comment
// markers is not enough: a continuation line of a block or HTML comment starts
// with neither, and reads as code to a line-shaped check.
//
// Instead both versions have their comments removed and the remainder is
// compared. If the code with comments stripped is byte-identical, the change
// was comments only, whatever shape those comments took.
//
// Usage: node scripts/naming/verify-comment-only.mjs <ref> [-- <pathspec>...]

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/**
 * Drop every line that is entirely a comment, and keep the rest verbatim.
 *
 * A character-level lexer is the obvious approach and the wrong one: telling a
 * regex literal from a division needs a parser, and getting it wrong silently
 * swallows the code that follows. Working line by line cannot make that
 * mistake. A trailing comment on a code line is left in place, so editing one
 * is reported as a code change — the packet bans trailing comments anyway, and
 * a gate that errs toward stopping is the right kind of wrong here.
 */
// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function stripCommentLines(source) {
  const kept = [];
  let region = null;
  for (const raw of source.split('\n')) {
    const line = raw.trim();
    if (region === 'block') {
      if (line.includes('*/')) region = null;
      continue;
    }
    if (region === 'html') {
      if (line.includes('-->')) region = null;
      continue;
    }
    if (line === '') continue;
    if (line.startsWith('//')) continue;
    if (line.startsWith('*') && !line.startsWith('*/')) continue;
    if (line.startsWith('/*')) {
      if (!line.includes('*/')) region = 'block';
      continue;
    }
    if (line.startsWith('<!--')) {
      if (!line.includes('-->')) region = 'html';
      continue;
    }
    kept.push(raw.trimEnd());
  }
  return kept.join('\n');
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

function main() {
  const ref = process.argv[2];
  if (ref === undefined) {
    console.error('usage: verify-comment-only.mjs <ref> [-- <pathspec>...]');
    process.exit(2);
  }
  const separator = process.argv.indexOf('--');
  const pathspec = separator === -1 ? [] : process.argv.slice(separator + 1);

  const changed = execFileSync('git', ['diff', '--name-only', ref, ...(pathspec.length ? ['--', ...pathspec] : [])], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);

  const offenders = [];
  for (const file of changed) {
    const before = execFileSync('git', ['show', `${ref}:${file}`], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
    const path = join(REPO_ROOT, file);
    if (!existsSync(path)) { offenders.push(`${file} (deleted)`); continue; }
    const after = readFileSync(path, 'utf8');
    if (stripCommentLines(before) !== stripCommentLines(after)) offenders.push(file);
  }

  console.log('comment-only verification');
  console.log('  files changed :', changed.length);
  console.log('  code changed  :', offenders.length);
  for (const file of offenders) console.log('   !', file);
  console.log(offenders.length === 0 ? '  PASS: comments only' : '  FAIL: code changed');
  process.exit(offenders.length === 0 ? 0 : 2);
}

main();
