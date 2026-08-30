import type { Preview } from '@storybook/sveltekit';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import { themes } from 'storybook/theming';
import { componentSources } from 'virtual:pi-component-sources';

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
    // The docs page chrome is separate from the story canvas and defaults to
    // white. This app's surfaces are dark far more often than not, so a white
    // page put a bright field around every component and made the canvases read
    // as cut-outs. The chrome is a reading surface, not a preview surface: it is
    // pinned dark rather than following the theme toolbar, which continues to
    // drive what the canvases themselves render.
    docs: {
      theme: themes.dark,
      source: {
        // Storybook synthesises a one-line invocation from the args, which shows
        // how to call a component and nothing about what it is. Nearly every
        // rendering decision in this app lives in a component's markup and its
        // scoped <style>, so the invocation is followed by the real file read
        // off disk. Both are behind "Show code", collapsed by default.
        transform: (code: string, context: { component?: { __docgen?: { name?: string } } }) => {
          const name = context?.component?.__docgen?.name;
          const source = name ? componentSources[name] : undefined;
          if (source === undefined) return code;
          return `${code}\n\n<!-- ─────────────── ${name} ─────────────── -->\n\n${source}`;
        },
      },
    },
    // This app only ever ships in a phone frame, and every gate renders it there:
    // the screenshot archive, the CDP smoke sweep and the UI audit all use
    // 402x874. A catalog that opens at desktop width shows a rendering no user
    // receives — and hides the ones they do, because several surfaces change
    // below 52rem. `wide` exists so those alternates stay one click away rather
    // than requiring someone to drag the canvas and guess when the breakpoint
    // flipped.
    viewport: {
      options: {
        phone: {
          name: 'Phone — the archive frame',
          styles: { width: '402px', height: '874px' },
          type: 'mobile',
        },
        wide: {
          name: 'Wide — above the 52rem breakpoint',
          styles: { width: '900px', height: '874px' },
          type: 'tablet',
        },
      },
    },
  },
  // Open every story in the frame the app actually ships in. This is a manager
  // default only: the gates load `iframe.html` directly at their own size, so
  // nothing here changes what they measure.
  initialGlobals: {
    viewport: { value: 'phone', isRotated: false },
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
