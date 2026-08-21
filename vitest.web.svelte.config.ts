// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Web Test Configuration (Svelte)
// ───────────────────────────────────────────────────────────────────
// Runs the Svelte component/a11y suite alongside the React suite during
// the SvelteKit migration. React tests stay on vitest.web.config.ts
// (*.test.tsx); ported Svelte tests live in *.svelte.test.ts so the two
// suites never collide. svelteTesting() wires auto-cleanup and the
// browser resolve condition so client-side runes run under jsdom.

import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [svelte({ hot: false }), svelteTesting()],
  test: {
    environment: 'jsdom',
    include: ['app-mobile/tests/**/*.svelte.test.ts'],
    setupFiles: ['app-mobile/tests/setup.ts'],
    server: {
      // bits-ui ships raw *.svelte inside node_modules; vitest externalizes
      // node_modules by default, so Node rejects the .svelte extension and any
      // bits-ui-backed component (Dialog/DropdownMenu/RadioGroup/...) fails to
      // mount. Inlining bits-ui (and its @internationalized deps) routes those
      // files through vite-plugin-svelte so the components render under jsdom.
      deps: { inline: [/bits-ui/, /runed/, /svelte-toolbelt/, /@internationalized/] },
    },
  },
});
