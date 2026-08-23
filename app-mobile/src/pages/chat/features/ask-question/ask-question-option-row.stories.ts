// ───────────────────────────────────────────────────────────────────
// MODULE: ASK QUESTION OPTION ROW STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { AskQuestionOption } from '@pi-remote/pi-rpc-protocol';

import AskQuestionOptionRow from './ask-question-option-row.svelte';

// Reuse one demo option so each row state exercises the real option shape.
const DEMO_ASK_QUESTION_OPTION: AskQuestionOption = {
  id: 'demo-option-tests',
  label: 'Run the focused tests',
  description: 'Fast local confidence.',
};

const meta = {
  title: 'AskQuestion/AskQuestionOptionRow',
  component: AskQuestionOptionRow,
  tags: ['autodocs'],
} satisfies Meta<typeof AskQuestionOptionRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    option: DEMO_ASK_QUESTION_OPTION,
    selected: false,
    selectionMode: 'single',
    disabled: false,
    onToggle: () => {},
  },
};
export const Selected: Story = {
  args: {
    option: DEMO_ASK_QUESTION_OPTION,
    selected: true,
    selectionMode: 'single',
    disabled: false,
    onToggle: () => {},
  },
};
export const MultipleIndicator: Story = {
  args: {
    option: DEMO_ASK_QUESTION_OPTION,
    selected: true,
    selectionMode: 'multiple',
    disabled: false,
    onToggle: () => {},
  },
};
export const Disabled: Story = {
  args: {
    option: DEMO_ASK_QUESTION_OPTION,
    selected: false,
    selectionMode: 'single',
    disabled: true,
    onToggle: () => {},
  },
};
