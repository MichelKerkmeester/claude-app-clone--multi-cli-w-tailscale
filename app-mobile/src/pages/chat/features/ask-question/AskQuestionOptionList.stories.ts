import type { Meta, StoryObj } from '@storybook/sveltekit';

import AskQuestionOptionList from './AskQuestionOptionList.svelte';
import type { AskQuestionViewModel } from './askQuestionTypes.js';

// Re-host the demo ask-question display values (verbatim from the frozen
// DEMO_ASK_QUESTION_DISPLAY in $shared/data/demo.ts) — nothing is invented.
const DEMO_ASK_QUESTION_VIEW: AskQuestionViewModel = {
  type: 'session.ask-question.display',
  sessionId: 'demo-session-refactor',
  questionId: 'demo-ask-question-001',
  activityId: 'demo-ask-activity-001',
  revision: 1,
  display: {
    prompt: 'Which release gate should Pi run next?',
    options: [
      { id: 'demo-option-tests', label: 'Run the focused tests', description: 'Fast local confidence.' },
      { id: 'demo-option-review', label: 'Open the review lane', description: 'Inspect the current diff.' },
      { id: 'demo-option-hold', label: 'Hold for later', description: 'Leave the question pending.' },
    ],
    freeText: {
      allowed: true,
      required: false,
      placeholder: 'Add a short note (optional)',
      maxLength: 280,
    },
    minSelections: 1,
    maxSelections: 2,
  },
  selectionMode: 'multiple',
  redaction: {
    applied: true,
    policyVersion: 1,
    contentAvailability: 'available',
    redactedFields: [],
  },
  requiresReadOnlyHint: true,
};

// Same derivation form tests/ask-question-card.svelte.test.ts uses for its
// singleDisplay fixture.
const SINGLE_VIEW: AskQuestionViewModel = {
  ...DEMO_ASK_QUESTION_VIEW,
  selectionMode: 'single',
  display: { ...DEMO_ASK_QUESTION_VIEW.display, minSelections: 1, maxSelections: 1 },
};

const meta = {
  title: 'AskQuestion/AskQuestionOptionList',
  component: AskQuestionOptionList,
  tags: ['autodocs'],
} satisfies Meta<typeof AskQuestionOptionList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    viewModel: DEMO_ASK_QUESTION_VIEW,
    selectedOptionIds: [],
    disabled: false,
    onToggle: () => {},
  },
};
export const SingleChoice: Story = {
  args: {
    viewModel: SINGLE_VIEW,
    selectedOptionIds: [],
    disabled: false,
    onToggle: () => {},
  },
};
export const PartialSelection: Story = {
  args: {
    viewModel: DEMO_ASK_QUESTION_VIEW,
    selectedOptionIds: ['demo-option-tests'],
    disabled: false,
    onToggle: () => {},
  },
};
export const Disabled: Story = {
  args: {
    viewModel: DEMO_ASK_QUESTION_VIEW,
    selectedOptionIds: [],
    disabled: true,
    onToggle: () => {},
  },
};
