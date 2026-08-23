import type { Meta, StoryObj } from '@storybook/sveltekit';
import AttentionInbox from './screen-attention-inbox.svelte';

// The inbox fetches attention signals itself; with no live relay it renders its
// empty state. Handlers are no-op arrows — the open callback's resolution type
// is supplied by the host at runtime and is ignored here.
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
