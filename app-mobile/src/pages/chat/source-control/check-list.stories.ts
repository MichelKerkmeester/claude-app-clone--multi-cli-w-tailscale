// ───────────────────────────────────────────────────────────────────
// MODULE: CHECK LIST STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import CheckList from './check-list.svelte';

const meta = {
  title: 'Source Control/CheckList',
  component: CheckList,
  tags: ['autodocs'],
} satisfies Meta<typeof CheckList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutHostData: Story = {
  args: {},
};
