// ───────────────────────────────────────────────────────────────────
// MODULE: RICH BLOCK FRAME STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { TranscriptBlock } from '@pi-remote/pi-rpc-protocol';
import { createRawSnippet } from 'svelte';

import RichBlockFrame from './rich-block-frame.svelte';
import { DEMO_RICH_CONTENT_BLOCKS, DEMO_RICH_RELEASE_BLOCKS } from '$shared/fixtures/demo.js';
import {
  normalizeTranscriptBlocks,
  type NormalizedCommandBlock,
  type NormalizedProseBlock,
} from './normalize-transcript-blocks.js';

// Normalized fixtures + raw snippets keep stories on frame chrome only.
const NORMALIZED = normalizeTranscriptBlocks({
  sessionId: 'demo-session-triage',
  blocks: [
    ...DEMO_RICH_CONTENT_BLOCKS,
    ...DEMO_RICH_RELEASE_BLOCKS,
  ] as unknown as readonly TranscriptBlock[],
});

function firstCommandByLifecycle(
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

function firstProse(): NormalizedProseBlock {
  const block = NORMALIZED.find((value): value is NormalizedProseBlock => value.kind === 'prose');
  if (block === undefined) {
    throw new Error('No prose block found in the rich-content fixtures.');
  }
  return block;
}

function escapeHtml(value: string): string {
  return value.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;');
}

function preSnippet(text: string) {
  return createRawSnippet(() => ({
    render: () => `<pre class="rich--shell-well"><code>${escapeHtml(text)}</code></pre>`,
  }));
}

function paragraphSnippet(text: string) {
  return createRawSnippet(() => ({
    render: () => `<p class="block--copy quiet-copy">${escapeHtml(text)}</p>`,
  }));
}

const runningCommand = firstCommandByLifecycle('running');
const proseBlock = firstProse();

const meta: Meta<typeof RichBlockFrame> = {
  title: 'Rich Content/RichBlockFrame',
  component: RichBlockFrame,
  tags: ['autodocs'],
} satisfies Meta<typeof RichBlockFrame>;

export default meta;
type Story = StoryObj<typeof RichBlockFrame>;

export const WithRedaction: Story = {
  args: {
    title: 'Bash command',
    eyebrow: 'Command / Output',
    metadata: ['Bash', `Call ${runningCommand.callId}`, '8 output lines'],
    status: 'Running',
    redaction: runningCommand.redaction,
    children: preSnippet(runningCommand.canonicalOutput ?? 'No output yet'),
  },
};

export const Plain: Story = {
  args: {
    title: 'Activity',
    eyebrow: 'Activity',
    metadata: ['text'],
    children: paragraphSnippet(proseBlock.canonicalSource),
  },
};
