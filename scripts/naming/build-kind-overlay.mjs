// ───────────────────────────────────────────────────────────────────
// MODULE: Kind Prefix Overlay Builder
// ───────────────────────────────────────────────────────────────────

// Emits the manifest overlay that puts the kind first in a component's name.
// The rule is deliberately mechanical: a component whose name ends in one of
// the closed kinds is an instance of that kind, and everything else is a
// feature component whose name already is the thing. Screens are listed by
// hand because "screen" is not a suffix anyone writes.
//
// Usage: node scripts/naming/build-kind-overlay.mjs

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import { toKebab, splitBasename } from './naming-rules.mjs';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const PAGES_ROOT = 'app-mobile/src/pages';

// The closed list. A name is only rewritten when it ends in one of these, so
// adding a kind is a deliberate edit here rather than an emergent guess.
const KINDS = ['Sheet', 'Menu', 'Dialog', 'Card', 'Button', 'Toggle', 'RadioGroup'];
const KIND_PREFIX = {
  Sheet: 'sheet',
  Menu: 'menu',
  Dialog: 'dialog',
  Card: 'card',
  Button: 'button',
  Toggle: 'toggle',
  RadioGroup: 'radio',
};

// A screen is the whole surface behind a route. The prefix exists so a reader
// searching for one types what they would type for any other kind, instead of
// having to already know these five names.
const SCREENS = {
  'app-mobile/src/pages/chat/Chat': 'screen-chat',
  'app-mobile/src/pages/chat/chat': 'screen-chat',
  'app-mobile/src/pages/home/Home': 'screen-home',
  'app-mobile/src/pages/home/home': 'screen-home',
  'app-mobile/src/pages/review/Review': 'screen-review',
  'app-mobile/src/pages/review/review': 'screen-review',
  'app-mobile/src/pages/inbox/AttentionInbox': 'screen-attention-inbox',
  'app-mobile/src/pages/inbox/attention-inbox': 'screen-attention-inbox',
  'app-mobile/src/pages/enrollment/Enrollment': 'screen-enrollment',
  'app-mobile/src/pages/enrollment/enrollment': 'screen-enrollment',
};

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.svelte') || entry.endsWith('.ts')) out.push(full);
  }
  return out;
}

/**
 * The kind-first stem for a component name, or null when it is not an instance
 * of a kind. Both spellings are recognised — the original PascalCase and the
 * kebab-case a partial pass may already have produced — so running this twice
 * converges instead of leaving half the tree kind-last.
 */
function kindFirstStem(stem) {
  const alreadyKindFirst = Object.values(KIND_PREFIX).some((prefix) =>
    stem.startsWith(`${prefix}-`),
  );
  if (alreadyKindFirst) return null;

  for (const kind of KINDS) {
    if (stem !== kind && stem.endsWith(kind)) {
      const remainder = stem.slice(0, -kind.length);
      if (remainder.length > 0) return `${KIND_PREFIX[kind]}-${toKebab(remainder)}`;
    }
    const kebabKind = `-${toKebab(kind)}`;
    if (stem !== toKebab(kind) && stem.endsWith(kebabKind)) {
      const remainder = stem.slice(0, -kebabKind.length);
      if (remainder.length > 0) return `${KIND_PREFIX[kind]}-${remainder}`;
    }
  }
  return null;
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

function main() {
  const overlay = {};
  const files = walk(join(REPO_ROOT, PAGES_ROOT))
    .map((full) => relative(REPO_ROOT, full).split('\\').join('/'))
    .sort();

  for (const path of files) {
    const dir = dirname(path);
    const { stem, suffix } = splitBasename(basename(path));
    const key = `${dir}/${stem}`;

    const screen = SCREENS[key];
    if (screen !== undefined) {
      overlay[path] = `${dir}/${screen}${suffix}`;
      continue;
    }
    const kindFirst = kindFirstStem(stem);
    if (kindFirst !== null) overlay[path] = `${dir}/${kindFirst}${suffix}`;
  }

  const outPath = join(REPO_ROOT, 'scripts/naming/kind-prefixes.json');
  writeFileSync(outPath, `${JSON.stringify(overlay, null, 2)}\n`);
  console.log('kind overlay');
  console.log('  entries:', Object.keys(overlay).length);
  console.log('  written:', relative(REPO_ROOT, outPath));
  for (const [from, to] of Object.entries(overlay)) {
    console.log(`   ${basename(from)}  ->  ${basename(to)}`);
  }
}

main();
