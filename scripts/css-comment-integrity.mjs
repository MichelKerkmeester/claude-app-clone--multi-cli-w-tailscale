#!/usr/bin/env node
// ───────────────────────────────────────────────────────────────────
// MODULE: CSS Comment Integrity
// ───────────────────────────────────────────────────────────────────
// A CSS comment that loses its closing delimiter keeps swallowing text
// until the next one, taking whole rules with it. Nothing else notices:
// the file still parses, every token still resolves, the build is green,
// and the only symptom is a surface that quietly renders unstyled.
//
// Two shapes are reported:
//
//   SWALLOWED  a comment whose body contains a declaration block, which
//              means a real rule is now commented out
//   LEAKED     a CSS comment sitting in Svelte MARKUP rather than in a
//              <style> block, which Svelte renders as visible page text
//
// Exit 0 = clean, 1 = findings.

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '..');
const SRC = path.join(REPO, 'app-mobile', 'src');

const svelteFiles = execSync(`find ${JSON.stringify(SRC)} -name '*.svelte'`, { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);
const cssFiles = execSync(`find ${JSON.stringify(SRC)} -name '*.css'`, { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

const rel = (f) => path.relative(REPO, f);
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

const findings = [];

// ── Comments that swallowed a rule ───────────────────────────────────
const scanSwallowed = (file, css, offset, raw) => {
  const re = /\/\*[\s\S]*?\*\//g;
  let match;
  while ((match = re.exec(css)) !== null) {
    const body = match[0].slice(2, -2);
    if (!/\{[\s\S]*?[a-z-]+\s*:/i.test(body)) continue;
    const declarations = (body.match(/[a-z-]+\s*:/gi) || []).length;
    findings.push({
      kind: 'SWALLOWED',
      file: rel(file),
      line: lineOf(raw, offset + match.index),
      detail: `comment swallows a rule with ~${declarations} declaration(s): ${match[0].replace(/\s+/g, ' ').slice(0, 120)}`,
    });
  }
};

for (const file of cssFiles) {
  const raw = readFileSync(file, 'utf8');
  scanSwallowed(file, raw, 0, raw);
}

for (const file of svelteFiles) {
  const raw = readFileSync(file, 'utf8');

  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let style;
  while ((style = styleRe.exec(raw)) !== null) {
    scanSwallowed(file, style[1], style.index + style[0].indexOf(style[1]), raw);
  }

  // HTML comments are blanked FIRST. A comment that merely mentions the text
  // "<style>" would otherwise open a false blank region running to the real
  // </style>, hiding every leak in between — which is exactly how the first
  // version of this check reported a clean tree over three live leaks.
  const markup = raw
    .replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length))
    .replace(/<script[\s\S]*?<\/script>/gi, (m) => ' '.repeat(m.length))
    .replace(/<style[\s\S]*?<\/style>/gi, (m) => ' '.repeat(m.length));

  const leakRe = /\/\*[\s\S]*?\*\//g;
  let leak;
  while ((leak = leakRe.exec(markup)) !== null) {
    findings.push({
      kind: 'LEAKED',
      file: rel(file),
      line: lineOf(raw, leak.index),
      detail: `CSS comment in markup renders as page text: ${leak[0].replace(/\s+/g, ' ').slice(0, 100)}`,
    });
  }
}

findings.sort((a, b) => a.kind.localeCompare(b.kind) || a.file.localeCompare(b.file) || a.line - b.line);

for (const finding of findings) {
  console.log(`${finding.kind}  ${finding.file}:${finding.line}\n   ${finding.detail}`);
}

if (findings.length === 0) {
  console.log(`css-comment-integrity PASS: ${cssFiles.length} css + ${svelteFiles.length} svelte files clean`);
  process.exit(0);
}

const swallowed = findings.filter((f) => f.kind === 'SWALLOWED').length;
const leaked = findings.filter((f) => f.kind === 'LEAKED').length;
console.log(`\ncss-comment-integrity FAIL: ${swallowed} swallowed rule(s), ${leaked} leaked comment(s)`);
process.exit(1);
