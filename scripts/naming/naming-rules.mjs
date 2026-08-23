// ───────────────────────────────────────────────────────────────────
// MODULE: Naming Rules
// ───────────────────────────────────────────────────────────────────
// The single place the file-naming grammar is expressed. Every rename in this
// programme is generated from here rather than typed, so the moves and the
// import rewrites cannot drift apart.

// SvelteKit reads these names as routing directives, so they are the URL
// contract rather than a naming choice and never take part in a rename.
export const RESERVED_SVELTEKIT = [
  '+page',
  '+layout',
  '+error',
  '+server',
  '+page.server',
  '+layout.server',
];

/** True when a path segment is a SvelteKit route parameter such as [id]. */
export function isRouteParameterSegment(segment) {
  return /^\[.*\]$/.test(segment);
}

/** True when a basename is owned by SvelteKit's routing contract. */
export function isReservedName(basename) {
  const stem = basename.split('.')[0];
  return RESERVED_SVELTEKIT.includes(stem) || stem.startsWith('+');
}

/**
 * Split a basename into its stem and its full suffix chain. A .svelte.ts file
 * has two dots, and truncating at the first one silently drops half the
 * extension — so the stem is everything before the first dot and the suffix is
 * everything from it.
 */
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
