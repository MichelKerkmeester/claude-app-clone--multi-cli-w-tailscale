import type { StorybookConfig } from '@storybook/sveltekit';

// The Svelte component catalog, replacing the bespoke React catalog. The
// SvelteKit framework preset mocks $app/* so socket/route-coupled surfaces load.
const config: StorybookConfig = {
  // Component stories live beside their component. The second glob picks up
  // catalog tooling that edits the design system rather than demonstrating a
  // surface, which is kept out of src so it never reaches the app bundle.
  stories: ['../src/**/*.stories.@(ts|svelte)', './*.stories.@(ts|svelte)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-themes', '@storybook/addon-designs'],
  framework: {
    name: '@storybook/sveltekit',
    options: {},
  },
};

export default config;
