import type { Meta, StoryObj } from '@storybook/sveltekit';

import SecureImagePreview from './SecureImagePreview.svelte';
import type { ImagePan } from './SecureImagePreview.svelte';
import { DEMO_IMAGE_PDF_BLOCKS, demoArtifactBytes } from '$shared/fixtures/demo.js';

// Re-host the frozen DEMO_IMAGE_PDF_BLOCKS image-ready entry so every story arg
// is sourced from the demo data — nothing is invented. The component's own
// types demand an object URL string (no demo fixture exports one), so a local
// blob: URL is created from the fixture's real PNG bytes via the same
// demoArtifactBytes seam the viewer uses. `alt` reuses the component family's
// own fallback copy ('Sanitized image preview', as in ImagePreview.svelte) —
// the fixture block carries no altText of its own. SecureImagePreview is
// prop-only (no context read), so no decorator; the change callbacks are
// no-ops.
const READY_BLOCK = DEMO_IMAGE_PDF_BLOCKS.find((block) => block.id === 'blk-image-ready');
if (READY_BLOCK === undefined) {
  throw new Error('No ready image fixture found in DEMO_IMAGE_PDF_BLOCKS.');
}
const IMAGE_BYTES = demoArtifactBytes(READY_BLOCK);
const OBJECT_URL = URL.createObjectURL(new Blob([IMAGE_BYTES.slice()], { type: READY_BLOCK.mimeType }));
const ZERO_PAN: ImagePan = Object.freeze({ x: 0, y: 0 });

const meta = {
  title: 'Artifacts/SecureImagePreview',
  component: SecureImagePreview,
  tags: ['autodocs'],
} satisfies Meta<typeof SecureImagePreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: {
    objectUrl: null,
    alt: 'Sanitized image preview',
    zoom: 1,
    pan: ZERO_PAN,
    imageState: 'loading',
    isFull: false,
    onPanChange: () => {},
    onZoomChange: () => {},
    onStateChange: () => {},
  },
};
export const ThumbnailReady: Story = {
  args: {
    objectUrl: OBJECT_URL,
    alt: 'Sanitized image preview',
    zoom: 1,
    pan: ZERO_PAN,
    imageState: 'ready',
    isFull: false,
    onPanChange: () => {},
    onZoomChange: () => {},
    onStateChange: () => {},
  },
};
export const FullZoomed: Story = {
  args: {
    objectUrl: OBJECT_URL,
    alt: 'Sanitized image preview',
    zoom: 2,
    pan: ZERO_PAN,
    imageState: 'ready',
    isFull: true,
    onPanChange: () => {},
    onZoomChange: () => {},
    onStateChange: () => {},
  },
};
