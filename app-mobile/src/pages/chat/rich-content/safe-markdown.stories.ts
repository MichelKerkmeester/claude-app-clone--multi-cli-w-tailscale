// ───────────────────────────────────────────────────────────────────
// MODULE: SAFE MARKDOWN STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { TranscriptBlock } from '@pi-remote/pi-rpc-protocol';

import SafeMarkdown from './safe-markdown.svelte';
import { DEMO_RICH_CONTENT_BLOCKS, DEMO_RICH_RELEASE_BLOCKS } from '$shared/fixtures/demo.js';
import {
  normalizeTranscriptBlocks,
  type NormalizedProseBlock,
} from './normalize-transcript-blocks.js';

// Reuse normalized prose fixtures so plain and bidirectional text exercise the real canonical source.
const NORMALIZED = normalizeTranscriptBlocks({
  sessionId: 'demo-session-triage',
  blocks: [
    ...DEMO_RICH_CONTENT_BLOCKS,
    ...DEMO_RICH_RELEASE_BLOCKS,
  ] as unknown as readonly TranscriptBlock[],
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

const meta: Meta<typeof SafeMarkdown> = {
  title: 'Rich Content/SafeMarkdown',
  component: SafeMarkdown,
  tags: ['autodocs'],
} satisfies Meta<typeof SafeMarkdown>;

export default meta;
type Story = StoryObj<typeof SafeMarkdown>;

export const Prose: Story = { args: { source: plainProse.canonicalSource } };
export const ProseRtl: Story = { args: { source: rtlProse.canonicalSource } };
