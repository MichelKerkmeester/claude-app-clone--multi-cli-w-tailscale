import type { Meta, StoryObj } from '@storybook/sveltekit';

import NormalizedTranscriptBlockView from './NormalizedTranscriptBlockView.svelte';
import { DEMO_RICH_CONTENT_BLOCKS, DEMO_RICH_RELEASE_BLOCKS } from '$shared/fixtures/demo.js';
import {
  normalizeTranscriptBlocks,
  type NormalizedTranscriptBlock,
} from '../rich-content/normalizeTranscriptBlocks.js';
import {
  parseDisplayBlock,
  type DisplayTranscriptBlock,
  type TranscriptProvenance,
} from '$shared/state/state.js';

// Re-host the frozen rich-content fixtures through the existing normalizer so every
// story `block` arg is a real NormalizedTranscriptBlock sourced from the demo data —
// nothing is invented. The `transcript` surface declares the `block-delivery` state;
// NormalizedTranscriptBlockView dispatches each normalized kind to Block (fallback /
// diff) or RichContentRouter, so one story per normalized kind present in the fixtures.
//
// The transcript reducer (src/state.ts) runs every relay block through parseDisplayBlock
// before it reaches the normalizer, converting any unrecognized protocol kind into
// `{ kind: 'unknown', originalKind }`. Block.svelte handles 'unknown' but not raw
// protocol kinds like 'unknown_payload', so the fallback story's sourceBlock must be
// that converted display block. Reuse the same exported converter here, preserving each
// fixture's existing provenance so only the unknown-kind conversion differs from a raw
// passthrough.
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
