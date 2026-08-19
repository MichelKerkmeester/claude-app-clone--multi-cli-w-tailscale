// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Rollback Drill Runner
// ───────────────────────────────────────────────────────────────────

import { fileURLToPath } from 'node:url';

import { runRollbackDrill } from '../src/relay/dist/release/rollback-drill.js';

const releaseRoot = fileURLToPath(new URL('../release/', import.meta.url));

try {
  process.stdout.write(`${JSON.stringify(runRollbackDrill(releaseRoot))}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
