// ───────────────────────────────────────────────────────────────────
// MODULE: IMAGE PREVIEW STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import ImagePreview from './image-preview.svelte';
import { DEMO_IMAGE_PDF_BLOCKS, demoArtifactBytes } from '$shared/fixtures/demo.js';

// Reuse the frozen image fixtures so ready and corrupt stories exercise the guarded byte path.
// Decode failure remains tied to a real fixture rather than an invented payload.
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
