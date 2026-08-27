// ───────────────────────────────────────────────────────────────────
// MODULE: PROMPT HISTORY SHEET STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import PromptHistorySheet from './sheet-prompt-history.svelte';

const noop = (): void => {};

const meta = {
  title: 'Chrome/PromptHistorySheet',
  component: PromptHistorySheet,
  tags: ['autodocs'],
} satisfies Meta<typeof PromptHistorySheet>;

export default meta;
type Story = StoryObj<typeof meta>;

// Recent prompts recall sheet, opened from the composer when the draft is empty.
// History is device-local; an empty store shows the empty state.
export const Open: Story = {
  args: {
    isOpen: true,
    onOpenChange: noop,
    onSelectHistory: noop,
  },
};
