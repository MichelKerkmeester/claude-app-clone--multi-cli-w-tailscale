import type { Meta, StoryObj } from '@storybook/sveltekit';
import EmptyState from './empty-state.svelte';

// The empty-state surface declares two states: empty (no error) and error.
// Both are rendered over the component's real prop values — no invented copy.
const meta = {
  title: 'Views/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { args: { loading: false, error: null } };

export const Error: Story = { args: { loading: false, error: 'The relay request failed.' } };
