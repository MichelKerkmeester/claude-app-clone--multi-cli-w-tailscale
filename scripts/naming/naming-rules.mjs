// ───────────────────────────────────────────────────────────────────
// MODULE: Naming Rules
// ───────────────────────────────────────────────────────────────────

// Single grammar source for renames; SvelteKit routing names never participate.
// ───────────────────────────────────────────────────────────────────
// 1. CONSTANTS
// ───────────────────────────────────────────────────────────────────

export const RESERVED_SVELTEKIT = [
  '+page',
  '+layout',
  '+error',
  '+server',
  '+page.server',
  '+layout.server',
];

/** True when a path segment is a SvelteKit route parameter such as [id]. */
// ───────────────────────────────────────────────────────────────────
// 2. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

export function isRouteParameterSegment(segment) {
  return /^\[.*\]$/.test(segment);
}

/** True when a basename is owned by SvelteKit's routing contract. */
export function isReservedName(basename) {
  const stem = basename.split('.')[0];
  return RESERVED_SVELTEKIT.includes(stem) || stem.startsWith('+');
}

/** Split stem and full suffix chain; truncating at the first dot drops .svelte.ts suffixes. */
export function splitBasename(basename) {
  const dot = basename.indexOf('.');
  return dot === -1
    ? { stem: basename, suffix: '' }
    : { stem: basename.slice(0, dot), suffix: basename.slice(dot) };
}

/** Convert a PascalCase or camelCase stem to kebab-case. */
export function toKebab(stem) {
  return stem
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/_/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

/** Kebab-case a basename while preserving its suffix chain verbatim. */
export function kebabBasename(basename) {
  if (isReservedName(basename)) return basename;
  const { stem, suffix } = splitBasename(basename);
  return `${toKebab(stem)}${suffix}`;
}

/** True when a rename changes only letter case, which this filesystem can swallow. */
export function isCaseOnlyRename(from, to) {
  return from !== to && from.toLowerCase() === to.toLowerCase();
}
