// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Web Test Configuration
// ───────────────────────────────────────────────────────────────────

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['apps/pi-remote-web/tests/**/*.test.tsx'],
    setupFiles: ['apps/pi-remote-web/tests/setup.ts'],
  },
});
