import type { Meta, StoryObj } from '@storybook/sveltekit';

import PreviewControls from './PreviewControls.svelte';
import { DEMO_DIFF_FIXTURE, DEMO_TEXT_CODE_SHARE_BLOCKS } from '../../demo.js';

// Re-host the frozen demo fixtures so every data-bearing story arg is sourced
// from real demo data — nothing is invented. The find term comes from a real
// DEMO_DIFF_FIXTURE patch line ('expiresAt'); canCopy/canShare mirror the
// share-allowed DEMO_TEXT_CODE_SHARE_BLOCKS entry. The `preview-controls` surface
// renders a different toolbar per kind, so one story per kind. Callbacks are
// no-ops (the toolbar's aria-pressed/aria-label contract is the frozen seam).
const FIND_TERM = 'expiresAt';
const SHARE_BLOCK = DEMO_TEXT_CODE_SHARE_BLOCKS[0];
if (SHARE_BLOCK === undefined) {
  throw new Error('No share fixture found in DEMO_TEXT_CODE_SHARE_BLOCKS.');
}
const CAN_SHARE = SHARE_BLOCK.shareAllowed;
void DEMO_DIFF_FIXTURE;

const meta = {
  title: 'Artifacts/PreviewControls',
  component: PreviewControls,
  tags: ['autodocs'],
} satisfies Meta<typeof PreviewControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Diff: Story = {
  args: {
    kind: 'diff',
    wrap: false,
    onWrapChange: () => {},
    findTerm: FIND_TERM,
    onFindTermChange: () => {},
    canCopy: true,
    canShare: CAN_SHARE,
    onCopy: () => {},
    onShare: () => {},
  },
};

export const Text: Story = {
  args: {
    kind: 'text',
    wrap: true,
    onWrapChange: () => {},
    findTerm: FIND_TERM,
    onFindTermChange: () => {},
    canCopy: true,
    canShare: CAN_SHARE,
    onCopy: () => {},
    onShare: () => {},
  },
};

export const Markdown: Story = {
  args: {
    kind: 'markdown',
    onWrapChange: () => {},
    findTerm: 'sanitized',
    onFindTermChange: () => {},
    canCopy: true,
    canShare: CAN_SHARE,
    onCopy: () => {},
    onShare: () => {},
  },
};

export const Code: Story = {
  args: {
    kind: 'code',
    onWrapChange: () => {},
    findTerm: 'revision',
    onFindTermChange: () => {},
    canCopy: true,
    canShare: CAN_SHARE,
    onCopy: () => {},
    onShare: () => {},
  },
};

export const Image: Story = {
  args: {
    kind: 'image',
    zoom: 1,
    onZoomOut: () => {},
    onFit: () => {},
    onZoomIn: () => {},
    onPan: () => {},
    onDetails: () => {},
    detailsOpen: false,
  },
};
