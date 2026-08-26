import type { Meta, StoryObj } from '@storybook/sveltekit';

import TranscriptLoadPanel from './transcript-load-panel.svelte';
import { deriveTranscriptLoadState } from './transcript-load-state.js';
import { EMPTY_TRANSCRIPT, type DisplayTranscriptBlock } from '$shared/state/state.js';

const UNKNOWN_BLOCK: DisplayTranscriptBlock = {
  id: 'blk-unknown-001',
  revision: 1,
  seq: 1,
  occurredAt: '2026-08-17T10:00:00.000Z',
  kind: 'unknown',
  originalKind: 'future-block',
};

const noop = (): void => {};

const meta = {
  title: 'Transcript/TranscriptLoadPanel',
  component: TranscriptLoadPanel,
  tags: ['autodocs'],
} satisfies Meta<typeof TranscriptLoadPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: {
    view: deriveTranscriptLoadState({
      transcript: { ...EMPTY_TRANSCRIPT, awaitingSnapshot: true },
      connection: 'connecting',
      heldBlocks: null,
    }),
  },
};

export const Missing: Story = {
  args: {
    view: deriveTranscriptLoadState({
      transcript: { ...EMPTY_TRANSCRIPT, gapReason: 'unknown-session' },
      connection: 'live',
      heldBlocks: null,
    }),
  },
};

export const Unsupported: Story = {
  args: {
    view: deriveTranscriptLoadState({
      transcript: { ...EMPTY_TRANSCRIPT, source: 'relay', blocks: [UNKNOWN_BLOCK] },
      connection: 'live',
      heldBlocks: null,
    }),
  },
};

export const ErrorRetryable: Story = {
  args: {
    view: deriveTranscriptLoadState({
      transcript: { ...EMPTY_TRANSCRIPT, error: 'The transcript could not be read.' },
      connection: 'error',
      heldBlocks: null,
    }),
    onRetry: noop,
  },
};
