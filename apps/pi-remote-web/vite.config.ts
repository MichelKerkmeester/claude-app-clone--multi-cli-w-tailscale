// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Web Vite Configuration
// ───────────────────────────────────────────────────────────────────

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
});
