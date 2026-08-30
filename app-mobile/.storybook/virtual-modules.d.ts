// The component sources map is produced at build time by the catalog's own Vite
// plugin, so it has no file on disk for the type checker to read.
declare module 'virtual:pi-component-sources' {
  /** Raw `.svelte` file contents, keyed by filename. */
  export const componentSources: Record<string, string>;
}
