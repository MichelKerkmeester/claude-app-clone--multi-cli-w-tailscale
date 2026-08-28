// ───────────────────────────────────────────────────────────────────
// MODULE: SOURCE CONTROL HUB STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import SourceControlHub from './source-control-hub.svelte';

const meta = {
  title: 'Source Control/SourceControlHub',
  component: SourceControlHub,
  tags: ['autodocs'],
} satisfies Meta<typeof SourceControlHub>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutHostData: Story = {
  args: {},
};
