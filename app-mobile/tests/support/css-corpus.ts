// CSS corpus builder for the post-cutover stylesheet assertions.
//
// Before the SvelteKit migration every rule lived in one style.css, so CSS-source tests read that
// file directly. After the migration each surface's rules live in its component's scoped <style>,
// and the global foundation lives in app.css — style.css is retired at cutover. This assembles the
// same logical stylesheet those tests need: app.css concatenated with every component's scoped
// <style> body, with Svelte's :global(...) wrapping unwrapped so a selector normalizes to the plain
// form the assertions match (`:global(.todo-panel)` -> `.todo-panel`).

import { readFileSync, readdirSync } from 'node:fs';

// Unwrap one level of :global(...); Svelte does not nest it in practice. Mirrors decl-equivalence.mjs.
function stripGlobal(css: string): string {
  return css.replace(/:global\(([^()]*)\)/g, '$1');
}

function scopedStyleBodies(): string[] {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const full = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.svelte')) files.push(full);
    }
  };
  walk('app-mobile/src/lib');
  walk('app-mobile/src/routes');
  const bodies: string[] = [];
  for (const file of files) {
    // Strip HTML comments first: a markup comment can literally mention `<style>`, which would make
    // the <style> regex capture markup through to the real </style>. CSS never contains `<!--`.
    const text = readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    for (const match of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
      bodies.push(stripGlobal(match[1]));
    }
  }
  return bodies;
}

/** app.css + every component scoped <style> body (:global unwrapped) — the migrated stylesheet. */
export function readCssCorpus(): string {
  return [readFileSync('app-mobile/src/app.css', 'utf8'), ...scopedStyleBodies()].join('\n');
}
