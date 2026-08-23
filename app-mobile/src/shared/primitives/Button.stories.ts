import type { Meta, StoryObj } from '@storybook/sveltekit';
import { createRawSnippet } from 'svelte';

import Button from './Button.svelte';

// Button's `children` is a Snippet; build it inline via createRawSnippet (the
// Svelte 5 API for authoring a snippet from a .ts story file) so no .svelte
// wrapper file is added.
function labelSnippet(text: string) {
  return createRawSnippet(() => ({
    render: () => text,
  }));
}

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: labelSnippet('Continue') },
};
export const Disabled: Story = {
  args: { disabled: true, children: labelSnippet('Continue') },
};
export const Submit: Story = {
  args: { type: 'submit', children: labelSnippet('Continue') },
};
