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

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'src/mobile-app/tests/**', ...RUNTIME_SYMLINKS],
  },
});
