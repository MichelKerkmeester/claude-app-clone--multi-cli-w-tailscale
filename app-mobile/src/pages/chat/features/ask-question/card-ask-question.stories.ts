import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { AskQuestionTranscriptMeta } from '@pi-remote/pi-rpc-protocol';

import AskQuestionCard from './card-ask-question.svelte';

// Re-host the demo ask-question display values (verbatim from the frozen
// DEMO_ASK_QUESTION_DISPLAY in $shared/data/demo.ts) and the transcript block
// shape used by tests/ask-question-card.svelte.test.ts — nothing is invented.
// Note: the card resolves its display through fetchAskQuestionDisplay (relay),
// which needs the live backend or demo mode, so Storybook shows the card's
// loading shell; the block.status arg still drives the lifecycle phase class.
const DEMO_ASK_QUESTION_BLOCK: AskQuestionTranscriptMeta = {
  id: 'ask_block_001',
  revision: 1,
  seq: 2,
  occurredAt: '2026-08-18T10:00:00.000Z',
  kind: 'ask-question',
  activityId: 'demo-ask-activity-001',
  questionId: 'demo-ask-question-001',
  sessionId: 'demo-session-refactor',
  presentedRevision: 1,
  status: 'presented',
};

const meta = {
  title: 'AskQuestion/AskQuestionCard',
  component: AskQuestionCard,
  tags: ['autodocs'],
} satisfies Meta<typeof AskQuestionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Presented: Story = { args: { block: DEMO_ASK_QUESTION_BLOCK } };
export const Submitting: Story = {
  args: { block: { ...DEMO_ASK_QUESTION_BLOCK, status: 'submitting' } },
};
export const Answered: Story = {
  args: { block: { ...DEMO_ASK_QUESTION_BLOCK, status: 'answered' } },
};
export const Expired: Story = {
  args: { block: { ...DEMO_ASK_QUESTION_BLOCK, status: 'expired' } },
};
export const ReadOnly: Story = {
  args: { block: DEMO_ASK_QUESTION_BLOCK, canAnswer: false },
};
