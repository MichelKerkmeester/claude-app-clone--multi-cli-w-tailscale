import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { TranscriptBlock } from '@pi-remote/pi-rpc-protocol';

import AssistantActions from './AssistantActions.svelte';
import { DEMO_RICH_CONTENT_BLOCKS, DEMO_RICH_RELEASE_BLOCKS } from '$shared/data/demo.js';
import {
  normalizeTranscriptBlocks,
  type NormalizedProseBlock,
} from '../rich-content/normalizeTranscriptBlocks.js';

// Re-host the frozen rich-content fixtures through the existing normalizer so the
// story `text` arg is the canonicalSource of a real assistant prose block sourced
// from the demo data — nothing is invented. The `transcript` surface declares the
// `turn-actions` state; AssistantActions renders the under-answer Copy / Share row.
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
