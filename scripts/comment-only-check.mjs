// ───────────────────────────────────────────────────────────────────
// MODULE: Comment-Only Diff Gate
// ───────────────────────────────────────────────────────────────────

// Prove a documentation pass changed comments only; token-identity strips comments by design.
// Usage:
//   node scripts/comment-only-check.mjs [<git-range-or-ref>] [-- <pathspec>...]
// No range checks working tree vs HEAD. Exit 0 = comment-only; 1 = code changed; 2 = diff unreadable.
// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { execFileSync } from 'node:child_process';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const sep = argv.indexOf('--');
const range = sep === -1 ? argv[0] : argv.slice(0, sep)[0];
const paths = sep === -1 ? ['app-mobile/src'] : argv.slice(sep + 1);

// A changed line is acceptable when it is blank or a line comment. Block
// comments are deliberately NOT accepted: a stray `*/` can silently re-open
// code, which is exactly the corruption this gate exists to catch.
const OK = /^\s*(\/\/.*)?$/;

let diff;
// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

try {
  const args = ['diff', '-U0'];
  if (range) args.push(range);
  diff = execFileSync('git', [...args, '--', ...paths], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (err) {
  console.error(`comment-only-check: could not read the diff — ${err.message}`);
  process.exit(2);
}

const offenders = [];
let file = null;
for (const line of diff.split('\n')) {
  if (line.startsWith('+++ b/')) { file = line.slice(6); continue; }
  if (line.startsWith('+++') || line.startsWith('---')) continue;
  if (!/^[+-]/.test(line)) continue;
  const body = line.slice(1);
  if (!OK.test(body)) offenders.push(`${file}: ${line[0]} ${body.trim()}`);
}

if (offenders.length) {
  console.error(`\n❌ comment-only-check FAILED — ${offenders.length} changed line(s) are not comments or blanks:\n`);
  for (const o of offenders.slice(0, 40)) console.error(`   ${o}`);
  if (offenders.length > 40) console.error(`   ... and ${offenders.length - 40} more`);
  console.error('\nA documentation pass must not move, add, or delete a line of code.');
  process.exit(1);
}

console.log(`✅ comment-only-check PASS — every changed line in ${paths.join(' ')} is a comment or blank.`);
