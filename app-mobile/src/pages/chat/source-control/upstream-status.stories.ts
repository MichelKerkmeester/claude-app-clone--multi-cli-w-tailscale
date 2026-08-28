// ───────────────────────────────────────────────────────────────────
// MODULE: UPSTREAM STATUS STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import UpstreamStatus from './upstream-status.svelte';

const meta = {
  title: 'Source Control/UpstreamStatus',
  component: UpstreamStatus,
  tags: ['autodocs'],
} satisfies Meta<typeof UpstreamStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutHostData: Story = {
  args: {},
};
