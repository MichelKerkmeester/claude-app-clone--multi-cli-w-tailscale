import type { Meta, StoryObj } from '@storybook/sveltekit';

import TranscriptList from './transcript-list.svelte';
import { parseDisplayBlock, type DisplayTranscriptBlock, type TranscriptProvenance } from '$shared/state/state.js';
import { DEMO_RICH_CONTENT_BLOCKS, DEMO_RICH_RELEASE_BLOCKS } from '$shared/fixtures/demo.js';

// Reuse frozen rich-content fixtures through the real parser so virtualized stories exercise genuine blocks.
// Live-edge behavior stays explicit, as does the empty state.
const BLOCKS: readonly DisplayTranscriptBlock[] = [
  ...DEMO_RICH_CONTENT_BLOCKS,
  ...DEMO_RICH_RELEASE_BLOCKS,
]
  .map((raw) => parseDisplayBlock(raw, readFixtureProvenance(raw)))
  .filter((block): block is DisplayTranscriptBlock => block !== null);

function readFixtureProvenance(block: Record<string, unknown>): TranscriptProvenance {
  const value = block.provenance;
  return value === 'relay' || value === 'cache' || value === 'optimistic' ? value : 'relay';
}

const SESSION_ID = 'demo-session-triage';

const meta = {
  title: 'Transcript/TranscriptList',
  component: TranscriptList,
  tags: ['autodocs'],
} satisfies Meta<typeof TranscriptList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const VirtualizedList: Story = {
  args: { sessionId: SESSION_ID, blocks: BLOCKS, running: false },
};
export const LiveEdge: Story = {
  args: { sessionId: SESSION_ID, blocks: BLOCKS, running: true },
};
export const Empty: Story = {
  args: { sessionId: SESSION_ID, blocks: [], running: false },
};
