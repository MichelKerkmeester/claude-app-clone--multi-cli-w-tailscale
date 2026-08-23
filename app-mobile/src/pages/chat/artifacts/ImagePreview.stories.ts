import type { Meta, StoryObj } from '@storybook/sveltekit';

import ImagePreview from './ImagePreview.svelte';
import { DEMO_IMAGE_PDF_BLOCKS, demoArtifactBytes } from '$shared/data/demo.js';

// Re-host the frozen DEMO_IMAGE_PDF_BLOCKS entries so every story arg is
// sourced from the demo data — nothing is invented. The ready story streams the
// fixture's real PNG bytes via demoArtifactBytes; the corrupt story pairs the
// fixture's own truncated 7-byte payload block with its matching bytes so the
// decode fails into the guarded 'corrupt' state. ImagePreview is prop-only (no
// context read), so no decorator; onStateChange is a no-op callback.
const READY_BLOCK = DEMO_IMAGE_PDF_BLOCKS.find((block) => block.id === 'blk-image-ready');
if (READY_BLOCK === undefined) {
  throw new Error('No ready image fixture found in DEMO_IMAGE_PDF_BLOCKS.');
}
const CORRUPT_BLOCK = DEMO_IMAGE_PDF_BLOCKS.find((block) => block.id === 'blk-image-corrupt');
if (CORRUPT_BLOCK === undefined) {
  throw new Error('No corrupt image fixture found in DEMO_IMAGE_PDF_BLOCKS.');
}

const meta = {
  title: 'Artifacts/ImagePreview',
  component: ImagePreview,
  tags: ['autodocs'],
} satisfies Meta<typeof ImagePreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {
  args: {
    block: READY_BLOCK,
    bytes: demoArtifactBytes(READY_BLOCK),
    onStateChange: () => {},
  },
};
export const Corrupt: Story = {
  args: {
    block: CORRUPT_BLOCK,
    bytes: demoArtifactBytes(CORRUPT_BLOCK),
    onStateChange: () => {},
  },
};
