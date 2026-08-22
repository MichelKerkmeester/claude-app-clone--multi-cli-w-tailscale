import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { TranscriptBlock } from '@pi-remote/pi-rpc-protocol';

import CommandOutputCard from './CommandOutputCard.svelte';
import { DEMO_RICH_CONTENT_BLOCKS, DEMO_RICH_RELEASE_BLOCKS } from '$shared/data/demo.js';
import {
  normalizeTranscriptBlocks,
  type NormalizedCommandBlock,
} from './normalizeTranscriptBlocks.js';

// Re-host the frozen rich-content fixtures through the existing normalizer so
// every story args object is a real NormalizedCommandBlock sourced from the
// demo data — nothing is invented. The `rich-content-cards` surface declares
// the six command lifecycle states; one story per state.
const NORMALIZED = normalizeTranscriptBlocks({
  sessionId: 'demo-session-triage',
  blocks: [
    ...DEMO_RICH_CONTENT_BLOCKS,
    ...DEMO_RICH_RELEASE_BLOCKS,
  ] as unknown as readonly TranscriptBlock[],
});

function commandByLifecycle(
  lifecycle: NormalizedCommandBlock['lifecycle'],
): NormalizedCommandBlock {
  const block = NORMALIZED.find(
    (value): value is NormalizedCommandBlock =>
      value.kind === 'command' && value.lifecycle === lifecycle,
  );
  if (block === undefined) {
    throw new Error(`No command block found for lifecycle "${lifecycle}".`);
  }
  return block;
}

const meta: Meta<typeof CommandOutputCard> = {
  title: 'Rich Content/CommandOutputCard',
  component: CommandOutputCard,
  tags: ['autodocs'],
} satisfies Meta<typeof CommandOutputCard>;

export default meta;
type Story = StoryObj<typeof CommandOutputCard>;

export const Running: Story = { args: { block: commandByLifecycle('running') } };
export const Completed: Story = { args: { block: commandByLifecycle('completed') } };
export const Failed: Story = { args: { block: commandByLifecycle('failed') } };
export const Denied: Story = { args: { block: commandByLifecycle('denied') } };
export const Cancelled: Story = { args: { block: commandByLifecycle('cancelled') } };
export const Interrupted: Story = { args: { block: commandByLifecycle('interrupted') } };
