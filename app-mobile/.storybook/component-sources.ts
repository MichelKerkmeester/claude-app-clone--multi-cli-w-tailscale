// ───────────────────────────────────────────────────────────────────
// MODULE: COMPONENT SOURCES VITE PLUGIN
// ───────────────────────────────────────────────────────────────────
// The catalog could show what a component looks like and what it accepts, but
// not what it is. Storybook's own snippet synthesises a one-line invocation
// (`<theme-control value="system" />`) from the args — useful for calling the
// component, useless for reading it. The markup and the scoped <style> block,
// which is where nearly every rendering decision in this app actually lives,
// appeared nowhere.
//
// This plugin exposes every component's raw source as a virtual module, keyed by
// filename, so the docs source block can print the real file. Sources are read
// from disk rather than reconstructed, so what is shown is what compiled.
//
// Keyed by basename because that is the only identifier the framework's docgen
// attaches to a component (`__docgen.name`). Route files are excluded: `+page`
// and friends are the only repeating names in the tree, and none of them has a
// story.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const VIRTUAL_ID = 'virtual:pi-component-sources';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

function collect(srcRoot: string): Record<string, string> {
  const entries = readdirSync(srcRoot, { recursive: true, encoding: 'utf8' });
  const sources: Record<string, string> = {};
  for (const entry of entries) {
    const name = path.basename(entry);
    if (!name.endsWith('.svelte') || name.startsWith('+')) continue;
    try {
      sources[name] = readFileSync(path.join(srcRoot, entry), 'utf8');
    } catch {
      // A file that vanished between listing and reading is not worth failing
      // the whole catalog build over; it simply has no source to show.
    }
  }
  return sources;
}

export function componentSourcesPlugin(srcRoot: string) {
  return {
    name: 'pi:component-sources',
    resolveId(id: string) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    load(id: string) {
      if (id !== RESOLVED_ID) return null;
      return `export const componentSources = ${JSON.stringify(collect(srcRoot))};`;
    },
    // Without this the map is read once and a component edited during a dev
    // session keeps showing its old source — a docs page confidently displaying
    // code that no longer compiles is worse than showing none.
    handleHotUpdate(ctx: { file: string; server: { moduleGraph: { getModuleById: (id: string) => unknown } } }) {
      if (!ctx.file.endsWith('.svelte')) return;
      const mod = ctx.server.moduleGraph.getModuleById(RESOLVED_ID);
      if (mod) (ctx.server as unknown as { reloadModule: (m: unknown) => void }).reloadModule(mod);
    },
  };
}
