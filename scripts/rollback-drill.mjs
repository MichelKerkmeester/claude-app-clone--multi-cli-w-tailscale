// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Rollback Drill Runner
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { fileURLToPath } from 'node:url';

import { runRollbackDrill } from '../app-relay/dist/release/rollback-drill.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const releaseRoot = fileURLToPath(new URL('../release/', import.meta.url));

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

try {
  process.stdout.write(`${JSON.stringify(runRollbackDrill(releaseRoot))}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
