import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { TranscriptBlock } from '@pi-remote/pi-rpc-protocol';

import RichContentRouter from './RichContentRouter.svelte';
import ArtifactViewerProvider from '../artifacts/ArtifactViewerProvider.svelte';
import { DEMO_RICH_CONTENT_BLOCKS, DEMO_RICH_RELEASE_BLOCKS } from '../../demo.js';
import {
  normalizeTranscriptBlocks,
  type NormalizedCommandBlock,
  type NormalizedTranscriptBlock,
} from '../../rich-content/normalizeTranscriptBlocks.js';

// Re-host the frozen rich-content fixtures through the existing normalizer so
// every story args object is a real NormalizedTranscriptBlock sourced from the
// demo data — nothing is invented. The `rich-content-cards` surface declares
// ten states; RichContentRouter dispatches all of them, so one story per state.
const NORMALIZED = normalizeTranscriptBlocks({
  sessionId: 'demo-session-triage',
  blocks: [
    ...DEMO_RICH_CONTENT_BLOCKS,
    ...DEMO_RICH_RELEASE_BLOCKS,
  ] as unknown as readonly TranscriptBlock[],
});

function commandByLifecycle(
  lifecycle: NormalizedCommandBlock['lifecycle'],
): NormalizedTranscriptBlock {
  const block = NORMALIZED.find(
    (value): value is NormalizedCommandBlock =>
      value.kind === 'command' && value.lifecycle === lifecycle,
  );
  if (block === undefined) {
    throw new Error(`No command block found for lifecycle "${lifecycle}".`);
  }
  return block;
}

function blockByKind(kind: NormalizedTranscriptBlock['kind']): NormalizedTranscriptBlock {
  const block = NORMALIZED.find((value) => value.kind === kind);
  if (block === undefined) {
    throw new Error(`No normalized block found for kind "${kind}".`);
  }
  return block;
}

const meta = {
  title: 'Rich Content/RichContentRouter',
  component: RichContentRouter,
  tags: ['autodocs'],
  // RichContentRouter reads the ArtifactViewer context via getOptionalArtifactViewer;
  // the self-providing ArtifactViewerProvider supplies it as a Storybook decorator.
  decorators: [() => ({ Component: ArtifactViewerProvider })],
} satisfies Meta<typeof RichContentRouter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Running: Story = { args: { block: commandByLifecycle('running') } };
export const Completed: Story = { args: { block: commandByLifecycle('completed') } };
export const Failed: Story = { args: { block: commandByLifecycle('failed') } };
export const Denied: Story = { args: { block: commandByLifecycle('denied') } };
export const Cancelled: Story = { args: { block: commandByLifecycle('cancelled') } };
export const Interrupted: Story = { args: { block: commandByLifecycle('interrupted') } };
export const Prose: Story = { args: { block: blockByKind('prose') } };
export const Code: Story = { args: { block: blockByKind('code') } };
export const TextArtifact: Story = { args: { block: blockByKind('text-artifact') } };
export const Fallback: Story = { args: { block: blockByKind('fallback') } };
