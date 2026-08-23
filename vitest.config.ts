// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Relay Test Configuration
// ───────────────────────────────────────────────────────────────────

import { configDefaults, defineConfig } from 'vitest/config';

// Runtime tooling (.opencode, .pi, etc.) is symlinked into this app's root in the
// standalone deployment; those trees carry thousands of unrelated test files that a
// bare positional filter like `tests` would otherwise match. Keep discovery to this app.
const RUNTIME_SYMLINKS = [
  '.opencode/**',
  '.pi/**',
  '.claude/**',
  '.codex/**',
  '.cursor/**',
  '.devin/**',
];

// Research repositories checked out under specs/context are read-only inputs, not
// workspace code. They carry their own test suites, which the same bare positional
// filter matches, so a plain `npm test` reports hundreds of failures that belong to
// another project entirely.
const RESEARCH_INPUTS = ['specs/context/**'];

export default defineConfig({
  test: {
    // The pinned-Pi integration probe spawns a real Pi build and snapshots workspace
    // files, so concurrent test files perturb what it observes. Running the suite in
    // parallel it failed every time, asserting that image bytes reached stdout; serially
    // the same assertion holds, so the leak it reported was an artifact of the capture
    // racing other workers, not a real one. Serializing costs seconds on a suite this
    // size, and a gate that is confidently wrong is worth less than one that is slower.
    // This does not make the probe deterministic — it drives a real subprocess and stays
    // timing-sensitive — it removes the failure that concurrency alone was causing.
    fileParallelism: false,
    exclude: [
      ...configDefaults.exclude,
      'app-mobile/tests/**',
      ...RUNTIME_SYMLINKS,
      ...RESEARCH_INPUTS,
    ],
  },
});
