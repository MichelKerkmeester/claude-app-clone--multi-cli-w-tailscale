// ───────────────────────────────────────────────────────────────────
// MODULE: Queue Advancement
// ───────────────────────────────────────────────────────────────────

// Next workable graph node by strict validation and dependency satisfaction.
// Usage: node scripts/queue/next-node.mjs

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const PACKET_ROOT = 'specs/004-sveltekit-spa-migration';
const VALIDATE =
  '/Users/michelkerkmeester/MEGA/Development/Code_Environment/Public/.opencode/skills/system-spec-kit/scripts/spec/validate.sh';

/** Resolve a node id to the folder that holds its documents, parent or child. */
// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function packetFolder(id) {
  const [parent, child] = id.split('/');
  const root = join(REPO_ROOT, PACKET_ROOT);
  const parentDir = readdirSync(root).find((entry) => entry.startsWith(`${parent}-`));
  if (parentDir === undefined) return null;
  if (child === undefined) return join(PACKET_ROOT, parentDir);
  const childDir = readdirSync(join(root, parentDir)).find((entry) => entry.startsWith(`${child}-`));
  return childDir === undefined ? null : join(PACKET_ROOT, parentDir, childDir);
}

function completion(folder) {
  const summary = join(REPO_ROOT, folder, 'implementation-summary.md');
  if (!existsSync(summary)) return null;
  const match = readFileSync(summary, 'utf8').match(/completion_pct:\s*(\d+)/);
  return match === null ? null : Number(match[1]);
}

/** Strict validation is read by counting results, because the script can exit 0 on a failure. */
function validates(folder) {
  try {
    const output = execFileSync('bash', [VALIDATE, folder, '--strict'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
    return !output.includes('RESULT: FAILED');
  } catch (error) {
    const output = `${error.stdout ?? ''}`;
    return output.length > 0 && !output.includes('RESULT: FAILED');
  }
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

function main() {
  const graph = JSON.parse(readFileSync(join(REPO_ROOT, 'scripts/queue/graph.json'), 'utf8'));
  const state = new Map();

  for (const node of graph.nodes) {
    const folder = packetFolder(node.id);
    const pct = folder === null ? null : completion(folder);
    const strict = folder === null ? false : validates(folder);
    // Phase parents advance when strict validation passes; children hold the work.
    const advanced = strict && (pct === null || pct >= 95);
    // Held nodes do not advance, but a shipped partial still satisfies dependants.
    const satisfiesDependants = advanced || (node.held !== undefined && strict && (pct ?? 0) >= 50);
    state.set(node.id, { ...node, folder, pct, strict, advanced, satisfiesDependants });
  }

  const ready = [];
  const blocked = [];
  for (const node of state.values()) {
    if (node.advanced) continue;
    const unmet = node.deps.filter((dep) => !(state.get(dep)?.satisfiesDependants ?? false));
    if (unmet.length === 0) ready.push(node);
    else blocked.push({ ...node, unmet });
  }

  const label = (node) =>
    `${node.id.padEnd(9)} strict=${node.strict ? 'pass' : 'FAIL'} pct=${node.pct ?? '-'}` +
    `${node.held === undefined ? '' : '  HELD: ' + node.held}`;

  console.log('ADVANCED');
  for (const node of state.values()) if (node.advanced) console.log('  ', label(node));
  console.log('HELD (shipped part satisfies dependants)');
  for (const node of state.values()) {
    if (!node.advanced && node.satisfiesDependants) console.log('  ', label(node));
  }
  console.log('READY');
  for (const node of ready) console.log('  ', label(node));
  console.log('BLOCKED');
  for (const node of blocked) console.log('  ', label(node), '<- waits on', node.unmet.join(', '));

  // Prefer the node that unlocks the most dependants.
  const dependants = (id) => graph.nodes.filter((n) => n.deps.includes(id)).length;
  const workable = ready.filter((node) => node.held === undefined);
  workable.sort((a, b) => dependants(b.id) - dependants(a.id) || a.id.localeCompare(b.id));

  console.log('\nNEXT:', workable.length === 0 ? '(nothing workable without an operator decision)' : workable[0].id);
  if (workable.length > 1) {
    const [first, second] = workable;
    const disjoint =
      (graph.writes[first.id] ?? []).every((path) => !(graph.writes[second.id] ?? []).includes(path));
    console.log(
      `ALSO: ${second.id} — ${disjoint ? 'disjoint write paths, may run in parallel' : 'shares a write path with ' + first.id + ', must run after it'}`,
    );
  }
}

main();
