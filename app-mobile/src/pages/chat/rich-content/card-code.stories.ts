// ───────────────────────────────────────────────────────────────────
// MODULE: CODE CARD STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { TranscriptBlock } from '@pi-remote/pi-rpc-protocol';

import CodeCard from './card-code.svelte';
import { DEMO_RICH_CONTENT_BLOCKS, DEMO_RICH_RELEASE_BLOCKS } from '$shared/fixtures/demo.js';
import {
  normalizeTranscriptBlocks,
  type NormalizedCodeBlock,
} from './normalize-transcript-blocks.js';

// Normalized demo fixtures.
const NORMALIZED = normalizeTranscriptBlocks({
  sessionId: 'demo-session-triage',
  blocks: [
    ...DEMO_RICH_CONTENT_BLOCKS,
    ...DEMO_RICH_RELEASE_BLOCKS,
  ] as unknown as readonly TranscriptBlock[],
});

function firstCodeBlock(): NormalizedCodeBlock {
  const block = NORMALIZED.find((value): value is NormalizedCodeBlock => value.kind === 'code');
  if (block === undefined) {
    throw new Error('No code block found in the rich-content fixtures.');
  }
  return block;
}

const codeBlock = firstCodeBlock();

const meta: Meta<typeof CodeCard> = {
  title: 'Rich Content/CodeCard',
  component: CodeCard,
  tags: ['autodocs'],
} satisfies Meta<typeof CodeCard>;

export default meta;
type Story = StoryObj<typeof CodeCard>;

export const Code: Story = { args: { block: codeBlock } };
