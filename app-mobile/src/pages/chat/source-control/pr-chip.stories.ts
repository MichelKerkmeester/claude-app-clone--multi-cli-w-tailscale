// ───────────────────────────────────────────────────────────────────
// MODULE: PULL REQUEST CHIP STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import PrChip from './pr-chip.svelte';

const meta = {
  title: 'Source Control/PrChip',
  component: PrChip,
  tags: ['autodocs'],
} satisfies Meta<typeof PrChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutHostData: Story = {
  args: {},
};
