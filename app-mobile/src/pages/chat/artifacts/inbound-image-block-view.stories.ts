// ───────────────────────────────────────────────────────────────────
// MODULE: INBOUND IMAGE BLOCK VIEW STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { InboundImageBlock } from '@pi-remote/pi-rpc-protocol';

import InboundImageBlockView from './inbound-image-block-view.svelte';
import ArtifactViewerProvider from './artifact-viewer-provider.svelte';
import { DEMO_IMAGE_PDF_BLOCKS, demoArtifactBytes } from '$shared/fixtures/demo.js';

// Rebuild private inbound-image fixtures as exported blocks so stories exercise the same context.
// Viewer wiring stays tied to real identities and payloads rather than invented data.
function requireImageBytes(): {
  readonly digest: string;
  readonly byteLength: number;
  readonly mediaType: 'image/jpeg' | 'image/png';
} {
  const ready = DEMO_IMAGE_PDF_BLOCKS.find((block) => block.renderer === 'image');
  if (ready === undefined || ready.byteLength === null) {
    throw new Error('No image fixture found in DEMO_IMAGE_PDF_BLOCKS.');
  }
  const mediaType = ready.mimeType;
  if (mediaType !== 'image/jpeg' && mediaType !== 'image/png') {
    throw new Error(`Image fixture has an unsupported mediaType: ${mediaType}`);
  }
  return { digest: ready.digest, byteLength: demoArtifactBytes(ready).byteLength, mediaType };
}

const IMAGE = requireImageBytes();

const READY_BLOCK: InboundImageBlock = Object.freeze<InboundImageBlock>({
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

const PROCESSING_BLOCK: InboundImageBlock = Object.freeze<InboundImageBlock>({
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
