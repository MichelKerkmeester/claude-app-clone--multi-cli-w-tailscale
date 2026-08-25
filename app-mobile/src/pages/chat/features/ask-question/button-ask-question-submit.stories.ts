// ───────────────────────────────────────────────────────────────────
// MODULE: ASK QUESTION SUBMIT BUTTON STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import AskQuestionSubmitButton from './button-ask-question-submit.svelte';

const meta = {
  title: 'AskQuestion/AskQuestionSubmitButton',
  component: AskQuestionSubmitButton,
  tags: ['autodocs'],
} satisfies Meta<typeof AskQuestionSubmitButton>;

export default meta;
type Story = StoryObj<typeof meta>;

// Single-prop smoke story.
export const Enabled: Story = { args: { disabled: false } };
export const Disabled: Story = { args: { disabled: true } };
