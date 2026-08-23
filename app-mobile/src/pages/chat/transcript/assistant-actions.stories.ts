import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { TranscriptBlock } from '@pi-remote/pi-rpc-protocol';

import AssistantActions from './assistant-actions.svelte';
import { DEMO_RICH_CONTENT_BLOCKS, DEMO_RICH_RELEASE_BLOCKS } from '$shared/fixtures/demo.js';
import {
  normalizeTranscriptBlocks,
  type NormalizedProseBlock,
} from '../rich-content/normalize-transcript-blocks.js';

// Reuse normalized assistant prose so the action story tests canonical source text.
// The capability-gated row therefore needs no invented content.
const NORMALIZED = normalizeTranscriptBlocks({
  sessionId: 'demo-session-triage',
  blocks: [
    ...DEMO_RICH_CONTENT_BLOCKS,
    ...DEMO_RICH_RELEASE_BLOCKS,
  ] as unknown as readonly TranscriptBlock[],
});

const prose = NORMALIZED.find(
  (block): block is NormalizedProseBlock => block.kind === 'prose' && block.role === 'assistant',
);
if (prose === undefined) {
  throw new Error('No assistant prose block found in the rich-content fixtures.');
}

const meta = {
  title: 'Transcript/AssistantActions',
  component: AssistantActions,
  tags: ['autodocs'],
} satisfies Meta<typeof AssistantActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AnswerActions: Story = { args: { text: prose.canonicalSource } };
