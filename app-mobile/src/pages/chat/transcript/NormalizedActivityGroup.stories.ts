import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { TranscriptBlock } from '@pi-remote/pi-rpc-protocol';

import NormalizedActivityGroup from './NormalizedActivityGroup.svelte';
import { DEMO_RICH_CONTENT_BLOCKS, DEMO_RICH_RELEASE_BLOCKS } from '$shared/fixtures/demo.js';
import {
  normalizeTranscriptBlocks,
  type NormalizedActivityBlock,
} from '../rich-content/normalizeTranscriptBlocks.js';

// Re-host the frozen rich-content fixtures through the existing normalizer so every
// story `blocks` arg is a real array of NormalizedActivityBlock sourced from the demo
// data — nothing is invented. The `transcript` surface declares the
// `evidence-disclosure` state; NormalizedActivityGroup renders the grouped bare
// evidence disclosure, so one story over the activity blocks the fixtures yield.
const NORMALIZED = normalizeTranscriptBlocks({
  sessionId: 'demo-session-triage',
  blocks: [
    ...DEMO_RICH_CONTENT_BLOCKS,
    ...DEMO_RICH_RELEASE_BLOCKS,
  ] as unknown as readonly TranscriptBlock[],
});

const ACTIVITY_BLOCKS: readonly NormalizedActivityBlock[] = NORMALIZED.filter(
  (block): block is NormalizedActivityBlock => block.kind === 'activity',
);

if (ACTIVITY_BLOCKS.length === 0) {
  throw new Error('No activity blocks found in the rich-content fixtures.');
}

const meta = {
  title: 'Transcript/NormalizedActivityGroup',
  component: NormalizedActivityGroup,
  tags: ['autodocs'],
} satisfies Meta<typeof NormalizedActivityGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ToolCallActivity: Story = { args: { blocks: ACTIVITY_BLOCKS } };
