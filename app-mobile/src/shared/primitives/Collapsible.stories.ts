import type { Meta, StoryObj } from '@storybook/sveltekit';
import { createRawSnippet } from 'svelte';

import Collapsible from './Collapsible.svelte';

// Collapsible's `trigger` and `children` are Snippets; build them inline via
// createRawSnippet (the Svelte 5 API for authoring a snippet from a .ts story
// file) so no .svelte wrapper file is added.
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

const meta = {
  title: 'Primitives/Collapsible',
  component: Collapsible,
  tags: ['autodocs'],
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {
  args: { open: false, trigger: TRIGGER, children: BODY },
};
export const Expanded: Story = {
  args: { open: true, trigger: TRIGGER, children: BODY },
};
