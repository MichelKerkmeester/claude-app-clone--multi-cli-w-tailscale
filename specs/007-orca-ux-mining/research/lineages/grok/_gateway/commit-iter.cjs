#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const n = String(process.argv[2] || '').padStart(3, '0');
if (!/^\d{3}$/.test(n) && process.argv[2]) {
  const raw = String(process.argv[2]);
  const num = raw.padStart(3, '0');
  if (!/^\d{3}$/.test(num)) {
    process.stderr.write('usage: commit-iter.cjs <n>\n');
    process.exit(1);
  }
}
const iter = String(process.argv[2]).padStart(3, '0');
const root = path.resolve(__dirname, '..');
const gateway = path.join(root, '_gateway', `iter-${iter}.json`);
const delta = path.join(root, 'deltas', `iter-${iter}.jsonl`);
if (!fs.existsSync(delta) && fs.existsSync(gateway)) {
  fs.writeFileSync(delta, `${fs.readFileSync(gateway, 'utf8').trim()}\n`);
}
const append = spawnSync(process.execPath, [
  '.opencode/skills/system-deep-loop/runtime/scripts/append-mode-event.cjs',
  '--mode', 'research',
  '--run-directory', 'specs/007-orca-ux-mining/research/lineages/grok',
  '--event-json', gateway,
], { cwd: process.cwd(), encoding: 'utf8' });
process.stdout.write(append.stdout || '');
process.stderr.write(append.stderr || '');
if (append.status !== 0) process.exit(append.status || 1);
const reduce = spawnSync(process.execPath, [path.join(root, '_gateway', 'reduce-lineage.cjs')], {
  cwd: process.cwd(),
  encoding: 'utf8',
});
process.stdout.write(reduce.stdout || '');
process.stderr.write(reduce.stderr || '');
process.exit(reduce.status || 0);
