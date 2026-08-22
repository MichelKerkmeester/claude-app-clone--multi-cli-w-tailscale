import type { Meta, StoryObj } from '@storybook/sveltekit';

import ArtifactDetails, { type ArtifactDetailsModel } from './ArtifactDetails.svelte';
import { DEMO_IMAGE_PDF_BLOCKS } from '$shared/data/demo.js';

// Re-host the frozen DEMO_IMAGE_PDF_BLOCKS image-ready fixture as a real
// ArtifactDetailsModel so every story arg is sourced from the demo data — nothing
// is invented. displayName/mediaType/fullBytes/revision/redaction come straight
// off the image-ready FilePreviewBlock; processing is 'complete' because that
// block's availability is 'ready'. The demo image fixture is a 1×1 PNG, so its
// real dimensions are width=1/height=1, and the demo's image fixture uses
// identical thumbnail and full byte lengths (see DEMO_INBOUND_MEDIA_READY_BLOCK),
// so thumbnailBytes reuses the same real byteLength.
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
