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
    exclude: [
      ...configDefaults.exclude,
      'app-mobile/tests/**',
      ...RUNTIME_SYMLINKS,
      ...RESEARCH_INPUTS,
    ],
  },
});
