import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { TranscriptBlock } from '@pi-remote/pi-rpc-protocol';

import TextArtifactCard from './text-artifact-card.svelte';
import { DEMO_RICH_CONTENT_BLOCKS, DEMO_RICH_RELEASE_BLOCKS } from '$shared/fixtures/demo.js';
import {
  normalizeTranscriptBlocks,
  type NormalizedTextArtifactBlock,
} from './normalize-transcript-blocks.js';

// Re-host the frozen rich-content fixtures through the existing normalizer so
// every story args object is a real NormalizedTextArtifactBlock sourced from
// the demo data — nothing is invented. The `rich-content-cards` surface
// declares the `text-artifact` state; the fixtures yield two labels
// (`document` and `long-text`), one story each.
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
