import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { FileDiffBlock } from '@pi-remote/pi-rpc-protocol';

import ArtifactCard from './ArtifactCard.svelte';
import ArtifactViewerProvider from './ArtifactViewerProvider.svelte';
import { DEMO_DIFF_FIXTURE } from '$shared/fixtures/demo.js';

// Re-host the frozen DEMO_DIFF_FIXTURE as a real FileDiffBlock so the story
// `block` arg is sourced from the demo data — nothing is invented. The id,
// summary and patch come straight from the fixture; the ordering fields use the
// fixture's real transcript seq (5) with deterministic revision/occurredAt, the
// same form the catalog's demoDiffBlock() uses. ArtifactCard reads the
// ArtifactViewer context via getOptionalArtifactViewer, so the self-providing
// ArtifactViewerProvider supplies it as a Storybook decorator (same form as
// RichContentRouter.stories and FilePreviewCard.stories).
const DEMO_DIFF_BLOCK: FileDiffBlock = Object.freeze({
  kind: 'file_diff',
  id: DEMO_DIFF_FIXTURE.blockId,
  revision: 1,
  seq: 5,
  occurredAt: '1970-01-01T00:00:00.000Z',
  summary: DEMO_DIFF_FIXTURE.summary,
  patch: DEMO_DIFF_FIXTURE.patch,
});

const meta = {
  title: 'Artifacts/ArtifactCard',
  component: ArtifactCard,
  tags: ['autodocs'],
  decorators: [() => ({ Component: ArtifactViewerProvider })],
} satisfies Meta<typeof ArtifactCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { block: DEMO_DIFF_BLOCK } };
