// ───────────────────────────────────────────────────────────────────
// MODULE: COMMIT HISTORY STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import CommitHistory from './commit-history.svelte';

const meta = {
  title: 'Source Control/CommitHistory',
  component: CommitHistory,
  tags: ['autodocs'],
} satisfies Meta<typeof CommitHistory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutHostData: Story = {
  args: {},
};
