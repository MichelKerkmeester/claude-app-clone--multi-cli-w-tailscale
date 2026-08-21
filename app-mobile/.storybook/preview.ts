import type { Preview } from '@storybook/sveltekit';

// The frozen global stylesheet (foundation + component rules) so surfaces render
// against the real --pi-* tokens, exactly as the app serves them.
import '../src/style.css';

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    // Tokens own the surface background; Storybook's own backgrounds would fight them.
    backgrounds: { disable: true },
  },
  // The design system themes via data-theme on the root; expose a toolbar toggle
  // so every surface can be checked in system / light / dark.
  globalTypes: {
    theme: {
      description: 'Design-system theme',
      defaultValue: 'system',
      toolbar: {
        title: 'Theme',
        icon: 'contrast',
        items: ['system', 'light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (story, context) => {
      if (typeof document !== 'undefined') {
        document.documentElement.dataset.theme = String(context.globals.theme ?? 'system');
      }
      return story();
    },
  ],
};

export default preview;
