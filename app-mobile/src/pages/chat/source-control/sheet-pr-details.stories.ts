// ───────────────────────────────────────────────────────────────────
// MODULE: PULL REQUEST DETAILS SHEET STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import SheetPrDetails from './sheet-pr-details.svelte';

const meta = {
  title: 'Source Control/SheetPrDetails',
  component: SheetPrDetails,
  tags: ['autodocs'],
} satisfies Meta<typeof SheetPrDetails>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutHostData: Story = {
  args: {},
};
