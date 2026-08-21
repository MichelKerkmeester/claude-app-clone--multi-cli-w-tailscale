import type { Meta, StoryObj } from '@storybook/sveltekit';

import CodeCard from './CodeCard.svelte';
import { DEMO_RICH_CONTENT_BLOCKS, DEMO_RICH_RELEASE_BLOCKS } from '../../demo.js';
import {
  normalizeTranscriptBlocks,
  type NormalizedCodeBlock,
} from '../../rich-content/normalizeTranscriptBlocks.js';

// Re-host the frozen rich-content fixtures through the existing normalizer so
// the story args object is a real NormalizedCodeBlock sourced from the demo
// data — nothing is invented. The `rich-content-cards` surface declares the
// `code` state; one story for the fenced bash block emitted by the fixtures.
const NORMALIZED = normalizeTranscriptBlocks({
  sessionId: 'demo-session-triage',
  blocks: [...DEMO_RICH_CONTENT_BLOCKS, ...DEMO_RICH_RELEASE_BLOCKS],
});

function firstCodeBlock(): NormalizedCodeBlock {
  const block = NORMALIZED.find(
    (value): value is NormalizedCodeBlock => value.kind === 'code',
  );
  if (block === undefined) {
    throw new Error('No code block found in the rich-content fixtures.');
  }
  return block;
}

const codeBlock = firstCodeBlock();

const meta = {
  title: 'Rich Content/CodeCard',
  component: CodeCard,
  tags: ['autodocs'],
} satisfies Meta<typeof CodeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Code: Story = { args: { block: codeBlock } };
