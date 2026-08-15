// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Relay Runtime Asset Copier
// ───────────────────────────────────────────────────────────────────

import { cp, mkdir } from 'node:fs/promises';

await mkdir(new URL('../dist/fixtures/', import.meta.url), { recursive: true });
await cp(
  new URL('../src/fixtures/', import.meta.url),
  new URL('../dist/fixtures/', import.meta.url),
  { recursive: true },
);
await mkdir(new URL('../dist/migrations/', import.meta.url), { recursive: true });
await cp(
  new URL('../migrations/', import.meta.url),
  new URL('../dist/migrations/', import.meta.url),
  { recursive: true },
);
