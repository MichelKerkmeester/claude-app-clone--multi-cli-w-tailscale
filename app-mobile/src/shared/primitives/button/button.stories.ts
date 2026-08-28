// ───────────────────────────────────────────────────────────────────
// MODULE: BUTTON STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import { createRawSnippet } from 'svelte';

import Button from './button.svelte';

// Build Button's Snippet inline with `createRawSnippet` so the story needs no .svelte wrapper.
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
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: { children: labelSnippet('Continue') },
};
export const Disabled: Story = {
  args: { disabled: true, children: labelSnippet('Continue') },
};
export const Submit: Story = {
  args: { type: 'submit', children: labelSnippet('Continue') },
};
// The primitive is headless; consumers supply the visual class. This is the
// chrome-button class the inbox and review back controls actually pass.
export const AsBackButton: Story = {
  args: { class: 'back-button', children: labelSnippet('Back to sessions') },
};
