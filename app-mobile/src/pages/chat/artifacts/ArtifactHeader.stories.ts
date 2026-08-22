import type { Meta, StoryObj } from '@storybook/sveltekit';

import ArtifactHeader from './ArtifactHeader.svelte';
import { DEMO_DIFF_FIXTURE, DEMO_ARTIFACT_BLOCKS } from '$shared/data/demo.js';

// Re-host the frozen demo fixtures so every story arg is sourced from real demo
// data — nothing is invented. The title comes from DEMO_DIFF_FIXTURE.summary and
// the revision from the ready DEMO_ARTIFACT_BLOCKS entry. onClose is a no-op
// callback (the header's close handoff is the frozen guarded seam; the story
// only exercises the heading + close chrome). The `artifact-status` surface
// groups the viewer header chrome; WithoutRevision shows the revision line omitted.
const TITLE = DEMO_DIFF_FIXTURE.summary;
const REVISION = DEMO_ARTIFACT_BLOCKS[0]?.revision;
if (REVISION === undefined) {
  throw new Error('No ready artifact fixture found in DEMO_ARTIFACT_BLOCKS.');
}

const meta = {
  title: 'Artifacts/ArtifactHeader',
  component: ArtifactHeader,
  tags: ['autodocs'],
} satisfies Meta<typeof ArtifactHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { title: TITLE, revision: REVISION, onClose: () => {} },
};
export const WithoutRevision: Story = {
  args: { title: TITLE, onClose: () => {} },
};
