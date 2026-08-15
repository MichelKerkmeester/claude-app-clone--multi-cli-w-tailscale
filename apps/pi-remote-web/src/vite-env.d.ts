/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Set to '1' at build time to compile in the offline local-preview path (see demo.ts).
  readonly VITE_PI_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
