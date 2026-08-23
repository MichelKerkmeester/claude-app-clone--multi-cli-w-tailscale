import type { Meta, StoryObj } from '@storybook/sveltekit';
import { createRawSnippet } from 'svelte';

import RootErrorBoundary from './root-error-boundary.svelte';

// RootErrorBoundary wraps the app shell in an <svelte:boundary>; the children
// Snippet is built with createRawSnippet so no wrapper .svelte file is needed.
// This story covers the normal pass-through state — children render untouched,
// no error thrown.
const children = createRawSnippet(() => ({
  render: () => '<p style="padding:2rem">The app shell renders here.</p>',
}));

const meta = {
  title: 'Chrome/RootErrorBoundary',
  component: RootErrorBoundary,
  tags: ['autodocs'],
} satisfies Meta<typeof RootErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children },
};
