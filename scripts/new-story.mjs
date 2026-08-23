// Story scaffold: emit a correct CSF3 story stub co-located with a Svelte
// component, so adding a component (or filling a coverage gap) is one command.
// The stub compiles and renders a props-free component as-is; a context-coupled
// component needs its args sourced from real demo fixtures and a provider
// decorator added by hand (see any sibling *.stories.ts) — the TODO marks that.
//
// Usage: npm run story:new app-mobile/src/<path>/<Component>.svelte
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const arg = process.argv[2];
if (!arg) {
  console.error('Usage: npm run story:new app-mobile/src/<path>/<Component>.svelte');
  process.exit(2);
}

const abs = arg.startsWith('/') ? arg : join(process.cwd(), arg);
if (!existsSync(abs) || !abs.endsWith('.svelte') || abs.endsWith('.stories.svelte')) {
  console.error(`Not a component file: ${arg}`);
  process.exit(2);
}

const name = basename(abs, '.svelte');
const storyPath = join(dirname(abs), `${name}.stories.ts`);
if (existsSync(storyPath)) {
  console.error(`Story already exists: ${relative(ROOT, storyPath)}`);
  process.exit(1);
}

// Group = the immediate folder, title-cased (kebab → Title Case). A best-effort
// default the author refines to match the curated buckets (Views, Artifacts, …).
const folder = basename(dirname(abs));
const group = folder
  .split('-')
  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
  .join(' ');

const stub = `import type { Meta, StoryObj } from '@storybook/sveltekit';

import ${name} from './${name}.svelte';

const meta = {
  title: '${group}/${name}',
  component: ${name},
  tags: ['autodocs'],
} satisfies Meta<typeof ${name}>;

export default meta;
type Story = StoryObj<typeof meta>;

// TODO: source args from real demo fixtures (\$shared/data/demo), one story per
// meaningful state. If ${name} reads context, add a provider \`decorators\` entry
// — see a sibling *.stories.ts for the pattern. Never invent values.
export const Default: Story = {};
`;

writeFileSync(storyPath, stub);
console.log(`Created ${relative(ROOT, storyPath)}  (title: ${group}/${name})`);
console.log(`Next: fill real args/decorators, then verify: npm run build-storybook -w @pi-remote/web && node scripts/catalog-smoke-cdp.mjs`);
