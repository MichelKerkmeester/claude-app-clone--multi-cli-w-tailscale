// ───────────────────────────────────────────────────────────────────
// MODULE: CHANGED FILES STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import ChangedFiles from './changed-files.svelte';

const meta = {
  title: 'Source Control/ChangedFiles',
  component: ChangedFiles,
  tags: ['autodocs'],
} satisfies Meta<typeof ChangedFiles>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutHostData: Story = {
  args: {},
};
