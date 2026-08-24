// ───────────────────────────────────────────────────────────────────
// MODULE: Folder Documentation Coverage Scan
// ───────────────────────────────────────────────────────────────────

// Every folder holding source should answer what it is for. A folder with
// enough structure to get lost in should also answer how that structure is
// arranged, in a second document. A folder holding one file has no such
// structure, and describing it twice produced roughly six times more prose per
// source file than the large folders got — ceremony reads as content and ages
// the same way, so the second document is required only where it earns itself.
//
// This counts the folders that answer neither question, the ones that owe a
// code map and lack it, the ones carrying a code map they do not owe, and
// checks that whatever the documents name still exists — a document naming a
// file that has been renamed is worse than no document, because it is believed.
//
// Usage: node scripts/naming/scan-folder-docs.mjs [--json]

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SOURCE_ROOT = 'app-mobile/src';
const SOURCE_EXTENSIONS = ['.svelte', '.ts'];
const FEATURE_DOC = 'README.md';
const CODE_DOC = 'CODE.md';
// Below this, one document says everything there is to say about the folder.
const CODE_DOC_SOURCE_THRESHOLD = 3;

/** Direct source files, ignoring stories, which describe a component rather than being one. */
// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function directSourceCount(dir) {
  return readdirSync(dir).filter(
    (entry) =>
      SOURCE_EXTENSIONS.some((ext) => entry.endsWith(ext)) &&
      !entry.endsWith('.stories.ts') &&
      !statSync(join(dir, entry)).isDirectory(),
  ).length;
}

/** A folder whose job is orienting a reader across children owes a code map however few files it holds. */
function hasSourceChildren(dir) {
  return readdirSync(dir).some((entry) => {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) return false;
    return sourceFolders(full).size > 0;
  });
}

function owesCodeDocument(absoluteFolder) {
  return (
    directSourceCount(absoluteFolder) >= CODE_DOC_SOURCE_THRESHOLD ||
    hasSourceChildren(absoluteFolder)
  );
}

function sourceFolders(dir, out = new Set()) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      sourceFolders(full, out);
      continue;
    }
    if (SOURCE_EXTENSIONS.some((ext) => entry.endsWith(ext))) {
      out.add(relative(REPO_ROOT, dir).split('\\').join('/'));
    }
  }
  return out;
}

/** Every path- or file-shaped token a document names, so each can be resolved. */
function referencedPaths(markdown) {
  const references = new Set();
  for (const match of markdown.matchAll(/`([^`\n]+)`/g)) {
    const token = match[1].trim();
    if (!/\.(svelte|ts|tsx|js|mjs|css|json|html)$/.test(token)) continue;
    // A glob names a shape, not a file, and resolving one would always fail.
    if (token.includes(' ') || token.startsWith('@') || token.includes('*')) continue;
    if (token.startsWith('.') && !token.includes('/')) continue;
    references.add(token);
  }
  return references;
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

function main() {
  const folders = [...sourceFolders(join(REPO_ROOT, SOURCE_ROOT))].sort();

  const missingBoth = [];
  const missingFeature = [];
  const missingCode = [];
  const unwarrantedCode = [];
  const brokenReferences = [];

  for (const folder of folders) {
    const hasFeature = existsSync(join(REPO_ROOT, folder, FEATURE_DOC));
    const hasCode = existsSync(join(REPO_ROOT, folder, CODE_DOC));
    const owesCode = owesCodeDocument(join(REPO_ROOT, folder));
    if (!hasFeature && !hasCode) missingBoth.push(folder);
    else {
      if (!hasFeature) missingFeature.push(folder);
      if (owesCode && !hasCode) missingCode.push(folder);
      if (!owesCode && hasCode) unwarrantedCode.push(folder);
    }

    for (const doc of [FEATURE_DOC, CODE_DOC]) {
      const path = join(REPO_ROOT, folder, doc);
      if (!existsSync(path)) continue;
      for (const reference of referencedPaths(readFileSync(path, 'utf8'))) {
        // A bare filename is read as a sibling; anything with a slash is read
        // from the repository root, which is how these documents write paths.
        const candidate = reference.includes('/')
          ? join(REPO_ROOT, reference)
          : join(REPO_ROOT, folder, reference);
        // Documents write paths three ways: from the repository root, from the
        // source root, and relative to the folder they sit in.
        const alternates = [
          join(REPO_ROOT, SOURCE_ROOT, reference),
          join(REPO_ROOT, folder, reference),
        ];
        if (existsSync(candidate) || alternates.some((path) => existsSync(path))) continue;
        brokenReferences.push(`${folder}/${doc} → ${reference}`);
      }
    }
  }

  const report = {
    sourceFolders: folders.length,
    missingBothDocuments: missingBoth.length,
    missingFeatureDocument: missingFeature.length,
    missingCodeDocument: missingCode.length,
    unwarrantedCodeDocument: unwarrantedCode.length,
    brokenReferences: brokenReferences.length,
  };

  if (process.argv.includes('--json')) {
    console.log(
      JSON.stringify(
        { ...report, missingBoth, missingFeature, missingCode, unwarrantedCode, brokenReferences },
        null,
        2,
      ),
    );
    return;
  }
  console.log('folder documentation scan');
  for (const [key, value] of Object.entries(report)) console.log(`  ${key.padEnd(24)}: ${value}`);
  const show = (label, list) => {
    if (list.length === 0) return;
    console.log(`  ${label}:`);
    for (const item of list.slice(0, 30)) console.log('   -', item.replace(`${SOURCE_ROOT}/`, ''));
    if (list.length > 30) console.log(`   … and ${list.length - 30} more`);
  };
  show('folders with neither document', missingBoth);
  show('folders missing the feature document', missingFeature);
  show('folders missing the code document', missingCode);
  show('folders carrying a code document they do not owe', unwarrantedCode);
  show('references that do not resolve', brokenReferences);
  const failures =
    missingBoth.length +
    missingFeature.length +
    missingCode.length +
    unwarrantedCode.length +
    brokenReferences.length;
  process.exit(failures === 0 ? 0 : 2);
}

main();
