#!/usr/bin/env node
'use strict';

/**
 * Lineage-local reducer driver.
 *
 * reduce-state.cjs always calls resolveArtifactRoot(specFolder, 'research'),
 * which would write to the parent spec packet if given specs/007-orca-ux-mining.
 * This fan-out lineage may only write inside lineages/grok, so we patch
 * resolveArtifactRoot to the lineage directory before requiring the reducer.
 */

const path = require('node:path');
const Module = require('node:module');

const LINEAGE = path.resolve(__dirname, '..');

const origLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  const loaded = origLoad.apply(this, arguments);
  if (
    typeof request === 'string' &&
    loaded &&
    typeof loaded.resolveArtifactRoot === 'function' &&
    (request.includes('review-research-paths') || request.includes('artifact-root'))
  ) {
    loaded.resolveArtifactRoot = function resolveLineageArtifactRoot() {
      return {
        rootDir: LINEAGE,
        subfolder: null,
        artifactDir: LINEAGE,
        artifactArchiveRoot: path.join(LINEAGE, '_archive'),
      };
    };
  }
  return loaded;
};

const reducerPath = path.resolve(
  process.cwd(),
  '.opencode/skills/system-deep-loop/deep-research/scripts/reduce-state.cjs',
);
const { reduceResearchState } = require(reducerPath);
const emitResourceMap = process.argv.includes('--emit-resource-map');
const fanoutResourceMapOnly = process.argv.includes('--fanout-resource-map-only');

const result = reduceResearchState(LINEAGE, {
  write: true,
  emitResourceMap,
  fanoutResourceMapOnly,
});

process.stdout.write(`${JSON.stringify({
  registryPath: result.registryPath,
  dashboardPath: result.dashboardPath,
  strategyPath: result.strategyPath,
  iterationsCompleted: fanoutResourceMapOnly ? null : result.registry?.metrics?.iterationsCompleted,
  resourceMapPath: emitResourceMap ? result.resourceMapPath : null,
  resourceMapSkipped: emitResourceMap ? result.resourceMapSkipped : null,
}, null, 2)}\n`);
