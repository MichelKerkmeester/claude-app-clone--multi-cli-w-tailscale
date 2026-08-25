// ───────────────────────────────────────────────────────────────────
// MODULE: ARTIFACT CARD STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { FileDiffBlock } from '@pi-remote/pi-rpc-protocol';

import ArtifactCard from './card-artifact.svelte';
import ArtifactViewerProvider from './artifact-viewer-provider.svelte';
import { DEMO_DIFF_FIXTURE } from '$shared/fixtures/demo.js';

// Frozen diff fixture — real patch provenance via viewer context, no invented metadata.
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
