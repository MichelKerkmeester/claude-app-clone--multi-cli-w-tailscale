// ───────────────────────────────────────────────────────────────────
// MODULE: TEXT ARTIFACT CARD STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { TranscriptBlock } from '@pi-remote/pi-rpc-protocol';

import TextArtifactCard from './card-text-artifact.svelte';
import { DEMO_RICH_CONTENT_BLOCKS, DEMO_RICH_RELEASE_BLOCKS } from '$shared/fixtures/demo.js';
import {
  normalizeTranscriptBlocks,
  type NormalizedTextArtifactBlock,
} from './normalize-transcript-blocks.js';

const NORMALIZED = normalizeTranscriptBlocks({
  sessionId: 'demo-session-triage',
  blocks: [
    ...DEMO_RICH_CONTENT_BLOCKS,
    ...DEMO_RICH_RELEASE_BLOCKS,
  ] as unknown as readonly TranscriptBlock[],
});

function textArtifactByLabel(
  label: NormalizedTextArtifactBlock['label'],
): NormalizedTextArtifactBlock {
  const block = NORMALIZED.find(
    (value): value is NormalizedTextArtifactBlock =>
      value.kind === 'text-artifact' && value.label === label,
  );
  if (block === undefined) {
    throw new Error(`No text-artifact block found for label "${label}".`);
  }
  return block;
}

const meta: Meta<typeof TextArtifactCard> = {
  title: 'Rich Content/TextArtifactCard',
  component: TextArtifactCard,
  tags: ['autodocs'],
} satisfies Meta<typeof TextArtifactCard>;

export default meta;
type Story = StoryObj<typeof TextArtifactCard>;

export const Document: Story = { args: { block: textArtifactByLabel('document') } };
export const LongText: Story = { args: { block: textArtifactByLabel('long-text') } };
