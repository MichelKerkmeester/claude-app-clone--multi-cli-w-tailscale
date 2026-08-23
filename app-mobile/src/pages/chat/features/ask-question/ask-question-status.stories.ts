// ───────────────────────────────────────────────────────────────────
// MODULE: ASK QUESTION STATUS STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import AskQuestionStatus from './ask-question-status.svelte';
import type { AskQuestionFormState } from './ask-question-types.js';

// Cover each status phase with a real form-state shape and an allowlisted error reason.
const formState = (phase: AskQuestionFormState['phase'], errorReason: AskQuestionFormState['errorReason'] = null): AskQuestionFormState => ({
  phase,
  selectedOptionIds: [],
  freeText: '',
  errorReason,
  clientMutationId: null,
});

const meta = {
  title: 'AskQuestion/AskQuestionStatus',
  component: AskQuestionStatus,
  tags: ['autodocs'],
} satisfies Meta<typeof AskQuestionStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Presented: Story = { args: { state: formState('presented') } };
export const Selecting: Story = { args: { state: formState('selecting') } };
export const Submitting: Story = { args: { state: formState('submitting') } };
export const Answered: Story = { args: { state: formState('answered-immutable') } };
export const Expired: Story = { args: { state: formState('expired') } };
export const Error: Story = {
  args: { state: formState('error', 'validation-failed') },
};
