// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Web Test Configuration
// ───────────────────────────────────────────────────────────────────

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/mobile-app/tests/**/*.test.tsx'],
    setupFiles: ['src/mobile-app/tests/setup.ts'],
  },
});
