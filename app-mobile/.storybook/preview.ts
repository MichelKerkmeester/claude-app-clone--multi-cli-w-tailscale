import type { Preview } from '@storybook/sveltekit';
import { withThemeByDataAttribute } from '@storybook/addon-themes';

import { applyOverrides } from './token-overrides.js';

// The global foundation stylesheet the app serves (imported once by +layout), so
// surfaces render against the real --pi-* tokens; component rules live in each
// component's scoped <style> and travel with the story.
import '../src/app.css';

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    // Tokens own the surface background; Storybook's own backgrounds would fight them.
    backgrounds: { disable: true },
  },
  // A token retune set on the playground is re-applied before each story, so a
  // designer sees the whole catalog move rather than one page. With no
  // overrides stored this removes nothing and costs a single map read, which
  // is why it is unconditional rather than gated on a flag someone must find.
  beforeEach: () => {
    applyOverrides();
  },
  // addon-themes drives the design system's data-theme on <html> and gives the
  // toolbar toggle, so every surface can be checked in system / light / dark. Its
  // `theme` global name matches the catalog-smoke CDP gate's `globals=theme:*`.
  decorators: [
    withThemeByDataAttribute({
      attributeName: 'data-theme',
      defaultTheme: 'system',
      themes: { system: 'system', light: 'light', dark: 'dark' },
    }),
  ],
};

export default preview;
