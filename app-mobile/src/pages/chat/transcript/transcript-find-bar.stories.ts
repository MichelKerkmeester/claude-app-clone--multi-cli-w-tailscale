import type { Meta, StoryObj } from '@storybook/sveltekit';

import TranscriptFindBar from './transcript-find-bar.svelte';
import { createFindCursor, type SearchSnippet } from './transcript-find-index.js';

const SNIPPET: SearchSnippet = {
  role: 'assistant',
  text: 'Tightened the expiry comparison to fail closed on the boundary and added a regression test asserting an expired ticket is rejected.',
  haystack:
    'tightened the expiry comparison to fail closed on the boundary and added a regression test asserting an expired ticket is rejected.',
  rowIndex: 5,
  sourceBlockId: 'blk-006',
};

const MATCH = { snippetIndex: 0, start: 34, end: 45 };

const noop = (): void => {};

const meta = {
  title: 'Transcript/TranscriptFindBar',
  component: TranscriptFindBar,
  tags: ['autodocs'],
} satisfies Meta<typeof TranscriptFindBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstMatch: Story = {
  args: {
    query: 'fail closed',
    cursor: { ...createFindCursor([MATCH]), matchIndex: 1 },
    snippet: SNIPPET,
    onQueryChange: noop,
    onNext: noop,
    onPrev: noop,
    onClose: noop,
  },
};

export const NoMatches: Story = {
  args: {
    query: 'unmatched-token',
    cursor: createFindCursor([]),
    snippet: null,
    onQueryChange: noop,
    onNext: noop,
    onPrev: noop,
    onClose: noop,
  },
};
