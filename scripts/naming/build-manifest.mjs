// ───────────────────────────────────────────────────────────────────
// MODULE: Rename Manifest Builder
// ───────────────────────────────────────────────────────────────────

// Emit one rename row per in-scope file for the mover and specifier rewriter.
// Usage: node scripts/naming/build-manifest.mjs [--out <path>]

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { readdirSync, statSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, relative, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import { kebabBasename, isReservedName, isRouteParameterSegment, isCaseOnlyRename } from './naming-rules.mjs';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SOURCE_ROOT = 'app-mobile/src';
// The route tree is the URL contract, so it is excluded by path rather than by
// a name rule that could accidentally start matching.
const EXCLUDED_DIRS = new Set(['routes']);
const SOURCE_EXTENSIONS = ['.svelte', '.ts'];

// shared/primitives/ becomes six folders by control family. The grouping is a
// decision, not a derivation, so it is stated rather than inferred.
const PRIMITIVE_FAMILIES = {
  'Button.svelte': 'button',
  'Button.stories.ts': 'button',
  'Menu.svelte': 'menu',
  'MenuContent.svelte': 'menu',
  'MenuItem.svelte': 'menu',
  'MenuTrigger.svelte': 'menu',
  'Sheet.svelte': 'sheet',
  'SheetContent.svelte': 'sheet',
  'SheetTitle.svelte': 'sheet',
  'SheetClose.svelte': 'sheet',
  'RadioGroup.svelte': 'choice',
  'RadioGroupItem.svelte': 'choice',
  'ToggleGroup.svelte': 'choice',
  'ToggleGroupItem.svelte': 'choice',
  'Collapsible.svelte': 'disclosure',
  'Collapsible.stories.ts': 'disclosure',
  'ariaHideOutside.svelte.ts': 'a11y',
  'interactions.ts': 'a11y',
};

// shared/data/ splits by reason to change: the wire contract, a reducer, slash
// handling and so on each move for their own trigger.
const DATA_FOLDERS = {
  'relay.ts': 'transport',
  'useSyncSocket.svelte.ts': 'transport',
  'auth.ts': 'transport',
  'cache.ts': 'transport',
  'state.ts': 'state',
  'runtime.ts': 'state',
  'app-state.svelte.ts': 'state',
  'turns.ts': 'state',
  'todo-state.ts': 'state',
  'todo-model.ts': 'state',
  'runtime-issues.ts': 'state',
  'useRuntime.svelte.ts': 'state',
  'commands.ts': 'commands',
  'hostCommandCatalog.svelte.ts': 'commands',
  'insertSlashCommand.ts': 'commands',
  'rankHostCommands.ts': 'commands',
  'submitSlashDraft.ts': 'commands',
  'useSlashTrigger.ts': 'commands',
  'planModeShortcut.ts': 'commands',
  'model-catalog.ts': 'catalog',
  'model-switcher-strings.ts': 'catalog',
  'catalog-registry.ts': 'catalog',
  'effort.ts': 'catalog',
  'format.ts': 'format',
  'view-helpers.ts': 'format',
  'attention.ts': 'format',
  'useVisualViewportAnchor.svelte.ts': 'viewport',
  'demo.ts': 'fixtures',
};

// Kind-first component names come from a closed list. A file whose kind is not
// yet assigned keeps its kebab-case name; the later child supplies the overlay
// rather than editing manifest rows by hand.
const KIND_OVERLAY_PATH = join(REPO_ROOT, 'scripts/naming/kind-prefixes.json');

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function readKindOverlay() {
  if (!existsSync(KIND_OVERLAY_PATH)) return {};
  return JSON.parse(readFileSync(KIND_OVERLAY_PATH, 'utf8'));
}

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

function targetFor(relativePath, overlay) {
  const name = basename(relativePath);
  const dir = dirname(relativePath);

  if (isReservedName(name)) return relativePath;
  if (dir.split('/').some(isRouteParameterSegment)) return relativePath;

  const overridden = overlay[relativePath];
  if (typeof overridden === 'string') return overridden;

  if (dir === `${SOURCE_ROOT}/shared/primitives`) {
    const family = PRIMITIVE_FAMILIES[name];
    if (family !== undefined) return `${dir}/${family}/${kebabBasename(name)}`;
  }
  if (dir === `${SOURCE_ROOT}/shared/data`) {
    const folder = DATA_FOLDERS[name];
    if (folder !== undefined) {
      return `${SOURCE_ROOT}/shared/${folder}/${kebabBasename(name)}`;
    }
  }
  return `${dir}/${kebabBasename(name)}`;
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

function main() {
  const outIndex = process.argv.indexOf('--out');
  const outPath = outIndex === -1 ? join(REPO_ROOT, 'scripts/naming/rename-manifest.json') : process.argv[outIndex + 1];
  const overlay = readKindOverlay();

  const files = walk(join(REPO_ROOT, SOURCE_ROOT))
    .map((full) => relative(REPO_ROOT, full))
    .sort();

  const rows = files.map((from) => {
    const to = targetFor(from, overlay);
    // Only a whole-path case difference can be swallowed by the filesystem;
    // a rename that also changes directory is an ordinary move.
    return { from, to, moves: from !== to, caseOnly: isCaseOnlyRename(from, to) };
  });

  const manifest = {
    sourceRoot: SOURCE_ROOT,
    excludedDirs: [...EXCLUDED_DIRS],
    total: rows.length,
    moving: rows.filter((row) => row.moves).length,
    caseOnly: rows.filter((row) => row.caseOnly).length,
    rows,
  };

  writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log('rename-manifest');
  console.log('  rows        :', manifest.total);
  console.log('  moving      :', manifest.moving);
  console.log('  case-only   :', manifest.caseOnly);
  console.log('  unchanged   :', manifest.total - manifest.moving);
  console.log('  written     :', relative(REPO_ROOT, outPath));

  const collisions = new Map();
  for (const row of rows) collisions.set(row.to, (collisions.get(row.to) ?? 0) + 1);
  const clashes = [...collisions].filter(([, count]) => count > 1);
  if (clashes.length > 0) {
    console.log('  COLLISIONS  :', clashes.length);
    for (const [path, count] of clashes) console.log('   !', path, `(${count})`);
    process.exit(2);
  }
  console.log('  collisions  : 0');
}

main();
