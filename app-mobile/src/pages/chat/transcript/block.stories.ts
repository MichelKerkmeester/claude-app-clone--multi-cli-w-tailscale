import type { Meta, StoryObj } from '@storybook/sveltekit';

import Block from './block.svelte';
import {
  parseDisplayBlock,
  type DisplayTranscriptBlock,
  type TranscriptProvenance,
} from '$shared/state/state.js';
import {
  DEMO_RICH_CONTENT_BLOCKS,
  DEMO_RICH_RELEASE_BLOCKS,
  DEMO_ARTIFACT_BLOCKS,
} from '$shared/fixtures/demo.js';

const RAW_BLOCKS: readonly Record<string, unknown>[] = [
  ...DEMO_RICH_CONTENT_BLOCKS,
  ...DEMO_RICH_RELEASE_BLOCKS,
  ...DEMO_ARTIFACT_BLOCKS,
];

const PARSED: readonly DisplayTranscriptBlock[] = RAW_BLOCKS.map((raw) =>
  parseDisplayBlock(raw, readFixtureProvenance(raw)),
).filter((block): block is DisplayTranscriptBlock => block !== null);

function readFixtureProvenance(block: Record<string, unknown>): TranscriptProvenance {
  const value = block.provenance;
  return value === 'relay' || value === 'cache' || value === 'optimistic' ? value : 'relay';
}

function displayBlockBy(
  predicate: (block: DisplayTranscriptBlock) => boolean,
): DisplayTranscriptBlock {
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
  parameters: {
    docs: {
      description: {
        component:
          'Each block kind is routed from host-normalized transcript data: routine evidence collapses, tool errors stay open, and unknown or redacted kinds render a non-interactive fallback. If media, artifact-viewer, or answer capabilities are unavailable, the surrounding transcript remains readable while the affected preview or action fails closed.',
      },
    },
  },
} satisfies Meta<typeof Block>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TextUser: Story = {
  args: {
    block: displayBlockBy((b) => b.kind === 'text' && b.role === 'user'),
    sessionId: SESSION_ID,
  },
};
export const TextAssistant: Story = {
  args: {
    block: displayBlockBy((b) => b.kind === 'text' && b.role === 'assistant'),
    sessionId: SESSION_ID,
  },
};
export const TextArtifact: Story = {
  args: { block: displayBlockBy((b) => b.kind === 'text_artifact'), sessionId: SESSION_ID },
};
export const ToolCall: Story = {
  args: { block: displayBlockBy((b) => b.kind === 'tool_call'), sessionId: SESSION_ID },
};
export const ToolResult: Story = {
  args: {
    block: displayBlockBy((b) => b.kind === 'tool_result' && !b.isError),
    sessionId: SESSION_ID,
  },
};
export const ToolError: Story = {
  args: {
    block: displayBlockBy((b) => b.kind === 'tool_result' && b.isError),
    sessionId: SESSION_ID,
  },
};
export const Unknown: Story = {
  args: { block: displayBlockBy((b) => b.kind === 'unknown'), sessionId: SESSION_ID },
};
export const FilePreviewReady: Story = {
  args: {
    block: displayBlockBy((b) => b.kind === 'file_preview' && b.availability === 'ready'),
    sessionId: SESSION_ID,
  },
};
export const FilePreviewWithheld: Story = {
  args: {
    block: displayBlockBy((b) => b.kind === 'file_preview' && b.availability === 'withheld'),
    sessionId: SESSION_ID,
  },
};
export const FilePreviewMissing: Story = {
  args: {
    block: displayBlockBy((b) => b.kind === 'file_preview' && b.availability === 'missing'),
    sessionId: SESSION_ID,
  },
};
export const FilePreviewDenied: Story = {
  args: {
    block: displayBlockBy((b) => b.kind === 'file_preview' && b.availability === 'denied'),
    sessionId: SESSION_ID,
  },
};
export const FilePreviewUnsupported: Story = {
  args: {
    block: displayBlockBy((b) => b.kind === 'file_preview' && b.availability === 'unsupported'),
    sessionId: SESSION_ID,
  },
};
