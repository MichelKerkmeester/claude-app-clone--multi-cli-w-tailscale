import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { InboundImageBlock } from '@pi-remote/pi-rpc-protocol';

import InboundImageBlockView from './InboundImageBlockView.svelte';
import ArtifactViewerProvider from './ArtifactViewerProvider.svelte';
import { DEMO_IMAGE_PDF_BLOCKS, demoArtifactBytes } from '$shared/data/demo.js';

// Re-host the demo module's private inbound-image fixtures (DEMO_INBOUND_MEDIA_
// READY_BLOCK / DEMO_INBOUND_MEDIA_PROCESSING_BLOCK in $shared/data/demo.js) as
// real InboundImageBlocks so every story arg is sourced from the demo data —
// nothing is invented. Every id, revision, seq, dimension and flag below is
// copied verbatim from those fixtures; the digest, media type and byte length
// come from the exported image-ready DEMO_IMAGE_PDF_BLOCKS entry (the same
// DEMO_IMAGE_BYTES the private fixture wraps), and occurredAt uses the
// deterministic epoch form from ArtifactCard.stories because the fixtures
// derive their timestamps from wall-clock minutes. InboundImageBlockView
// renders InboundImageCard, which reads the ArtifactViewer context via
// getOptionalArtifactViewer, so the self-providing ArtifactViewerProvider
// supplies it as a Storybook decorator (same form as ArtifactCard.stories).
function requireImageBytes(): { readonly digest: string; readonly byteLength: number; readonly mediaType: string } {
  const ready = DEMO_IMAGE_PDF_BLOCKS.find((block) => block.renderer === 'image');
  if (ready === undefined || ready.byteLength === null) {
    throw new Error('No image fixture found in DEMO_IMAGE_PDF_BLOCKS.');
  }
  return { digest: ready.digest, byteLength: demoArtifactBytes(ready).byteLength, mediaType: ready.mimeType };
}

const IMAGE = requireImageBytes();

const READY_BLOCK: InboundImageBlock = Object.freeze({
  kind: 'inbound_image',
  schemaVersion: 1,
  id: 'blk-inbound-card',
  revision: 2,
  seq: 5,
  occurredAt: '1970-01-01T00:00:00.000Z',
  mediaClass: 'screenshot',
  displayName: 'Screenshot',
  source: 'extension',
  availability: 'ready',
  artifact: {
    id: 'artifact_inbound_image_demo_001',
    revision: 'rev_inbound_image_demo_001',
    expiresAt: '2099-01-01T00:00:00.000Z',
    full: {
      digest: IMAGE.digest,
      mediaType: IMAGE.mediaType,
      width: 320,
      height: 200,
      byteLength: IMAGE.byteLength,
    },
    thumbnail: {
      digest: IMAGE.digest,
      mediaType: IMAGE.mediaType,
      width: 160,
      height: 100,
      byteLength: IMAGE.byteLength,
    },
  },
  presentation: { safeAlt: 'Shared screenshot preview' },
  redaction: { status: 'applied' },
  shareAllowed: false,
  content: { kind: 'artifact-ref' },
});

const PROCESSING_BLOCK: InboundImageBlock = Object.freeze({
  kind: 'inbound_image',
  schemaVersion: 1,
  id: 'blk-inbound-processing',
  revision: 8,
  seq: 6,
  occurredAt: '1970-01-01T00:00:00.000Z',
  mediaClass: 'screenshot',
  displayName: 'Screenshot',
  source: 'extension',
  availability: 'processing',
});

const meta = {
  title: 'Artifacts/InboundImageBlockView',
  component: InboundImageBlockView,
  tags: ['autodocs'],
  decorators: [() => ({ Component: ArtifactViewerProvider })],
} satisfies Meta<typeof InboundImageBlockView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = { args: { block: READY_BLOCK, sessionId: 'demo-session-refactor' } };
export const Processing: Story = {
  args: { block: PROCESSING_BLOCK, sessionId: 'demo-session-refactor' },
};
