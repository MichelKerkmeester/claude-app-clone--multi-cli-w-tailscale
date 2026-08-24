// CSS corpus builder for the post-cutover stylesheet assertions.
//
// Before the SvelteKit migration every rule lived in one style.css, so CSS-source tests read that
// file directly. After the migration each component's rules live in its own co-located `.css` file
// (imported by the component) and the global foundation lives in app.css — style.css is retired at
// cutover. This assembles the same logical stylesheet those tests need: app.css concatenated with
// every component `.css` body.

import { readFileSync, readdirSync } from 'node:fs';

function componentCssBodies(): string[] {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const full = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(full);
      // Every component `.css` except the global foundation (added separately below).
      else if (entry.name.endsWith('.css') && full !== 'app-mobile/src/app.css') files.push(full);
    }
  };
  walk('app-mobile/src');
  return files.map((file) => readFileSync(file, 'utf8'));
}

/** app.css + every co-located component `.css` body — the migrated stylesheet. */
export function readCssCorpus(): string {
  return [readFileSync('app-mobile/src/app.css', 'utf8'), ...componentCssBodies()].join('\n');
}
