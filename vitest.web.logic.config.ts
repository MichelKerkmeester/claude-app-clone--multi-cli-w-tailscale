// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Web Test Configuration (framework-agnostic logic)
// ───────────────────────────────────────────────────────────────────
// Runs the pure-logic web tests — those that exercise ported .ts/.svelte.ts
// modules (reducers, formatters, command ranking, transport, contrast math)
// with no React or Svelte component rendering. They were framework-neutral
// already, so they need a home in the post-cutover suite without a rewrite.
// Component tests live in vitest.web.config.ts (React, *.test.tsx, the pre-
// cutover oracle) and vitest.web.svelte.config.ts (*.svelte.test.ts). The
// svelte plugin is present so a test importing a runes *.svelte.ts factory
// still compiles; jsdom covers the DOM-touching cases (contrast, worker).

import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Four transport/worker tests are intentionally NOT here: highlight.worker,
// relay-runtime-transport, submitSlashDraft, submitSlashDraftTransport. They
// were excluded from every config (dead — never run), and fail on stale
// fetch-mock / Worker-env assumptions that need a real fix before they can be
// wired in. Tracked for follow-up; do not silently include until they pass.
const LOGIC_TESTS = [
  'app-mobile/tests/artifact-cache.test.ts',
  'app-mobile/tests/artifact-share.test.ts',
  'app-mobile/tests/model-catalog.test.ts',
  'app-mobile/tests/runtime-issues.test.ts',
  'app-mobile/tests/todo-state.test.ts',
  'app-mobile/tests/transcript-scope.test.ts',
  'app-mobile/tests/artifact-share-binary.test.tsx',
  'app-mobile/tests/artifact-transport.test.tsx',
  'app-mobile/tests/contrast.test.tsx',
  'app-mobile/tests/demo-rich-release.test.tsx',
  'app-mobile/tests/insertSlashCommand.test.tsx',
  'app-mobile/tests/normalizeTranscriptBlocks.test.tsx',
  'app-mobile/tests/rankHostCommands.test.tsx',
  'app-mobile/tests/turns.test.tsx',
  'app-mobile/tests/useSlashTrigger.test.tsx',
];

export default defineConfig({
  resolve: { alias: { $shared: fileURLToPath(new URL('./app-mobile/src/shared', import.meta.url)) } },
  plugins: [svelte({ hot: false })],
  test: {
    environment: 'jsdom',
    include: LOGIC_TESTS,
    setupFiles: ['app-mobile/tests/setup.ts'],
  },
});
