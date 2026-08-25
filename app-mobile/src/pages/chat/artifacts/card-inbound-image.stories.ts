// ───────────────────────────────────────────────────────────────────
// MODULE: INBOUND IMAGE CARD STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { InboundImageReadyBlock } from '@pi-remote/pi-rpc-protocol';

import InboundImageCard from './card-inbound-image.svelte';
import ArtifactViewerProvider from './artifact-viewer-provider.svelte';
import type { InboundImageLifecycleState } from './image-status.svelte';
import { DEMO_IMAGE_PDF_BLOCKS, demoArtifactBytes } from '$shared/fixtures/demo.js';

// Demo-byte ready-image fixture — real identity, payload, and lifecycle wiring.
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

const DEMO_INBOUND_IMAGE_READY_BLOCK: InboundImageReadyBlock =
  Object.freeze<InboundImageReadyBlock>({
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

function stateStory(state: InboundImageLifecycleState): StoryObj<typeof meta> {
  return {
    args: {
      block: DEMO_INBOUND_IMAGE_READY_BLOCK,
      sessionId: 'demo-session-refactor',
      state,
      onAction: () => {},
    },
  };
}

const meta = {
  title: 'Artifacts/InboundImageCard',
  component: InboundImageCard,
  tags: ['autodocs'],
  decorators: [() => ({ Component: ArtifactViewerProvider })],
} satisfies Meta<typeof InboundImageCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InlineReady: Story = stateStory('inline-ready');
export const Processing: Story = stateStory('processing');
export const Deferred: Story = {
  args: {
    block: DEMO_INBOUND_IMAGE_READY_BLOCK,
    sessionId: 'demo-session-refactor',
    deferReady: true,
    onAction: () => {},
  },
};
export const Corrupt: Story = stateStory('corrupt');
export const PrivacyCovered: Story = stateStory('privacy-covered');
