import type { Meta, StoryObj } from '@storybook/sveltekit';

import AskQuestionFreeText from './AskQuestionFreeText.svelte';
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
// requiredFreeTextDisplay fixture.
const REQUIRED_FREE_TEXT_VIEW: AskQuestionViewModel = {
  ...DEMO_ASK_QUESTION_VIEW,
  display: {
    prompt: 'Provide the required operator note.',
    options: [],
    freeText: { allowed: true, required: true, placeholder: 'Required note', maxLength: 120 },
  },
};

const meta = {
  title: 'AskQuestion/AskQuestionFreeText',
  component: AskQuestionFreeText,
  tags: ['autodocs'],
} satisfies Meta<typeof AskQuestionFreeText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { viewModel: DEMO_ASK_QUESTION_VIEW, value: '', disabled: false, invalid: false, onChange: () => {} },
};
export const Filled: Story = {
  args: {
    viewModel: DEMO_ASK_QUESTION_VIEW,
    value: 'Ship the focused test lane first.',
    disabled: false,
    invalid: false,
    onChange: () => {},
  },
};
export const Required: Story = {
  args: {
    viewModel: REQUIRED_FREE_TEXT_VIEW,
    value: '',
    disabled: false,
    invalid: false,
    onChange: () => {},
  },
};
export const Invalid: Story = {
  args: {
    viewModel: DEMO_ASK_QUESTION_VIEW,
    value: '',
    disabled: false,
    invalid: true,
    onChange: () => {},
  },
};
export const Disabled: Story = {
  args: {
    viewModel: DEMO_ASK_QUESTION_VIEW,
    value: '',
    disabled: true,
    invalid: false,
    onChange: () => {},
  },
};
