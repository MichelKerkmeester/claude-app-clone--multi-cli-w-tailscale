import type { StorybookConfig } from '@storybook/sveltekit';

// The Svelte component catalog, replacing the bespoke React catalog. The
// SvelteKit framework preset mocks $app/* so socket/route-coupled surfaces load.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|svelte)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-themes', '@storybook/addon-designs'],
  framework: {
    name: '@storybook/sveltekit',
    options: {},
  },
};

export default config;
