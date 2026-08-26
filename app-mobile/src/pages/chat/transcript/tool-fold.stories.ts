import type { Meta, StoryObj } from '@storybook/sveltekit';
import { createRawSnippet } from 'svelte';

import ToolFold from './tool-fold.svelte';

function bodySnippet(content: string) {
  const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return createRawSnippet(() => ({
    render: () => `<pre>${escaped}</pre>`,
  }));
}

const meta = {
  title: 'Transcript/ToolFold',
  component: ToolFold,
  tags: ['autodocs'],
} satisfies Meta<typeof ToolFold>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CompletedGrep: Story = {
  args: {
    blockId: 'blk-003',
    summary: 'grep',
    inFlight: false,
    children: bodySnippet('src/auth/policy.ts:42:  const fresh = verifyTicket(ticket, now);'),
  },
};

export const InFlight: Story = {
  args: {
    blockId: 'blk-003',
    summary: 'grep',
    inFlight: true,
    children: bodySnippet('rg "verifyTicket" src'),
  },
};
