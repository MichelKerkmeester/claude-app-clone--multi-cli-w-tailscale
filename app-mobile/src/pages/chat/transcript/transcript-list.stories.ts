import type { Meta, StoryObj } from '@storybook/sveltekit';

import TranscriptList, { type TranscriptListProps } from './transcript-list.svelte';
import {
  parseDisplayBlock,
  type DisplayTranscriptBlock,
  type TranscriptProvenance,
} from '$shared/state/state.js';
import { DEMO_RICH_CONTENT_BLOCKS, DEMO_RICH_RELEASE_BLOCKS } from '$shared/fixtures/demo.js';

const BLOCKS: readonly DisplayTranscriptBlock[] = [
  ...DEMO_RICH_CONTENT_BLOCKS,
  ...DEMO_RICH_RELEASE_BLOCKS,
]
  .map((raw) => parseDisplayBlock(raw, readFixtureProvenance(raw)))
  .filter((block): block is DisplayTranscriptBlock => block !== null);

function readFixtureProvenance(block: Record<string, unknown>): TranscriptProvenance {
  const value = block.provenance;
  return value === 'relay' || value === 'cache' || value === 'optimistic' ? value : 'relay';
}

const SESSION_ID = 'demo-session-triage';
const STORY_CONTROLS_CATEGORY = 'Story controls';
const DEFAULT_BLOCK_COUNT = BLOCKS.length;

type StreamingState = 'fixture' | 'waiting' | 'token';
type TranscriptStoryArgs = TranscriptListProps & {
  readonly blockCount?: number;
  readonly streamingState?: StreamingState;
};

function isAssistantTextBlock(block: DisplayTranscriptBlock | undefined): boolean {
  return block?.kind === 'text' && block.role === 'assistant';
}

function blocksForStreamingState(
  blocks: readonly DisplayTranscriptBlock[],
  state: StreamingState,
): readonly DisplayTranscriptBlock[] {
  if (state === 'fixture') return blocks;

  if (state === 'waiting') {
    let end = blocks.length;
    while (end > 0 && isAssistantTextBlock(blocks[end - 1])) end -= 1;
    return blocks.slice(0, end);
  }

  const selectedIds = new Set(blocks.map((block) => block.id));
  const tokenSource = BLOCKS.find(isAssistantTextBlock);
  if (tokenSource === undefined || tokenSource.kind !== 'text') return blocks;

  let tokenId = `${tokenSource.id}-streaming`;
  let suffix = 1;
  while (selectedIds.has(tokenId)) {
    tokenId = `${tokenSource.id}-streaming-${suffix}`;
    suffix += 1;
  }

  const prefixLength = Math.max(1, Math.floor(tokenSource.text.length / 2));
  return [
    ...blocks,
    { ...tokenSource, id: tokenId, text: tokenSource.text.slice(0, prefixLength) },
  ];
}

// The synthetic controls are story-only and must not reach the component. Naming
// them in a discard destructure leaves bindings the linter counts as unused, so
// they are removed from a copy instead.
function withoutStoryControls<T extends object, K extends keyof T>(
  source: T,
  keys: readonly K[],
): Omit<T, K> {
  const copy = { ...source };
  for (const key of keys) delete copy[key];
  return copy;
}

function renderTranscript(args: TranscriptStoryArgs) {
  const blockCount = Math.max(
    0,
    Math.min(DEFAULT_BLOCK_COUNT, Math.floor(args.blockCount ?? DEFAULT_BLOCK_COUNT)),
  );
  const slicedBlocks = BLOCKS.slice(0, blockCount);
  const streamingState = args.streamingState ?? 'fixture';
  const blocks = blocksForStreamingState(slicedBlocks, streamingState);
  const props = withoutStoryControls(args, ['blockCount', 'streamingState', 'blocks']);

  return {
    Component: TranscriptList,
    props: {
      ...props,
      blocks,
      running: streamingState === 'fixture' ? args.running : true,
    },
  };
}

const meta = {
  title: 'Transcript/TranscriptList',
  component: TranscriptList,
  tags: ['autodocs'],
  argTypes: {
    blockCount: {
      control: { type: 'number', min: 0, max: DEFAULT_BLOCK_COUNT, step: 1 },
      description: 'Number of demo transcript blocks to show before the streaming edge.',
      table: {
        category: STORY_CONTROLS_CATEGORY,
        defaultValue: { summary: String(DEFAULT_BLOCK_COUNT) },
      },
    },
    streamingState: {
      control: { type: 'select' },
      options: ['fixture', 'waiting', 'token'],
      description:
        'Choose the fixture edge, a running turn waiting for its first assistant token, or a running turn with one.',
      table: { category: STORY_CONTROLS_CATEGORY },
    },
  },
  render: renderTranscript,
} satisfies Meta<TranscriptStoryArgs>;

export default meta;
type Story = StoryObj<TranscriptStoryArgs>;

export const VirtualizedList: Story = {
  args: {
    sessionId: SESSION_ID,
    blocks: BLOCKS,
    running: false,
    blockCount: DEFAULT_BLOCK_COUNT,
    streamingState: 'fixture',
  },
};
export const LiveEdge: Story = {
  args: {
    sessionId: SESSION_ID,
    blocks: BLOCKS,
    running: true,
    blockCount: DEFAULT_BLOCK_COUNT,
    streamingState: 'fixture',
  },
};
export const Empty: Story = {
  args: {
    sessionId: SESSION_ID,
    blocks: [],
    running: false,
    blockCount: 0,
    streamingState: 'fixture',
  },
};
