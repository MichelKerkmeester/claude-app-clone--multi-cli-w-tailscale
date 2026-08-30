// ───────────────────────────────────────────────────────────────────
// MODULE: SETTINGS DIAGNOSTICS STORIES
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import Settings from './screen-settings.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. STORY CONFIGURATION
// ───────────────────────────────────────────────────────────────────

const meta = {
  title: 'Views/Settings Diagnostics',
  component: Settings,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Diagnostics run on mount against relay heartbeat and any host inventory supplied; absent inventory makes host-count and per-host-ping rows Unavailable, not Failed, while connectivity still checks relay reachability. Probe failures use generic failure copy, and clipboard failure is reported as “Copy unavailable” without exposing probe errors.',
      },
    },
  },
} satisfies Meta<typeof Settings>;

export default meta;
type Story = StoryObj<typeof meta>;

// ───────────────────────────────────────────────────────────────────
// 3. STORIES
// ───────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: {},
};
