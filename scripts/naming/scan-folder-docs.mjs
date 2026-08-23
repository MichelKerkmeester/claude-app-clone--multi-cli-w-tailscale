// ───────────────────────────────────────────────────────────────────
// MODULE: Folder Documentation Coverage Scan
// ───────────────────────────────────────────────────────────────────
// Every folder holding source should answer two questions for a reader who
// opens it cold: what this is for, and how it is arranged. This counts the
// folders that answer neither, and checks that whatever the existing documents
// name still exists — a document naming a file that has been renamed is worse
// than no document, because it is believed.
//
// Usage: node scripts/naming/scan-folder-docs.mjs [--json]

import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SOURCE_ROOT = 'app-mobile/src';
const SOURCE_EXTENSIONS = ['.svelte', '.ts'];
const FEATURE_DOC = 'README.md';
const CODE_DOC = 'CODE.md';

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

function main() {
  const folders = [...sourceFolders(join(REPO_ROOT, SOURCE_ROOT))].sort();

  const missingBoth = [];
  const missingFeature = [];
  const missingCode = [];
  const brokenReferences = [];

  for (const folder of folders) {
    const hasFeature = existsSync(join(REPO_ROOT, folder, FEATURE_DOC));
    const hasCode = existsSync(join(REPO_ROOT, folder, CODE_DOC));
    if (!hasFeature && !hasCode) missingBoth.push(folder);
    else {
      if (!hasFeature) missingFeature.push(folder);
      if (!hasCode) missingCode.push(folder);
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
    brokenReferences: brokenReferences.length,
  };

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ ...report, missingBoth, missingFeature, missingCode, brokenReferences }, null, 2));
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
  show('references that do not resolve', brokenReferences);
  process.exit(missingBoth.length + missingFeature.length + missingCode.length + brokenReferences.length === 0 ? 0 : 2);
}

main();
