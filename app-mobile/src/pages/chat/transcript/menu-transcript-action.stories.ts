import type { Meta, StoryObj } from '@storybook/sveltekit';

import MenuTranscriptAction from './menu-transcript-action.svelte';

const noop = (): void => {};

const meta = {
  title: 'Transcript/MenuTranscriptAction',
  component: MenuTranscriptAction,
  tags: ['autodocs'],
} satisfies Meta<typeof MenuTranscriptAction>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MixedAvailability: Story = {
  args: {
    open: true,
    x: 24,
    y: 80,
    rows: [
      { id: 'copy-selection', label: 'Copy selection', disabled: true, hint: 'Nothing selected' },
      { id: 'copy-message', label: 'Copy message', disabled: false, hint: null },
      { id: 'copy-code', label: 'Copy code', disabled: true, hint: 'No code in this row' },
    ],
    onSelect: noop,
    onClose: noop,
  },
};
