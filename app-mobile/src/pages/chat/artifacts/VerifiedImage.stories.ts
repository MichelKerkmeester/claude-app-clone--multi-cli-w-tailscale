import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { InboundImageReadyBlock } from '@pi-remote/pi-rpc-protocol';

import VerifiedImage from './VerifiedImage.svelte';
import { DEMO_IMAGE_PDF_BLOCKS, demoArtifactBytes } from '$shared/fixtures/demo.js';

// Re-host the demo module's private DEMO_INBOUND_MEDIA_READY_BLOCK (in
// $shared/data/demo.js) as a real InboundImageReadyBlock so every story arg is
// sourced from the demo data — nothing is invented. Every id, revision, seq,
// dimension and flag below is copied verbatim from that fixture; the digest,
// media type and byte length come from the exported image-ready
// DEMO_IMAGE_PDF_BLOCKS entry (the same DEMO_IMAGE_BYTES the private fixture
// wraps), and occurredAt uses the deterministic epoch form from
// ArtifactCard.stories because the fixture derives its timestamp from
// wall-clock minutes. The aspect ratio is the fixture thumbnail's real
// 160×100 ratio. VerifiedImage is prop-only (no context read), so no decorator;
// outside demo mode the resource read resolves through the real relay seam, so
// lifecycle states are pinned with the frozen `lifecycleState` prop.
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

const ASPECT_RATIO = 160 / 100;

const meta = {
  title: 'Artifacts/VerifiedImage',
  component: VerifiedImage,
  tags: ['autodocs'],
} satisfies Meta<typeof VerifiedImage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    block: DEMO_INBOUND_IMAGE_READY_BLOCK,
    sessionId: 'demo-session-refactor',
    aspectRatio: ASPECT_RATIO,
    forceLoad: true,
    onStateChange: () => {},
  },
};
export const PrivacyCovered: Story = {
  args: {
    block: DEMO_INBOUND_IMAGE_READY_BLOCK,
    sessionId: 'demo-session-refactor',
    aspectRatio: ASPECT_RATIO,
    forceLoad: true,
    lifecycleState: 'privacy-covered',
    onStateChange: () => {},
  },
};
