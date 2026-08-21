import type { Meta, StoryObj } from '@storybook/sveltekit';

import SafeMarkdown from './SafeMarkdown.svelte';
import { DEMO_RICH_CONTENT_BLOCKS, DEMO_RICH_RELEASE_BLOCKS } from '../../demo.js';
import {
  normalizeTranscriptBlocks,
  type NormalizedProseBlock,
} from '../../rich-content/normalizeTranscriptBlocks.js';

// Re-host the frozen rich-content fixtures through the existing normalizer so
// every story `source` arg is the canonicalSource of a real NormalizedProseBlock
// sourced from the demo data — nothing is invented. The `rich-content-cards`
// surface declares the `prose` state; the fixtures yield a plain prose block and
// a bidirectional (RTL) prose block, one story each.
const NORMALIZED = normalizeTranscriptBlocks({
  sessionId: 'demo-session-triage',
  blocks: [...DEMO_RICH_CONTENT_BLOCKS, ...DEMO_RICH_RELEASE_BLOCKS],
});

function proseByPredicate(
  predicate: (block: NormalizedProseBlock) => boolean,
): NormalizedProseBlock {
  const block = NORMALIZED.find(
    (value): value is NormalizedProseBlock => value.kind === 'prose' && predicate(value),
  );
  if (block === undefined) {
    throw new Error('No matching prose block found in the rich-content fixtures.');
  }
  return block;
}

const plainProse = proseByPredicate((block) => !block.canonicalSource.includes('مرحبًا'));
const rtlProse = proseByPredicate((block) => block.canonicalSource.includes('مرحبًا'));

const meta = {
  title: 'Rich Content/SafeMarkdown',
  component: SafeMarkdown,
  tags: ['autodocs'],
} satisfies Meta<typeof SafeMarkdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Prose: Story = { args: { source: plainProse.canonicalSource } };
export const ProseRtl: Story = { args: { source: rtlProse.canonicalSource } };
