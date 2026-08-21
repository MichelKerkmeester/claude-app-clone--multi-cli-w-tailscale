import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { RedactionMetadata } from '@pi-remote/pi-rpc-protocol';

import RedactionBadge from './RedactionBadge.svelte';
import { DEMO_RICH_CONTENT_BLOCKS, DEMO_RICH_RELEASE_BLOCKS } from '../../demo.js';
import {
  normalizeTranscriptBlocks,
  type NormalizedCommandBlock,
} from '../../rich-content/normalizeTranscriptBlocks.js';

// Re-host the frozen rich-content fixtures through the existing normalizer and
// read the redaction metadata that the fixtures already carry — nothing is
// invented. RedactionBadge is the shared redaction indicator rendered inside
// RichBlockFrame; the fixtures yield a `command`-reason redaction and a
// `cache`+`command`-reason redaction, plus the null case.
const NORMALIZED = normalizeTranscriptBlocks({
  sessionId: 'demo-session-triage',
  blocks: [...DEMO_RICH_CONTENT_BLOCKS, ...DEMO_RICH_RELEASE_BLOCKS],
});

function commandBySource(source: 'relay' | 'cache'): NormalizedCommandBlock {
  const block = NORMALIZED.find(
    (value): value is NormalizedCommandBlock =>
      value.kind === 'command' && value.source === source && value.redaction !== null,
  );
  if (block === undefined || block.redaction === null) {
    throw new Error(`No command block with redaction found for source "${source}".`);
  }
  return block;
}

const commandRedaction: RedactionMetadata = commandBySource('relay').redaction;
const cacheRedaction: RedactionMetadata = commandBySource('cache').redaction;

const meta = {
  title: 'Rich Content/RedactionBadge',
  component: RedactionBadge,
  tags: ['autodocs'],
} satisfies Meta<typeof RedactionBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Command: Story = { args: { redaction: commandRedaction } };
export const Cache: Story = { args: { redaction: cacheRedaction } };
export const None: Story = { args: { redaction: null } };
