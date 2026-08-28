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
} satisfies Meta<typeof Settings>;

export default meta;
type Story = StoryObj<typeof meta>;

// ───────────────────────────────────────────────────────────────────
// 3. STORIES
// ───────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: {},
};
