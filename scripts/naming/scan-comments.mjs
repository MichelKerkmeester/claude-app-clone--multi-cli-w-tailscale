// ───────────────────────────────────────────────────────────────────
// MODULE: Comment Grammar Scan
// ───────────────────────────────────────────────────────────────────
// Measures the three comment properties that can be counted, so the packet
// that fixes them reports a delta rather than a claim. The fourth property —
// whether a comment says why rather than what — is not measurable and is not
// pretended to be here.
//
// Usage: node scripts/naming/scan-comments.mjs [--json]

import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SOURCE_ROOT = 'app-mobile/src';
const EXCLUDED_DIRS = new Set(['routes']);
const EXTENSIONS = ['.svelte', '.ts'];
const RULE = '─';
// Directives and quoted identifiers are not sentences, so they are not
// capitalisation violations.
const NOT_A_SENTENCE = /^(eslint-|@ts-|prettier-|svelte-ignore|deno-|c8 |istanbul |ANCHOR|\/|\*|-|@)/;

/** Every file under the source root, for counts that must match the gate. */
function walkAll(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkAll(full, out);
    else out.push(full);
  }
  return out;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (EXCLUDED_DIRS.has(entry)) continue;
      walk(full, out);
      continue;
    }
    if (EXTENSIONS.some((ext) => entry.endsWith(ext))) out.push(full);
  }
  return out;
}

/** The comment body of a line, or null when the line is not a comment. */
function commentBody(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith('//')) return trimmed.slice(2).trim();
  if (trimmed.startsWith('<!--')) return trimmed.slice(4).replace(/-->$/, '').trim();
  if (trimmed.startsWith('*') && !trimmed.startsWith('*/')) return trimmed.slice(1).trim();
  return null;
}

function main() {
  const files = walk(join(REPO_ROOT, SOURCE_ROOT))
    .map((full) => relative(REPO_ROOT, full).split('\\').join('/'))
    .sort();

  // The fence total is counted the way the gate counts it: every line carrying
  // the marker anywhere under the source root, stylesheet and route tree
  // included. Counting a narrower set makes a reformatted fence read as a fence
  // that was added, which is exactly the false alarm this packet must not raise.
  const fenceScope = walkAll(join(REPO_ROOT, SOURCE_ROOT));

  const withoutBanner = [];
  let lowercaseStarts = 0;
  let multiLineFences = 0;


  for (const file of files) {
    const lines = readFileSync(join(REPO_ROOT, file), 'utf8').split('\n');
    if (!lines.some((line) => line.includes(RULE))) withoutBanner.push(file);


    lines.forEach((line, index) => {
      const body = commentBody(line);
      if (body === null || body.length === 0) return;
      // Only the first line of a comment run starts a sentence. Counting every
      // line counts wrapped prose as a violation, which would send someone to
      // capitalise the middle of a sentence.
      const previous = commentBody(lines[index - 1] ?? '');
      const isContinuation = previous !== null && previous.length > 0;
      if (body.includes('@ds guardrail:')) {
        // Counted separately over the gate's scope; here only its shape matters.
        // A fence whose reason spills onto the next comment line is the shape
        // being corrected: one line of reason, or the reader stops reading.
        const next = commentBody(lines[index + 1] ?? '');
        if (next !== null && next.length > 0 && !next.includes('@ds ')) multiLineFences += 1;
        return;
      }
      if (body.includes(RULE) || /^[A-Z0-9. ]+$/.test(body)) return;
      if (NOT_A_SENTENCE.test(body)) return;
      if (isContinuation) return;
      // Commented-out declarations are code kept for reference, not prose.
      if (/^(interface|const|let|var|function|import|export|type|declare|class)\b/.test(body)) return;
      if (/^[a-z]/.test(body)) lowercaseStarts += 1;
    });
  }

  // Stories are source too, but the packet's own baseline counts the modules
  // only, so both scopes are reported and neither is quietly substituted.
  const isStory = (file) => file.endsWith('.stories.ts') || file.endsWith('.d.ts');
  const report = {
    filesScanned: files.length,
    modulesScanned: files.filter((file) => !isStory(file)).length,
    filesWithoutBanner: withoutBanner.length,
    modulesWithoutBanner: withoutBanner.filter((file) => !isStory(file)).length,
    lowercaseCommentStarts: lowercaseStarts,
    guardrailFences: fenceScope.reduce(
      (total, file) =>
        total +
        readFileSync(file, 'utf8')
          .split('\n')
          .filter((line) => line.includes('@ds guardrail:')).length,
      0,
    ),
    multiLineFenceExplanations: multiLineFences,
  };

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log('comment grammar scan');
  for (const [key, value] of Object.entries(report)) console.log(`  ${key.padEnd(28)}: ${value}`);
  if (withoutBanner.length > 0) {
    console.log('  files without a section rule:');
    for (const file of withoutBanner.slice(0, 60)) console.log('   -', file.replace(`${SOURCE_ROOT}/`, ''));
    if (withoutBanner.length > 60) console.log(`   … and ${withoutBanner.length - 60} more`);
  }
}

main();
