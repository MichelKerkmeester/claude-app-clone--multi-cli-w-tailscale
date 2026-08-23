import type { Meta, StoryObj } from '@storybook/sveltekit';

import AskQuestionSubmitButton from './button-ask-question-submit.svelte';

const meta = {
  title: 'AskQuestion/AskQuestionSubmitButton',
  component: AskQuestionSubmitButton,
  tags: ['autodocs'],
} satisfies Meta<typeof AskQuestionSubmitButton>;

export default meta;
type Story = StoryObj<typeof meta>;

// Smoke story: a single-prop guarded one-use submit button.
export const Enabled: Story = { args: { disabled: false } };
export const Disabled: Story = { args: { disabled: true } };
