// ───────────────────────────────────────────────────────────────────
// MODULE: ARTIFACT DETAILS STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import ArtifactDetails, { type ArtifactDetailsModel } from './artifact-details.svelte';
import { DEMO_IMAGE_PDF_BLOCKS } from '$shared/fixtures/demo.js';

// Frozen image fixture — real dimensions, bytes, revision, and redaction metadata.
const IMAGE_BLOCK = DEMO_IMAGE_PDF_BLOCKS.find((block) => block.renderer === 'image');
if (IMAGE_BLOCK === undefined) {
  throw new Error('No image fixture found in DEMO_IMAGE_PDF_BLOCKS.');
}
if (IMAGE_BLOCK.byteLength === null) {
  throw new Error('The image fixture has no byte length.');
}

const MODEL: ArtifactDetailsModel = Object.freeze({
  displayName: IMAGE_BLOCK.displayName,
  mediaType: IMAGE_BLOCK.mimeType,
  width: 1,
  height: 1,
  thumbnailBytes: IMAGE_BLOCK.byteLength,
  fullBytes: IMAGE_BLOCK.byteLength,
  revision: IMAGE_BLOCK.revision,
  processing: 'complete',
  redaction: IMAGE_BLOCK.redaction === 'withheld' ? 'not-needed' : 'applied',
});

const meta: Meta<typeof ArtifactDetails> = {
  title: 'Artifacts/ArtifactDetails',
  component: ArtifactDetails,
  tags: ['autodocs'],
} satisfies Meta<typeof ArtifactDetails>;

export default meta;
type Story = StoryObj<typeof ArtifactDetails>;

export const Open: Story = { args: { model: MODEL, open: true } };
export const Closed: Story = { args: { model: MODEL, open: false } };
