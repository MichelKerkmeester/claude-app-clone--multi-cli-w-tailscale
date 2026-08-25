import type { Meta, StoryObj } from '@storybook/sveltekit';

import NormalizedTranscriptBlockView from './normalized-transcript-block-view.svelte';
import { DEMO_RICH_CONTENT_BLOCKS, DEMO_RICH_RELEASE_BLOCKS } from '$shared/fixtures/demo.js';
import {
  normalizeTranscriptBlocks,
  type NormalizedTranscriptBlock,
} from '../rich-content/normalize-transcript-blocks.js';
import {
  parseDisplayBlock,
  type DisplayTranscriptBlock,
  type TranscriptProvenance,
} from '$shared/state/state.js';

const DISPLAY_BLOCKS: readonly DisplayTranscriptBlock[] = [
  ...DEMO_RICH_CONTENT_BLOCKS,
  ...DEMO_RICH_RELEASE_BLOCKS,
]
  .map((block) => parseDisplayBlock(block, readFixtureProvenance(block)))
  .filter((block): block is DisplayTranscriptBlock => block !== null);

const NORMALIZED = normalizeTranscriptBlocks({
  sessionId: 'demo-session-triage',
  blocks: DISPLAY_BLOCKS,
});

function readFixtureProvenance(block: Record<string, unknown>): TranscriptProvenance {
  const value = block.provenance;
  return value === 'relay' || value === 'cache' || value === 'optimistic' ? value : 'relay';
}

function blockByKind(kind: NormalizedTranscriptBlock['kind']): NormalizedTranscriptBlock {
  const block = NORMALIZED.find((value) => value.kind === kind);
  if (block === undefined) {
    throw new Error(`No normalized block found for kind "${kind}".`);
  }
  return block;
}

const SESSION_ID = 'demo-session-triage';

const meta = {
  title: 'Transcript/NormalizedTranscriptBlockView',
  component: NormalizedTranscriptBlockView,
  tags: ['autodocs'],
} satisfies Meta<typeof NormalizedTranscriptBlockView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Prose: Story = { args: { block: blockByKind('prose'), sessionId: SESSION_ID, canAnswer: true } };
export const Code: Story = { args: { block: blockByKind('code'), sessionId: SESSION_ID, canAnswer: true } };
export const TextArtifact: Story = { args: { block: blockByKind('text-artifact'), sessionId: SESSION_ID, canAnswer: true } };
export const Command: Story = { args: { block: blockByKind('command'), sessionId: SESSION_ID, canAnswer: true } };
export const Activity: Story = { args: { block: blockByKind('activity'), sessionId: SESSION_ID, canAnswer: true } };
export const Fallback: Story = { args: { block: blockByKind('fallback'), sessionId: SESSION_ID, canAnswer: true } };
