// ───────────────────────────────────────────────────────────────────
// MODULE: ARTIFACT HEADER STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import ArtifactHeader from './artifact-header.svelte';
import { DEMO_DIFF_FIXTURE, DEMO_ARTIFACT_BLOCKS } from '$shared/fixtures/demo.js';

// Reuse frozen fixture metadata so the header story exercises real title/revision provenance.
// The guarded close handoff remains inert.
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
