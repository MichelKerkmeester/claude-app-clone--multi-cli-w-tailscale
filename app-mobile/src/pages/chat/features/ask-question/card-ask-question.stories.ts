// ───────────────────────────────────────────────────────────────────
// MODULE: ASK QUESTION CARD STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { AskQuestionTranscriptMeta } from '@pi-remote/pi-rpc-protocol';

import { demoPostJson } from '$shared/fixtures/demo.js';
import { installStoryHostFetch } from '$shared/fixtures/story-host-fetch.js';
import { setAskQuestionDisplay } from './ask-question-ephemeral-store.js';
import { isAskQuestionViewModel, type AskQuestionViewModel } from './ask-question-types.js';
import AskQuestionCard from './card-ask-question.svelte';

// Demo transcript shape for lifecycle stories.
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

const DEMO_ASK_QUESTION_DISPLAY: AskQuestionViewModel = (() => {
  const payload = demoPostJson('/api/ask-question/display', {
    sessionId: DEMO_ASK_QUESTION_BLOCK.sessionId,
    questionId: DEMO_ASK_QUESTION_BLOCK.questionId,
    revision: DEMO_ASK_QUESTION_BLOCK.presentedRevision,
  });
  if (!isAskQuestionViewModel(payload)) {
    throw new Error('Demo ask-question display fixture is missing from demoPostJson.');
  }
  return payload;
})();

const meta = {
  title: 'AskQuestion/AskQuestionCard',
  component: AskQuestionCard,
  tags: ['autodocs'],
  // The card fetches display text from the host; isolation has no relay, so
  // seed the ephemeral store and answer that read with the live demo display.
  beforeEach: () => {
    setAskQuestionDisplay(DEMO_ASK_QUESTION_DISPLAY);
    return installStoryHostFetch({
      '/api/ask-question/display': () => DEMO_ASK_QUESTION_DISPLAY,
    });
  },
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
