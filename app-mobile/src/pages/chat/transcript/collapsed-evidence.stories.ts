import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { TranscriptBlock } from '@pi-remote/pi-rpc-protocol';
import { createRawSnippet } from 'svelte';

import CollapsedEvidence from './collapsed-evidence.svelte';
import { DEMO_RICH_CONTENT_BLOCKS, DEMO_RICH_RELEASE_BLOCKS } from '$shared/fixtures/demo.js';
import {
  normalizeTranscriptBlocks,
  type NormalizedCommandBlock,
} from '../rich-content/normalize-transcript-blocks.js';

// Reuse frozen command fixtures through the real normalizer so the disclosure summary and body reflect a completed command.
// CreateRawSnippet avoids a wrapper component.
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

const COMPLETED = commandByLifecycle('completed');

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Mirror Block's tool output markup so the disclosure story tests the same body shape.
function evidenceSnippet(content: string) {
  return createRawSnippet(() => ({
    render: () => `<pre>${escapeHtml(content)}</pre>`,
  }));
}

const toolName =
  COMPLETED.sourceBlock.kind === 'tool_call' || COMPLETED.sourceBlock.kind === 'tool_result'
    ? COMPLETED.sourceBlock.toolName
    : 'bash';

const meta = {
  title: 'Transcript/CollapsedEvidence',
  component: CollapsedEvidence,
  tags: ['autodocs'],
} satisfies Meta<typeof CollapsedEvidence>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ToolCall: Story = {
  args: { summary: `Tool call · ${toolName}`, children: evidenceSnippet(COMPLETED.command ?? '') },
};
export const ToolResult: Story = {
  args: { summary: `Tool result · ${toolName}`, children: evidenceSnippet(COMPLETED.output ?? '') },
};
