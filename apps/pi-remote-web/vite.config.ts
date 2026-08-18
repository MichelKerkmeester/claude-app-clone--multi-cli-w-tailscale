// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Web Vite Configuration
// ───────────────────────────────────────────────────────────────────

import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const relayProxy = {
  '/api': {
    target: 'http://127.0.0.1:4310',
    ws: true,
  },
  '/health': 'http://127.0.0.1:4310',
};

// Tailscale Serve forwards the tailnet Host header to this loopback-bound preview server, so the
// tailnet hostname must be allowed or Vite answers every phone request with a blocked-host error.
// The server binds to 127.0.0.1 and is reachable only through tailnet Serve, so allowing the
// .ts.net suffix alongside the configured origin does not widen network exposure.
function previewAllowedHosts(): string[] {
  const hosts = ['.ts.net'];
  const origin = process.env.PI_REMOTE_PUBLIC_ORIGIN;
  if (origin === undefined || origin.length === 0) {
    return hosts;
  }
  try {
    hosts.push(new URL(origin).hostname);
  } catch {
    return hosts;
  }
  return hosts;
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: { exclude: ['pdfjs-dist'] },
  worker: { format: 'es' },
  server: { proxy: relayProxy },
  preview: { proxy: relayProxy, allowedHosts: previewAllowedHosts() },
  // The catalog is a separate, isolated Vite entry (catalog.html + its own React
  // root). Both the operator app and the catalog must build; the app entry still
  // maps to the existing index.html.
  build: {
    rollupOptions: {
      input: {
        app: fileURLToPath(new URL('./index.html', import.meta.url)),
        catalog: fileURLToPath(new URL('./catalog.html', import.meta.url)),
      },
    },
  },
});
