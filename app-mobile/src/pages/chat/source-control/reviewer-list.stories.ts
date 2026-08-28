// ───────────────────────────────────────────────────────────────────
// MODULE: REVIEWER LIST STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import ReviewerList from './reviewer-list.svelte';

const meta = {
  title: 'Source Control/ReviewerList',
  component: ReviewerList,
  tags: ['autodocs'],
} satisfies Meta<typeof ReviewerList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutHostData: Story = {
  args: {},
};
