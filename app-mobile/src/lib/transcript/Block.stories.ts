import type { Meta, StoryObj } from '@storybook/sveltekit';

import Block from './Block.svelte';
import { parseDisplayBlock, type DisplayTranscriptBlock } from '../../state.js';
import {
  DEMO_RICH_CONTENT_BLOCKS,
  DEMO_RICH_RELEASE_BLOCKS,
  DEMO_ARTIFACT_BLOCKS,
} from '../../demo.js';

// Re-host the frozen demo fixtures through the existing parseDisplayBlock parser so
// every story `block` arg is a real DisplayTranscriptBlock sourced from the demo
// data — nothing is invented. The `transcript` surface declares the `block-delivery`
// state; Block renders one card per block kind, so one story per kind present in the
// fixtures. (The `plan-todo` pending/done checklist has no `plan`-kind fixture and is
// not storyed — nothing invented.)
const RAW_BLOCKS: readonly unknown[] = [
  ...DEMO_RICH_CONTENT_BLOCKS,
  ...DEMO_RICH_RELEASE_BLOCKS,
  ...DEMO_ARTIFACT_BLOCKS,
];

const PARSED: readonly DisplayTranscriptBlock[] = RAW_BLOCKS
  .map((raw) => parseDisplayBlock(raw))
  .filter((block): block is DisplayTranscriptBlock => block !== null);

function displayBlockBy(predicate: (block: DisplayTranscriptBlock) => boolean): DisplayTranscriptBlock {
  const block = PARSED.find(predicate);
  if (block === undefined) {
    throw new Error('No display block found matching the requested kind in the demo fixtures.');
  }
  return block;
}

const SESSION_ID = 'demo-session-triage';

const meta = {
  title: 'Transcript/Block',
  component: Block,
  tags: ['autodocs'],
} satisfies Meta<typeof Block>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TextUser: Story = {
  args: { block: displayBlockBy((b) => b.kind === 'text' && b.role === 'user'), sessionId: SESSION_ID },
};
export const TextAssistant: Story = {
  args: { block: displayBlockBy((b) => b.kind === 'text' && b.role === 'assistant'), sessionId: SESSION_ID },
};
export const TextArtifact: Story = {
  args: { block: displayBlockBy((b) => b.kind === 'text_artifact'), sessionId: SESSION_ID },
};
export const ToolCall: Story = {
  args: { block: displayBlockBy((b) => b.kind === 'tool_call'), sessionId: SESSION_ID },
};
export const ToolResult: Story = {
  args: { block: displayBlockBy((b) => b.kind === 'tool_result' && !b.isError), sessionId: SESSION_ID },
};
export const ToolError: Story = {
  args: { block: displayBlockBy((b) => b.kind === 'tool_result' && b.isError), sessionId: SESSION_ID },
};
export const Unknown: Story = {
  args: { block: displayBlockBy((b) => b.kind === 'unknown'), sessionId: SESSION_ID },
};
export const FilePreviewReady: Story = {
  args: { block: displayBlockBy((b) => b.kind === 'file_preview' && b.availability === 'ready'), sessionId: SESSION_ID },
};
export const FilePreviewWithheld: Story = {
  args: { block: displayBlockBy((b) => b.kind === 'file_preview' && b.availability === 'withheld'), sessionId: SESSION_ID },
};
export const FilePreviewMissing: Story = {
  args: { block: displayBlockBy((b) => b.kind === 'file_preview' && b.availability === 'missing'), sessionId: SESSION_ID },
};
export const FilePreviewDenied: Story = {
  args: { block: displayBlockBy((b) => b.kind === 'file_preview' && b.availability === 'denied'), sessionId: SESSION_ID },
};
export const FilePreviewUnsupported: Story = {
  args: { block: displayBlockBy((b) => b.kind === 'file_preview' && b.availability === 'unsupported'), sessionId: SESSION_ID },
};
