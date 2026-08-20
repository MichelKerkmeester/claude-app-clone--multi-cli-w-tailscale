// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote ESLint Configuration
// ───────────────────────────────────────────────────────────────────

import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // Runtime tooling is symlinked into this app's root in the standalone deployment; do not lint it.
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/release/evidence/**',
      '**/coverage/**',
      '.opencode/**',
      '.pi/**',
      '.claude/**',
      '.codex/**',
      '.cursor/**',
      '.devin/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['app-mobile/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      ...reactRefresh.configs.vite.rules,
    },
  },
  {
    files: ['app-mobile/public/service-worker.js'],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
      },
    },
  },
  {
    files: ['**/*.test.{js,mjs,ts,tsx}', '**/tests/**/*.{js,mjs,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
);
