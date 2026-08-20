// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Web Test Configuration
// ───────────────────────────────────────────────────────────────────

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['app-mobile/tests/**/*.test.tsx'],
    setupFiles: ['app-mobile/tests/setup.ts'],
  },
});
