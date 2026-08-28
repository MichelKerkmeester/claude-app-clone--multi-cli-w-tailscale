// ───────────────────────────────────────────────────────────────────
// MODULE: CONFLICT LIST STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import ConflictList from './conflict-list.svelte';

const meta = {
  title: 'Source Control/ConflictList',
  component: ConflictList,
  tags: ['autodocs'],
} satisfies Meta<typeof ConflictList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutHostData: Story = {
  args: {},
};
