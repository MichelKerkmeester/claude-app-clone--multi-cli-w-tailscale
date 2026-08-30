import type { StorybookConfig } from '@storybook/sveltekit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { componentSourcesPlugin } from './component-sources';

const SRC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

// The Svelte component catalog, replacing the bespoke React catalog. The
// SvelteKit framework preset mocks $app/* so socket/route-coupled surfaces load.
const config: StorybookConfig = {
  // Component stories live beside their component. The second glob picks up
  // catalog tooling that edits the design system rather than demonstrating a
  // surface, which is kept out of src so it never reaches the app bundle.
  stories: ['../src/**/*.stories.@(ts|svelte)', './*.stories.@(ts|svelte)'],
  // addon-docs renders what the framework already extracts. `svelte-vite` runs a
  // TypeScript docgen over every .svelte file on each build, reading $props()
  // runes for name, type, optionality, default and JSDoc; without this addon
  // that output is computed and discarded. The props table is therefore derived
  // on every build and cannot drift from the component.
  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
    '@storybook/addon-designs',
    '@storybook/addon-docs',
  ],
  framework: {
    name: '@storybook/sveltekit',
    options: {},
  },
  viteFinal: (config) => {
    config.plugins = [...(config.plugins ?? []), componentSourcesPlugin(SRC_ROOT)];
    return config;
  },
};

export default config;
