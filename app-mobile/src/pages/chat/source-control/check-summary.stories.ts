// ───────────────────────────────────────────────────────────────────
// MODULE: CHECK SUMMARY STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import CheckSummary from './check-summary.svelte';

const meta = {
  title: 'Source Control/CheckSummary',
  component: CheckSummary,
  tags: ['autodocs'],
} satisfies Meta<typeof CheckSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutHostData: Story = {
  args: {},
};
