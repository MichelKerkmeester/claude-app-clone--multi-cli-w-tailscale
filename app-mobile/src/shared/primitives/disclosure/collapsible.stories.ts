// ───────────────────────────────────────────────────────────────────
// MODULE: COLLAPSIBLE STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import { createRawSnippet } from 'svelte';

import Collapsible from './collapsible.svelte';

// Build both Snippets inline with `createRawSnippet` so the story needs no .svelte wrapper.
function triggerSnippet(text: string) {
  return createRawSnippet(() => ({
    render: () => text,
  }));
}

function paragraphSnippet(text: string) {
  return createRawSnippet(() => ({
    render: () => `<p>${text}</p>`,
  }));
}

const TRIGGER = triggerSnippet('Details');
const BODY = paragraphSnippet(
  'This collapsible content stays hidden until the trigger is activated. Use it to keep long or secondary information out of the primary reading flow.',
);

const meta: Meta<typeof Collapsible> = {
  title: 'Primitives/Collapsible',
  component: Collapsible,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Collapsible>;

export const Collapsed: Story = {
  args: { open: false, trigger: TRIGGER, children: BODY },
};
export const Expanded: Story = {
  args: { open: true, trigger: TRIGGER, children: BODY },
};
