// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote ESLint Configuration
// ───────────────────────────────────────────────────────────────────

import js from '@eslint/js';
import globals from 'globals';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/release/evidence/**',
      '**/coverage/**',
      // Generated output. Linting it reports thousands of findings nobody can
      // act on, which drowns the findings in authored code.
      '**/.svelte-kit/**',
      '**/storybook-static/**',
      // Spec folders carry read-only research repositories checked out whole.
      // They are inputs, not this project's source, and must never be edited.
      'specs/**',
      // Runtime tooling is symlinked into this app's root in the standalone deployment; do not lint it.
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
  },
  // Svelte components were unparsed until now, so no rule had ever read one.
  // The runes doctrine lives as prose rather than as a custom rule, but the
  // recommended set still catches the ordinary component mistakes.
  ...svelte.configs['flat/recommended'],
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tseslint.parser,
      },
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ['app-mobile/static/service-worker.js'],
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
