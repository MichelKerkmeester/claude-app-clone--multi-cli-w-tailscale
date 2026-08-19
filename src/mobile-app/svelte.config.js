import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // SPA / CSR: a single static fallback, no server. Tailscale Serve (not the relay) serves
    // this build, and adapter-static keeps the dist/ output that the release gate and vite
    // preview already expect — so the backend needs zero serving changes.
    adapter: adapter({
      pages: 'dist',
      assets: 'dist',
      fallback: 'index.html',
      precompress: false,
      strict: false,
    }),
    // The frozen CSP directives move off the index.html meta tag to here. Hash mode lets SvelteKit
    // hash its own inline bootstrap script, which script-src 'self' would otherwise block.
    csp: {
      mode: 'hash',
      directives: {
        'default-src': ['self'],
        'script-src': ['self'],
        'style-src': ['self'],
        'img-src': ['self', 'blob:'],
        'connect-src': ['self'],
        'object-src': ['none'],
        'frame-src': ['none'],
        'base-uri': ['none'],
      },
    },
  },
};

export default config;
