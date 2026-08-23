// ───────────────────────────────────────────────────────────────────
// MODULE: ATTENTION INBOX STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import AttentionInbox from './screen-attention-inbox.svelte';

// Leave fetching and callbacks internal so the story exercises the real empty-state fallback.
const noop = (): void => {};

const meta = {
  title: 'Views/AttentionInbox',
  component: AttentionInbox,
  tags: ['autodocs'],
} satisfies Meta<typeof AttentionInbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { onBack: noop, onOpen: noop },
};
